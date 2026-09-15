// FF-D settlement: pipeline happy/fail paths, data/compute fees, licensing
// (in-memory DB via NODE_ENV=test).
process.env.NODE_ENV = 'test';
const db = require('../database');
const { settleContract, settleDataGrant, settleComputeJob,
  issueLicense, revokeLicense, canGrant, completeGrant } = require('./settlement');

const get = (sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, r) => e ? rej(e) : res(r)));
const all = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => e ? rej(e) : res(r)));
const run = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res(this); }));
const pwrap = (fn, ...a) => new Promise((res, rej) => fn(...a, (e, r) => e ? rej(e) : res(r)));

const NEED_TABLES = ['users', 'units', 'datasets', 'data_access', 'dataset_licenses',
  'compute_nodes', 'compute_jobs', 'ledger', 'fee_config'];

// NOTE: jest resetModules gives each test a fresh :memory: DB, so table
// readiness is awaited before EVERY test, not once per file.
async function ready() {
  for (let i = 0; i < 200; i++) {
    const rows = await all("SELECT name FROM sqlite_master WHERE type='table'").catch(() => []);
    const have = new Set(rows.map(r => r.name));
    if (NEED_TABLES.every(t => have.has(t))) return;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('tables never ready');
}

beforeEach(ready, 25000);

let userSeq = 0;
async function users2() {
  userSeq += 1;
  const a = await run(`INSERT INTO users (username, email, password) VALUES ('o${userSeq}a','o${userSeq}a@x.y','p')`);
  const b = await run(`INSERT INTO users (username, email, password) VALUES ('b${userSeq}b','b${userSeq}b@x.y','p')`);
  return [a.lastID, b.lastID];
}

test('happy path: contract settles with fee splits, reconciles, reports', async () => {
  const t = await pwrap(settleContract, { contractId: 11, taskId: 12, amountPaise: 20000,
    payer: null, payee: null, rakeBps: 300, welfareBps: 100, provider: 'stub', by: null });
  expect(t.stages).toEqual(['authorized', 'provider_ok', 'settled', 'reconciled', 'paid_out', 'reported']);
  expect(t.splits).toEqual({ gross: 20000, rake: 600, welfare: 200, workerNet: 19200 });
  expect(t.reconciled).toBe(true);
  expect(t.provider_tx_id).toMatch(/^stub_/);
  const head = await get('SELECT evidence FROM ledger WHERE idempotency_key=?', ['contract-release:11']);
  expect(JSON.parse(head.evidence).settlement_report.splits.workerNet).toBe(19200);
});

test('provider failure: no payout, ledger consistent', async () => {
  const t = await pwrap(settleContract, { contractId: 13, taskId: 14, amountPaise: 5000,
    payer: null, payee: null, rakeBps: 300, welfareBps: 100, provider: 'fail', by: null });
  expect(t.stages).toEqual(['authorized', 'failed']);
  expect(t.error).toBe('PROVIDER_FAILED');
  const rows = await all("SELECT * FROM ledger WHERE ref_id IN (13, 14)");
  expect(rows.length).toBe(0);
});

test('data grant: flat fee booked once; double grant idempotent', async () => {
  const [owner, buyer] = await users2();
  await run("INSERT INTO units (unit_id, unit_type, owner_user_id) VALUES ('du1','Dataset',?)", [owner]);
  const d = await run("INSERT INTO datasets (unit_id, owner_user_id, title, access) VALUES ('du1',?, 't', 'open')", [owner]);
  const a = await run('INSERT INTO data_access (dataset_id, requester_id, purpose) VALUES (?,?,?)',
    [d.lastID, buyer, 'research']);
  const g = await pwrap(completeGrant, { accessId: a.lastID });
  expect(g.fee_paise).toBe(5000);
  expect(g.license_id).toBeGreaterThan(0);
  const fee = await all("SELECT amount_paise FROM ledger WHERE ref_type='data_access'");
  expect(fee.map(r => r.amount_paise).sort((x, y) => x - y)).toEqual([5000, 5000, 5000]);
  await expect(pwrap(completeGrant, { accessId: a.lastID })).rejects.toThrow('DUPLICATE');
});

test('revoked license blocks future grants', async () => {
  const [owner, buyer] = await users2();
  await run("INSERT INTO units (unit_id, unit_type, owner_user_id) VALUES ('du2','Dataset',?)", [owner]);
  const d = await run("INSERT INTO datasets (unit_id, owner_user_id, title, access) VALUES ('du2',?, 't2', 'gated')", [owner]);
  const lic = await pwrap(issueLicense, { datasetId: d.lastID, buyerId: buyer, purpose: 'p' });
  expect(lic.status).toBe('granted');
  expect((await pwrap(revokeLicense, lic.license_id)).status).toBe('revoked');
  expect(await new Promise((res) => canGrant(d.lastID, buyer, (e, ok) => res(ok)))).toBe(false);
  const a = await run('INSERT INTO data_access (dataset_id, requester_id, purpose) VALUES (?,?,?)',
    [d.lastID, buyer, 'p2']);
  await expect(pwrap(completeGrant, { accessId: a.lastID })).rejects.toThrow('LICENSE_REVOKED');
});

test('compute completion: bps fee math, idempotent', async () => {
  const s = await pwrap(settleComputeJob, { jobId: 21, requesterId: null, ownerId: null,
    costPaise: 20000, feeBps: 1000, by: null });
  expect(s).toEqual({ settled: true, cost_paise: 20000, fee_paise: 2000, workerNet: 18000 });
  await expect(pwrap(settleComputeJob, { jobId: 21, requesterId: null, ownerId: null,
    costPaise: 20000, feeBps: 1000, by: null })).rejects.toThrow('DUPLICATE');
  const incomes = await all("SELECT amount_paise FROM ledger WHERE ref_type='compute_job' AND entry_type='income'");
  expect(incomes.map(r => r.amount_paise).sort((x, y) => x - y)).toEqual([2000, 18000]);
});
