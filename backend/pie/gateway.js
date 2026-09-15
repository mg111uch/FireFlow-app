// PIE gateway router (FF-B): proposal -> authorize -> execute -> evidence ->
// result envelopes. Mounted at /api/pie (see app.js). Receipt ingest is
// idempotent per execution_id (in-memory set + note lookup; slice-scoped —
// FF-C adds idempotency keys).
const express = require('express');
const db = require('../database');
const { authenticateAgentApiKey } = require('../middleware/agentAuth');
const { PROPOSAL_REQUIRED, validateProposal, validateReceipt } = require('./commands');
const { authorize } = require('./policies');
const { ingestObservation } = require('./observations');

const seenExecutions = new Set();
function resetSeenForTests() { seenExecutions.clear(); }

const router = express.Router();
router.use(authenticateAgentApiKey);

// POST /api/pie/propose — validate envelope, server-side authorize.
router.post('/propose', (req, res) => {
  const v = validateProposal(req.body);
  if (!v.valid) return res.status(400).json({ error: v.error });
  const a = authorize(req.agent, req.body);
  const code = a.decision === 'denied' ? 403 : 200;
  res.status(code).json({ proposal_id: req.body.proposal_id,
    decision: a.decision, reason: a.reason });
});

// POST /api/pie/receipts — validate, dedupe, store as observation.
router.post('/receipts', (req, res) => {
  const v = validateReceipt(req.body);
  if (!v.valid) return res.status(400).json({ error: v.error });
  const execId = req.body.execution_id;
  const done = (row, dedup) => res.status(200).json({ stored: true,
    observation_id: row ? row.id : undefined, execution_id: execId,
    ...(dedup ? { dedup: true } : {}) });
  if (seenExecutions.has(execId)) {
    return db.get('SELECT * FROM observations WHERE note LIKE ? ORDER BY id DESC LIMIT 1',
      [`%${execId}%`], (err, row) => {
        if (err || !row) return res.status(200).json({ stored: true, execution_id: execId, dedup: true });
        done(row, true);
      });
  }
  seenExecutions.add(execId);
  ingestObservation({
    reporterId: req.agent.userId,
    metric: 'pie_receipt',
    value: req.body.actual_cost_paise,
    note: JSON.stringify({ execution_id: execId, proposal_id: req.body.proposal_id,
      status: req.body.status, economic_delta: req.body.economic_delta }),
    region: '',
  }, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    done(row, false);
  });
});

router.get('/health', (req, res) => res.json({ ok: true, envelope_keys: PROPOSAL_REQUIRED }));

module.exports = router;
module.exports.resetSeenForTests = resetSeenForTests;
