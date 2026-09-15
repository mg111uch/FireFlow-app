// FF-A contract tests (lib-level, in-memory DB via NODE_ENV=test):
// escrow stage->approve lifecycle, rake math, verification gate, fee defaults.
process.env.NODE_ENV = 'test';
const db = require('../database');
const { rupeesToPaise, recordPayment, stage, approve } = require('./ledger');
const { userVerified, requireWorkerVerified } = require('./verification');
const { getFees } = require('./fees');

const get = (sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, r) => e ? rej(e) : res(r)));
const all = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => e ? rej(e) : res(r)));
const run = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res(this); }));

beforeAll(async () => {
  for (let i = 0; i < 100; i++) {
    const t = await get("SELECT name FROM sqlite_master WHERE type='table' AND name='ledger'");
    if (t) break;
    await new Promise(r => setTimeout(r, 100));
  }
}, 15000);

const pwrap = (fn, ...a) => new Promise((res, rej) => fn(...a, (e, r) => e ? rej(e) : res(r)));
// capture the async gate outcome (res.json or next())
const gate = (workerId) => new Promise((resolve) => {
  const res = { status: (c) => ({ json: (b) => resolve([c, b]) }) };
  requireWorkerVerified(workerId, res, () => resolve(['next']));
});

test('rupeesToPaise rounds half-up allegedly fractional amounts', () => {
  expect(rupeesToPaise(19.99)).toBe(1999);
  expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
  expect(rupeesToPaise(null)).toBe(0);
});

test('escrow lifecycle: stage -> approve posts approved+expense+income; re-approve rejected', async () => {
  const s = await pwrap(stage, { amountPaise: 5000, fromUser: null, toUser: null,
    refType: 'contract', refId: 1, memo: 't', by: null });
  expect(s.entry_type).toBe('staged');
  await pwrap(approve, s.id, 42);
  const kinds = (await all("SELECT entry_type, amount_paise FROM ledger WHERE ref_type=? AND ref_id=? AND entry_type != 'staged'",
    ['contract', 1])).map(r => `${r.entry_type}:${r.amount_paise}`).sort();
  expect(kinds).toEqual(['approved:5000', 'expense:5000', 'income:5000']);
  await expect(pwrap(approve, s.id, 42)).rejects.toThrow('ALREADY');
  await expect(pwrap(approve, 999999, 42)).rejects.toThrow();
});

test('recordPayment splits gross into net income + rake income', async () => {
  await pwrap(recordPayment, { amountPaise: 10000, rakePaise: 500, fromUser: null,
    toUser: null, refType: 'rakeprobe', refId: 7, memo: 'm', by: null });
  const rows = await all("SELECT entry_type, amount_paise, memo FROM ledger WHERE ref_type='rakeprobe'");
  const one = (t) => rows.filter(r => r.entry_type === t).map(r => r.amount_paise);
  expect(one('approved')).toEqual([10000]);
  expect(one('expense')).toEqual([10000]);
  expect(one('income').sort((a, b) => a - b)).toEqual([500, 9500]);
  expect(rows.find(r => /marketplace rake/.test(r.memo)).amount_paise).toBe(500);
});

test('verification gate: 403 until a verified unit exists; fee defaults hold', async () => {
  expect(await gate(null)).toEqual([400, { error: 'No worker assigned yet.' }]);
  const u = await run("INSERT INTO users (username, email, password) VALUES ('w1','w1@x.y','p')");
  const denied = await gate(u.lastID);
  expect(denied[0]).toBe(403); // no verified unit yet
  expect(await new Promise((res2, rej) =>
    userVerified(u.lastID, (e, ok) => e ? rej(e) : res2(ok)))).toBe(false);
  await run("INSERT INTO units (unit_id, unit_type, owner_user_id, verification_status) VALUES ('uv1','Person',?, 'verified')", [u.lastID]);
  expect(await gate(u.lastID)).toEqual(['next']);
  expect(await pwrap(getFees)).toEqual({ task_rake_bps: 500 });
});
