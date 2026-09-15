// Reporter reliability (sensors §11, FireFlow half): per-capability outcome
// tallies with Laplace-smoothed scores. Independent per capability; a fake
// history in one capability never drags the others.
const db = require('../database');

function recordOutcome(reporterId, capability, accurate, cb) {
  if (!reporterId || !capability) {
    const e = new Error('reporterId and capability are required');
    e.code = 'BADINPUT';
    return cb(e);
  }
  db.run(`INSERT INTO capability_scores (reporter_id, capability, correct, total)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(reporter_id, capability) DO UPDATE SET
        correct = correct + ?, total = total + 1`,
    [reporterId, capability, accurate ? 1 : 0, accurate ? 1 : 0], (err) => {
      if (err) return cb(err);
      db.get('SELECT reporter_id, capability, correct, total FROM capability_scores WHERE reporter_id = ? AND capability = ?',
        [reporterId, capability], cb);
    });
}

function laplace(correct, total) {
  return Math.round(((correct + 1) / (total + 2)) * 1000) / 1000;
}

function scoresFor(reporterId, cb) {
  db.all('SELECT capability, correct, total FROM capability_scores WHERE reporter_id = ?',
    [reporterId], (err, rows) => {
      if (err) return cb(err);
      const out = {};
      for (const r of rows || []) {
        out[r.capability] = { score: laplace(r.correct, r.total), correct: r.correct, total: r.total };
      }
      cb(null, out);
    });
}

module.exports = { recordOutcome, scoresFor, laplace };
