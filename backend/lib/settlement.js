// Settlement pipeline (FF-D): authorize -> provider -> settle -> reconcile ->
// payout -> reporting. Every step idempotent (idempotency keys), every money
// move via the FF-C ledger write path. Provider 'stub' settles instantly;
// 'fail' simulates provider failure; live Razorpay charges stay in
// routes/payments.js (no network calls from this module).
const db = require('../database');
const { releaseAgainstPaid, recordPayment } = require('./ledger');
const { getDataAccessFee } = require('./fees');

const STAGES = ['authorized', 'provider_ok', 'settled', 'reconciled', 'paid_out', 'reported', 'failed'];

function chargeProvider(provider, amountPaise, key, cb) {
  if (provider === 'fail') {
    const e = new Error('PROVIDER_FAILED');
    e.code = 'PROVIDER_FAILED';
    return cb(e);
  }
  return cb(null, { provider_tx_id: `stub_${key}`, provider: provider || 'stub' });
}

const pwrap = (fn, ...a) => new Promise((res, rej) => fn(...a, (e, r) => e ? rej(e) : res(r)));
const q = (sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, r) => e ? rej(e) : res(r)));
const qa = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => e ? rej(e) : res(r)));

// Contract settlement with fee splits. Pre-authorized input (route owns auth).
async function settleContract({ contractId, taskId, amountPaise, payer, payee,
  rakeBps, welfareBps, provider, memo, by }, cb) {
  const t = { stages: [], contract_id: contractId };
  const gross = Math.max(0, Math.round(amountPaise || 0));
  const rake = Math.round(gross * (rakeBps || 0) / 10000);
  const welfare = Math.round(gross * (welfareBps || 0) / 10000);
  t.stages.push('authorized');
  let charge;
  try {
    charge = await pwrap(chargeProvider, provider || 'stub', gross, `settle:${contractId}`);
  } catch (e) {
    t.stages.push('failed');
    t.error = e.code || e.message;
    return cb(null, t); // no payout, ledger untouched by this call
  }
  t.stages.push('provider_ok');
  t.provider_tx_id = charge.provider_tx_id;
  let rel;
  try {
    rel = await pwrap(releaseAgainstPaid, { contractId, taskId, amountPaise: gross,
      fromUser: payer, toUser: payee, memo: memo || 'contract settlement', by,
      idempotencyKey: `contract-release:${contractId}`,
      rakePaise: rake, welfarePaise: welfare, providerTxId: charge.provider_tx_id,
      evidence: { pipeline: 'settleContract', stages: t.stages } });
  } catch (e) {
    t.stages.push('failed');
    t.error = e.code || e.message;
    return cb(null, t);
  }
  t.stages.push('settled');
  t.splits = { gross, rake, welfare, workerNet: gross - rake - welfare };
  t.referenced = rel.referenced || null;
  // Reconcile: booked legs must net to the splits.
  const rows = await qa(`SELECT entry_type, amount_paise FROM ledger
      WHERE (ref_type = 'contract' AND ref_id = ?) OR (ref_type = 'task' AND ref_id = ?)`,
    [contractId, taskId]);
  const sum = (k) => rows.filter(r => r.entry_type === k).reduce((s, r) => s + r.amount_paise, 0);
  t.reconciliation = { approved: sum('approved'), expense: sum('expense'), income: sum('income') };
  t.reconciled = t.reconciliation.approved > 0 &&
    t.reconciliation.expense === t.reconciliation.approved;
  t.stages.push('reconciled');
  t.stages.push('paid_out');
  // Reporting record: transcript persisted as evidence on the head row.
  const head = await q('SELECT id, evidence FROM ledger WHERE idempotency_key = ?',
    [`contract-release:${contractId}`]).catch(() => null);
  if (head) {
    let ev = {};
    try { ev = JSON.parse(head.evidence || '{}'); } catch { ev = {}; }
    ev.settlement_report = { stages: t.stages, splits: t.splits,
      reconciled: t.reconciled, provider_tx_id: t.provider_tx_id };
    await new Promise((res2) => db.run('UPDATE ledger SET evidence = ? WHERE id = ?',
      [JSON.stringify(ev), head.id], () => res2()));
  }
  t.stages.push('reported');
  cb(null, t);
}

