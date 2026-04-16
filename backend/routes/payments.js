const express = require('express');
const axios = require('axios');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../database');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const router = express.Router();

router.post('/create-order', async (req, res) => {
  try {
    const { amount, gateway } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const amountPaise = Math.round(amount * 100);

    let order;

    if (gateway === 'flowpay') {
      const fpRes = await axios.post(
        `${process.env.FLOWPAY_BASE_URL}/create-order`,
        { amount },
        {
          headers: {
            'x-flowpay-id': process.env.FLOWPAY_ID,
            'x-flowpay-secret': process.env.FLOWPAY_SECRET,
          },
        }
      );

      order = {
        order_id: fpRes.data.order_id,
        amount: amountPaise,
        gateway: 'flowpay',
      };
    } 

    if (gateway === 'razorpay') {
      const rpRes = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `rcpt_${req.user.id}_${Date.now()}`,
      });

      order = {
        order_id: rpRes.id,
        amount: rpRes.amount,
        currency: rpRes.currency,
        gateway: 'razorpay',
      }
    }

    if (!order) return res.status(400).json({ error: 'Invalid gateway' });

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO payments (user_id, order_id, amount_paise, status, gateway)
        VALUES (?, ?, ?, 'created', ?)`,
        [req.user.id, order.order_id, order.amount, order.gateway],function(err) {
          if (err) {
            console.error("INSERT ERROR:", err);
            reject(err);
          } else {
            console.log("INSERT SUCCESS:", order.order_id);
            resolve();
          }
        }
      );
    });

    return res.json({
      order_id: order.order_id,
      amount: order.amount,
      gateway: order.gateway,
      key_id:
        order.gateway === 'razorpay'
          ? process.env.RAZORPAY_KEY_ID
          : 'flowpay_mock_key',
    });

  } catch (err) {
    console.error("CREATE ORDER ERROR:", err?.response?.data || err.message);
    return res.status(500).json({ error: 'Create order failed' });
  }
});

router.post('/process', async (req, res) => {
  const { order_id } = req.body;

  console.log("PROCESS INPUT:", order_id, req.user.id);

  const payment = await new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM payments WHERE order_id=?`,
      [order_id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  console.log("PAYMENT FOUND:", payment);

  if (!payment) {
    return res.status(400).json({ error: 'Payment not found' });
  }

  if (payment.gateway !== 'flowpay') {
    return res.status(400).json({ error: 'Wrong gateway' });
  }

  const fpRes = await axios.post(
    `${process.env.FLOWPAY_BASE_URL}/process`,
    { order_id },
    {
      headers: {
        'x-flowpay-id': process.env.FLOWPAY_ID,
        'x-flowpay-secret': process.env.FLOWPAY_SECRET,
      },
    }
  );

  const { payment_id, signature } = fpRes.data;

  await new Promise((resolve, reject) => {
    db.run(
      `UPDATE payments 
      SET payment_id = ?, status = 'processing', signature = ?
      WHERE order_id = ?`,
      [payment_id, signature, order_id],
      function (err) {
        if (err) {
          console.error("PROCESS UPDATE ERROR:", err);
          reject(err);
        } else {
          console.log("PROCESS UPDATE SUCCESS:", payment_id);
          resolve();
        }
      }
    );
  });

  return res.json(fpRes.data);
});

router.post('/verify', async (req, res) => {
  try {
    const { order_id, payment_id, signature } = req.body;

    console.log("VERIFY INPUT:", order_id, payment_id, signature);

    const payment = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM payments WHERE order_id = ?`,
        [order_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    // console.log("DB PAYMENT:", payment);

    if (!payment) {
      return res.status(400).json({ error: 'Payment not found' });
    }

    console.log("GATEWAY:", payment?.gateway);

    let isValid = false;

    if (payment.gateway === 'razorpay') {
      const expected = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(`${order_id}|${payment_id}`)
          .digest('hex');

      isValid = crypto.timingSafeEqual(
          Buffer.from(expected, 'hex'),
          Buffer.from(signature, 'hex')
        );
    }       

    if (payment.gateway === 'flowpay') {
      const fpRes = await axios.post(
        `${process.env.FLOWPAY_BASE_URL}/verify`,
        {
          order_id,
          payment_id,
          signature,
        },
        {
          headers: {
            'x-flowpay-id': process.env.FLOWPAY_ID,
            'x-flowpay-secret': process.env.FLOWPAY_SECRET,
          },
        }
      );

      isValid = fpRes.data.valid;
    }
    

    if (!isValid) {
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE payments SET status='failed' WHERE order_id=?`,[order_id], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE payments SET status='verified', payment_id=?, signature=?, verified_at=CURRENT_TIMESTAMP WHERE order_id=?`,
      [payment_id, signature, order_id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return res.json({ success: true });

  } catch {
    return res.status(500).json({ error: 'Verify failed' });
  }
});

module.exports = (io, onlineUsers) => {
  return router;
};