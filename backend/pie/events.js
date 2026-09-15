// PIE execution evidence -> market signals (FF-B). Only the CHECK-allowed
// signal types may be written; anything else is rejected, not coerced.
const db = require('../database');

const SIGNAL_TYPES = ['trend', 'demand', 'policy', 'tech_cost'];

function recordEvidence({ signalType, title, detail, region, reporterId }, cb) {
  if (!SIGNAL_TYPES.includes(signalType)) {
    return cb(new Error(`signal_type must be one of ${SIGNAL_TYPES.join(', ')}`));
  }
  if (!title) return cb(new Error('title is required'));
  db.run(`INSERT INTO market_signals (signal_type, title, detail, region, reported_by)
      VALUES (?, ?, ?, ?, ?)`,
    [signalType, title, detail || '', region || '', reporterId],
    function (err) {
      if (err) return cb(err);
      db.get('SELECT * FROM market_signals WHERE id = ?', [this.lastID], cb);
    });
}

module.exports = { SIGNAL_TYPES, recordEvidence };
