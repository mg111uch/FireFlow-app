// Tasks routes — marketplace (needs + B2 supply offers, gigs stay as-is).
// need: poster demands, worker supplies, poster pays worker.
// offer: poster supplies (spare capacity), claimer books, claimer pays poster.
// publish -> claim/book -> complete vs verification_rule -> pay (payer authorizes).
// Disputes resolve against this record; optional link to an opportunity.
const express = require('express');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const { requireWorkerVerified } = require('../lib/verification');
const { recordPayment, rupeesToPaise } = require('../lib/ledger');
const { getFees } = require('../lib/fees');

const OPEN = 'open';

function asJson(row) {
  if (!row) return row;
  if (typeof row.inputs === 'string') {
    try { row.inputs = row.inputs ? JSON.parse(row.inputs) : {}; } catch { row.inputs = {}; }
  } else if (row.inputs === null || row.inputs === undefined) row.inputs = {};
  if (typeof row.required_capabilities === 'string') {
    try { row.required_capabilities = row.required_capabilities ? JSON.parse(row.required_capabilities) : []; } catch { row.required_capabilities = []; }
  } else if (row.required_capabilities === null || row.required_capabilities === undefined) row.required_capabilities = [];
  return row;
}

module.exports = (io) => {
  const router = express.Router();

  router.post('/', authenticateToken, (req, res) => {
    const { objective, budget, deadline, inputs, required_capabilities,
      verification_rule, reward, risk_flag, opportunity_id, direction, category, parent_id,
      engagement_type, terms_ref } = req.body;
    if (!objective || typeof objective !== 'string') {
      return res.status(400).json({ error: 'objective is required' });
    }
    const dir = direction || 'need';
    if (dir !== 'need' && dir !== 'offer') {
      return res.status(400).json({ error: "direction must be 'need' or 'offer'" });
    }
    // B4: poster declares the engagement class; claiming accepts it.
    const eng = engagement_type || '';
    if (eng && !['gig', 'contract', 'trial'].includes(eng)) {
      return res.status(400).json({ error: "engagement_type must be 'gig', 'contract' or 'trial'" });
    }
    const create = (pid) => db.run(`INSERT INTO tasks (objective, budget, deadline, inputs,
        required_capabilities, verification_rule, reward, risk_flag,
        poster_id, opportunity_id, direction, category, parent_id,
        engagement_type, terms_ref) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [objective, Number(budget) || 0, deadline || '',
       JSON.stringify(inputs || {}), JSON.stringify(required_capabilities || []),
       verification_rule || '', Number(reward) || 0, risk_flag || '',
       req.user.id, opportunity_id || null, dir, category || '', pid || null,
       eng, typeof terms_ref === 'string' ? terms_ref : ''],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get('SELECT * FROM tasks WHERE id = ?', [this.lastID], (e2, row) => {
          if (e2) return res.status(500).json({ error: e2.message });
          if (io) io.emit('taskUpdated', asJson(row));
          res.status(201).json(asJson(row));
        });
      });
    if (!parent_id) return create(null);
    // Child task: parent must exist and belong to the same poster; one level only.
    db.get('SELECT * FROM tasks WHERE id = ?', [parent_id], (err, p) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!p) return res.status(404).json({ error: 'Parent task not found' });
      if (p.poster_id !== req.user.id) return res.status(403).json({ error: 'Not your project' });
      if (p.parent_id) return res.status(400).json({ error: 'No nested splits' });
      create(parent_id);
    });
  });

  router.get('/', optionalAuthenticateToken, (req, res) => {
    const { status, direction, category } = req.query;
    let q = 'SELECT * FROM tasks WHERE status = ?';
    const p = [status || OPEN];
    if (direction) { q += ' AND direction = ?'; p.push(direction); }
    if (category) { q += ' AND category = ?'; p.push(category); }
    q += ' ORDER BY created_at DESC';
    db.all(q, p, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json((rows || []).map(asJson));
    });
  });

  router.get('/:id', optionalAuthenticateToken, (req, res) => {
    db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Task not found' });
      db.all('SELECT id, status, worker_id FROM tasks WHERE parent_id = ?', [req.params.id], (e2, kids) => {
        if (e2) return res.status(500).json({ error: e2.message });
        const out = asJson(row);
        out.children = kids || [];
        out.progress = { done: (kids || []).filter((k) => k.status === 'completed' || k.status === 'paid').length, total: (kids || []).length };
        res.json(out);
      });
    });
  });

  function transition(id, userId, from, to, extra, res, opts = {}) {
    db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, t) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!t) return res.status(404).json({ error: 'Task not found' });
      if (t.status !== from) return res.status(400).json({ error: `Task must be ${from}` });
      if (opts.claimer && t.poster_id === userId) {
        return res.status(400).json({ error: 'Cannot claim your own task' });
      }
      if (opts.posterOnly && t.poster_id !== userId) {
        return res.status(403).json({ error: 'Only the poster can do this' });
      }
      if (opts.workerOnly && t.worker_id !== userId) {
        return res.status(403).json({ error: 'Only the booking party can do this' });
      }
      if (opts.party && t.poster_id !== userId && t.worker_id !== userId) {
        return res.status(403).json({ error: 'Not a party to this task' });
      }
      const sets = ['status = ?'];
      const params = [to];
      if (extra) for (const [k, v] of Object.entries(extra)) { sets.push(`${k} = ?`); params.push(v); }
      params.push(id);
      db.run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params, (uErr) => {
        if (uErr) return res.status(500).json({ error: uErr.message });
        db.get('SELECT * FROM tasks WHERE id = ?', [id], (e2, row) => {
          if (e2) return res.status(500).json({ error: e2.message });
          if (io) io.emit('taskUpdated', asJson(row));
          res.json(asJson(row));
        });
      });
    });
  }

  router.post('/:id/claim', authenticateToken, (req, res) =>
    transition(req.params.id, req.user.id, 'open', 'claimed', { worker_id: req.user.id }, res, { claimer: true }));

  router.post('/:id/complete', authenticateToken, (req, res) => {
    // Project gate: a parent completes only when all micro-tasks are done.
    db.all('SELECT id FROM tasks WHERE parent_id = ? AND status NOT IN (\'completed\', \'paid\')',
      [req.params.id], (err, open) => {
        if (err) return res.status(500).json({ error: err.message });
        if (open && open.length) {
          return res.status(400).json({ error: `${open.length} micro-task(s) still open` });
        }
        transition(req.params.id, req.user.id, 'claimed', 'completed', null, res, { party: true });
      });
  });

  // POST /:id/split {parts: [{objective, reward?, ...}]} — poster splits a
  // project into micro-tasks (one level). Children inherit direction/category.
  router.post('/:id/split', authenticateToken, (req, res) => {
    const { parts } = req.body;
    if (!Array.isArray(parts) || !parts.length || parts.length > 20) {
      return res.status(400).json({ error: 'parts must be an array of 1-20 micro-tasks' });
    }
    for (const p of parts) {
      if (!p || typeof p.objective !== 'string') {
        return res.status(400).json({ error: 'each part needs an objective' });
      }
    }
    db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, t) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!t) return res.status(404).json({ error: 'Task not found' });
      if (t.poster_id !== req.user.id) return res.status(403).json({ error: 'Only the poster can split' });
      if (t.status !== 'open') return res.status(400).json({ error: 'Only open projects split' });
      if (t.parent_id) return res.status(400).json({ error: 'No nested splits' });
      const made = [];
      const insertOne = (i) => {
        if (i >= parts.length) {
          if (io) io.emit('taskSplit', { parent_id: t.id, children: made.map((m) => m.id) });
          return res.status(201).json(made);
        }
        const p = parts[i];
        db.run(`INSERT INTO tasks (objective, budget, deadline, inputs, required_capabilities,
            verification_rule, reward, risk_flag, poster_id, opportunity_id,
            direction, category, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.objective, Number(p.budget) || 0, p.deadline || '',
           JSON.stringify(p.inputs || {}), JSON.stringify(p.required_capabilities || []),
           p.verification_rule || t.verification_rule || '', Number(p.reward) || 0,
           p.risk_flag || '', req.user.id, t.opportunity_id, t.direction, p.category || t.category || '',
           t.id],
          function (iErr) {
            if (iErr) return res.status(500).json({ error: iErr.message });
            db.get('SELECT * FROM tasks WHERE id = ?', [this.lastID], (e2, row) => {
              if (e2) return res.status(500).json({ error: e2.message });
              made.push(asJson(row));
              insertOne(i + 1);
            });
          });
      };
      insertOne(0);
    });
  });

  // Payout gate: payee must own a verified unit before first payout.
  // need → poster pays worker (poster authorizes); offer → claimer pays
  // poster (claimer authorizes). Ledger records before status flips.
  router.post('/:id/pay', authenticateToken, (req, res) => {
    db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, t) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!t) return res.status(404).json({ error: 'Task not found' });
      const isOffer = t.direction === 'offer';
      const payer = isOffer ? t.worker_id : t.poster_id;
      const payee = isOffer ? t.poster_id : t.worker_id;
      const auth = isOffer ? { workerOnly: true } : { posterOnly: true };
      if (isOffer && payer !== req.user.id) {
        return res.status(403).json({ error: 'Only the booking party can pay' });
      }
      requireWorkerVerified(payee, res, () =>
        getFees((fErr, fees) => {
          if (fErr) return res.status(500).json({ error: fErr.message });
          const gross = rupeesToPaise(t.reward);
          const rake = Math.round(gross * fees.task_rake_bps / 10000);
          recordPayment({ grossPaise: gross, rakePaise: rake, fromUser: payer,
            toUser: payee, refType: 'task', refId: t.id,
            memo: isOffer ? 'offer booking' : 'task payout', by: req.user.id }, (lErr) => {
              if (lErr) return res.status(500).json({ error: lErr.message });
              transition(req.params.id, req.user.id, 'completed', 'paid', null, res, auth);
            });
        }));
    });
  });

  router.post('/:id/cancel', authenticateToken, (req, res) =>
    transition(req.params.id, req.user.id, 'open', 'cancelled', null, res, { posterOnly: true }));

  return router;
};
