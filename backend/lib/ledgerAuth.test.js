// FF-C authoritative ledger: state machine, idempotency, double-count fix,
// policy rake splits, gig verification gate wiring (in-memory DB).
process.env.NODE_ENV = 'test';
const fs = require('fs');
const db = require('../database');
const { insert, setStatus, recordPayment, releaseAgainstPaid, settleWithRake } = require('./ledger');
const { getRakePolicy, getDataAccessFee, DEFAULTS } = require('./fees');

const get = (sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, r) => e ? rej(e) : res(r)));
const all = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => e ? rej(e) : res(r)));
const pwrap = (fn, ...a) => new Promise((res, rej) => fn(...a, (e, r) => e ? rej(e) : res(r)));

beforeAll(async () => {
  for (let i = 0; i < 150; i++) {
    const cols = await all('PRAGMA table_info(ledger)').catch(() => []);
    if (cols.some(c => c.name === 'idempotency_key')) break;
    await new Promise(r => setTimeout(r, 100));
  }
}, 20000);

test('fee policy values are decided and readable', async () => {
  expect(DEFAULTS).toMatchObject({ task_rake_bps: '500', gig_rake_bps: '500',
    contract_rake_bps: '300', data_access_fee_paise: '5000',
    compute_job_bps: '1000', welfare_bps: '100' });
  expect(await pwrap(getRakePolicy)).toEqual({ task_rake_bps: 500, gig_rake_bps: 500,
    contract_rake_bps: 300, welfare_bps: 100 });
  expect(await pwrap(getDataAccessFee)).toBe(5000);
});

test('state machine: legal path settles; illegal jumps rejected', async () => {
  const r = await pwrap(insert, { entry_type: 'staged', amount_paise: 10, status: 'pending' });
  for (const s of ['authorized', 'captured', 'settled']) {
    const u = await pwrap(setStatus, r.id, s);
    expect(u.status).toBe(s);
  }
  await expect(pwrap(setStatus, r.id, 'captured')).rejects.toThrow('BADTRANSITION');
  const f = await pwrap(insert, { entry_type: 'staged', amount_paise: 10, status: 'failed' });
  await expect(pwrap(setStatus, f.id, 'settled')).rejects.toThrow('BADTRANSITION');
});

test('idempotency: duplicate webhook pays once', async () => {
  const base = { amountPaise: 3000, fromUser: null, toUser: null, refType: 'idem',
    refId: 1, memo: 'm', by: null, idempotencyKey: 'wh-aaa' };
  await pwrap(recordPayment, base);
  await expect(pwrap(recordPayment, base)).rejects.toThrow('DUPLICATE');
  const n = await get("SELECT COUNT(*) n FROM ledger WHERE idempotency_key='wh-aaa'");
  expect(n.n).toBe(1); // key lives on the head row only
  const legs = await get("SELECT COUNT(*) n FROM ledger WHERE ref_type='idem' AND ref_id=1");
  expect(legs.n).toBe(3); // approved+expense+income, single booking, no double pay
});

test('double-count fix: release against paid task references, unpaid books', async () => {
  await pwrap(recordPayment, { amountPaise: 7000, fromUser: null, toUser: null,
    refType: 'task', refId: 3, memo: 'task payout', by: null });
  const ref = await pwrap(releaseAgainstPaid, { contractId: 5, taskId: 3,
    amountPaise: 7000, fromUser: null, toUser: null, by: null, idempotencyKey: 'rel-5' });
  expect(ref.referenced).toBeGreaterThan(0);
  const camts = (await all("SELECT amount_paise FROM ledger WHERE ref_type='contract' AND ref_id=5"))
    .map(r => r.amount_paise);
  expect(camts).toEqual([0]); // reference only, net zero new booking
  const fresh = await pwrap(releaseAgainstPaid, { contractId: 6, taskId: 999,
    amountPaise: 4000, fromUser: null, toUser: null, by: null });
  expect(fresh.booked).toBe(true);
});

test('rake splits per policy: worker/platform/welfare heads', async () => {
  const s = await pwrap(settleWithRake, { grossPaise: 10000, rakeBps: 500,
    welfareBps: 100, fromUser: null, toUser: null, refType: 'rake3', refId: 1, memo: 'm', by: null });
  expect(s).toEqual({ gross: 10000, rake: 500, welfare: 100, workerNet: 9400 });
  const incomes = (await all("SELECT amount_paise, memo FROM ledger WHERE ref_type='rake3' AND entry_type='income'"));
  expect(incomes.map(r => r.amount_paise).sort((a, b) => a - b)).toEqual([100, 500, 9400]);
  expect(incomes.find(r => /welfare head/.test(r.memo)).amount_paise).toBe(100);
});

test('gig payout is verification-gated in the route', () => {
  const src = fs.readFileSync(__dirname + '/../routes/gigs.js', 'utf8');
  expect(src).toContain('requireWorkerVerified');
});
