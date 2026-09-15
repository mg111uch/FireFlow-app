// Datasets routes — C4 data marketplace (consent-first, provenance-tracked).
// Datasets bind caller-owned Dataset units. Access is purpose-bound:
// requesters state purpose, owners grant/deny, every decision is logged.
// Lineage: sources[] carries upstream dataset ids; /:id/lineage walks them.
const express = require('express');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const { completeGrant, canGrant } = require('../lib/settlement');

function asJson(row) {
  if (!row) return row;
  for (const k of ['schema_json', 'purposes', 'sources']) {
    if (typeof row[k] === 'string') {
      try { row[k] = row[k] ? JSON.parse(row[k]) : (k === 'schema_json' ? {} : []); }
      catch { row[k] = (k === 'schema_json' ? {} : []); }
    }
  }
  return row;
}

function checkDatasetUnit(unit_id, userId) {
  return new Promise((resolve, reject) => {
    if (!unit_id) return reject(Object.assign(new Error('unit_id is required'), { code: 400 }));
    db.get('SELECT * FROM units WHERE unit_id = ?', [unit_id], (err, u) => {
      if (err) return reject(err);
      if (!u) return reject(Object.assign(new Error('Unit not found.'), { code: 404 }));
      if (u.unit_type !== 'Dataset') {
        return reject(Object.assign(new Error('Only Dataset units list datasets.'), { code: 400 }));
      }
      if (u.owner_user_id !== userId) {
        return reject(Object.assign(new Error('Not the owner of this unit.'), { code: 403 }));
      }
      resolve(u);
    });
  });
}

