// Proposal authorization policy (FF-B): pure function of agent record +
// envelope. High risk or >50% of cap needs human approval; over cap denies.
const { checkTool } = require('./permissions');

const WRITE_ACTIONS = ['execute', 'spend', 'book', 'publish'];

function approvalThreshold(agent) {
  const cap = agent && agent.spendLimitPaise;
  if (cap === null || cap === undefined) return 100000; // 1000 INR default
  return Math.floor(cap / 2);
}

function authorize(agent, proposal) {
  const p = proposal || {};
  const tool = WRITE_ACTIONS.includes(p.action) ? p.action : 'propose';
  const gate = checkTool(agent, tool === 'propose' ? 'propose' : 'execute',
    Number(p.budget_paise) || 0);
  if (!gate.ok) return { decision: 'denied', reason: gate.reason, audit: gate.audit };
  if (p.risk === 'high') {
    return { decision: 'needs_approval', reason: 'high-risk action needs human approval', audit: gate.audit };
  }
  if ((Number(p.budget_paise) || 0) > approvalThreshold(agent)) {
    return { decision: 'needs_approval', reason: 'budget exceeds approval threshold', audit: gate.audit };
  }
  return { decision: 'authorized', reason: 'within policy', audit: gate.audit };
}

module.exports = { WRITE_ACTIONS, approvalThreshold, authorize };
