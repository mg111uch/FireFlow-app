// Business profiles — FireFlow A8. One profile per Business unit,
// owner-gated. Capability profile + capacity + order book + compliance docs.
// ?capability= gives a substrate-level filter (full C1 search is Stage C).
const express = require('express');
const { execFile } = require('child_process');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const { DUTIES, runDuty } = require('../lib/agentDuties');

const INDUSTRIAL_CLI = process.env.PIE_INDUSTRIAL_CLI
  || '/home/manigupt/Hello/Agentic_Unit_PIE/codebase/modules/economy/industrial_cli.py';

function asJson(row) {
  if (!row) return row;
  for (const k of ['capabilities', 'capacity', 'order_book', 'compliance_docs']) {
    const dflt = (k === 'capacity' ? {} : []);
    if (typeof row[k] === 'string') {
      try { row[k] = row[k] ? JSON.parse(row[k]) : dflt; }
      catch { row[k] = dflt; }
    } else if (row[k] === null || row[k] === undefined) row[k] = dflt;
  }
  return row;
}

function str(v, d = '') { return typeof v === 'string' ? v : d; }

function offerings(b) {
  const c = (b && b.capacity) || {};
  return Array.isArray(c.offerings) ? c.offerings : [];
}

// Structured capacity: {headcount?, shifts?, offerings: [{capability,
// quantity, unit?, lead_time_days?}]}. Returns error string or null.
function capacityError(cap) {
  if (cap === undefined || cap === null) return null;
  if (typeof cap !== 'object' || Array.isArray(cap)) return 'capacity must be an object';
  if (cap.headcount !== undefined && (!Number.isFinite(Number(cap.headcount)) || Number(cap.headcount) < 0)) {
    return 'capacity.headcount must be a number >= 0';
  }
  if (cap.shifts !== undefined && (!Number.isFinite(Number(cap.shifts)) || Number(cap.shifts) < 0)) {
    return 'capacity.shifts must be a number >= 0';
  }
  const offs = cap.offerings === undefined ? [] : cap.offerings;
  if (!Array.isArray(offs)) return 'capacity.offerings must be an array';
  for (const o of offs) {
    if (!o || typeof o.capability !== 'string') return 'each offering needs a capability';
    if (o.quantity !== undefined && (!Number.isFinite(Number(o.quantity)) || Number(o.quantity) < 0)) {
      return 'offering quantity must be a number >= 0';
    }
    if (o.lead_time_days !== undefined && (!Number.isFinite(Number(o.lead_time_days)) || Number(o.lead_time_days) < 0)) {
      return 'offering lead_time_days must be a number >= 0';
    }
  }
  return null;
}

