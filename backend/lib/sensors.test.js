// Sensors §11 (FireFlow half): anti-fraud observation fields, confirm rules,
// per-capability reliability (in-memory DB via NODE_ENV=test).
process.env.NODE_ENV = 'test';
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET } = require('../middleware/auth');
const { recordOutcome, scoresFor, laplace } = require('./reliability');
const observationsRoute = require('../routes/observations');

const get = (sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, r) => e ? rej(e) : res(r)));
const all = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => e ? rej(e) : res(r)));
const run = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res(this); }));
const pwrap = (fn, ...a) => new Promise((res, rej) => fn(...a, (e, r) => e ? rej(e) : res(r)));

const NEED = ['users', 'observations', 'observation_confirmations', 'capability_scores'];
async function ready() {
  for (let i = 0; i < 200; i++) {
    const rows = await all("SELECT name FROM sqlite_master WHERE type='table'").catch(() => []);
    if (NEED.every(t => rows.some(r => r.name === t))) return;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('tables never ready');
}
beforeEach(ready, 25000);

let seq = 0;
async function user() {
  seq += 1;
  const r = await run(`INSERT INTO users (username, email, password) VALUES ('s${seq}','s${seq}@x.y','p')`);
  return r.lastID;
}
const token = (id) => jwt.sign({ id }, JWT_SECRET);
function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/observations', observationsRoute(null));
  return a;
}

test('observations carry anti-fraud fields end to end', async () => {
  const u = await user();
  const r = await request(app()).post('/api/observations').set('Authorization', `Bearer ${token(u)}`)
    .send({ metric: 'capacity', value: 0.71, source: 'factory-tablet', device: 'tablet-3',
      geography: { ward: 12 }, evidence: { photo: 'hash9' }, confidence: 0.8 });
  expect(r.status).toBe(201);
  const row = await get('SELECT * FROM observations WHERE id = ?', [r.body.id]);
  expect(row.source).toBe('factory-tablet');
  expect(row.device).toBe('tablet-3');
  expect(JSON.parse(row.geography)).toEqual({ ward: 12 });
  expect(JSON.parse(row.evidence)).toEqual({ photo: 'hash9' });
  expect(row.confidence).toBe(0.8);
  expect(row.confirmation_count).toBe(0);
});

test('confirm: independent ok, self 400, double 409', async () => {
  const a = await user();
  const b = await user();
  const r = await request(app()).post('/api/observations').set('Authorization', `Bearer ${token(a)}`)
    .send({ metric: 'capacity', value: 0.7 });
  const id = r.body.id;
  expect((await request(app()).post(`/api/observations/${id}/confirm`)
    .set('Authorization', `Bearer ${token(a)}`)).status).toBe(400);
  expect((await request(app()).post(`/api/observations/${id}/confirm`)
    .set('Authorization', `Bearer ${token(b)}`)).body.confirmation_count).toBe(1);
  expect((await request(app()).post(`/api/observations/${id}/confirm`)
    .set('Authorization', `Bearer ${token(b)}`)).status).toBe(409);
});

test('reliability: per-capability scores independent; fakes downweighted', async () => {
  const u = await user();
  for (let i = 0; i < 9; i++) await pwrap(recordOutcome, u, 'price_estimate', true);
  await pwrap(recordOutcome, u, 'price_estimate', false);
  for (let i = 0; i < 2; i++) await pwrap(recordOutcome, u, 'verification', true);
  for (let i = 0; i < 8; i++) await pwrap(recordOutcome, u, 'verification', false);
  const s = await pwrap(scoresFor, u);
  expect(s.price_estimate.score).toBe(laplace(9, 10));
  expect(s.verification.score).toBe(laplace(2, 10));
  expect(s.price_estimate.score).toBeGreaterThan(0.8);
  expect(s.verification.score).toBeLessThan(0.5);
  await expect(pwrap(recordOutcome, null, 'x', true)).rejects.toThrow();
});
