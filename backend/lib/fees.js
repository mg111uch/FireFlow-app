// Fee policy (D1 revenue rails) — runtime-changeable, no redeploy.
// Keys: task_rake_bps (default 500 = 5% of task payouts, deducted from worker
// income). Gigs price their spread in (price vs payout) — no bps needed.
// Data/compute money rails land here when their settlement exists.
const db = require('../database');

const DEFAULTS = { task_rake_bps: '500', gig_rake_bps: '500', contract_rake_bps: '300',
  data_access_fee_paise: '5000', compute_job_bps: '1000', welfare_bps: '100',
  export_incentive_bps: '200', export_required_docs: '["IEC"]' };

function getFee(key, cb) {
  db.get('SELECT value FROM fee_config WHERE key = ?', [key], (err, row) => {
    if (err) return cb(err);
    if (row) return cb(null, row.value);
    cb(null, DEFAULTS[key] ?? '');
  });
}

function getFees(cb) {
  getFee('task_rake_bps', (err, v) => {
    if (err) return cb(err);
    const bps = Math.max(0, Number(v) || 0);
    cb(null, { task_rake_bps: bps });
  });
}

function setFee(key, value, cb) {
  db.run(`INSERT INTO fee_config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
    [key, String(value), String(value)], cb);
}

// Export policy: incentive bps + required compliance docs (both changeable).
function getExportPolicy(cb) {
  getFee('export_incentive_bps', (e1, bps) => {
    if (e1) return cb(e1);
    getFee('export_required_docs', (e2, docs) => {
      if (e2) return cb(e2);
      let required = ['IEC'];
      try {
        const parsed = JSON.parse(docs || '');
        if (Array.isArray(parsed)) required = parsed;
      } catch { /* default stands */ }
      cb(null, { incentive_bps: Math.max(0, Number(bps) || 0), required_docs: required });
    });
  });
}

// Rake policy: all bps heads in one read (task/gig/contract/welfare).
function getRakePolicy(cb) {
  const keys = ['task_rake_bps', 'gig_rake_bps', 'contract_rake_bps', 'welfare_bps'];
  const out = {};
  (function next(i) {
    if (i >= keys.length) return cb(null, out);
    getFee(keys[i], (err, v) => {
      if (err) return cb(err);
      out[keys[i]] = Math.max(0, Number(v) || 0);
      next(i + 1);
    });
  })(0);
}

function getDataAccessFee(cb) {
  getFee('data_access_fee_paise', (err, v) => {
    if (err) return cb(err);
    cb(null, Math.max(0, Number(v) || 0));
  });
}

function getComputeFeeBps(cb) {
  getFee('compute_job_bps', (err, v) => {
    if (err) return cb(err);
    cb(null, Math.max(0, Number(v) || 0));
  });
}

module.exports = { DEFAULTS, getFee, getFees, setFee, getExportPolicy, getRakePolicy, getDataAccessFee, getComputeFeeBps };
