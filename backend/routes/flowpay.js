/**
 * backend/routes/flowpay.js
 * 
 * Mock payment gateway - Flowpay
 * Processes mock card payments and returns payment_id + signature
 * 
 * Toggle with USE_MOCK_GATEWAY=true in .env
 */

const express = require('express');
const crypto = require('crypto');
const db = require('../database');

const router = express.Router();

const USE_MOCK_GATEWAY = process.env.USE_MOCK_GATEWAY === 'true';

const MOCK_CARDS = {
  '4111111111111111': { name: 'Test Card', type: 'visa' },
  '5555555555554444': { name: 'Test Card', type: 'mastercard' },
};

function generatePaymentId() {
  return 'fp_' + crypto.randomBytes(12).toString('hex');
}

function generateSignature(orderId, paymentId) {
  const payload = `${orderId}|${paymentId}`;
  return crypto.createHmac('sha256', process.env.FLOWPAY_SECRET || 'flowpay_secret_key')
    .update(payload)
    .digest('hex');
}

/**
 * POST /api/flowpay/process
 * 
 * Process mock card payment
 * Body: { orderId, cardNumber, expiry, cvv, name }
 * Returns: { flowpay_payment_id, flowpay_signature }
 */
router.post('/process', async (req, res) => {
  try {
    const { orderId, cardNumber, expiry, cvv, name } = req.body;

    if (!orderId || !cardNumber || !expiry || !cvv || !name) {
      return res.status(400).json({ error: 'Missing payment details.' });
    }

    const cleanCard = cardNumber.replace(/\s/g, '');
    
    if (cleanCard.length < 13 || cleanCard.length > 19) {
      return res.status(400).json({ error: 'Invalid card number.' });
    }

    const expMonth = parseInt(expiry.split('/')[0]);
    const expYear = parseInt('20' + expiry.split('/')[1]);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      return res.status(400).json({ error: 'Card expired.' });
    }

    if (cvv.length < 3 || cvv.length > 4) {
      return res.status(400).json({ error: 'Invalid CVV.' });
    }

    const flowpay_payment_id = generatePaymentId();
    const flowpay_signature = generateSignature(orderId, flowpay_payment_id);

    db.run(
      `INSERT INTO flowpay_payments (user_id, order_id, card_last4, status, created_at)
       VALUES (?, ?, ?, 'completed', datetime('now'))`,
      [req.user.id, orderId, cleanCard.slice(-4)],
      (err) => {
        if (err) console.error('[Flowpay] DB insert error:', err.message);
      }
    );

    console.log(`[Flowpay] Payment processed - user: ${req.user.id}, order: ${orderId}, payment: ${flowpay_payment_id}`);

    return res.status(200).json({
      flowpay_payment_id,
      flowpay_signature,
      status: 'completed',
    });

  } catch (error) {
    console.error('[Flowpay] Process error:', error);
    return res.status(500).json({ error: 'Payment processing failed.' });
  }
});

/**
 * POST /api/flowpay/verify
 * 
 * Verify mock payment signature
 * Body: { orderId, paymentId, signature }
 */
router.post('/verify', async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ error: 'Missing verification details.' });
    }

    const expectedSignature = generateSignature(orderId, paymentId);

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
router.get('/status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    db.get(
      `SELECT status, created_at FROM flowpay_payments WHERE order_id = ? AND user_id = ?`,
      [paymentId, req.user.id],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Database error.' });
        }

        if (!row) {
          return res.status(404).json({ error: 'Payment not found.' });
        }

        return res.status(200).json({ status: row.status, created_at: row.created_at });
      }
    );

  } catch (error) {
    console.error('[Flowpay] Status error:', error);
    return res.status(500).json({ error: 'Status check failed.' });
  }
});

module.exports = router;