module.exports = (io) => {
  const router = express.Router();

  // POST /api/datasets {unit_id, title, description?, schema?, price?, consent_text?, purposes?, sources?, access?}
  router.post('/', authenticateToken, (req, res) => {
    const { unit_id, title, description, schema, price, consent_text, purposes, sources, access } = req.body;
    if (!title || typeof title !== 'string') return res.status(400).json({ error: 'title is required' });
    if (!consent_text || typeof consent_text !== 'string') {
      return res.status(400).json({ error: 'consent_text is required (consent-first)' });
    }
    if (access && access !== 'open' && access !== 'gated') {
      return res.status(400).json({ error: "access must be 'open' or 'gated'" });
    }
    checkDatasetUnit(unit_id, req.user.id).then(() => {
      db.run(`INSERT INTO datasets (unit_id, owner_user_id, title, description, schema_json,
          price, consent_text, purposes, sources, access) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [unit_id, req.user.id, title, description || '', JSON.stringify(schema || {}),
         Number(price) || 0, consent_text, JSON.stringify(purposes || []),
         JSON.stringify(sources || []), access || 'gated'],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(409).json({ error: 'Dataset already exists for this unit.' });
            }
            return res.status(500).json({ error: err.message });
          }
          db.get('SELECT * FROM datasets WHERE id = ?', [this.lastID], (e2, row) => {
            if (e2) return res.status(500).json({ error: e2.message });
            if (io) io.emit('datasetUpdated', asJson(row));
            res.status(201).json(asJson(row));
          });
        });
    }).catch((e) => res.status(e.code || 500).json({ error: e.message }));
  });

  router.get('/', optionalAuthenticateToken, (req, res) => {
    const { access, owner } = req.query;
    let q = 'SELECT * FROM datasets WHERE 1=1';
    const p = [];
    if (access) { q += ' AND access = ?'; p.push(access); }
    if (owner) { q += ' AND owner_user_id = ?'; p.push(Number(owner)); }
    q += ' ORDER BY created_at DESC';
    db.all(q, p, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json((rows || []).map(asJson));
    });
  });

  router.get('/:id', optionalAuthenticateToken, (req, res) => {
    db.get('SELECT * FROM datasets WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Dataset not found' });
      res.json(asJson(row));
    });
  });

  // GET /api/datasets/:id/lineage — walk sources[] upstream (provenance chain).
  router.get('/:id/lineage', optionalAuthenticateToken, (req, res) => {
    const chain = [];
    const seen = new Set();
    const walk = (id) => {
      if (seen.has(id)) return Promise.resolve();
      seen.add(id);
      return new Promise((resolve, reject) => {
        db.get('SELECT id, title, unit_id, sources FROM datasets WHERE id = ?', [id], (err, r) => {
          if (err) return reject(err);
          if (!r) return resolve();
          let srcs = [];
          try { srcs = r.sources ? JSON.parse(r.sources) : []; } catch { srcs = []; }
          chain.push({ id: r.id, title: r.title, unit_id: r.unit_id, sources: srcs });
          (async () => {
            for (const s of srcs) await walk(Number(s));
            resolve();
          })().catch(reject);
        });
      });
    };
    walk(Number(req.params.id)).then(() => res.json({ dataset_id: Number(req.params.id), lineage: chain }))
      .catch((e) => res.status(500).json({ error: e.message }));
  });

  // POST /api/datasets/:id/request {purpose} — purpose-bound access request.
  router.post('/:id/request', authenticateToken, (req, res) => {
    const { purpose } = req.body;
    if (!purpose || typeof purpose !== 'string') {
      return res.status(400).json({ error: 'purpose is required (purpose limitation)' });
    }
    db.get('SELECT * FROM datasets WHERE id = ?', [req.params.id], (err, d) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!d) return res.status(404).json({ error: 'Dataset not found' });
      if (d.owner_user_id === req.user.id) {
        return res.status(400).json({ error: 'Owners already have access.' });
      }
      canGrant(d.id, req.user.id, (gErr, ok) => {
        if (gErr) return res.status(500).json({ error: gErr.message });
        if (!ok) return res.status(403).json({ error: 'License revoked for this dataset.' });
        if (d.access === 'open') {
          // Open datasets: auto-grant, still logged (provenance).
          return grant(d.id, req.user.id, purpose, res, io);
        }
        request(); // eslint-disable-line no-use-before-define
      });
      return;
      function request() {
      db.run('INSERT INTO data_access (dataset_id, requester_id, purpose) VALUES (?, ?, ?)',
        [d.id, req.user.id, purpose], function (iErr) {
          if (iErr) return res.status(500).json({ error: iErr.message });
          if (io) io.emit('accessRequested', { dataset_id: d.id, requester_id: req.user.id });
          res.status(201).json({ id: this.lastID, dataset_id: d.id, purpose, status: 'requested' });
        });
      }
    });
  });

  // POST /api/datasets/access/:accessId/grant|deny — owner decides (logged).
  const decide = (to) => (req, res) => {
    db.get(`SELECT a.*, d.owner_user_id FROM data_access a
        JOIN datasets d ON d.id = a.dataset_id WHERE a.id = ?`, [req.params.accessId], (err, a) => {
          if (err) return res.status(500).json({ error: err.message });
          if (!a) return res.status(404).json({ error: 'Access request not found' });
          if (a.owner_user_id !== req.user.id) return res.status(403).json({ error: 'Only the dataset owner decides.' });
          if (to === 'revoked' && a.status !== 'granted') {
            return res.status(400).json({ error: 'Only granted access can be revoked' });
          }
          if (to !== 'revoked' && a.status !== 'requested') {
            return res.status(400).json({ error: `Already ${a.status}` });
          }
          db.run("UPDATE data_access SET status = ?, decided_at = CURRENT_TIMESTAMP WHERE id = ?",
            [to, a.id], (uErr) => {
              if (uErr) return res.status(500).json({ error: uErr.message });
              if (io) io.emit('accessDecided', { id: a.id, status: to });
              if (to !== 'granted') return res.json({ id: a.id, dataset_id: a.dataset_id, status: to });
              completeGrant({ accessId: a.id }, (gErr, g) => {
                if (gErr) return res.status(500).json({ error: gErr.message });
                res.json({ id: a.id, dataset_id: a.dataset_id, status: to,
                  fee_paise: g.fee_paise, license_id: g.license_id });
              });
            });
        });
  };
  router.post('/access/:accessId/grant', authenticateToken, decide('granted'));
  router.post('/access/:accessId/deny', authenticateToken, decide('denied'));

  // POST /api/datasets/access/:accessId/revoke — owner revokes (logged).
  router.post('/access/:accessId/revoke', authenticateToken, decide('revoked'));

  return router;

  function grant(datasetId, requesterId, purpose, res, io) {
    db.run("INSERT INTO data_access (dataset_id, requester_id, purpose, status, decided_at) VALUES (?, ?, ?, 'granted', CURRENT_TIMESTAMP)",
      [datasetId, requesterId, purpose], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        const accessId = this.lastID;
        completeGrant({ accessId }, (gErr, g) => {
          if (gErr) return res.status(500).json({ error: gErr.message });
          res.status(201).json({ id: accessId, dataset_id: datasetId, purpose,
            status: 'granted', fee_paise: g.fee_paise, license_id: g.license_id });
        });
      });
  }
};