// Dataset access grant: flat fee per policy through the same pipeline.
async function settleDataGrant({ accessId, datasetId, requesterId, ownerId, feePaise, by }, cb) {
  try {
    await pwrap(recordPayment, { amountPaise: feePaise, fromUser: requesterId,
      toUser: ownerId, refType: 'data_access', refId: accessId,
      memo: 'dataset access fee', by, idempotencyKey: `data-grant:${accessId}` });
    return cb(null, { granted: true, fee_paise: feePaise });
  } catch (e) {
    return cb(e);
  }
}

// Compute job completion: bps fee on node-rate cost through the same pipeline.
async function settleComputeJob({ jobId, requesterId, ownerId, costPaise, feeBps, by }, cb) {
  const cost = Math.max(0, Math.round(costPaise || 0));
  const fee = Math.round(cost * (feeBps || 0) / 10000);
  try {
    await pwrap(recordPayment, { grossPaise: cost, rakePaise: fee,
      fromUser: requesterId, toUser: ownerId, refType: 'compute_job', refId: jobId,
      memo: 'compute job settlement', by, idempotencyKey: `compute-job:${jobId}` });
    return cb(null, { settled: true, cost_paise: cost, fee_paise: fee,
      workerNet: cost - fee });
  } catch (e) {
    return cb(e);
  }
}

// dataset_license: first-class grant record (pragmatic §12 core).
async function issueLicense({ datasetId, buyerId, terms, restrictions, purpose, accessId }, cb) {
  try {
    const row = await new Promise((res, rej) => db.run(
      `INSERT INTO dataset_licenses (dataset_id, buyer_id, terms, restrictions, purpose, access_id, status)
       VALUES (?, ?, ?, ?, ?, ?, 'granted')`,
      [datasetId, buyerId, terms || '', restrictions || '', purpose || '', accessId ?? null],
      function (e) { e ? rej(e) : res({ id: this.lastID }); }));
    return cb(null, { license_id: row.id, status: 'granted' });
  } catch (e) {
    return cb(e);
  }
}

async function revokeLicense(licenseId, cb) {
  const r = await q('SELECT * FROM dataset_licenses WHERE id = ?', [licenseId]).catch(() => null);
  if (!r) {
    const e = new Error('NOTFOUND');
    e.code = 'NOTFOUND';
    return cb(e);
  }
  await new Promise((res, rej) => db.run(
    "UPDATE dataset_licenses SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP WHERE id = ?",
    [licenseId], (e) => e ? rej(e) : res()));
  return cb(null, { license_id: licenseId, status: 'revoked' });
}

// Grant gate: a revoked license blocks future grants (server-side).
async function canGrant(datasetId, buyerId, cb) {
  const r = await q(`SELECT id FROM dataset_licenses WHERE dataset_id = ?
      AND buyer_id = ? AND status = 'revoked' LIMIT 1`, [datasetId, buyerId]).catch(() => null);
  return cb(null, !r);
}

// Full grant completion: revocation gate -> fee booking -> license issue.
async function completeGrant({ accessId }, cb) {
  const a = await q(`SELECT a.*, d.owner_user_id FROM data_access a
      JOIN datasets d ON d.id = a.dataset_id WHERE a.id = ?`, [accessId]).catch(() => null);
  if (!a) {
    const e = new Error('NOTFOUND');
    e.code = 'NOTFOUND';
    return cb(e);
  }
  const allowed = await new Promise((res) => canGrant(a.dataset_id, a.requester_id, (e, ok) => res(!e && ok)));
  if (!allowed) {
    const e = new Error('LICENSE_REVOKED');
    e.code = 'LICENSE_REVOKED';
    return cb(e);
  }
  const fee = await new Promise((res, rej) => getDataAccessFee((e, v) => e ? rej(e) : res(v)));
  try {
    await pwrap(settleDataGrant, { accessId, datasetId: a.dataset_id,
      requesterId: a.requester_id, ownerId: a.owner_user_id, feePaise: fee, by: a.requester_id });
  } catch (e) {
    return cb(e);
  }
  issueLicense({ datasetId: a.dataset_id, buyerId: a.requester_id, purpose: a.purpose,
    terms: 'standard', restrictions: '', accessId }, (e2, lic) => {
      if (e2) return cb(e2);
      cb(null, { access_id: accessId, fee_paise: fee, license_id: lic.license_id });
    });
}

module.exports = { STAGES, chargeProvider, settleContract, settleDataGrant,
  settleComputeJob, issueLicense, revokeLicense, canGrant, completeGrant };
