// Units routes — Economic identity as Units (FireFlow A1).
// POST create / GET resolve / GET list-by-type / GET unit gigs.
// Auth: user JWT mints human/org-side types; agent key mints machine-side
// types; NEVER cross (403). Ownership helper exported for A3.
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { authenticateAgentApiKey } = require('../middleware/agentAuth');
const {
  validateUnitInput, canMint, genUnitId, toUnit,
} = require('../lib/unitSchema');

// Identify caller via either credential; sets callerKind user|agent.
function identifyCaller(req, res, next) {
  if (req.headers['authorization']) {
    return authenticateToken(req, res, () => {
      req.callerKind = 'user';
      next();
    });
  }
  if (req.headers['x-agent-api-key']) {
    return authenticateAgentApiKey(req, res, () => {
      req.callerKind = 'agent';
      next();
    });
  }
  return res.status(401).json({ error: 'Authentication required.' });
}

function callerUserId(req) {
  if (req.user && req.user.id !== undefined) return req.user.id;
  if (req.agent && req.agent.userId !== undefined) return req.agent.userId;
  return null;
}

// Load unit from :id and enforce caller ownership (403 otherwise).
function requireUnitOwnership(req, res, next) {
  const unitId = req.params.id;
  if (!unitId) return res.status(400).json({ error: 'Unit id required.' });
  const callerId = callerUserId(req);
  if (callerId === null) return res.status(401).json({ error: 'Authentication required.' });
  db.get('SELECT * FROM units WHERE unit_id = ?', [unitId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!row) return res.status(404).json({ error: 'Unit not found.' });
    if (row.owner_user_id !== callerId) {
      return res.status(403).json({ error: 'Not the owner of this unit.' });
    }
    req.unitRow = row;
    req.unit = toUnit(row);
    next();
  });
}

module.exports = (io) => {
  const router = express.Router();

  // POST /api/units — mint a unit (credential-gated by type).
  router.post('/', identifyCaller, (req, res) => {
    const check = validateUnitInput(req.body);
    if (!check.valid) return res.status(400).json({ error: check.error });
    const { unit_type, subtype, identity, state, traits, resources, behaviors, relations } = req.body;
    if (!canMint(req.callerKind, unit_type)) {
      return res.status(403).json({ error: `This credential cannot mint '${unit_type}' units.` });
    }
    const unitId = genUnitId(unit_type);
    const ownerId = callerUserId(req);
    db.run(
      `INSERT INTO units (unit_id, unit_type, subtype, owner_user_id,
        identity_json, state_json, traits_json, resources_json,
        behaviors_json, relations_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [unitId, unit_type, subtype || null, ownerId,
        JSON.stringify(identity || {}), JSON.stringify(state || {}),
        JSON.stringify(traits || {}), JSON.stringify(resources || {}),
        JSON.stringify(behaviors || []), JSON.stringify(relations || [])],
      function (err) {
        if (err) return res.status(500).json({ error: 'Failed to create unit.' });
        db.get('SELECT * FROM units WHERE unit_id = ?', [unitId], (err2, row) => {
          if (err2 || !row) return res.status(500).json({ error: 'Failed to read unit.' });
          res.status(201).json(toUnit(row));
        });
      }
    );
  });

  // GET /api/units/type/:unitType — list units by type.
  router.get('/type/:unitType', (req, res) => {
    const { UNIT_TYPES } = require('../lib/unitSchema');
    if (!UNIT_TYPES.includes(req.params.unitType)) {
      return res.status(400).json({ error: 'Unknown unit_type.' });
    }
    db.all('SELECT * FROM units WHERE unit_type = ? ORDER BY created_at DESC',
      [req.params.unitType], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.json((rows || []).map(toUnit));
      });
  });

  // GET /api/units/:id — resolve one unit (public).
  router.get('/:id', (req, res) => {
    db.get('SELECT * FROM units WHERE unit_id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error.' });
      if (!row) return res.status(404).json({ error: 'Unit not found.' });
      res.json(toUnit(row));
    });
  });

  // GET /api/units/:id/gigs — gigs attributed to this unit.
  // Acting identity via X-Act-As-Unit must match :id and be caller-owned.
  router.get('/:id/gigs', identifyCaller, requireUnitOwnership, (req, res) => {
    const claimed = req.headers['x-act-as-unit'];
    if (!claimed) return res.status(400).json({ error: 'X-Act-As-Unit header required.' });
    if (claimed !== req.params.id) return res.status(400).json({ error: 'Acting unit mismatch.' });
    db.all('SELECT * FROM gigs ORDER BY created_at DESC', [], (err, gigs) => {
      if (err) return res.status(500).json({ error: 'Database error.' });
      const mine = (gigs || []).filter((g) => {
        try {
          return g.details && JSON.parse(g.details).unit_id === req.params.id;
        } catch {
          return false;
        }
      }).map((g) => ({ ...g, details: g.details ? JSON.parse(g.details) : null }));
      res.json(mine);
    });
  });

  // POST /api/units/:id/request-verification — owner queues unit for review.
  router.post('/:id/request-verification', identifyCaller, requireUnitOwnership, (req, res) => {
    if (!['unverified', 'rejected'].includes(req.unitRow.verification_status)) {
      return res.status(400).json({ error: `Unit is already ${req.unitRow.verification_status}.` });
    }
    db.run("UPDATE units SET verification_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE unit_id = ?",
      [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.json({ unit_id: req.params.id, verification_status: 'pending' });
      });
  });

  // POST /api/units/:id/verify {status: verified|rejected} — admin (user id 1) only.
  router.post('/:id/verify', identifyCaller, (req, res) => {
    if (callerUserId(req) !== 1) {
      return res.status(403).json({ error: 'Only admin can verify units.' });
    }
    const { status } = req.body;
    if (status !== 'verified' && status !== 'rejected') {
      return res.status(400).json({ error: "status must be 'verified' or 'rejected'" });
    }
    db.get('SELECT * FROM units WHERE unit_id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error.' });
      if (!row) return res.status(404).json({ error: 'Unit not found.' });
      if (row.verification_status !== 'pending') {
        return res.status(400).json({ error: `Unit is ${row.verification_status}, not pending.` });
      }
      db.run('UPDATE units SET verification_status = ?, updated_at = CURRENT_TIMESTAMP WHERE unit_id = ?',
        [status, req.params.id], (uErr) => {
          if (uErr) return res.status(500).json({ error: 'Database error.' });
          res.json({ unit_id: req.params.id, verification_status: status });
        });
    });
  });

  return router;
};

module.exports.requireUnitOwnership = requireUnitOwnership;
module.exports.identifyCaller = identifyCaller;
