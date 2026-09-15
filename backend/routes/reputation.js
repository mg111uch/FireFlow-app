// Reputation routes — FireFlow A5 (ratings + capability attestations).
// Ratings: per completed task/contract, rater must be a party, subject the
// other party; portable via per-user aggregates. Attestations: one user
// vouches another's capability (test/trial + proof ref).
const express = require('express');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const { recordOutcome, scoresFor } = require('../lib/reliability');

module.exports = (io) => {
  const router = express.Router();

  // POST /api/reputation/ratings {task_id?, contract_id?, score 1-5, comment?}
  router.post('/ratings', authenticateToken, (req, res) => {
    const { task_id, contract_id, score, comment } = req.body;
    const s = Number(score);
    if (!Number.isInteger(s) || s < 1 || s > 5) {
      return res.status(400).json({ error: 'score must be an integer 1-5' });
    }
    if (!task_id && !contract_id) {
      return res.status(400).json({ error: 'task_id or contract_id is required' });
    }
    const checkTask = (cb) => {
      if (!task_id) return cb(null, null);
      db.get('SELECT * FROM tasks WHERE id = ?', [task_id], (err, t) => {
        if (err) return cb(err);
        if (!t) return cb(new Error('NOTASK'));
        if (t.status !== 'completed' && t.status !== 'paid') return cb(new Error('NOTDONE'));
        if (req.user.id !== t.poster_id && req.user.id !== t.worker_id) return cb(new Error('NOTPARTY'));
        cb(null, t);
      });
    };
    const checkContract = (cb) => {
      if (!contract_id) return cb(null, null);
      db.get('SELECT * FROM contracts WHERE id = ?', [contract_id], (err, c) => {
        if (err) return cb(err);
        if (!c) return cb(new Error('NOCONTRACT'));
        if (c.status !== 'released') return cb(new Error('NOTDONE'));
        if (req.user.id !== c.poster_id && req.user.id !== c.worker_id) return cb(new Error('NOTPARTY'));
        cb(null, c);
      });
    };
    checkTask((e1, t) => {
      if (e1) return ratingErr(e1, res);
      checkContract((e2, c) => {
        if (e2) return ratingErr(e2, res);
        const ref = t || c;
        const other = req.user.id === ref.poster_id ? ref.worker_id : ref.poster_id;
        if (!other) return res.status(400).json({ error: 'No counterparty to rate yet.' });
        if (other === req.user.id) return res.status(400).json({ error: 'Cannot rate yourself.' });
        const dupQ = task_id
          ? 'SELECT 1 FROM ratings WHERE rater_id = ? AND task_id = ? LIMIT 1'
          : 'SELECT 1 FROM ratings WHERE rater_id = ? AND contract_id = ? LIMIT 1';
        db.get(dupQ, [req.user.id, task_id || contract_id], (dErr, dup) => {
          if (dErr) return res.status(500).json({ error: dErr.message });
          if (dup) return res.status(400).json({ error: 'Already rated.' });
          db.run(`INSERT INTO ratings (subject_id, rater_id, task_id, contract_id, score, comment)
              VALUES (?, ?, ?, ?, ?, ?)`,
            [other, req.user.id, task_id || null, contract_id || null, s, comment || ''],
            function (iErr) {
              if (iErr) return res.status(500).json({ error: iErr.message });
              db.get('SELECT * FROM ratings WHERE id = ?', [this.lastID], (e3, row) => {
                if (e3) return res.status(500).json({ error: e3.message });
                if (io) io.emit('ratingAdded', row);
                res.status(201).json(row);
              });
            });
        });
      });
    });
  });

  // POST /api/reputation/attestations {subject_id, capability, kind?, proof_ref?}
  router.post('/attestations', authenticateToken, (req, res) => {
    const { subject_id, capability, kind, proof_ref } = req.body;
    if (!subject_id || !capability || typeof capability !== 'string') {
      return res.status(400).json({ error: 'subject_id and capability are required' });
    }
    if (Number(subject_id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot attest your own capability.' });
    }
    if (kind && kind !== 'test' && kind !== 'trial') {
      return res.status(400).json({ error: "kind must be 'test' or 'trial'" });
    }
    db.run(`INSERT INTO attestations (subject_id, attester_id, capability, kind, proof_ref)
        VALUES (?, ?, ?, ?, ?)`,
      [subject_id, req.user.id, capability, kind || 'trial', proof_ref || ''],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get('SELECT * FROM attestations WHERE id = ?', [this.lastID], (e2, row) => {
          if (e2) return res.status(500).json({ error: e2.message });
          if (io) io.emit('attestationAdded', row);
          res.status(201).json(row);
        });
      });
  });

  // POST /api/reputation/capability {reporter_id, capability, accurate} —
  // record a verified outcome for per-capability reliability scoring.
  router.post('/capability', authenticateToken, (req, res) => {
    const { reporter_id, capability, accurate } = req.body;
    recordOutcome(reporter_id, capability, !!accurate, (err, row) => {
      if (err) {
        if (err.code === 'BADINPUT') return res.status(400).json({ error: err.message });
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json(row);
    });
  });

  // GET /api/reputation/users/:userId/capabilities — Laplace-smoothed scores.
  router.get('/users/:userId/capabilities', optionalAuthenticateToken, (req, res) => {
    scoresFor(Number(req.params.userId), (err, scores) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ user_id: Number(req.params.userId), capabilities: scores });
    });
  });

  // GET /api/reputation/users/:userId/ratings — portable rating history.
  router.get('/users/:userId/ratings', optionalAuthenticateToken, (req, res) => {
    db.all('SELECT * FROM ratings WHERE subject_id = ? ORDER BY created_at DESC',
      [req.params.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
      });
  });

  // GET /api/reputation/users/:userId/reputation — aggregate summary.
  router.get('/users/:userId/reputation', optionalAuthenticateToken, (req, res) => {
    const uid = req.params.userId;
    db.get(`SELECT COUNT(*) AS n, COALESCE(AVG(score), 0) AS avg FROM ratings WHERE subject_id = ?`,
      [uid], (err, agg) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all(`SELECT capability, kind, COUNT(*) AS n FROM attestations
            WHERE subject_id = ? GROUP BY capability, kind`, [uid], (e2, caps) => {
              if (e2) return res.status(500).json({ error: e2.message });
              res.json({
                user_id: Number(uid),
                ratings_count: agg.n,
                avg_score: Math.round(agg.avg * 100) / 100,
                attestations: caps || [],
              });
            });
      });
  });

  // GET /api/reputation/users/:userId/work-history — B4 portable record:
  // performed work (tasks + gigs) with engagement class, ledger earnings,
  // ratings aggregate. The artifact a worker takes to any welfare rail.
  router.get('/users/:userId/work-history', optionalAuthenticateToken, (req, res) => {
    const uid = Number(req.params.userId);
    db.all(`SELECT id, objective AS title, engagement_type, terms_ref, reward AS amount,
        status, direction, created_at FROM tasks
        WHERE worker_id = ? AND status IN ('completed', 'paid')`, [uid], (err, tasks) => {
          if (err) return res.status(500).json({ error: err.message });
          db.all(`SELECT id, type AS title, engagement_type, terms_ref,
              payout_price AS amount, status, created_at FROM gigs
              WHERE driver_id = ? AND status = 'completed'`, [uid], (e2, gigs) => {
                if (e2) return res.status(500).json({ error: e2.message });
                const engagements = [
                  ...(tasks || []).map((t) => ({ kind: 'task', ...t })),
                  ...(gigs || []).map((g) => ({ kind: 'gig', ...g })),
                ].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
                db.get(`SELECT COALESCE(SUM(amount_paise), 0) AS earnings_paise,
                    COUNT(*) AS income_rows FROM ledger
                    WHERE to_user = ? AND entry_type = 'income'`, [uid], (e3, earn) => {
                      if (e3) return res.status(500).json({ error: e3.message });
                      db.get(`SELECT COUNT(*) AS n, COALESCE(AVG(score), 0) AS avg FROM ratings
                          WHERE subject_id = ?`, [uid], (e4, agg) => {
                            if (e4) return res.status(500).json({ error: e4.message });
                            res.json({ user_id: uid, engagements,
                              earnings_paise: earn.earnings_paise, income_rows: earn.income_rows,
                              ratings_count: agg.n, avg_score: Math.round(agg.avg * 100) / 100 });
                          });
                    });
              });
        });
  });

  return router;
};

function ratingErr(e, res) {
  const m = {
    NOTASK: [404, 'Task not found'],
    NOCONTRACT: [404, 'Contract not found'],
    NOTDONE: [400, 'Work must be completed before rating'],
    NOTPARTY: [403, 'Only a party to this work can rate'],
  }[e.message];
  if (m) return res.status(m[0]).json({ error: m[1] });
  return res.status(500).json({ error: e.message });
}
