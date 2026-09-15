// Loop decisions — D2 tail (learn / scale / abandon / pivot).
// Every loop closes with a verdict AND a reason; kills need reasons.
// Subjects: reconciled opportunities, finished tasks (completed/paid).
// Decider must own the subject. One verdict per subject (latest wins:
// re-deciding supersedes, history kept).
const express = require('express');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

module.exports = (io) => {
  const router = express.Router();

  function ownSubject(type, id, userId) {
    return new Promise((resolve, reject) => {
      const t = type === 'opportunity' ? 'opportunities' : 'tasks';
      const ownerCol = type === 'opportunity' ? 'user_id' : 'poster_id';
      db.get(`SELECT *, '${type}' AS ttype FROM ${t} WHERE id = ?`, [id], (err, row) => {
        if (err) return reject(err);
        if (!row) return reject(Object.assign(new Error(`${type} not found`), { code: 404 }));
        if (row[ownerCol] !== userId) {
          return reject(Object.assign(new Error('Only the owner decides.'), { code: 403 }));
        }
        resolve(row);
      });
    });
  }

  // POST /api/decisions {subject_type, subject_id, verdict, reason}
  router.post('/', authenticateToken, (req, res) => {
    const { subject_type, subject_id, verdict, reason } = req.body;
    if (subject_type !== 'opportunity' && subject_type !== 'task') {
      return res.status(400).json({ error: "subject_type must be 'opportunity' or 'task'" });
    }
    if (!['scaled', 'abandoned', 'pivoted'].includes(verdict)) {
      return res.status(400).json({ error: "verdict must be 'scaled', 'abandoned' or 'pivoted'" });
    }
    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({ error: 'reason is required (loops die with a reason)' });
    }
    ownSubject(subject_type, subject_id, req.user.id).then((s) => {
      // Gate: decide only finished work.
      if (subject_type === 'opportunity' && s.pipeline !== 'reconciled') {
        return res.status(400).json({ error: 'Opportunity must be reconciled first' });
      }
      if (subject_type === 'task' && s.status !== 'completed' && s.status !== 'paid') {
        return res.status(400).json({ error: 'Task must be completed first' });
      }
      db.run(`INSERT INTO decisions (subject_type, subject_id, verdict, reason, decided_by)
          VALUES (?, ?, ?, ?, ?)`,
        [subject_type, subject_id, verdict, reason, req.user.id], function (err) {
          if (err) return res.status(500).json({ error: err.message });
          db.get('SELECT * FROM decisions WHERE id = ?', [this.lastID], (e2, row) => {
            if (e2) return res.status(500).json({ error: e2.message });
            if (io) io.emit('loopDecided', row);
            res.status(201).json(row);
          });
        });
    }).catch((e) => res.status(e.code || 500).json({ error: e.message }));
  });

  // GET /api/decisions?subject_type=&subject_id=&verdict=&mine=
  router.get('/', optionalAuthenticateToken, (req, res) => {
    const { subject_type, subject_id, verdict, mine } = req.query;
    let q = 'SELECT * FROM decisions WHERE 1=1';
    const p = [];
    if (subject_type) { q += ' AND subject_type = ?'; p.push(subject_type); }
    if (subject_id) { q += ' AND subject_id = ?'; p.push(Number(subject_id)); }
    if (verdict) { q += ' AND verdict = ?'; p.push(verdict); }
    if (mine && req.user) { q += ' AND decided_by = ?'; p.push(req.user.id); }
    q += ' ORDER BY created_at DESC LIMIT 100';
    db.all(q, p, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
  });

  return router;
};
