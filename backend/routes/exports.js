// Export orders — domestic capability to global orders.
// Lifecycle: draft → quoted → confirmed → shipped → delivered (cancelled
// anytime with reason). Confirm is compliance-gated (required docs, default
// IEC, live in the business profile). Delivery posts the policy incentive
// (default 2%) as platform ledger income. Policy (incentive bps, required
// docs, all changeable at runtime) lives in fee_config via lib/fees.
const express = require('express');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const { getExportPolicy } = require('../lib/fees');

function itemsOf(row) {
  try { return row.items ? JSON.parse(row.items) : []; } catch { return []; }
}

function totals(row) {
  const items = itemsOf(row);
  const total = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
  return { items, total, currency: row.currency,
    inr_estimate: row.forex_rate ? Math.round(total * row.forex_rate * 100) / 100 : null };
}

function asJson(row) {
  if (!row) return row;
  return { ...row, ...totals(row) };
}

module.exports = (io) => {
  const router = express.Router();

  const load = (id, userId, res, cb) => {
    db.get('SELECT * FROM export_orders WHERE id = ?', [id], (err, o) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!o) return res.status(404).json({ error: 'Export order not found' });
      if (o.owner_user_id !== userId) return res.status(403).json({ error: 'Not your order.' });
      cb(o);
    });
  };

  // POST /api/exports {business_id, buyer_country, items, currency?, incoterm?}
  router.post('/', authenticateToken, (req, res) => {
    const { business_id, buyer_country, items, currency, incoterm } = req.body;
    if (!buyer_country || typeof buyer_country !== 'string') {
      return res.status(400).json({ error: 'buyer_country is required' });
    }
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'items array is required' });
    }
    for (const it of items) {
      if (!it.desc || !Number.isFinite(Number(it.qty)) || !Number.isFinite(Number(it.rate))) {
        return res.status(400).json({ error: 'each item needs desc, qty, rate' });
      }
    }
    if (incoterm && !['EXW', 'FOB', 'CIF'].includes(incoterm)) {
      return res.status(400).json({ error: 'bad incoterm' });
    }
    db.get('SELECT * FROM businesses WHERE id = ?', [business_id], (err, b) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!b) return res.status(404).json({ error: 'Business not found' });
      if (b.owner_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Not the business owner.' });
      }
      db.run(`INSERT INTO export_orders (business_id, owner_user_id, buyer_country,
          items, currency, incoterm) VALUES (?, ?, ?, ?, ?, ?)`,
        [business_id, req.user.id, buyer_country, JSON.stringify(items),
         currency || 'USD', incoterm || 'FOB'], function (iErr) {
          if (iErr) return res.status(500).json({ error: iErr.message });
          db.get('SELECT * FROM export_orders WHERE id = ?', [this.lastID], (e2, row) => {
            if (e2) return res.status(500).json({ error: e2.message });
            if (io) io.emit('exportUpdated', asJson(row));
            res.status(201).json(asJson(row));
          });
        });
    });
  });

  // GET /api/exports?business=&status=
  router.get('/', optionalAuthenticateToken, (req, res) => {
    const { business, status } = req.query;
    let q = 'SELECT * FROM export_orders WHERE 1=1';
    const p = [];
    if (business) { q += ' AND business_id = ?'; p.push(Number(business)); }
    if (status) { q += ' AND status = ?'; p.push(status); }
    q += ' ORDER BY created_at DESC LIMIT 100';
    db.all(q, p, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json((rows || []).map(asJson));
    });
  });

  router.get('/:id', optionalAuthenticateToken, (req, res) => {
    db.get('SELECT * FROM export_orders WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Export order not found' });
      res.json(asJson(row));
    });
  });

  const move = (from, extraCheck) => (req, res) => {
    load(req.params.id, req.user.id, res, (o) => {
      if (o.status !== from) return res.status(400).json({ error: `Order must be ${from}` });
      if (extraCheck) return extraCheck(o, req, res);
      db.run('UPDATE export_orders SET status = ? WHERE id = ?',
        [req._to, o.id], (uErr) => {
          if (uErr) return res.status(500).json({ error: uErr.message });
          if (io) io.emit('exportUpdated', { id: o.id, status: req._to });
          res.json({ id: o.id, status: req._to });
        });
    });
  };

  const setTo = (to) => (req, res, next) => { req._to = to; next(); };

  // draft → quoted (owner locks the quote; forex_rate may be set here).
  router.post('/:id/quote', authenticateToken, setTo('quoted'), (req, res) => {
    load(req.params.id, req.user.id, res, (o) => {
      if (o.status !== 'draft') return res.status(400).json({ error: 'Order must be draft' });
      const fx = req.body.forex_rate !== undefined ? Number(req.body.forex_rate) : o.forex_rate;
      if (req.body.forex_rate !== undefined && (!Number.isFinite(fx) || fx < 0)) {
        return res.status(400).json({ error: 'forex_rate must be a number >= 0' });
      }
      db.run('UPDATE export_orders SET status = ?, forex_rate = ? WHERE id = ?',
        ['quoted', fx || 0, o.id], (uErr) => {
          if (uErr) return res.status(500).json({ error: uErr.message });
          if (io) io.emit('exportUpdated', { id: o.id, status: 'quoted' });
          res.json({ id: o.id, status: 'quoted' });
        });
    });
  });

  // quoted → confirmed: compliance gate (required docs present on profile).
  router.post('/:id/confirm', authenticateToken, (req, res) => {
    load(req.params.id, req.user.id, res, (o) => {
      if (o.status !== 'quoted') return res.status(400).json({ error: 'Order must be quoted' });
      getExportPolicy((err, pol) => {
        if (err) return res.status(500).json({ error: err.message });
        db.get('SELECT compliance_docs FROM businesses WHERE id = ?', [o.business_id], (e2, b) => {
          if (e2) return res.status(500).json({ error: e2.message });
          let docs = [];
          try { docs = b && b.compliance_docs ? JSON.parse(b.compliance_docs) : []; } catch { docs = []; }
          const missing = pol.required_docs.filter((d) => !docs.includes(d));
          if (missing.length) {
            return res.status(400).json({ error: `missing compliance docs: ${missing.join(', ')}` });
          }
          db.run("UPDATE export_orders SET status = 'confirmed' WHERE id = ?", [o.id], (uErr) => {
            if (uErr) return res.status(500).json({ error: uErr.message });
            if (io) io.emit('exportUpdated', { id: o.id, status: 'confirmed' });
            res.json({ id: o.id, status: 'confirmed' });
          });
        });
      });
    });
  });

  router.post('/:id/ship', authenticateToken, setTo('shipped'), move('confirmed'));
  router.post('/:id/cancel', authenticateToken, (req, res) => {
    load(req.params.id, req.user.id, res, (o) => {
      if (['delivered', 'cancelled'].includes(o.status)) {
        return res.status(400).json({ error: 'Order already closed' });
      }
      db.run("UPDATE export_orders SET status = 'cancelled' WHERE id = ?", [o.id], (uErr) => {
        if (uErr) return res.status(500).json({ error: uErr.message });
        if (io) io.emit('exportUpdated', { id: o.id, status: 'cancelled' });
        res.json({ id: o.id, status: 'cancelled' });
      });
    });
  });

  // shipped → delivered: posts the policy incentive to the ledger.
  router.post('/:id/deliver', authenticateToken, (req, res) => {
    load(req.params.id, req.user.id, res, (o) => {
      if (o.status !== 'shipped') return res.status(400).json({ error: 'Order must be shipped' });
      getExportPolicy((err, pol) => {
        if (err) return res.status(500).json({ error: err.message });
        const { total } = totals(o);
        const inr = Math.round(total * (o.forex_rate || 0) * 100);
        const incentive = Math.round(inr * pol.incentive_bps / 10000);
        const finish = (inc) => db.run("UPDATE export_orders SET status = 'delivered' WHERE id = ?",
          [o.id], (uErr) => {
            if (uErr) return res.status(500).json({ error: uErr.message });
            if (io) io.emit('exportUpdated', { id: o.id, status: 'delivered' });
            res.json({ id: o.id, status: 'delivered', incentive_paise: inc });
          });
        if (!incentive) return finish(0);
        const { recordPayment } = require('../lib/ledger');
        recordPayment({ amountPaise: incentive, fromUser: null, toUser: o.owner_user_id,
          refType: 'export', refId: o.id, memo: 'export incentive', by: req.user.id },
          (lErr) => {
            if (lErr) return res.status(500).json({ error: lErr.message });
            finish(incentive);
          });
      });
    });
  });

  return router;
};
