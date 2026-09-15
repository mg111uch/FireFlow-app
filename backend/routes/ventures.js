// Ventures — research commercialization (lab → pilot → product).
// C5 pattern: each gate demands evidence, no skips, no backward moves.
// Kills need a reason (D2 rule). Graduated ventures are the rung funders.
const express = require('express');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

const ORDER = ['lab', 'pilot', 'product'];

function asJson(row) {
  if (!row) return row;
  if (typeof row.stage_data === 'string') {
    try { row.stage_data = row.stage_data ? JSON.parse(row.stage_data) : {}; }
    catch { row.stage_data = {}; }
  }
  return row;
}

// Returns error string or null. Evidence accumulates across advances.
function gateError(from, to, data, body) {
  if (to === 'killed') {
    if (!body.reason || typeof body.reason !== 'string') return 'kills need a reason';
    if (from === 'graduated' || from === 'killed') return `already ${from}`;
    return null;
  }
  if (from === 'graduated' || from === 'killed') return `already ${from}`;
  const next = from === 'product' ? 'graduated' : ORDER[ORDER.indexOf(from) + 1];
  if (to !== next) return `must advance one rung (${from} -> ${next || 'graduated/killed'})`;
  if (to === 'pilot' && !(data.hypothesis || body.hypothesis)) {
    return 'pilot needs a hypothesis';
  }
  if (to === 'product' && !(data.trial || body.trial)) {
    return 'product needs trial metrics';
  }
  if (to === 'graduated') {
    const rev = data.revenue ?? body.revenue;
    if (rev === undefined || rev === null || Number(rev) <= 0) {
      return 'graduation needs revenue > 0';
    }
  }
  return null;
}

module.exports = (io) => {
  const router = express.Router();

  // POST /api/ventures {title, description?, business_id?}
  router.post('/', authenticateToken, (req, res) => {
    const { title, description, business_id } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'title is required' });
    }
    const insert = () => db.run(`INSERT INTO ventures
        (owner_user_id, business_id, title, description) VALUES (?, ?, ?, ?)`,
      [req.user.id, business_id || null, title, description || ''],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get('SELECT * FROM ventures WHERE id = ?', [this.lastID], (e2, row) => {
          if (e2) return res.status(500).json({ error: e2.message });
          if (io) io.emit('ventureUpdated', asJson(row));
          res.status(201).json(asJson(row));
        });
      });
    if (!business_id) return insert();
    db.get('SELECT id, owner_user_id FROM businesses WHERE id = ?', [business_id], (err, b) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!b) return res.status(404).json({ error: 'Business not found' });
      if (b.owner_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Not the business owner.' });
      }
      insert();
    });
  });

  // GET /api/ventures?stage=&business=&mine=
  router.get('/', optionalAuthenticateToken, (req, res) => {
    const { stage, business, mine } = req.query;
    let q = 'SELECT * FROM ventures WHERE 1=1';
    const p = [];
    if (stage) { q += ' AND stage = ?'; p.push(stage); }
    if (business) { q += ' AND business_id = ?'; p.push(Number(business)); }
    if (mine && req.user) { q += ' AND owner_user_id = ?'; p.push(req.user.id); }
    q += ' ORDER BY created_at DESC LIMIT 100';
    db.all(q, p, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json((rows || []).map(asJson));
    });
  });

  router.get('/:id', optionalAuthenticateToken, (req, res) => {
    db.get('SELECT * FROM ventures WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Venture not found' });
      res.json(asJson(row));
    });
  });

  // POST /api/ventures/:id/advance {to, evidence?|hypothesis|trial|revenue, reason?}
  router.post('/:id/advance', authenticateToken, (req, res) => {
    const { to, reason } = req.body;
    const evidence = req.body.evidence || req.body;
    db.get('SELECT * FROM ventures WHERE id = ?', [req.params.id], (err, v) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!v) return res.status(404).json({ error: 'Venture not found' });
      if (v.owner_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Only the owner advances.' });
      }
      let data = {};
      try { data = v.stage_data ? JSON.parse(v.stage_data) : {}; } catch { data = {}; }
      // Merge new evidence keys (hypothesis/trial/revenue/anything).
      for (const [k, val] of Object.entries(evidence)) {
        if (['to', 'reason'].includes(k)) continue;
        data[k] = val;
      }
      const gErr = gateError(v.stage, to, data, { ...evidence, reason });
      if (gErr) return res.status(400).json({ error: gErr });
      const killReason = to === 'killed' ? reason : '';
      // Normalizes 'graduated' past product (ORDER holds lab/pilot/product).
      const next = to === 'graduated' ? 'graduated' : to;
      db.run(`UPDATE ventures SET stage = ?, stage_data = ?, kill_reason = ?,
          updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [next, JSON.stringify(data), killReason, v.id], (uErr) => {
          if (uErr) return res.status(500).json({ error: uErr.message });
          db.get('SELECT * FROM ventures WHERE id = ?', [v.id], (e2, row) => {
            if (e2) return res.status(500).json({ error: e2.message });
            if (io) io.emit('ventureUpdated', asJson(row));
            res.json(asJson(row));
          });
        });
    });
  });

  return router;
};
