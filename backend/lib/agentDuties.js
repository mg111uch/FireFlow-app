// Business-agent duties (C2) — deterministic, data-local.
// Implemented: inventory_watch, supplier_discovery, market_intel,
// quotation, business_analysis. Deferred (need comms channels):
// sales_outreach, procurement, customer_support, hiring_screens.
const db = require('../database');

const DUTIES = ['inventory_watch', 'supplier_discovery', 'market_intel',
  'quotation', 'business_analysis'];

function get(db, q, p) {
  return new Promise((resolve, reject) => {
    db.get(q, p, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(db, q, p) {
  return new Promise((resolve, reject) => {
    db.all(q, p, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

async function inventoryWatch(business, input, config) {
  const snap = await get(db, `SELECT metrics FROM twin_snapshots WHERE business_id = ?
    ORDER BY id DESC LIMIT 1`, [business.id]);
  let metrics = {};
  try { metrics = snap && snap.metrics ? JSON.parse(snap.metrics) : {}; } catch { metrics = {}; }
  const thresholds = { ...(config.thresholds || {}), ...((input && input.thresholds) || {}) };
  const breaches = [];
  for (const [k, min] of Object.entries(thresholds)) {
    const v = metrics[k];
    if (typeof v === 'number' && v < Number(min)) breaches.push({ metric: k, value: v, min: Number(min) });
  }
  return { ok: breaches.length === 0, breaches, checked: Object.keys(thresholds) };
}

async function supplierDiscovery(business, input) {
  const cap = ((input && input.capability) || '').toLowerCase();
  if (!cap) throw new Error('capability is required');
  const region = ((input && input.region) || '').toLowerCase();
  const rows = await all(db, 'SELECT id, unit_id, display_name, region, capabilities FROM businesses', []);
  return {
    capability: input.capability,
    matches: rows
      .map((r) => {
        try { r.capabilities = r.capabilities ? JSON.parse(r.capabilities) : []; } catch { r.capabilities = []; }
        return r;
      })
      .filter((r) => r.id !== business.id
        && r.capabilities.some((c) => String(c).toLowerCase().includes(cap))
        && (!region || (r.region || '').toLowerCase().includes(region)))
      .map((r) => ({ id: r.id, display_name: r.display_name, region: r.region, capabilities: r.capabilities })),
  };
}

async function marketIntel() {
  const rows = await all(db, `SELECT id, problem, customer, price, score, verdict
    FROM opportunities WHERE status = 'scored' ORDER BY score DESC LIMIT 5`, []);
  const signals = await all(db, `SELECT id, signal_type, title, region, created_at
    FROM market_signals ORDER BY created_at DESC LIMIT 5`, []);
  return { top: rows, count: rows.length, signals };
}

async function quotation(business, input) {
  const items = (input && input.items) || [];
  if (!Array.isArray(items) || !items.length) throw new Error('items array is required');
  const lines = items.map((it) => ({
    desc: String(it.desc || ''), qty: Number(it.qty) || 0, rate: Number(it.rate) || 0,
    amount: (Number(it.qty) || 0) * (Number(it.rate) || 0),
  }));
  return { from: business.display_name || business.unit_id, title: (input && input.title) || 'Quotation',
    terms: (input && input.terms) || '', lines,
    total: lines.reduce((s, l) => s + l.amount, 0) };
}

async function businessAnalysis(business) {
  const trows = await all(db, `SELECT status, COUNT(*) AS n FROM tasks
    WHERE poster_id = ? GROUP BY status`, [business.owner_user_id]);
  const tasks = {};
  trows.forEach((r) => { tasks[r.status] = r.n; });
  const cash = await get(db, `SELECT COALESCE(SUM(CASE WHEN entry_type = 'income' THEN amount_paise ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount_paise ELSE 0 END), 0) AS expense
      FROM ledger WHERE (entry_type = 'income' AND to_user = ?)
      OR (entry_type = 'expense' AND from_user = ?)`,
    [business.owner_user_id, business.owner_user_id]);
  const opps = await all(db, `SELECT COUNT(*) AS n FROM opportunities
    WHERE user_id = ? AND status = 'scored'`, [business.owner_user_id]);
  return { tasks, cashflow_paise: cash, open_opportunities: (opps[0] && opps[0].n) || 0 };
}

async function runDuty(duty, business, input, config) {
  switch (duty) {
    case 'inventory_watch': return inventoryWatch(business, input, config || {});
    case 'supplier_discovery': return supplierDiscovery(business, input);
    case 'market_intel': return marketIntel();
    case 'quotation': return quotation(business, input);
    case 'business_analysis': return businessAnalysis(business, input);
    default: throw new Error(`unknown duty '${duty}'`);
  }
}

module.exports = { DUTIES, runDuty };
