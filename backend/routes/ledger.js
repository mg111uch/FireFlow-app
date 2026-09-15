// Ledger routes — A7 single book. Read-only list + propose/approve.
// Propose: human JWT or agent key (agents propose, humans approve).
// Approve: human JWT only.
const express = require('express');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const { authenticateAgentApiKey } = require('../middleware/agentAuth');
const { stage, approve } = require('../lib/ledger');
const { getFees, setFee, DEFAULTS } = require('../lib/fees');

function identifyAny(req, res, next) {
  if (req.headers['authorization']) {
    req.callerVia = 'user';
    return authenticateToken(req, res, next);
  }
  if (req.headers['x-agent-api-key']) {
    req.callerVia = 'agent';
    return authenticateAgentApiKey(req, res, next);
  }
  return res.status(401).json({ error: 'Authentication required.' });
}

function callerId(req) {
  if (req.user && req.user.id !== undefined) return req.user.id;
  if (req.agent && req.agent.userId !== undefined) return req.agent.userId;
  return null;
}

module.exports = (io) => {
  const router = express.Router();

  // GET /api/ledger?entry_type=&ref_type=&ref_id=&user=&limit=
  router.get('/', optionalAuthenticateToken, (req, res) => {
    const { entry_type, ref_type, ref_id, user, limit } = req.query;
    let q = 'SELECT * FROM ledger WHERE 1=1';
    const p = [];
    if (entry_type) { q += ' AND entry_type = ?'; p.push(entry_type); }
    if (ref_type) { q += ' AND ref_type = ?'; p.push(ref_type); }
    if (ref_id) { q += ' AND ref_id = ?'; p.push(Number(ref_id)); }
    if (user) { q += ' AND (from_user = ? OR to_user = ?)'; p.push(Number(user), Number(user)); }
    q += ' ORDER BY id DESC LIMIT ?';
    p.push(Math.min(Number(limit) || 100, 500));
    db.all(q, p, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
  });

  // POST /api/ledger/propose {to_user, amount_rupees?, amount_paise?, ref_type?, ref_id?, memo?}
  router.post('/propose', identifyAny, (req, res) => {
    const { to_user, amount_rupees, amount_paise, ref_type, ref_id, memo } = req.body;
    if (!to_user) return res.status(400).json({ error: 'to_user is required' });
    const paise = amount_paise !== undefined ? Math.round(Number(amount_paise))
      : Math.round((Number(amount_rupees) || 0) * 100);
    if (!Number.isFinite(paise) || paise <= 0) {
      return res.status(400).json({ error: 'positive amount required' });
    }
    // Supervised spending (A8): agent keys with a cap cannot propose above it,
    // counting pending (unapproved) staged proposals against the same cap.
    const enforceCap = (cb) => {
      if (req.callerVia !== 'agent') return cb();
      const limit = req.agent.spendLimitPaise;
      if (limit === null || limit === undefined) return cb();
      if (paise > limit) return res.status(403).json({ error: 'Proposal exceeds key spend limit.' });
      db.get(`SELECT COALESCE(SUM(amount_paise), 0) AS s FROM ledger
          WHERE entry_type = 'staged' AND approved_by IS NULL
          AND created_via = 'agent' AND created_by = ?`, [callerId(req)], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if ((row.s || 0) + paise > limit) {
              return res.status(403).json({ error: 'Key spend limit exhausted by pending proposals.' });
            }
            cb();
          });
    };
    enforceCap(() =>
      stage({ amountPaise: paise, fromUser: callerId(req), toUser: Number(to_user),
        refType: ref_type || '', refId: ref_id ?? null, memo: memo || '',
        by: callerId(req), via: req.callerVia }, (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          if (io) io.emit('ledgerStaged', row);
          res.status(201).json(row);
        })
    );
  });

  // POST /api/ledger/:id/approve — human JWT only.
  router.post('/:id/approve', authenticateToken, (req, res) => {
    approve(req.params.id, req.user.id, (err) => {
      if (err) {
        if (err.message === 'NOTFOUND') return res.status(404).json({ error: 'Staged entry not found' });
        if (err.message === 'NOTSTAGED') return res.status(400).json({ error: 'Entry is not staged' });
        if (err.message === 'ALREADY') return res.status(400).json({ error: 'Already approved' });
        return res.status(500).json({ error: err.message });
      }
      if (io) io.emit('ledgerApproved', { staged_id: Number(req.params.id), by: req.user.id });
      db.all('SELECT * FROM ledger WHERE id > ? ORDER BY id ASC', [Number(req.params.id)], (e2, rows) => {
        if (e2) return res.status(500).json({ error: e2.message });
        res.json({ staged_id: Number(req.params.id), approved_by: req.user.id, entries: rows || [] });
      });
    });
  });

  // GET /api/ledger/revenue — D1 platform revenue (rake rows only).
  router.get('/revenue', optionalAuthenticateToken, (req, res) => {
    db.get(`SELECT COALESCE(SUM(amount_paise), 0) AS rake_paise, COUNT(*) AS n
        FROM ledger WHERE memo LIKE '%marketplace rake%'`, [], (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json(row);
        });
  });

  // GET /api/ledger/fees — current rake policy (defaults live in lib/fees).
  router.get('/fees', optionalAuthenticateToken, (req, res) => {
    getFees((err, fees) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ...DEFAULTS, ...Object.fromEntries(
        Object.entries(fees).map(([k, v]) => [k, String(v)])) });
    });
  });

  // PUT /api/ledger/fees {task_rake_bps?, export_incentive_bps?, export_required_docs?} — admin only.
  router.put('/fees', authenticateToken, (req, res) => {
    if (req.user.id !== 1) return res.status(403).json({ error: 'Only admin can set fees.' });
    const { task_rake_bps, export_incentive_bps, export_required_docs } = req.body;
    const updates = {};
    if (task_rake_bps !== undefined) {
      const bps = Number(task_rake_bps);
      if (!Number.isFinite(bps) || bps < 0 || bps > 10000) {
        return res.status(400).json({ error: 'task_rake_bps must be 0-10000' });
      }
      updates.task_rake_bps = bps;
    }
    if (export_incentive_bps !== undefined) {
      const bps = Number(export_incentive_bps);
      if (!Number.isFinite(bps) || bps < 0 || bps > 10000) {
        return res.status(400).json({ error: 'export_incentive_bps must be 0-10000' });
      }
      updates.export_incentive_bps = bps;
    }
    if (export_required_docs !== undefined) {
      if (!Array.isArray(export_required_docs)) {
        return res.status(400).json({ error: 'export_required_docs must be an array' });
      }
      updates.export_required_docs = JSON.stringify(export_required_docs);
    }
    const keys = Object.keys(updates);
    if (!keys.length) return res.status(400).json({ error: 'nothing to update' });
    const run = (i) => {
      if (i >= keys.length) return res.json(updates);
      setFee(keys[i], updates[keys[i]], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        run(i + 1);
      });
    };
    run(0);
  });

  return router;
};
