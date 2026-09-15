// Single-book ledger (A7): EVERY rupee movement lives here as
// income/expense/staged/approved rows, amounts in paise. No other module
// keeps money state (gateway tables are adapter records, not books).
// Agents propose (staged); humans approve. Human-direct actions
// (poster pays) record the approved set immediately.
const db = require('../database');

function rupeesToPaise(r) {
  return Math.round((Number(r) || 0) * 100);
}

// Authoritative-ledger columns (FF-C, additive): debit/credit accounts,
// provider_tx_id, contract_id, actor, status state machine, idempotency_key
// (UNIQUE), evidence JSON. Existing rows default to settled, history intact.
const TRANSITIONS = {
  pending: ['authorized', 'failed', 'disputed'],
  authorized: ['captured', 'failed', 'disputed', 'refunded'],
  captured: ['settled', 'disputed', 'refunded'],
  settled: ['refunded', 'reversed', 'disputed'],
  disputed: ['settled', 'refunded', 'reversed'],
  failed: [], refunded: [], reversed: [],
};

function transitionOk(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

function dupErr(err) {
  return err && /UNIQUE constraint failed: ledger\.idempotency_key/.test(err.message);
}

// Migrations run unordered at boot, so the idempotency index is ensured
// here (idempotent DDL) on first keyed write instead of in schema.js.
let indexEnsured = false;
function ensureIndex(cb) {
  if (indexEnsured) return cb();
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_idempotency ON ledger(idempotency_key)',
    (err) => {
      if (!err) indexEnsured = true;
      cb(err);
    });
}

function withIndex(entry, cb) {
  if (entry && entry.idempotencyKey) return ensureIndex(cb);
  cb();
}

function insert(entry, cb) {
  db.run(`INSERT INTO ledger (entry_type, amount_paise, currency, from_user,
      to_user, ref_type, ref_id, memo, created_by, created_via, approved_by,
      debit_account, credit_account, provider_tx_id, contract_id, actor,
      status, idempotency_key, evidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [entry.entry_type, entry.amount_paise, entry.currency || 'INR',
     entry.from_user ?? null, entry.to_user ?? null,
     entry.ref_type || '', entry.ref_id ?? null, entry.memo || '',
     entry.created_by ?? null, entry.created_via || 'user',
     entry.approved_by ?? null,
     entry.debit_account || '', entry.credit_account || '',
     entry.provider_tx_id ?? null, entry.contract_id ?? null,
     entry.actor || '', entry.status || 'settled',
     entry.idempotency_key ?? null,
     typeof entry.evidence === 'string' ? entry.evidence : JSON.stringify(entry.evidence || {})],
    function (err) {
      if (err) {
        if (dupErr(err)) {
          const d = new Error('DUPLICATE');
          d.code = 'DUPLICATE';
          return cb(d);
        }
        return cb(err);
      }
      db.get('SELECT * FROM ledger WHERE id = ?', [this.lastID], cb);
    });
}

// Server-side state-machine write path: invalid jumps rejected.
function setStatus(rowId, to, cb) {
  db.get('SELECT * FROM ledger WHERE id = ?', [rowId], (err, r) => {
    if (err) return cb(err);
    if (!r) return cb(new Error('NOTFOUND'));
    const from = r.status || 'settled';
    if (!transitionOk(from, to)) {
      const e = new Error(`BADTRANSITION:${from}->${to}`);
      e.code = 'BADTRANSITION';
      return cb(e);
    }
    db.run('UPDATE ledger SET status = ? WHERE id = ?', [to, rowId], (uErr) => {
      if (uErr) return cb(uErr);
      db.get('SELECT * FROM ledger WHERE id = ?', [rowId], cb);
    });
  });
}

// Human-direct payment: approved + expense (payer, gross) + income (payee,
// net) + optional rake income (payee -> platform, D1 revenue rails).
// approve()/staged flows pass no rake (rake applies at payout only).
function recordPayment({ amountPaise, grossPaise, rakePaise, welfarePaise, fromUser, toUser, refType, refId, memo, by, approvedBy, idempotencyKey, status, debitAccount, creditAccount, contractId, evidence, actor, providerTxId }, cb) {
  withIndex({ idempotencyKey }, (iErr) => {
    if (iErr) return cb(iErr);
    _recordPayment({ amountPaise, grossPaise, rakePaise, welfarePaise, fromUser, toUser, refType, refId, memo, by, approvedBy, idempotencyKey, status, debitAccount, creditAccount, contractId, evidence, actor, providerTxId }, cb);
  });
}

function _recordPayment({ amountPaise, grossPaise, rakePaise, welfarePaise, fromUser, toUser, refType, refId, memo, by, approvedBy, idempotencyKey, status, debitAccount, creditAccount, contractId, evidence, actor, providerTxId }, cb) {
  const gross = grossPaise ?? amountPaise;
  const rake = Math.max(0, Math.min(gross, rakePaise || 0));
  const welfare = Math.max(0, Math.min(gross - rake, welfarePaise || 0));
  const net = gross - rake - welfare;
  const base = { amount_paise: gross, from_user: fromUser, to_user: toUser,
    ref_type: refType, ref_id: refId, memo: memo || '', created_by: by,
    created_via: 'user', approved_by: approvedBy ?? by,
    status, debit_account: debitAccount, credit_account: creditAccount,
    contract_id: contractId, evidence, actor, provider_tx_id: providerTxId ?? null,
    idempotency_key: idempotencyKey };
  insert({ ...base, entry_type: 'approved' }, (e1) => {
    if (e1) return cb(e1);
    // Idempotency lives on the head row only; legs carry null so the
    // UNIQUE index sees one key per booking, not one per row.
    const legs = { ...base, idempotency_key: null };
    insert({ ...legs, entry_type: 'expense' }, (e2) => {
      if (e2) return cb(e2);
      insert({ ...legs, amount_paise: net, entry_type: 'income' }, (e3) => {
        if (e3) return cb(e3);
        const rakeRow = (next) => {
          if (!rake) return next();
          insert({ ...legs, amount_paise: rake, from_user: toUser, to_user: null,
            memo: `${memo || 'payout'} — marketplace rake`, entry_type: 'income',
            credit_account: 'platform' }, next);
        };
        rakeRow((e4) => {
          if (e4) return cb(e4);
          if (!welfare) return cb(null);
          insert({ ...legs, amount_paise: welfare, from_user: toUser, to_user: null,
            memo: `${memo || 'payout'} — welfare head`, entry_type: 'income',
            credit_account: 'welfare' }, cb);
        });
      });
    });
  });
}

// Double-count fix: release against an already-paid task writes a zero-amount
// reference entry (no re-booking); only unpaid releases book money.
function releaseAgainstPaid({ contractId, taskId, amountPaise, fromUser, toUser, memo, by, idempotencyKey, rakePaise, welfarePaise, providerTxId, evidence }, cb) {
  withIndex({ idempotencyKey }, (iErr) => {
    if (iErr) return cb(iErr);
    _releaseAgainstPaid({ contractId, taskId, amountPaise, fromUser, toUser, memo, by, idempotencyKey, rakePaise, welfarePaise, providerTxId, evidence }, cb);
  });
}

function _releaseAgainstPaid({ contractId, taskId, amountPaise, fromUser, toUser, memo, by, idempotencyKey, rakePaise, welfarePaise, providerTxId, evidence }, cb) {
  db.get(`SELECT id, ref_type FROM ledger WHERE entry_type = 'approved' AND amount_paise > 0
      AND ((ref_type = 'task' AND ref_id = ?) OR (ref_type = 'contract' AND ref_id = ?)) LIMIT 1`,
    [taskId, contractId], (err, prior) => {
      if (err) return cb(err);
      if (prior) {
        return insert({ entry_type: 'approved', amount_paise: 0,
          from_user: fromUser, to_user: toUser, ref_type: 'contract', ref_id: contractId,
          contract_id: contractId, provider_tx_id: providerTxId ?? null,
          memo: `release refs ${prior.ref_type} payment #${prior.id} (no re-booking)`,
          created_by: by, approved_by: by, status: 'settled',
          evidence, idempotency_key: idempotencyKey }, (iErr, row) => {
            if (iErr) return cb(iErr);
            cb(null, { referenced: prior.id, row });
          });
      }
      recordPayment({ amountPaise, fromUser, toUser, refType: 'contract', refId: contractId,
        memo: memo || 'escrow release', by, contractId, idempotencyKey,
        rakePaise, welfarePaise, providerTxId, evidence }, (pErr) => {
          if (pErr) return cb(pErr);
          cb(null, { booked: true });
        });
    });
}

