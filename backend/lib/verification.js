// Verification helper — single gate for "verification before first payout".
// A user is verified iff they own >= 1 unit with verification_status='verified'.
const db = require('../database');

function userVerified(userId, cb) {
  db.get(
    "SELECT 1 FROM units WHERE owner_user_id = ? AND verification_status = 'verified' LIMIT 1",
    [userId],
    (err, row) => cb(err, !!row)
  );
}

// Gate a payout-bound res flow on worker verification. Calls next() if ok.
function requireWorkerVerified(workerId, res, next) {
  if (!workerId) {
    res.status(400).json({ error: 'No worker assigned yet.' });
    return;
  }
  userVerified(workerId, (err, ok) => {
    if (err) {
      res.status(500).json({ error: 'Database error.' });
      return;
    }
    if (!ok) {
      res.status(403).json({ error: 'Worker identity verification required before first payout.' });
      return;
    }
    next();
  });
}

module.exports = { userVerified, requireWorkerVerified };
