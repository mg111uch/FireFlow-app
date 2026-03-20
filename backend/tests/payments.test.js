/**
 * backend/__tests__/payments.test.js
 *
 * Unit tests for POST /api/payments/create-order and POST /api/payments/verify.
 * DB is fully mocked via jest.mock('../database').
 * Razorpay SDK is mocked — no real API calls made.
 *
 * Run: NODE_ENV=test npx jest __tests__/payments.test.js
 */

// Create mock functions at module scope so both test and routes use the same reference
const mockRun = jest.fn((sql, params, cb) => { 
  if (typeof cb === 'function') cb(null); 
});

// Mock the DB before any require of the route
jest.mock('../database', () => ({
  run: mockRun,
  get: jest.fn(),
  all: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const crypto = require('crypto');

// Get the mocked database
const db = require('../database');

// Mock Razorpay SDK
const mockCreateOrder = jest.fn();
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: { create: mockCreateOrder },
  }));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RAZORPAY_KEY_SECRET = 'test_secret_key';
process.env.RAZORPAY_KEY_ID = 'rzp_test_key_id';
process.env.RAZORPAY_KEY_SECRET = RAZORPAY_KEY_SECRET;

/** Builds a valid HMAC-SHA256 Razorpay signature */
function makeSignature(orderId, paymentId) {
  return crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

/** Creates a minimal Express app with the payments router and a fake auth middleware */
function buildApp({ userId = 1 } = {}) {
  // Clear mock before each test
  mockRun.mockClear();
  
  const app = express();
  app.use(express.json());

  // Inject req.user as authenticateToken would
  app.use((req, res, next) => {
    req.user = { id: userId };
    next();
  });

  const paymentsRouter = require('../routes/payments');
  app.use('/api/payments', paymentsRouter(() => {}, new Map()));

  return app;
}

/** Creates an app where auth middleware sets no user (simulates missing/invalid JWT) */
function buildUnauthApp() {
  mockRun.mockClear();
  
  const app = express();
  app.use(express.json());
  // No req.user set — route will crash on req.user.id → 500
  const paymentsRouter = require('../routes/payments');
  app.use('/api/payments', paymentsRouter(() => {}, new Map()));
  return app;
}

// ─── create-order ─────────────────────────────────────────────────────────────

describe('POST /api/payments/create-order', () => {
  beforeEach(() => {
    mockRun.mockClear();
    mockCreateOrder.mockClear();
  });

  it('returns 200 with orderId, amount, currency, keyId on success', async () => {
    mockCreateOrder.mockResolvedValueOnce({
      id: 'order_test_abc',
      amount: 49900,
      currency: 'INR',
    });

    const res = await request(buildApp())
      .post('/api/payments/create-order')
      .send({ amount: 499 });

    expect(res.status).toBe(200);
    expect(res.body.orderId).toBe('order_test_abc');
    expect(res.body.amount).toBe(49900);
    expect(res.body.currency).toBe('INR');
    expect(res.body.keyId).toBe('rzp_test_key_id');
  });

  it('converts INR amount to paise before calling Razorpay', async () => {
    mockCreateOrder.mockResolvedValueOnce({
      id: 'order_test', amount: 49900, currency: 'INR',
    });

    await request(buildApp()).post('/api/payments/create-order').send({ amount: 499 });

    const [calledOptions] = mockCreateOrder.mock.calls[0];
    expect(calledOptions.amount).toBe(49900);   // 499 * 100
  });

  it('rounds fractional paise correctly (e.g. ₹10.5 → 1050)', async () => {
    mockCreateOrder.mockResolvedValueOnce({ id: 'o', amount: 1050, currency: 'INR' });
    await request(buildApp()).post('/api/payments/create-order').send({ amount: 10.5 });
    const [opts] = mockCreateOrder.mock.calls[0];
    expect(opts.amount).toBe(1050);
  });

  it('includes userId from JWT in order receipt and notes', async () => {
    mockCreateOrder.mockResolvedValueOnce({ id: 'o', amount: 49900, currency: 'INR' });
    await request(buildApp({ userId: 42 }))
      .post('/api/payments/create-order')
      .send({ amount: 499 });

    const [opts] = mockCreateOrder.mock.calls[0];
    expect(opts.receipt).toContain('42');
    expect(opts.notes.userId).toBe(42);
  });

  it('inserts a row into payments table with status "created"', async () => {
    mockCreateOrder.mockResolvedValueOnce({ id: 'order_db_test', amount: 49900, currency: 'INR' });
    await request(buildApp()).post('/api/payments/create-order').send({ amount: 499 });

    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO payments'),
      expect.arrayContaining([1, 'order_db_test', 49900]),
      expect.any(Function)
    );
  });

  it('returns 400 when amount is missing', async () => {
    const res = await request(buildApp()).post('/api/payments/create-order').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid amount/i);
  });

  it('returns 400 when amount is zero', async () => {
    const res = await request(buildApp()).post('/api/payments/create-order').send({ amount: 0 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when amount is negative', async () => {
    const res = await request(buildApp()).post('/api/payments/create-order').send({ amount: -100 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when amount is a string', async () => {
    const res = await request(buildApp()).post('/api/payments/create-order').send({ amount: '499' });
    expect(res.status).toBe(400);
  });

  it('returns 500 when Razorpay API throws', async () => {
    mockCreateOrder.mockRejectedValueOnce(new Error('Razorpay API down'));
    const res = await request(buildApp()).post('/api/payments/create-order').send({ amount: 499 });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to create payment order/i);
  });

  it('returns 500 when req.user is undefined (no auth middleware)', async () => {
    mockCreateOrder.mockResolvedValueOnce({ id: 'o', amount: 49900, currency: 'INR' });
    const res = await request(buildUnauthApp())
      .post('/api/payments/create-order')
      .send({ amount: 499 });
    expect(res.status).toBe(500);
  });
});

// ─── verify ───────────────────────────────────────────────────────────────────

describe('POST /api/payments/verify', () => {
  const ORDER_ID = 'order_verify_test';
  const PAYMENT_ID = 'pay_verify_test';
  const VALID_SIG = makeSignature(ORDER_ID, PAYMENT_ID);

  beforeEach(() => {
    mockRun.mockClear();
    mockCreateOrder.mockClear();
  });

  it('returns 200 and success:true for valid signature', async () => {
    const res = await request(buildApp())
      .post('/api/payments/verify')
      .send({
        razorpay_order_id: ORDER_ID,
        razorpay_payment_id: PAYMENT_ID,
        razorpay_signature: VALID_SIG,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.paymentId).toBe(PAYMENT_ID);
  });

  it('updates payments row to status "verified" on success', async () => {
    await request(buildApp())
      .post('/api/payments/verify')
      .send({
        razorpay_order_id: ORDER_ID,
        razorpay_payment_id: PAYMENT_ID,
        razorpay_signature: VALID_SIG,
      });

    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining("status = 'verified'"),
      expect.arrayContaining([PAYMENT_ID, ORDER_ID]),
      expect.any(Function)
    );
  });

  it('returns 400 for an invalid signature', async () => {
    const res = await request(buildApp())
      .post('/api/payments/verify')
      .send({
        razorpay_order_id: ORDER_ID,
        razorpay_payment_id: PAYMENT_ID,
        razorpay_signature: 'completely_wrong_signature_value_padded',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/signature verification failed/i);
  });

  it('updates payments row to status "failed" on invalid signature', async () => {
    await request(buildApp())
      .post('/api/payments/verify')
      .send({
        razorpay_order_id: ORDER_ID,
        razorpay_payment_id: PAYMENT_ID,
        razorpay_signature: 'completely_wrong_signature_value_padded',
      });

    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining("status = 'failed'"),
      expect.arrayContaining([ORDER_ID, 1])
    );
  });

  it('returns 400 when razorpay_order_id is missing', async () => {
    const res = await request(buildApp())
      .post('/api/payments/verify')
      .send({ razorpay_payment_id: PAYMENT_ID, razorpay_signature: VALID_SIG });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  it('returns 400 when razorpay_payment_id is missing', async () => {
    const res = await request(buildApp())
      .post('/api/payments/verify')
      .send({ razorpay_order_id: ORDER_ID, razorpay_signature: VALID_SIG });

    expect(res.status).toBe(400);
  });

  it('returns 400 when razorpay_signature is missing', async () => {
    const res = await request(buildApp())
      .post('/api/payments/verify')
      .send({ razorpay_order_id: ORDER_ID, razorpay_payment_id: PAYMENT_ID });

    expect(res.status).toBe(400);
  });

  it('handles a signature of wrong byte-length without throwing (returns 400, not 500)', async () => {
    // crypto.timingSafeEqual throws if buffer lengths differ.
    // The route wraps this in try/catch — should return 400, not crash to 500.
    const res = await request(buildApp())
      .post('/api/payments/verify')
      .send({
        razorpay_order_id: ORDER_ID,
        razorpay_payment_id: PAYMENT_ID,
        razorpay_signature: 'tooshort',  // will cause Buffer length mismatch
      });

    expect(res.status).toBe(400);
  });

  it('returns 500 when req.user is undefined (no auth middleware)', async () => {
    const res = await request(buildUnauthApp())
      .post('/api/payments/verify')
      .send({
        razorpay_order_id: ORDER_ID,
        razorpay_payment_id: PAYMENT_ID,
        razorpay_signature: VALID_SIG,
      });
    expect(res.status).toBe(500);
  });
});
