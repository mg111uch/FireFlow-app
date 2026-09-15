// PIE gateway envelopes (FF-B): strict proposal + receipt schemas.
// Byte-compatible with in-repo `codebase/modules/economy/pie_protocol.py`
// (same key lists). Validation is server-side, NEVER LLM-decided.
const PROPOSAL_REQUIRED = ['proposal_id', 'objective', 'action', 'budget_paise',
  'risk', 'required_capabilities', 'expected_outcome', 'authorization'];
const RECEIPT_REQUIRED = ['proposal_id', 'execution_id', 'status',
  'actual_cost_paise', 'evidence', 'result', 'economic_delta'];
const RISKS = ['low', 'medium', 'high'];
const RECEIPT_STATUS = ['succeeded', 'failed', 'partial'];
const AUTHORIZATIONS = ['agent', 'owner', 'human'];

function str(v) { return typeof v === 'string' && v.length > 0; }

function validateProposal(b) {
  const body = b || {};
  for (const k of PROPOSAL_REQUIRED) {
    if (body[k] === undefined || body[k] === null) return { valid: false, error: `'${k}' is required.` };
  }
  if (!str(body.proposal_id)) return { valid: false, error: 'proposal_id must be a non-empty string.' };
  if (!str(body.objective)) return { valid: false, error: 'objective must be a non-empty string.' };
  if (!str(body.action)) return { valid: false, error: 'action must be a non-empty string.' };
  if (typeof body.budget_paise !== 'number' || body.budget_paise < 0) {
    return { valid: false, error: 'budget_paise must be a non-negative number.' };
  }
  if (!RISKS.includes(body.risk)) return { valid: false, error: `risk must be one of ${RISKS.join(', ')}.` };
  if (!Array.isArray(body.required_capabilities) || !body.required_capabilities.length
      || !body.required_capabilities.every(str)) {
    return { valid: false, error: 'required_capabilities must be a non-empty string array.' };
  }
  if (typeof body.expected_outcome !== 'object' || body.expected_outcome === null) {
    return { valid: false, error: 'expected_outcome must be an object.' };
  }
  if (!AUTHORIZATIONS.includes(body.authorization)) {
    return { valid: false, error: `authorization must be one of ${AUTHORIZATIONS.join(', ')}.` };
  }
  return { valid: true };
}

function validateReceipt(b) {
  const body = b || {};
  for (const k of RECEIPT_REQUIRED) {
    if (body[k] === undefined || body[k] === null) return { valid: false, error: `'${k}' is required.` };
  }
  if (!str(body.proposal_id)) return { valid: false, error: 'proposal_id must be a non-empty string.' };
  if (!str(body.execution_id)) return { valid: false, error: 'execution_id must be a non-empty string.' };
  if (!RECEIPT_STATUS.includes(body.status)) {
    return { valid: false, error: `status must be one of ${RECEIPT_STATUS.join(', ')}.` };
  }
  if (typeof body.actual_cost_paise !== 'number' || body.actual_cost_paise < 0) {
    return { valid: false, error: 'actual_cost_paise must be a non-negative number.' };
  }
  if (typeof body.result !== 'object' || body.result === null) {
    return { valid: false, error: 'result must be an object.' };
  }
  return { valid: true };
}

module.exports = { PROPOSAL_REQUIRED, RECEIPT_REQUIRED, RISKS, RECEIPT_STATUS,
  AUTHORIZATIONS, validateProposal, validateReceipt };
