const express = require('express');
const crypto = require('crypto');
const db = require('../database');

const router = express.Router();

function generatePaymentId() {
  return 'fp_' + crypto.randomBytes(12).toString('hex');
}

function generateSignature(orderId, paymentId, secret) {
  const payload = `${orderId}|${paymentId}`;
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

function authenticateVendor(req, res, next) {
  const id = req.headers['x-flowpay-id'];
  const secret = req.headers['x-flowpay-secret'];

  if (!id || !secret) {
    return res.status(401).json({ error: 'Missing credentials' });
  }

  db.get(
    `SELECT * FROM gateway_users WHERE flowpay_id=? AND flowpay_secret=?`,
    [id, secret],
    (err, row) => {
      if (!row) {
        return res.status(403).json({ error: 'Invalid credentials' });
      }

      req.vendor = row;
      next();
    }
  );
}

router.post('/register', (req, res) => {
  const flowpay_id = 'fp_id_' + crypto.randomBytes(8).toString('hex');
  const flowpay_secret = crypto.randomBytes(16).toString('hex');

  db.run(
    `INSERT INTO gateway_users (flowpay_id, flowpay_secret)
     VALUES (?, ?)`,
    [flowpay_id, flowpay_secret]
  );

  return res.json({ flowpay_id, flowpay_secret });
});

router.use(authenticateVendor).post('/create-order', (req, res) => {
  const { amount } = req.body;

  const orderId = 'fp_order_' + crypto.randomBytes(12).toString('hex');

  db.run(
    `INSERT INTO gateway_transactions (flowpay_id, order_id, amount_paise, status)
    VALUES (?, ?, ?, 'created')`,
    [req.vendor.flowpay_id, orderId, amount * 100]
  );

  return res.json({
    order_id: orderId,
    amount
  });
});

/**
 * POST /api/flowpay/process
 * 
 * Process mock card payment
 * Body: { orderId, cardNumber, expiry, cvv, name }
 * Returns: { flowpay_payment_id, flowpay_signature }
 */
router.use(authenticateVendor).post('/process', (req, res) => {
  const { order_id } = req.body;

  const payment_id = generatePaymentId();
  const signature = generateSignature(
    order_id,
    payment_id,
    req.vendor.flowpay_secret
  );

  db.run(
    `UPDATE gateway_transactions
     SET payment_id=?, status='completed'
     WHERE order_id=? AND flowpay_id=?`,
    [payment_id, order_id, req.vendor.flowpay_id]
  );

  return res.json({
    payment_id,
    order_id,
    signature,
  });
});


/**
 * POST /api/flowpay/verify
 * 
 * Verify mock payment signature
 * Body: { orderId, paymentId, signature }
 */
router.use(authenticateVendor).post('/verify', async (req, res) => {
  try {
    const { order_id, payment_id, signature } = req.body;

    if (!order_id || !payment_id || !signature) {
      return res.status(400).json({ error: 'Missing verification details.' });
    }

    const expectedSignature = generateSignature(
      order_id,
      payment_id,
      req.vendor.flowpay_secret
    );

    // console.log("EXPECTED:", expectedSignature);
    // console.log("RECEIVED:", signature);

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature.' });
    }

    return res.status(200).json({ valid: true });

  } catch (error) {
    console.error('[Flowpay] Verify error:', error);
    return res.status(500).json({ error: 'Verification failed.' });
  }
});

/**
 * GET /api/flowpay/status/:paymentId
 * 
 * Check payment status
 */
router.use(authenticateVendor).get('/status/:paymentId', (req, res) => {
  const { paymentId } = req.params;

  db.get(
    `SELECT status FROM gateway_transactions 
    WHERE payment_id=? AND flowpay_id=?`,
    [paymentId, req.vendor.flowpay_id],
    (err, row) => {
      if (!row) return res.status(404).json({ error: 'Not found' });

      return res.json({
        payment_id: paymentId,
        status: row.status,
        created_at: row.created_at,
      });
    }
  );
});

module.exports = router;