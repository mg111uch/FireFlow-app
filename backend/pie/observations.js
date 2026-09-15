// PIE observation ingest (FF-B): execution receipts land in the existing
// `observations` table (metric='pie_receipt'). No new tables this slice.
const db = require('../database');

function ingestObservation({ reporterId, businessId, metric, value, note, region }, cb) {
  db.run(`INSERT INTO observations (reporter_id, business_id, metric, value, note, region)
      VALUES (?, ?, ?, ?, ?, ?)`,
    [reporterId, businessId || null, metric, value ?? null, note || '', region || ''],
    function (err) {
      if (err) return cb(err);
      db.get('SELECT * FROM observations WHERE id = ?', [this.lastID], cb);
    });
}

module.exports = { ingestObservation };
