// Server-side agent RBAC (FF-B): identity -> role -> tools -> scopes ->
// financial limit -> approval policy -> audit. Enforced in middleware and
// gateway code; NEVER decided by the LLM.
const TOOLS = {
  propose: { write: false },
  observe: { write: false },
  quote: { write: false },
  execute: { write: true },
  spend: { write: true },
};

function roleOf(agent) {
  if (!agent) return 'none';
  return agent.permissions === 'read/write' ? 'operator' : 'observer';
}

// Cost guard: spend caps live on the API key (spend_limit_paise), enforced here.
function checkTool(agent, tool, costPaise = 0) {
  const spec = TOOLS[tool];
  const at = new Date().toISOString();
  if (!agent) return { ok: false, reason: 'no agent identity', audit: { tool, at } };
  if (!spec) return { ok: false, reason: `unknown tool '${tool}'`, audit: { agent: agent.id, tool, at } };
  if (spec.write && roleOf(agent) !== 'operator') {
    return { ok: false, reason: 'write tool requires operator role', audit: { agent: agent.id, tool, at } };
  }
  const cap = agent.spendLimitPaise;
  if (costPaise > 0 && cap !== null && cap !== undefined && costPaise > cap) {
    return { ok: false, reason: `cost ${costPaise} exceeds spend cap ${cap}`,
      audit: { agent: agent.id, tool, costPaise, cap, at } };
  }
  return { ok: true, audit: { agent: agent.id, tool, costPaise, at } };
}

module.exports = { TOOLS, roleOf, checkTool };
