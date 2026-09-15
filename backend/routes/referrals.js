// Referrals — B3 flywheel (workers invite others, supply grows).
// Codes are inviter-bound; one redemption per invitee (first invite wins).
// No auto-bonus: rewards stay inside normal task payouts (no ledger gaming).
const express = require('express');
const crypto = require('crypto');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

module.exports = (io) => {
  const router = express.Router();

  // POST /api/referrals — mint a code for the caller.
  router.post('/', authenticateToken, (req, res) => {
    const code = 'rf_' + crypto.randomBytes(6).toString('hex');
    db.run('INSERT INTO referrals (code, inviter_id) VALUES (?, ?)',
      [code, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        const row = { id: this.lastID, code, inviter_id: req.user.id, status: 'open' };
        if (io) io.emit('referralCreated', row);
        res.status(201).json(row);
      });
  });

  // POST /api/referrals/redeem {code} — claim an invite (first one wins).
  router.post('/redeem', authenticateToken, (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'code is required' });
    db.get('SELECT * FROM referrals WHERE code = ?', [code], (err, r) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!r || r.status !== 'open') return res.status(404).json({ error: 'Invite not found or used' });
      if (r.inviter_id === req.user.id) {
        return res.status(400).json({ error: 'Cannot redeem your own invite.' });
      }
      db.get("SELECT 1 FROM referrals WHERE invitee_id = ? AND status = 'redeemed' LIMIT 1",
        [req.user.id], (e2, prior) => {
          if (e2) return res.status(500).json({ error: e2.message });
          if (prior) return res.status(400).json({ error: 'Invite already redeemed.' });
          db.run("UPDATE referrals SET invitee_id = ?, status = 'redeemed' WHERE id = ?",
            [req.user.id, r.id], (uErr) => {
              if (uErr) return res.status(500).json({ error: uErr.message });
              if (io) io.emit('referralRedeemed', { id: r.id, inviter_id: r.inviter_id, invitee_id: req.user.id });
              res.json({ id: r.id, inviter_id: r.inviter_id, invitee_id: req.user.id, status: 'redeemed' });
            });
        });
    });
  });

  // GET /api/referrals/mine — my codes + redemption count (supply-growth signal).
  router.get('/mine', authenticateToken, (req, res) => {
    db.all('SELECT * FROM referrals WHERE inviter_id = ? ORDER BY created_at DESC',
      [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const all = rows || [];
        res.json({ codes: all, redeemed: all.filter((r) => r.status === 'redeemed').length });
      });
  });

  return router;
};
