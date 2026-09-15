// Compute exchange — C4. Benchmarked, sandboxed nodes; published workloads.
// Nodes bind caller-owned Compute Node units. Jobs run ONLY the published
// kinds (render, inference, simulation, annotation_qa); params carrying code
// blobs are rejected — no arbitrary customer code ever runs on hosts.
// Lifecycle only (queued→running→done/failed); settlement rides task payouts.
const express = require('express');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const { getComputeFeeBps } = require('../lib/fees');
const { settleComputeJob } = require('../lib/settlement');

const WORKLOADS = ['render', 'inference', 'simulation', 'annotation_qa'];
const CODE_KEYS = ['code', 'script', 'image', 'binary', 'executable', 'dockerfile', 'shell'];

function asJson(row, keys) {
  if (!row) return row;
  for (const k of keys) {
    if (typeof row[k] === 'string') {
      try { row[k] = row[k] ? JSON.parse(row[k]) : (k === 'benchmarks' || k === 'params' ? {} : []); }
      catch { row[k] = (k === 'benchmarks' || k === 'params' ? {} : []); }
    }
  }
  return row;
}

function checkComputeUnit(unit_id, userId) {
  return new Promise((resolve, reject) => {
    if (!unit_id) return reject(Object.assign(new Error('unit_id is required'), { code: 400 }));
    db.get('SELECT * FROM units WHERE unit_id = ?', [unit_id], (err, u) => {
      if (err) return reject(err);
      if (!u) return reject(Object.assign(new Error('Unit not found.'), { code: 404 }));
      if (u.unit_type !== 'Compute Node') {
        return reject(Object.assign(new Error('Only Compute Node units serve compute.'), { code: 400 }));
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

  // GET /api/compute/workloads — the published list (nothing else may run).
  router.get('/workloads', (req, res) => res.json({ workloads: WORKLOADS }));

  // POST /api/compute/nodes {unit_id, name?, benchmarks?, runtime?, workloads?, price_rupees_per_hour?, status?}
  router.post('/nodes', authenticateToken, (req, res) => {
    const { unit_id, name, benchmarks, runtime, workloads, price_rupees_per_hour, status } = req.body;
    if (workloads !== undefined) {
      if (!Array.isArray(workloads) || !workloads.length) {
        return res.status(400).json({ error: 'workloads must be a non-empty array' });
      }
      for (const w of workloads) {
        if (!WORKLOADS.includes(w)) return res.status(400).json({ error: `unknown workload '${w}'` });
      }
    }
    if (status && !['online', 'paused', 'offline'].includes(status)) {
      return res.status(400).json({ error: 'bad status' });
    }
    checkComputeUnit(unit_id, req.user.id).then(() => {
      db.run(`INSERT INTO compute_nodes (unit_id, owner_user_id, name, benchmarks, runtime,
          workloads, price_paise_per_hour, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [unit_id, req.user.id, name || '', JSON.stringify(benchmarks || {}), runtime || 'docker',
         JSON.stringify(workloads || WORKLOADS),
         Math.round((Number(price_rupees_per_hour) || 0) * 100), status || 'online'],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(409).json({ error: 'Node already exists for this unit.' });
            }
            return res.status(500).json({ error: err.message });
          }
          db.get('SELECT * FROM compute_nodes WHERE id = ?', [this.lastID], (e2, row) => {
            if (e2) return res.status(500).json({ error: e2.message });
            if (io) io.emit('nodeUpdated', asJson(row, ['benchmarks', 'workloads']));
            res.status(201).json(asJson(row, ['benchmarks', 'workloads']));
          });
        });
    }).catch((e) => res.status(e.code || 500).json({ error: e.message }));
  });

  // GET /api/compute/nodes?status=&workload=
  router.get('/nodes', optionalAuthenticateToken, (req, res) => {
    const { status, workload } = req.query;
    let q = 'SELECT * FROM compute_nodes WHERE 1=1';
    const p = [];
    if (status) { q += ' AND status = ?'; p.push(status); }
    q += ' ORDER BY created_at DESC';
    db.all(q, p, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      let out = (rows || []).map((r) => asJson(r, ['benchmarks', 'workloads']));
      if (workload) out = out.filter((n) => (n.workloads || []).includes(workload));
      res.json(out);
    });
  });

  // PUT /api/compute/nodes/:id/status {status} — owner pauses/offlines.
  router.put('/nodes/:id/status', authenticateToken, (req, res) => {
    const { status } = req.body;
    if (!['online', 'paused', 'offline'].includes(status)) {
      return res.status(400).json({ error: 'bad status' });
    }
    db.get('SELECT * FROM compute_nodes WHERE id = ?', [req.params.id], (err, n) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!n) return res.status(404).json({ error: 'Node not found' });
      if (n.owner_user_id !== req.user.id) return res.status(403).json({ error: 'Not the owner.' });
      db.run('UPDATE compute_nodes SET status = ? WHERE id = ?', [status, n.id], (uErr) => {
        if (uErr) return res.status(500).json({ error: uErr.message });
        res.json({ id: n.id, status });
      });
    });
  });

  // POST /api/compute/jobs {node_id, workload, params?} — params only, never code.
  router.post('/jobs', authenticateToken, (req, res) => {
    const { node_id, workload, params } = req.body;
    if (!WORKLOADS.includes(workload)) {
      return res.status(400).json({ error: `workload must be one of ${WORKLOADS.join(', ')}` });
    }
    const ps = params || {};
    if (typeof ps !== 'object' || Array.isArray(ps)) {
      return res.status(400).json({ error: 'params must be an object' });
    }
    const bad = Object.keys(ps).filter((k) => CODE_KEYS.includes(k.toLowerCase()));
    if (bad.length) {
      return res.status(400).json({ error: `code blobs rejected (${bad.join(', ')}); params only` });
    }
    db.get('SELECT * FROM compute_nodes WHERE id = ?', [node_id], (err, n) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!n) return res.status(404).json({ error: 'Node not found' });
      if (n.status !== 'online') return res.status(400).json({ error: `Node is ${n.status}` });
      let serves = [];
      try { serves = n.workloads ? JSON.parse(n.workloads) : []; } catch { serves = []; }
      if (!serves.includes(workload)) {
        return res.status(400).json({ error: 'Node does not serve this workload' });
      }
      db.run('INSERT INTO compute_jobs (node_id, requester_id, workload, params) VALUES (?, ?, ?, ?)',
        [node_id, req.user.id, workload, JSON.stringify(ps)], function (iErr) {
          if (iErr) return res.status(500).json({ error: iErr.message });
          db.get('SELECT * FROM compute_jobs WHERE id = ?', [this.lastID], (e2, row) => {
            if (e2) return res.status(500).json({ error: e2.message });
            if (io) io.emit('jobUpdated', asJson(row, ['params']));
            res.status(201).json(asJson(row, ['params']));
          });
        });
    });
  });

  // GET /api/compute/jobs/mine — requester's jobs (BEFORE /:id route).
  router.get('/jobs/mine', authenticateToken, (req, res) => {
    db.all('SELECT * FROM compute_jobs WHERE requester_id = ? ORDER BY created_at DESC',
      [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json((rows || []).map((r) => asJson(r, ['params'])));
      });
  });

  const move = (from, to) => (req, res) => {
    db.get(`SELECT j.*, n.owner_user_id FROM compute_jobs j
        JOIN compute_nodes n ON n.id = j.node_id WHERE j.id = ?`, [req.params.id], (err, j) => {
          if (err) return res.status(500).json({ error: err.message });
          if (!j) return res.status(404).json({ error: 'Job not found' });
          if (j.owner_user_id !== req.user.id) {
            return res.status(403).json({ error: 'Only the node owner moves jobs.' });
          }
          if (j.status !== from) return res.status(400).json({ error: `Job must be ${from}` });
          const extra = to === 'done' && req.body && typeof req.body.result_ref === 'string'
            ? [', result_ref = ?', req.body.result_ref] : [];
          const q = `UPDATE compute_jobs SET status = ?${extra[0] || ''} WHERE id = ?`;
          const p = extra.length ? [to, extra[1], j.id] : [to, j.id];
          db.run(q, p, (uErr) => {
            if (uErr) return res.status(500).json({ error: uErr.message });
            if (io) io.emit('jobUpdated', { id: j.id, status: to });
            if (to !== 'done') return res.json({ id: j.id, status: to });
            // Job completion settles the node-rate fee through the pipeline.
            getComputeFeeBps((fErr, feeBps) => {
              if (fErr) return res.status(500).json({ error: fErr.message });
              const hours = Number((req.body && req.body.hours) || 1);
              settleComputeJob({ jobId: j.id, requesterId: j.requester_id,
                ownerId: j.owner_user_id,
                costPaise: Math.round((n.price_paise_per_hour || 0) * hours),
                feeBps, by: req.user.id }, (sErr, st) => {
                  if (sErr) return res.status(500).json({ error: sErr.message });
                  res.json({ id: j.id, status: to, settlement: st });
                });
            });
          });
        });
  };
  router.post('/jobs/:id/start', authenticateToken, move('queued', 'running'));
  router.post('/jobs/:id/complete', authenticateToken, move('running', 'done'));
  router.post('/jobs/:id/fail', authenticateToken, move('running', 'failed'));

  return router;
};
