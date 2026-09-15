// Observations — C7 human sensor network (closed loop).
// People observe → twin updates (twin view carries recent observations) →
// escalate to task (execute) → task lifecycle measures → twin reflects it.
// Reporters see their feed; escalation links the measuring task back.
const express = require('express');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

module.exports = (io) => {
  const router = express.Router();

  // POST /api/observations {business_id?, metric, value?, note?, region?,
  //   source?, device?, geography?, evidence?, confidence?} — anti-fraud fields.
  router.post('/', authenticateToken, (req, res) => {
    const { business_id, metric, value, note, region,
      source, device, geography, evidence, confidence } = req.body;
    if (!metric || typeof metric !== 'string') {
      return res.status(400).json({ error: 'metric is required' });
    }
    const conf = confidence === undefined || confidence === null ? null : Number(confidence);
    if (conf !== null && !(conf >= 0 && conf <= 1)) {
      return res.status(400).json({ error: 'confidence must be between 0 and 1' });
    }
    const jsonCol = (v) => (v === undefined || v === null ? '{}'
      : (typeof v === 'string' ? v : JSON.stringify(v)));
    const insert = () => db.run(`INSERT INTO observations
        (reporter_id, business_id, metric, value, note, region,
         source, device, geography, evidence, confidence)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, business_id || null, metric,
       value === undefined || value === null ? null : Number(value),
       note || '', region || '', source || '', device || '',
       jsonCol(geography), jsonCol(evidence), conf],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get('SELECT * FROM observations WHERE id = ?', [this.lastID], (e2, row) => {
          if (e2) return res.status(500).json({ error: e2.message });
          if (io) io.emit('observationReported', row);
          res.status(201).json(row);
        });
      });
    if (!business_id) return insert();
    db.get('SELECT id FROM businesses WHERE id = ?', [business_id], (err, b) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!b) return res.status(404).json({ error: 'Business not found' });
      insert();
    });
  });

  // GET /api/observations?business=&metric=&region=&mine=
  router.get('/', optionalAuthenticateToken, (req, res) => {
    const { business, metric, region, mine } = req.query;
    let q = 'SELECT * FROM observations WHERE 1=1';
    const p = [];
    if (business) { q += ' AND business_id = ?'; p.push(Number(business)); }
    if (metric) { q += ' AND metric = ?'; p.push(metric); }
    if (region) { q += ' AND region = ?'; p.push(region); }
    if (mine && req.user) { q += ' AND reporter_id = ?'; p.push(req.user.id); }
    q += ' ORDER BY created_at DESC LIMIT 100';
    db.all(q, p, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
  });

  // POST /api/observations/:id/escalate {objective?} — reporter turns it
  // into a task (execute); the task measures what the observation flagged.
  router.post('/:id/escalate', authenticateToken, (req, res) => {
    db.get('SELECT * FROM observations WHERE id = ?', [req.params.id], (err, o) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!o) return res.status(404).json({ error: 'Observation not found' });
      if (o.reporter_id !== req.user.id) {
        return res.status(403).json({ error: 'Only the reporter can escalate.' });
      }
      if (o.escalated_task_id) {
        return res.status(400).json({ error: 'Already escalated.' });
      }
      const objective = (req.body && req.body.objective)
        || `Investigate ${o.metric}${o.business_id ? ` for business #${o.business_id}` : ''}`;
      db.run(`INSERT INTO tasks (objective, budget, inputs, poster_id, direction)
          VALUES (?, 0, ?, ?, 'need')`,
        [objective, JSON.stringify({ observation_id: o.id, metric: o.metric,
          value: o.value, note: o.note, region: o.region }), req.user.id],
        function (iErr) {
          if (iErr) return res.status(500).json({ error: iErr.message });
          const tid = this.lastID;
          db.run('UPDATE observations SET escalated_task_id = ? WHERE id = ?', [tid, o.id], (uErr) => {
            if (uErr) return res.status(500).json({ error: uErr.message });
            if (io) io.emit('observationEscalated', { id: o.id, task_id: tid });
            res.status(201).json({ observation_id: o.id, task_id: tid });
          });
        });
    });
  });

  // POST /api/observations/:id/confirm — independent confirmation.
  // Anti-fraud: no self-confirm, no double-confirm (UNIQUE pair).
  router.post('/:id/confirm', authenticateToken, (req, res) => {
    db.get('SELECT * FROM observations WHERE id = ?', [req.params.id], (err, o) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!o) return res.status(404).json({ error: 'Observation not found' });
      if (o.reporter_id === req.user.id) {
        return res.status(400).json({ error: 'Cannot confirm your own observation.' });
      }
      db.run('INSERT INTO observation_confirmations (observation_id, confirmer_id) VALUES (?, ?)',
        [o.id, req.user.id], (iErr) => {
          if (iErr) {
            if (String(iErr.message).includes('UNIQUE constraint failed')) {
              return res.status(409).json({ error: 'Already confirmed by you.' });
            }
            return res.status(500).json({ error: iErr.message });
          }
          db.run('UPDATE observations SET confirmation_count = confirmation_count + 1 WHERE id = ?',
            [o.id], (uErr) => {
              if (uErr) return res.status(500).json({ error: uErr.message });
              res.json({ id: o.id, confirmation_count: (o.confirmation_count || 0) + 1 });
            });
        });
    });
  });

  return router;
};
