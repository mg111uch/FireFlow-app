// Market signals — D4 future-industry inputs (trends, demand, policy,
// tech costs). Reported by anyone, read by all. Freshness is explicit:
// each type goes stale after 7 days without a report (weekly refresh cadence).
// Signals feed the opportunity engine via the market_intel agent duty.
const express = require('express');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

const TYPES = ['trend', 'demand', 'policy', 'tech_cost'];
const STALE_AFTER_DAYS = 7;

module.exports = (io) => {
  const router = express.Router();

  // POST /api/signals {signal_type, title, detail?, region?}
  router.post('/', authenticateToken, (req, res) => {
    const { signal_type, title, detail, region } = req.body;
    if (!TYPES.includes(signal_type)) {
      return res.status(400).json({ error: `signal_type must be one of ${TYPES.join(', ')}` });
    }
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'title is required' });
    }
    db.run('INSERT INTO market_signals (signal_type, title, detail, region, reported_by) VALUES (?, ?, ?, ?, ?)',
      [signal_type, title, detail || '', region || '', req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get('SELECT * FROM market_signals WHERE id = ?', [this.lastID], (e2, row) => {
          if (e2) return res.status(500).json({ error: e2.message });
          if (io) io.emit('signalReported', row);
          res.status(201).json(row);
        });
      });
  });

  // GET /api/signals?signal_type=&region=&since= (ISO date)
  router.get('/', optionalAuthenticateToken, (req, res) => {
    const { signal_type, region, since } = req.query;
    let q = 'SELECT * FROM market_signals WHERE 1=1';
    const p = [];
    if (signal_type) { q += ' AND signal_type = ?'; p.push(signal_type); }
    if (region) { q += ' AND region = ?'; p.push(region); }
    if (since) { q += ' AND created_at >= ?'; p.push(since); }
    q += ' ORDER BY created_at DESC LIMIT 100';
    db.all(q, p, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
  });

  // GET /api/signals/freshness — latest per type + stale flag (BEFORE /:id).
  router.get('/freshness', optionalAuthenticateToken, (req, res) => {
    db.all(`SELECT signal_type, MAX(created_at) AS latest, COUNT(*) AS n
        FROM market_signals GROUP BY signal_type`, [], (err, rows) => {
          if (err) return res.status(500).json({ error: err.message });
          const byType = Object.fromEntries((rows || []).map((r) => [r.signal_type, r]));
          const out = TYPES.map((t) => {
            const r = byType[t];
            const ageDays = r ? (Date.now() - new Date(r.latest).getTime()) / 86400000 : Infinity;
            return { signal_type: t, latest: (r && r.latest) || null,
              count: (r && r.n) || 0, stale: ageDays > STALE_AFTER_DAYS };
          });
          res.json({ stale_after_days: STALE_AFTER_DAYS, types: out });
        });
  });

  router.get('/:id', optionalAuthenticateToken, (req, res) => {
    db.get('SELECT * FROM market_signals WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Signal not found' });
      res.json(row);
    });
  });

  return router;
};

module.exports.SIGNAL_TYPES = TYPES;
