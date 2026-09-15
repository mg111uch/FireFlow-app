// Opportunities routes — FireFlow A4 thin proxy over PIE scoring (single source).
// No weights/formula here: POST /:id/score shells to PIE score_cli.py and
// caches {score, verdict, breakdown}. Challenge reuses the same call.
const express = require('express');
const { execFile } = require('child_process');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const { stage, rupeesToPaise } = require('../lib/ledger');

const SCORE_CLI = process.env.PIE_SCORE_CLI
  || '/home/manigupt/Hello/Agentic_Unit_PIE/codebase/modules/economy/score_cli.py';

function num(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function in01(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 1;
}

function validateOpp(b) {
  if (!b.problem || typeof b.problem !== 'string') return 'problem is required';
  if (!b.customer || typeof b.customer !== 'string') return 'customer is required';
  for (const k of ['price', 'cost', 'margin', 'startup_cost']) {
    if (b[k] !== undefined && !(num(b[k]) >= 0)) return `${k} must be a number >= 0`;
  }
  for (const k of ['moonshot_relevance', 'scalability', 'adjacency']) {
    if (b[k] !== undefined && !in01(b[k])) return `${k} must be in [0,1]`;
  }
  return null;
}

function toPieOpp(row) {
  return {
    problem: row.problem, customer: row.customer,
    price: row.price, cost: row.cost, margin: row.margin,
    startup_cost: row.startup_cost,
    time_to_revenue: row.time_to_revenue || '',
    moonshot_relevance: row.moonshot_relevance || 0,
    scalability: row.scalability || 0, adjacency: row.adjacency || 0,
  };
}

// Single call site to PIE: never reimplement scoring in JS.
function pieScore(opp) {
  return new Promise((resolve, reject) => {
    execFile('conda', ['run', '-n', 'myenv', 'python', SCORE_CLI, JSON.stringify({ opportunity: opp, unit: {} })],
      { timeout: 60000 }, (err, stdout) => {
        if (err) return reject(new Error('PIE scoring failed: ' + err.message));
        try {
          const out = JSON.parse(stdout);
          if (out.error) return reject(new Error(out.error));
          resolve(out);
        } catch (e) {
          reject(new Error('PIE scoring returned invalid JSON'));
        }
      });
  });
}

module.exports = (io) => {
  const router = express.Router();

  router.post('/', authenticateToken, (req, res) => {
    const err = validateOpp(req.body);
    if (err) return res.status(400).json({ error: err });
    const b = req.body;
    db.run(`INSERT INTO opportunities (problem, customer, price, cost, margin,
        startup_cost, time_to_revenue, moonshot_relevance, scalability, adjacency, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.problem, b.customer, num(b.price), num(b.cost), num(b.margin),
       num(b.startup_cost), b.time_to_revenue || '', num(b.moonshot_relevance),
       num(b.scalability), num(b.adjacency), req.user.id],
      function (dbErr) {
        if (dbErr) return res.status(500).json({ error: dbErr.message });
        db.get('SELECT * FROM opportunities WHERE id = ?', [this.lastID], (e2, row) => {
          if (e2) return res.status(500).json({ error: e2.message });
          res.status(201).json(row);
        });
      });
  });

  router.get('/', optionalAuthenticateToken, (req, res) => {
    const { verdict, status } = req.query;
    let q = 'SELECT * FROM opportunities WHERE 1=1';
    const p = [];
    if (verdict) { q += ' AND verdict = ?'; p.push(verdict); }
    else if (status) { q += ' AND status = ?'; p.push(status); }
    q += ' ORDER BY score DESC, created_at DESC';
    db.all(q, p, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json((rows || []).map((r) => ({ ...r, breakdown: r.breakdown ? JSON.parse(r.breakdown) : null })));
    });
  });

  // E scanner: signals → scored drafts. Heuristic economics prefill the
  // draft (editable on accept); PIE scores. Defined before /:id.
  const SCAN_RELEVANCE = { demand: 0.7, trend: 0.6, policy: 0.5, tech_cost: 0.5 };

  // GET /api/opportunities/scan?region=&limit= — ranked draft candidates.
  router.get('/scan', optionalAuthenticateToken, async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 10, 10);
    const { region } = req.query;
    let q = 'SELECT * FROM market_signals WHERE signal_type IN (\'demand\', \'trend\')';
    const p = [];
    if (region) { q += ' AND region = ?'; p.push(region); }
    q += ' ORDER BY created_at DESC LIMIT ?';
    p.push(limit);
    db.all(q, p, async (err, sigs) => {
      if (err) return res.status(500).json({ error: err.message });
      const drafts = [];
      for (const s of sigs || []) {
        const opp = { problem: s.title, customer: s.region || 'open market',
          price: 100, cost: 60, margin: 0.4, startup_cost: 500,
          time_to_revenue: '90d', moonshot_relevance: SCAN_RELEVANCE[s.signal_type] ?? 0.5,
          scalability: 0.5, adjacency: 0.5 };
        try {
          const out = await pieScore(opp);
          drafts.push({ signal_id: s.id, signal_type: s.signal_type, region: s.region,
            draft: opp, score: out.score, verdict: out.verdict });
        } catch {
          drafts.push({ signal_id: s.id, signal_type: s.signal_type, region: s.region,
            draft: opp, score: null, verdict: 'UNSCORED' });
        }
      }
      drafts.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
      res.json({ drafts, heuristic: 'price 100 / cost 60 / startup 500 / 90d — edit on accept' });
    });
  });

  // POST /api/opportunities/scan/accept {signal_id, overrides?} — draft to opp.
  router.post('/scan/accept', authenticateToken, (req, res) => {
    const { signal_id, overrides } = req.body;
    if (!signal_id) return res.status(400).json({ error: 'signal_id is required' });
    db.get('SELECT * FROM market_signals WHERE id = ?', [signal_id], (err, s) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!s) return res.status(404).json({ error: 'Signal not found' });
      const o = { problem: s.title, customer: s.region || 'open market',
        price: 100, cost: 60, margin: 0.4, startup_cost: 500,
        time_to_revenue: '90d', moonshot_relevance: SCAN_RELEVANCE[s.signal_type] ?? 0.5,
        scalability: 0.5, adjacency: 0.5, ...(overrides || {}) };
      const vErr = validateOpp({ ...o, problem: o.problem, customer: o.customer });
      if (vErr) return res.status(400).json({ error: vErr });
      db.run(`INSERT INTO opportunities (problem, customer, price, cost, margin,
          startup_cost, time_to_revenue, moonshot_relevance, scalability, adjacency, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [o.problem, o.customer, num(o.price), num(o.cost), num(o.margin),
         num(o.startup_cost), o.time_to_revenue || '', num(o.moonshot_relevance),
         num(o.scalability), num(o.adjacency), req.user.id],
        function (dbErr) {
          if (dbErr) return res.status(500).json({ error: dbErr.message });
          db.get('SELECT * FROM opportunities WHERE id = ?', [this.lastID], (e2, row) => {
            if (e2) return res.status(500).json({ error: e2.message });
            if (io) io.emit('opportunityDraftAccepted', { id: row.id, signal_id: s.id });
            res.status(201).json({ ...row, from_signal: s.id });
          });
        });
    });
  });

  router.get('/:id', optionalAuthenticateToken, (req, res) => {
    db.get('SELECT * FROM opportunities WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Opportunity not found' });
      if (row.breakdown) row.breakdown = JSON.parse(row.breakdown);
      res.json(row);
    });
  });

  // Score via PIE (single source) + cache. Challenge rides the same output.
  async function scoreAndCache(id, res) {
    db.get('SELECT * FROM opportunities WHERE id = ?', [id], async (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Opportunity not found' });
      try {
        const out = await pieScore(toPieOpp(row));
        db.run('UPDATE opportunities SET score = ?, verdict = ?, breakdown = ?, status = ? WHERE id = ?',
          [out.score, out.verdict, JSON.stringify(out.breakdown), 'scored', id], (uErr) => {
            if (uErr) return res.status(500).json({ error: uErr.message });
            if (io) io.emit('opportunityScored', { id: Number(id), score: out.score, verdict: out.verdict });
            res.json({ ...row, score: out.score, verdict: out.verdict, breakdown: out.breakdown, challenge: out.challenge });
          });
      } catch (e) {
        res.status(502).json({ error: e.message });
      }
    });
  }

  router.post('/:id/score', authenticateToken, (req, res) => scoreAndCache(req.params.id, res));
  router.post('/:id/challenge', authenticateToken, (req, res) => scoreAndCache(req.params.id, res));

  // C5 pipeline: score → challenge → stage → approve → execute → reconcile.
  // Approve reuses POST /api/ledger/:id/approve (human JWT). Twin-update is C3.

  // POST /:id/stage — owner stages the startup estimate (scored opps only).
  router.post('/:id/stage', authenticateToken, (req, res) => {
    db.get('SELECT * FROM opportunities WHERE id = ?', [req.params.id], (err, o) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!o) return res.status(404).json({ error: 'Opportunity not found' });
      if (o.user_id !== req.user.id) return res.status(403).json({ error: 'Not your opportunity' });
      if (o.score === null || o.score === undefined) {
        return res.status(400).json({ error: 'Score the opportunity first' });
      }
      if (o.status === 'staged') return res.status(400).json({ error: 'Already staged' });
      stage({ amountPaise: rupeesToPaise(o.startup_cost), fromUser: o.user_id,
        toUser: o.user_id, refType: 'opportunity', refId: o.id,
        memo: 'opportunity staging', by: req.user.id, via: 'user' }, (sErr, staged) => {
          if (sErr) return res.status(500).json({ error: sErr.message });
          db.run("UPDATE opportunities SET status = 'staged' WHERE id = ?", [o.id], (uErr) => {
            if (uErr) return res.status(500).json({ error: uErr.message });
            if (io) io.emit('opportunityStaged', { id: o.id, staged_id: staged.id });
            res.status(201).json({ opportunity_id: o.id, status: 'staged', staged });
          });
        });
    });
  });

  // POST /:id/execute {task_id} — bind staged+approved opp to an executing task.
  router.post('/:id/execute', authenticateToken, (req, res) => {
    const { task_id } = req.body;
    if (!task_id) return res.status(400).json({ error: 'task_id is required' });
    db.get('SELECT * FROM opportunities WHERE id = ?', [req.params.id], (err, o) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!o) return res.status(404).json({ error: 'Opportunity not found' });
      if (o.user_id !== req.user.id) return res.status(403).json({ error: 'Not your opportunity' });
      if (o.status !== 'staged') return res.status(400).json({ error: 'Stage the opportunity first' });
      if (o.pipeline === 'executed' || o.pipeline === 'reconciled') {
        return res.status(400).json({ error: `Already ${o.pipeline}` });
      }
      db.get(`SELECT 1 FROM ledger WHERE entry_type = 'approved' AND ref_type = 'opportunity'
          AND ref_id = ? LIMIT 1`, [o.id], (e2, appr) => {
            if (e2) return res.status(500).json({ error: e2.message });
            if (!appr) return res.status(400).json({ error: 'Human approval required before execute (approve the staged entry)' });
            db.get('SELECT * FROM tasks WHERE id = ?', [task_id], (e3, t) => {
              if (e3) return res.status(500).json({ error: e3.message });
              if (!t) return res.status(404).json({ error: 'Task not found' });
              if (t.poster_id !== req.user.id) return res.status(403).json({ error: 'Task poster must own the opportunity' });
              db.run("UPDATE opportunities SET executing_task_id = ?, pipeline = 'executed' WHERE id = ?",
                [task_id, o.id], (uErr) => {
                  if (uErr) return res.status(500).json({ error: uErr.message });
                  if (io) io.emit('opportunityExecuted', { id: o.id, task_id });
                  res.json({ opportunity_id: o.id, pipeline: 'executed', executing_task_id: Number(task_id) });
                });
            });
          });
    });
  });

  // POST /:id/reconcile — owner closes the loop: estimate vs actuals.
  router.post('/:id/reconcile', authenticateToken, (req, res) => {
    db.get('SELECT * FROM opportunities WHERE id = ?', [req.params.id], (err, o) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!o) return res.status(404).json({ error: 'Opportunity not found' });
      if (o.user_id !== req.user.id) return res.status(403).json({ error: 'Not your opportunity' });
      if (o.pipeline !== 'executed') return res.status(400).json({ error: 'Execute first' });
      if (!o.executing_task_id) return res.status(400).json({ error: 'No executing task' });
      db.get('SELECT * FROM tasks WHERE id = ?', [o.executing_task_id], (e2, t) => {
        if (e2) return res.status(500).json({ error: e2.message });
        if (!t || t.status !== 'paid') {
          return res.status(400).json({ error: 'Executing task must be paid first' });
        }
        db.get(`SELECT COALESCE(SUM(amount_paise), 0) AS s FROM ledger
            WHERE entry_type = 'staged' AND ref_type = 'opportunity' AND ref_id = ?`, [o.id], (e3, st) => {
              if (e3) return res.status(500).json({ error: e3.message });
              db.get(`SELECT COALESCE(SUM(amount_paise), 0) AS s FROM ledger
                  WHERE entry_type = 'income' AND ref_type = 'task' AND ref_id = ?`, [t.id], (e4, act) => {
                    if (e4) return res.status(500).json({ error: e4.message });
                    const estimate = rupeesToPaise(o.startup_cost);
                    const actual = act.s || 0;
                    db.run("UPDATE opportunities SET pipeline = 'reconciled' WHERE id = ?", [o.id], (uErr) => {
                      if (uErr) return res.status(500).json({ error: uErr.message });
                      if (io) io.emit('opportunityReconciled', { id: o.id });
                      res.json({ opportunity_id: o.id, pipeline: 'reconciled',
                        estimate_paise: estimate, staged_paise: st.s || 0,
                        actual_paise: actual, variance_paise: actual - estimate });
                    });
                  });
            });
      });
    });
  });

  return router;
};
