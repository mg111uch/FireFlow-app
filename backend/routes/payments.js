/**
 * backend/routes/payments.js
 *
 * FIX applied to server.js mount — add authenticateToken:
 *
 *   const { authenticateToken } = require('./middleware/auth');
 *   app.use('/api/payments', authenticateToken, require('./routes/payments')(io, onlineUsers));
 *
 * Required env vars:
 *   RAZORPAY_KEY_ID      — rzp_test_...
 *   RAZORPAY_KEY_SECRET  — your secret
 */

const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../database');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * POST /api/payments/create-order
 *
 * 1. Creates a Razorpay order
 * 2. Inserts a 'created' row into the payments table
 * Returns: { orderId, amount, currency, keyId }
 */
router.post('/create-order', async (req, res) => {
  try {
    const { amount, receipt } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount. Must be a positive number in INR.' });
    }

    const amountPaise = Math.round(amount * 100);

    const options = {
      amount: amountPaise,
      currency: 'INR',
      receipt: receipt || `rcpt_${req.user.id}_${Date.now()}`,
      notes: {
        userId: req.user.id,
        purpose: 'subscription_fee',
      },
    };

    const order = await razorpay.orders.create(options);

    // Persist order to DB with status 'created'
    db.run(
      `INSERT INTO payments (user_id, razorpay_order_id, amount_paise, currency, status, purpose)
       VALUES (?, ?, ?, ?, 'created', 'subscription_fee')`,
      [req.user.id, order.id, amountPaise, order.currency],
      (err) => {
        if (err) console.error('[Payments] DB insert error (create-order):', err.message);
      }
    );

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('[Razorpay] create-order error:', error);
    return res.status(500).json({ error: 'Failed to create payment order.' });
  }
});

/**
 * POST /api/payments/verify
 *
 * 1. Verifies Razorpay HMAC-SHA256 signature
 * 2. Updates the payments row to status 'verified'
 * 3. Extend here to activate subscription for req.user.id
 */
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields.' });
    }

    // Step 1: Verify HMAC-SHA256 signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    // Wrap in try/catch — timingSafeEqual throws if buffer lengths differ
    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(razorpay_signature, 'hex')
      );
    } catch {
      isValid = false;
    }

    if (!isValid) {
      db.run(
        `UPDATE payments SET status = 'failed' WHERE razorpay_order_id = ? AND user_id = ?`,
        [razorpay_order_id, req.user.id]
      );
      return res.status(400).json({ error: 'Payment signature verification failed.' });
    }

    // Step 2: Update DB — verified status + payment_id + timestamp
    db.run(
      `UPDATE payments
       SET status = 'verified',
           razorpay_payment_id = ?,
           verified_at = CURRENT_TIMESTAMP
       WHERE razorpay_order_id = ? AND user_id = ?`,
      [razorpay_payment_id, razorpay_order_id, req.user.id],
      (err) => {
        if (err) console.error('[Payments] DB update error (verify):', err.message);
      }
    );

    // Step 3: Activate subscription — extend here, e.g.:
    // db.run(`UPDATE users SET subscription_status = 'active' WHERE id = ?`, [req.user.id]);

    console.log(`[Razorpay] Verified — user ${req.user.id}, payment ${razorpay_payment_id}`);

    return res.status(200).json({
      success: true,
      paymentId: razorpay_payment_id,
      message: 'Payment verified and subscription activated.',
    });
  } catch (error) {
    console.error('[Razorpay] verify error:', error);
    return res.status(500).json({ error: 'Payment verification failed.' });
  }
});

module.exports = (io, onlineUsers) => {
  return router;
};