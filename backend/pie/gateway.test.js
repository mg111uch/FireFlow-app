// FF-B gateway tests (in-memory DB via NODE_ENV=test): envelope validation,
// server-side RBAC denials, budget-cap enforcement, idempotent receipt ingest.
process.env.NODE_ENV = 'test';
const request = require('supertest');
const db = require('../database');
const app = require('../app');
const { validateProposal, validateReceipt, PROPOSAL_REQUIRED } = require('./commands');
const { authorize } = require('./policies');
const gateway = require('./gateway');

const get = (sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, r) => e ? rej(e) : res(r)));
const all = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => e ? rej(e) : res(r)));
const run = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res(this); }));

const PROP = () => ({ proposal_id: 'p1', objective: 'restock', action: 'quote',
  budget_paise: 5000, risk: 'low', required_capabilities: ['inventory'],
  expected_outcome: { units: 10 }, authorization: 'agent' });
const RECEIPT = () => ({ proposal_id: 'p1', execution_id: 'e1', status: 'succeeded',
  actual_cost_paise: 4800, evidence: ['delivery-note'], result: { units: 10 },
  economic_delta: { revenue: 9000, cost: 4800 } });

let readerKey, writerKey;

beforeAll(async () => {
  for (let i = 0; i < 100; i++) {
    const t = await get("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_api_keys'");
    if (t) break;
    await new Promise(r => setTimeout(r, 100));
  }
  const u = await run("INSERT INTO users (username, email, password) VALUES ('ag','ag@x.y','p')");
  await run("INSERT INTO agent_api_keys (key_name, api_key, user_id, permissions, spend_limit_paise) VALUES ('r','k-read',?, 'read', 10000)", [u.lastID]);
  await run("INSERT INTO agent_api_keys (key_name, api_key, user_id, permissions, spend_limit_paise) VALUES ('w','k-write',?, 'read/write', 10000)", [u.lastID]);
  readerKey = 'k-read';
  writerKey = 'k-write';
  gateway.resetSeenForTests();
}, 15000);

test('envelopes: validation rejects bad proposal and bad receipt', () => {
  const bad = PROP(); delete bad.budget_paise;
  expect(validateProposal(bad).valid).toBe(false);
  expect(validateProposal({ ...PROP(), risk: 'extreme' }).valid).toBe(false);
  expect(validateProposal({ ...PROP(), required_capabilities: [] }).valid).toBe(false);
  expect(validateProposal(PROP()).valid).toBe(true);
  expect(validateReceipt({ ...RECEIPT(), status: 'maybe' }).valid).toBe(false);
  expect(validateReceipt(RECEIPT()).valid).toBe(true);
  expect(PROPAL_REQUIRED_CHECK()).toBe(true);
  function PROPAL_REQUIRED_CHECK() {
    return JSON.stringify([...PROPOSAL_REQUIRED].sort()) ===
      JSON.stringify(['action', 'authorization', 'budget_paise', 'expected_outcome',
        'objective', 'proposal_id', 'required_capabilities', 'risk'].sort());
  }
});

test('authorize: over-cap denied, high-risk needs approval, in-cap authorized', () => {
  const agent = { id: 1, permissions: 'read/write', spendLimitPaise: 10000 };
  expect(authorize(agent, { ...PROP(), budget_paise: 20000 }).decision).toBe('denied');
  expect(authorize(agent, { ...PROP(), risk: 'high' }).decision).toBe('needs_approval');
  expect(authorize(agent, PROP()).decision).toBe('authorized');
  expect(authorize({ id: 2, permissions: 'read', spendLimitPaise: 10000 },
    { ...PROP(), action: 'execute' }).decision).toBe('denied');
});

test('POST /propose: 401 without key; read-only writer-action 403; over-cap 403', async () => {
  await request(app).post('/api/pie/propose').send(PROP()).expect(401);
  await request(app).post('/api/pie/propose').set('X-Agent-Api-Key', readerKey)
    .send({ ...PROP(), action: 'execute' }).expect(403);
  const over = await request(app).post('/api/pie/propose').set('X-Agent-Api-Key', writerKey)
    .send({ ...PROP(), budget_paise: 50000 });
  expect(over.status).toBe(403);
  expect(over.body.decision).toBe('denied');
  const ok = await request(app).post('/api/pie/propose').set('X-Agent-Api-Key', writerKey).send(PROP());
  expect(ok.status).toBe(200);
  expect(ok.body.decision).toBe('authorized');
});

test('POST /receipts: idempotent ingest, one observations row', async () => {
  const r1 = await request(app).post('/api/pie/receipts').set('X-Agent-Api-Key', writerKey).send(RECEIPT());
  expect(r1.status).toBe(200);
  expect(r1.body.dedup).toBeUndefined();
  const r2 = await request(app).post('/api/pie/receipts').set('X-Agent-Api-Key', writerKey).send(RECEIPT());
  expect(r2.body.dedup).toBe(true);
  const rows = await all("SELECT * FROM observations WHERE metric='pie_receipt'");
  expect(rows.length).toBe(1);
  expect(JSON.parse(rows[0].note).execution_id).toBe('e1');
});
