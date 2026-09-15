// Contracts routes — FireFlow A6 escrow (agreements + escrow states).
// Funds lock on task acceptance (claimed -> locked), release on verified
// completion (task completed -> released). Draft while task open.
// Cancel carries a kill-fee record; disputes resolve against this record.
// Record-only: no money moves without human approval (A7 gate).
const express = require('express');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const { requireWorkerVerified } = require('../lib/verification');
const { rupeesToPaise } = require('../lib/ledger');
const { settleContract } = require('../lib/settlement');
const { getRakePolicy } = require('../lib/fees');

function asJson(row) {
  if (!row) return row;
  if (typeof row.milestones === 'string') {
    try { row.milestones = row.milestones ? JSON.parse(row.milestones) : []; } catch { row.milestones = []; }
  } else if (row.milestones === null || row.milestones === undefined) row.milestones = [];
  return row;
}

module.exports = (io) => {
  const router = express.Router();
  const emit = (row) => { if (io) io.emit('contractUpdated', asJson({ ...row })); };

  // POST /api/contracts {task_id, amount?, kill_fee?, milestones?} — task poster only.
  router.post('/', authenticateToken, (req, res) => {
    const { task_id, amount, kill_fee, milestones } = req.body;
    if (!task_id) return res.status(400).json({ error: 'task_id is required' });
    db.get('SELECT * FROM tasks WHERE id = ?', [task_id], (err, t) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!t) return res.status(404).json({ error: 'Task not found' });
      if (t.poster_id !== req.user.id) {
        return res.status(403).json({ error: 'Only the task poster can create the contract' });
      }
      // Lock on acceptance: claimed task -> locked; open task -> draft.
      const status = t.status === 'claimed' || t.status === 'completed' ? 'locked' : 'draft';
      db.run(`INSERT INTO contracts (task_id, poster_id, worker_id, amount,
          kill_fee, status, milestones) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [task_id, t.poster_id, t.worker_id || null, Number(amount ?? t.reward) || 0,
         Number(kill_fee) || 0, status, JSON.stringify(milestones || [])],
        function (iErr) {
          if (iErr) return res.status(500).json({ error: iErr.message });
          db.get('SELECT * FROM contracts WHERE id = ?', [this.lastID], (e2, row) => {
            if (e2) return res.status(500).json({ error: e2.message });
            emit(row);
            res.status(201).json(asJson(row));
          });
        });
    });
  });

  router.get('/', optionalAuthenticateToken, (req, res) => {
    const { status } = req.query;
    let q = 'SELECT * FROM contracts WHERE 1=1';
    const p = [];
    if (status) { q += ' AND status = ?'; p.push(status); }
    q += ' ORDER BY created_at DESC';
    db.all(q, p, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json((rows || []).map(asJson));
    });
  });

  router.get('/:id', optionalAuthenticateToken, (req, res) => {
    db.get('SELECT * FROM contracts WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Contract not found' });
      res.json(asJson(row));
    });
  });

  function party(id, userId, res, fn) {
    db.get('SELECT * FROM contracts WHERE id = ?', [id], (err, c) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!c) return res.status(404).json({ error: 'Contract not found' });
      if (c.poster_id !== userId && c.worker_id !== userId) {
        return res.status(403).json({ error: 'Not a party to this contract' });
      }
      fn(c);
    });
  }

  function save(id, sets, params, res) {
    db.run(`UPDATE contracts SET ${sets.join(', ')} WHERE id = ?`, [...params, id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM contracts WHERE id = ?', [id], (e2, row) => {
        if (e2) return res.status(500).json({ error: e2.message });
        emit(row);
        res.json(asJson(row));
      });
    });
  }

  // Lock a draft once the task is claimed (worker accepted).
  router.post('/:id/lock', authenticateToken, (req, res) => {
    party(req.params.id, req.user.id, res, (c) => {
      if (c.status !== 'draft') return res.status(400).json({ error: 'Contract is not a draft' });
      db.get('SELECT * FROM tasks WHERE id = ?', [c.task_id], (err, t) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!t || (t.status !== 'claimed' && t.status !== 'completed')) {
          return res.status(400).json({ error: 'Task must be claimed before funds lock' });
        }
        save(c.id, ['status = ?', 'worker_id = ?'], ['locked', t.worker_id], res);
      });
    });
  });

  // Release on verified completion: need → poster authorizes, poster pays worker;
  // offer → booking party authorizes, buyer pays supplier. Task must be completed.
  router.post('/:id/release', authenticateToken, (req, res) => {
    party(req.params.id, req.user.id, res, (c) => {
      if (c.status !== 'locked') return res.status(400).json({ error: 'Contract is not locked' });
      db.get('SELECT * FROM tasks WHERE id = ?', [c.task_id], (err, t) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!t) return res.status(404).json({ error: 'Task not found' });
        const isOffer = t.direction === 'offer';
        const payer = isOffer ? c.worker_id : c.poster_id;
        const payee = isOffer ? c.poster_id : c.worker_id;
        if (req.user.id !== payer) {
          return res.status(403).json({ error: isOffer ? 'Only the booking party can release' : 'Only the poster can release' });
        }
        requireWorkerVerified(payee, res, () => {
          if (t.status !== 'completed') {
            return res.status(400).json({ error: 'Task must be completed before release' });
          }
          getRakePolicy((fErr, fees) => {
            if (fErr) return res.status(500).json({ error: fErr.message });
            settleContract({ contractId: c.id, taskId: c.task_id,
              amountPaise: rupeesToPaise(c.amount), payer, payee,
              rakeBps: fees.contract_rake_bps, welfareBps: fees.welfare_bps,
              provider: 'stub',
              memo: isOffer ? 'offer escrow release' : 'escrow release',
              by: req.user.id }, (lErr, t) => {
                if (lErr) return res.status(500).json({ error: lErr.message });
                if (t.error) return res.status(502).json({ error: t.error, stages: t.stages });
                db.run('UPDATE contracts SET status = ? WHERE id = ?', ['released', c.id], (uErr) => {
                  if (uErr) return res.status(500).json({ error: uErr.message });
                  db.get('SELECT * FROM contracts WHERE id = ?', [c.id], (e2, row) => {
                    if (e2) return res.status(500).json({ error: e2.message });
                    emit(row);
                    res.json({ ...asJson(row), settlement: t });
                  });
                });
              });
          });
        });
      });
    });
  });

  // Cancel with kill-fee record (either party; poster-only while draft).
  router.post('/:id/cancel', authenticateToken, (req, res) => {
    party(req.params.id, req.user.id, res, (c) => {
      if (c.status === 'released' || c.status === 'cancelled') {
        return res.status(400).json({ error: 'Contract already closed' });
      }
      if (c.status === 'draft' && c.poster_id !== req.user.id) {
        return res.status(403).json({ error: 'Only the poster can cancel a draft' });
      }
      save(c.id, ['status = ?'], ['cancelled'], res);
    });
  });

  // Open a dispute (either party); resolution reads this record, not chat logs.
  router.post('/:id/dispute', authenticateToken, (req, res) => {
    party(req.params.id, req.user.id, res, (c) => {
      if (c.status !== 'locked') return res.status(400).json({ error: 'Only a locked contract can be disputed' });
      save(c.id, ['status = ?'], ['disputed'], res);
    });
  });

  return router;
};