module.exports = (io) => {
  const router = express.Router();

  // POST /api/businesses {unit_id, display_name?, region?, capabilities?, ...}
  router.post('/', authenticateToken, (req, res) => {
    const { unit_id, display_name, region, capabilities, capacity, order_book, compliance_docs } = req.body;
    if (!unit_id) return res.status(400).json({ error: 'unit_id is required' });
    db.get('SELECT * FROM units WHERE unit_id = ?', [unit_id], (err, u) => {
      if (err) return res.status(500).json({ error: 'Database error.' });
      if (!u) return res.status(404).json({ error: 'Unit not found.' });
      if (u.unit_type !== 'Business') {
        return res.status(400).json({ error: 'Only Business units get business profiles.' });
      }
      if (u.owner_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Not the owner of this unit.' });
      }
      const capErr = capacityError(capacity);
      if (capErr) return res.status(400).json({ error: capErr });
      db.run(`INSERT INTO businesses (unit_id, owner_user_id, display_name, region, capabilities,
          capacity, order_book, compliance_docs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [unit_id, req.user.id, str(display_name), str(region), JSON.stringify(capabilities || []),
         JSON.stringify(capacity || {}), JSON.stringify(order_book || []),
         JSON.stringify(compliance_docs || [])],
        function (iErr) {
          if (iErr) {
            if (iErr.message.includes('UNIQUE constraint failed')) {
              return res.status(409).json({ error: 'Profile already exists for this unit.' });
            }
            return res.status(500).json({ error: iErr.message });
          }
          db.get('SELECT * FROM businesses WHERE id = ?', [this.lastID], (e2, row) => {
            if (e2) return res.status(500).json({ error: e2.message });
            if (io) io.emit('businessUpdated', asJson(row));
            res.status(201).json(asJson(row));
          });
        });
    });
  });

  // GET /api/businesses?capability=&owner=&min_qty=&max_lead_days=
  // Quantity/lead filters apply to structured offerings (matching capability
  // when given, else any offering).
  router.get('/', optionalAuthenticateToken, (req, res) => {
    const { capability, owner, min_qty, max_lead_days } = req.query;
    let q = 'SELECT * FROM businesses WHERE 1=1';
    const p = [];
    if (owner) { q += ' AND owner_user_id = ?'; p.push(Number(owner)); }
    q += ' ORDER BY created_at DESC';
    db.all(q, p, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      let out = (rows || []).map(asJson);
      const c = (capability || '').toLowerCase();
      const minQ = min_qty !== undefined ? Number(min_qty) : null;
      const maxLead = max_lead_days !== undefined ? Number(max_lead_days) : null;
      if (c) {
        out = out.filter((b) => (b.capabilities || []).some((x) => String(x).toLowerCase().includes(c)));
      }
      if (minQ !== null || maxLead !== null) {
        out = out.filter((b) => offerings(b).some((o) =>
          (!c || String(o.capability).toLowerCase().includes(c)) &&
          (minQ === null || (o.quantity ?? 0) >= minQ) &&
          (maxLead === null || (o.lead_time_days ?? Infinity) <= maxLead)));
      }
      res.json(out);
    });
  });

  // GET /api/businesses/search?capability=&region= — C1 capability search.
  // Thin proxy: PIE industrial graph ranks (most capable first), FireFlow
  // joins full profiles. Defined before /:id (single-segment conflict).
  router.get('/search', optionalAuthenticateToken, (req, res) => {
    const { capability, region } = req.query;
    if (!capability) return res.status(400).json({ error: 'capability is required' });
    db.all('SELECT * FROM businesses', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const payload = {
        businesses: (rows || []).map((b) => {
          let caps = [];
          try { caps = b.capabilities ? JSON.parse(b.capabilities) : []; } catch { caps = []; }
          return { ref: `biz_${b.id}`, name: b.display_name || b.unit_id,
            capabilities: caps, region: b.region || '' };
        }),
        capability, region: region || '',
      };
      execFile('conda', ['run', '-n', 'myenv', 'python', INDUSTRIAL_CLI, JSON.stringify(payload)],
        { timeout: 60000 }, (xErr, stdout) => {
          if (xErr) return res.status(502).json({ error: 'PIE capability search failed' });
          let out;
          try {
            out = JSON.parse(stdout);
            if (out.error) throw new Error(out.error);
          } catch {
            return res.status(502).json({ error: 'PIE search returned invalid JSON' });
          }
          const byRef = Object.fromEntries((rows || []).map((b) => [`biz_${b.id}`, asJson(b)]));
          res.json({ capability, region: region || '',
            suppliers: (out.suppliers || []).map((s) => ({ ...s, profile: byRef[s.ref] || null })) });
        });
    });
  });

  router.get('/:id', optionalAuthenticateToken, (req, res) => {
    db.get('SELECT * FROM businesses WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Business not found' });
      res.json(asJson(row));
    });
  });

  // GET /api/businesses/:id/ladder?target= — D5 rung ladder (base first).
  // have = this business's caps; rungs carry local supplier counts so each
  // rung is fundable before the next is climbed. Graph logic lives in PIE.
  router.get('/:id/ladder', optionalAuthenticateToken, (req, res) => {
    const { target } = req.query;
    if (!target) return res.status(400).json({ error: 'target is required' });
    db.get('SELECT * FROM businesses WHERE id = ?', [req.params.id], (err, b) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!b) return res.status(404).json({ error: 'Business not found' });
      let have = [];
      try { have = b.capabilities ? JSON.parse(b.capabilities) : []; } catch { have = []; }
      db.all('SELECT * FROM businesses', [], (e2, rows) => {
        if (e2) return res.status(500).json({ error: e2.message });
        const payload = {
          op: 'ladder', target,
          have,
          businesses: (rows || []).map((r) => {
            let caps = [];
            try { caps = r.capabilities ? JSON.parse(r.capabilities) : []; } catch { caps = []; }
            return { ref: `biz_${r.id}`, name: r.display_name || r.unit_id,
              capabilities: caps, region: r.region || '' };
          }),
        };
        execFile('conda', ['run', '-n', 'myenv', 'python', INDUSTRIAL_CLI, JSON.stringify(payload)],
          { timeout: 60000 }, (xErr, stdout) => {
            if (xErr) return res.status(502).json({ error: 'PIE ladder failed' });
            try {
              const out = JSON.parse(stdout);
              if (out.error) throw new Error(out.error);
              res.json({ business_id: b.id, ...out });
            } catch {
              return res.status(502).json({ error: 'PIE ladder returned invalid JSON' });
            }
          });
      });
    });
  });

  // GET /api/businesses/unit/:unitId — resolve profile by unit.
  router.get('/unit/:unitId', optionalAuthenticateToken, (req, res) => {
    db.get('SELECT * FROM businesses WHERE unit_id = ?', [req.params.unitId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Business not found' });
      res.json(asJson(row));
    });
  });

  // PUT /api/businesses/:id — owner only.
  router.put('/:id', authenticateToken, (req, res) => {
    db.get('SELECT * FROM businesses WHERE id = ?', [req.params.id], (err, b) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!b) return res.status(404).json({ error: 'Business not found' });
      if (b.owner_user_id !== req.user.id) return res.status(403).json({ error: 'Not the owner.' });
      const { display_name, region, capabilities, capacity, order_book, compliance_docs } = req.body;
      const capErr = capacity !== undefined ? capacityError(capacity) : null;
      if (capErr) return res.status(400).json({ error: capErr });
      db.run(`UPDATE businesses SET display_name = ?, region = ?, capabilities = ?, capacity = ?,
          order_book = ?, compliance_docs = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [str(display_name, b.display_name), region !== undefined ? str(region) : (b.region || ''),
         capabilities !== undefined ? JSON.stringify(capabilities) : b.capabilities,
         capacity !== undefined ? JSON.stringify(capacity) : b.capacity,
         order_book !== undefined ? JSON.stringify(order_book) : b.order_book,
         compliance_docs !== undefined ? JSON.stringify(compliance_docs) : b.compliance_docs,
         req.params.id],
        (uErr) => {
          if (uErr) return res.status(500).json({ error: uErr.message });
          db.get('SELECT * FROM businesses WHERE id = ?', [req.params.id], (e2, row) => {
            if (e2) return res.status(500).json({ error: e2.message });
            if (io) io.emit('businessUpdated', asJson(row));
            res.json(asJson(row));
          });
        });
    });
  });

  // C3 enterprise twin feeds. Derived measures compute live from tasks,
  // ledger, contracts, opportunities (measure back into twin); reported
  // metrics arrive via owner feeds (orders, inventory, machines, energy...).

  // POST /api/businesses/:id/twin/feed {metrics: {...}} — owner only.
  router.post('/:id/twin/feed', authenticateToken, (req, res) => {
    const { metrics } = req.body;
    if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) {
      return res.status(400).json({ error: 'metrics must be an object' });
    }
    db.get('SELECT * FROM businesses WHERE id = ?', [req.params.id], (err, b) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!b) return res.status(404).json({ error: 'Business not found' });
      if (b.owner_user_id !== req.user.id) return res.status(403).json({ error: 'Not the owner.' });
      db.run('INSERT INTO twin_snapshots (business_id, metrics) VALUES (?, ?)',
        [req.params.id, JSON.stringify(metrics)], function (iErr) {
          if (iErr) return res.status(500).json({ error: iErr.message });
          if (io) io.emit('twinFed', { business_id: Number(req.params.id) });
          // Event-driven agent: a fresh feed triggers inventory_watch if on.
          agentConfig(req.params.id).then(async (cfg) => {
            let watch = null;
            if (cfg && cfg.active === 1 && cfg.duties.includes('inventory_watch')) {
              try {
                watch = await runDuty('inventory_watch', asJson(b), null, cfg);
                db.run('INSERT INTO agent_runs (business_id, duty, input, output, initiated_by) VALUES (?, ?, ?, ?, ?)',
                  [b.id, 'inventory_watch', '{}', JSON.stringify(watch), 'event'], () => {});
              } catch (e) {
                watch = { error: e.message };
              }
            }
            res.status(201).json({ id: this.lastID, business_id: Number(req.params.id), metrics, watch });
          }).catch((e) => res.status(500).json({ error: e.message }));
        });
    });
  });

  // GET /api/businesses/:id/twin — live twin: profile + derived + latest reported.
  router.get('/:id/twin', optionalAuthenticateToken, (req, res) => {
    db.get('SELECT * FROM businesses WHERE id = ?', [req.params.id], (err, b) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!b) return res.status(404).json({ error: 'Business not found' });
      const biz = asJson(b);
      db.all(`SELECT status, COUNT(*) AS n FROM tasks WHERE poster_id = ? GROUP BY status`,
        [b.owner_user_id], (e1, trows) => {
          if (e1) return res.status(500).json({ error: e1.message });
          const tasks = {};
          (trows || []).forEach((r) => { tasks[r.status] = r.n; });
          db.get(`SELECT COALESCE(SUM(CASE WHEN entry_type = 'income' THEN amount_paise ELSE 0 END), 0) AS income,
              COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount_paise ELSE 0 END), 0) AS expense
              FROM ledger WHERE (entry_type = 'income' AND to_user = ?)
              OR (entry_type = 'expense' AND from_user = ?)`,
            [b.owner_user_id, b.owner_user_id], (e2, cash) => {
              if (e2) return res.status(500).json({ error: e2.message });
              db.get(`SELECT COUNT(DISTINCT worker_id) AS workforce FROM tasks
                  WHERE poster_id = ? AND worker_id IS NOT NULL`, [b.owner_user_id], (e3, wf) => {
                    if (e3) return res.status(500).json({ error: e3.message });
                    db.get(`SELECT COUNT(*) AS n, COALESCE(AVG(score), 0) AS avg FROM ratings
                        WHERE subject_id = ?`, [b.owner_user_id], (e4, rep) => {
                          if (e4) return res.status(500).json({ error: e4.message });
                          db.all(`SELECT id, pipeline, startup_cost FROM opportunities
                              WHERE user_id = ? AND pipeline IN ('executed', 'reconciled')`,
                            [b.owner_user_id], (e5, opps) => {
                              if (e5) return res.status(500).json({ error: e5.message });
                              db.all(`SELECT verdict, COUNT(*) AS n FROM decisions
                                  WHERE decided_by = ? GROUP BY verdict`,
                                [b.owner_user_id], (e8, decs) => {
                                  if (e8) return res.status(500).json({ error: e8.message });
                                  const decisions = {};
                                  (decs || []).forEach((r) => { decisions[r.verdict] = r.n; });
                              db.get(`SELECT metrics, created_at FROM twin_snapshots
                                  WHERE business_id = ? ORDER BY id DESC LIMIT 1`,
                                [b.id], (e6, snap) => {
                                  if (e6) return res.status(500).json({ error: e6.message });
                                  let reported = {};
                                  try { reported = snap && snap.metrics ? JSON.parse(snap.metrics) : {}; } catch { reported = {}; }
                                  db.all(`SELECT id, reporter_id, metric, value, note, region,
                                      escalated_task_id, created_at FROM observations
                                      WHERE business_id = ? ORDER BY id DESC LIMIT 10`,
                                    [b.id], (e7, obs) => {
                                      if (e7) return res.status(500).json({ error: e7.message });
                                      res.json({ business: biz,
                                        derived: { tasks, cashflow_paise: cash,
                                          workforce: (wf && wf.workforce) || 0,
                                          reputation: { count: rep.n, avg: Math.round(rep.avg * 100) / 100 },
                                          pipeline: { executed: (opps || []).filter((o) => o.pipeline === 'executed').length,
                                            reconciled: (opps || []).filter((o) => o.pipeline === 'reconciled').length },
                                          decisions,
                                          capacity: { offerings: offerings(biz).length,
                                            headcount: (biz.capacity && biz.capacity.headcount) || 0,
                                            shifts: (biz.capacity && biz.capacity.shifts) || 0 } },
                                        reported, reported_at: (snap && snap.created_at) || null,
                                        observations: obs || [] });
                                    });
                                });
                            });
                        });
                  });
            });
        });
    });
  });
  });

  // C2 business agent — per-business duties, event-driven + manual.
  // No cron: twin feeds auto-trigger inventory_watch; owners run the rest.

  function agentConfig(bid) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM business_agents WHERE business_id = ?', [bid], (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(null);
        try { row.duties = row.duties ? JSON.parse(row.duties) : []; } catch { row.duties = []; }
        try { row.thresholds = row.thresholds ? JSON.parse(row.thresholds) : {}; } catch { row.thresholds = {}; }
        resolve(row);
      });
    });
  }

  function recordRun(bid, duty, input, output, by, res, code = 200) {
    db.run('INSERT INTO agent_runs (business_id, duty, input, output, initiated_by) VALUES (?, ?, ?, ?, ?)',
      [bid, duty, JSON.stringify(input || {}), JSON.stringify(output), by], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (io) io.emit('agentRan', { business_id: Number(bid), duty });
        res.status(code).json({ duty, output, run_id: this.lastID });
      });
  }

  // PUT /api/businesses/:id/agent {duties, thresholds?, active?} — owner only.
  router.put('/:id/agent', authenticateToken, (req, res) => {
    const { duties, thresholds, active } = req.body;
    if (!Array.isArray(duties) || !duties.length) {
      return res.status(400).json({ error: 'duties array is required' });
    }
    for (const d of duties) {
      if (!DUTIES.includes(d)) return res.status(400).json({ error: `unknown duty '${d}' (known: ${DUTIES.join(', ')})` });
    }
    db.get('SELECT * FROM businesses WHERE id = ?', [req.params.id], (err, b) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!b) return res.status(404).json({ error: 'Business not found' });
      if (b.owner_user_id !== req.user.id) return res.status(403).json({ error: 'Not the owner.' });
      db.run(`INSERT INTO business_agents (business_id, duties, thresholds, active)
          VALUES (?, ?, ?, ?) ON CONFLICT(business_id)
          DO UPDATE SET duties = ?, thresholds = ?, active = ?, updated_at = CURRENT_TIMESTAMP`,
        [req.params.id, JSON.stringify(duties), JSON.stringify(thresholds || {}), active === undefined ? 1 : (active ? 1 : 0),
         JSON.stringify(duties), JSON.stringify(thresholds || {}), active === undefined ? 1 : (active ? 1 : 0)],
        (uErr) => {
          if (uErr) return res.status(500).json({ error: uErr.message });
          agentConfig(req.params.id).then((cfg) => res.json(cfg)).catch((e) => res.status(500).json({ error: e.message }));
        });
    });
  });

  // GET /api/businesses/:id/agent — owner sees config + recent runs.
  router.get('/:id/agent', authenticateToken, (req, res) => {
    db.get('SELECT * FROM businesses WHERE id = ?', [req.params.id], (err, b) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!b) return res.status(404).json({ error: 'Business not found' });
      if (b.owner_user_id !== req.user.id) return res.status(403).json({ error: 'Not the owner.' });
      agentConfig(req.params.id).then((cfg) => {
        db.all('SELECT * FROM agent_runs WHERE business_id = ? ORDER BY id DESC LIMIT 10',
          [req.params.id], (e2, runs) => {
            if (e2) return res.status(500).json({ error: e2.message });
            res.json({ agent: cfg, runs: runs || [] });
          });
      }).catch((e) => res.status(500).json({ error: e.message }));
    });
  });

  // POST /api/businesses/:id/agent/run {duty, input?} — owner triggers a duty.
  router.post('/:id/agent/run', authenticateToken, (req, res) => {
    const { duty, input } = req.body;
    if (!duty) return res.status(400).json({ error: 'duty is required' });
    db.get('SELECT * FROM businesses WHERE id = ?', [req.params.id], (err, b) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!b) return res.status(404).json({ error: 'Business not found' });
      if (b.owner_user_id !== req.user.id) return res.status(403).json({ error: 'Not the owner.' });
      agentConfig(req.params.id).then(async (cfg) => {
        if (!cfg) return res.status(400).json({ error: 'Agent not configured' });
        if (cfg.active !== 1) return res.status(400).json({ error: 'Agent is paused' });
        if (!cfg.duties.includes(duty)) return res.status(400).json({ error: `duty '${duty}' not enabled` });
        try {
          const out = await runDuty(duty, asJson(b), input, cfg);
          recordRun(b.id, duty, input, out, 'owner', res);
        } catch (e) {
          recordRun(b.id, duty, input, { error: e.message }, 'owner', res);
        }
      }).catch((e) => res.status(500).json({ error: e.message }));
    });
  });

  return router;
};