// Settlement with policy splits: rake + welfare heads from fee_config bps.
function settleWithRake({ grossPaise, rakeBps, welfareBps, fromUser, toUser, refType, refId, memo, by, idempotencyKey, contractId }, cb) {
  const gross = Math.max(0, Math.round(grossPaise || 0));
  const rake = Math.round(gross * (rakeBps || 0) / 10000);
  const welfare = Math.round(gross * (welfareBps || 0) / 10000);
  recordPayment({ grossPaise: gross, rakePaise: rake, welfarePaise: welfare,
    fromUser, toUser, refType, refId, memo, by, idempotencyKey, contractId },
    (err) => {
      if (err) return cb(err);
      cb(null, { gross, rake, welfare, workerNet: gross - rake - welfare });
    });
}

// Agent/human proposal: staged row only. Returns the staged row.
function stage({ amountPaise, fromUser, toUser, refType, refId, memo, by, via }, cb) {
  insert({ entry_type: 'staged', amount_paise: amountPaise, from_user: fromUser,
    to_user: toUser, ref_type: refType, ref_id: refId, memo: memo || '',
    created_by: by, created_via: via || 'user', approved_by: null }, cb);
}

// Human approval of a staged row: approved + expense + income.
// Consumes the staged row (approved_by set) — re-approve is rejected.
function approve(stagedId, approverId, cb) {
  db.get('SELECT * FROM ledger WHERE id = ?', [stagedId], (err, s) => {
    if (err) return cb(err);
    if (!s) return cb(new Error('NOTFOUND'));
    if (s.entry_type !== 'staged') return cb(new Error('NOTSTAGED'));
    if (s.approved_by) return cb(new Error('ALREADY'));
    db.run('UPDATE ledger SET approved_by = ? WHERE id = ?', [approverId, stagedId], (uErr) => {
      if (uErr) return cb(uErr);
      recordPayment({ amountPaise: s.amount_paise, fromUser: s.from_user, toUser: s.to_user,
        refType: s.ref_type, refId: s.ref_id,
        memo: `approve staged #${s.id}${s.memo ? ': ' + s.memo : ''}`, by: s.created_by,
        approvedBy: approverId }, cb);
    });
  });
}

module.exports = { rupeesToPaise, recordPayment, stage, approve, insert, setStatus,
  transitionOk, TRANSITIONS, releaseAgainstPaid, settleWithRake };
