// unitSchema.js — THIN adapter over the kernel unit schema (FireFlow A1).
// Single source: kernel owns the schema (Agentic_Unit_PIE
// codebase/kernel/schemas/unit_schema.py; vendored artifact schema_version
// "1.0.0" at ./kernel_unit_schema.json). Every schema key list is built FROM
// the artifact at runtime — no hand-written schema key lists here.
// FireFlow-only additions (economic unit_types, ownership, verification,
// timeline) live under `fireflow.extensions` and must never shadow a kernel
// key (drift-tested). No route logic here.
const crypto = require('crypto');
const ARTIFACT = require('./kernel_unit_schema.json');

const KERNEL_SCHEMA_VERSION = ARTIFACT.schema_version;
const KERNEL_TOP = ARTIFACT.required; // top-level UnitSchema keys
const KERNEL_FIELDS = ARTIFACT.fields; // per-class field names

// FireFlow economic identity types (extension, not kernel schema).
const UNIT_TYPES = [
  'Person', 'Business', 'Organization', 'AI Agent', 'Service', 'Product',
  'Vehicle', 'Machine', 'Facility', 'Compute Node', 'Dataset',
];

// User JWT mints human/org-side types (incl. business-owned assets).
const USER_MINTABLE = [
  'Person', 'Business', 'Organization', 'Service', 'Product',
  'Vehicle', 'Facility',
];
// Agent API key mints machine-side types only. NEVER cross (403 otherwise).
const AGENT_MINTABLE = ['AI Agent', 'Machine', 'Compute Node', 'Dataset'];

// Kernel List[...] sections (container validation only, not a key list).
const LIST_SECTIONS = ['behaviors', 'signals', 'relations'];

function genUnitId(unitType) {
  const slug = String(unitType).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return `unit_${slug}_${crypto.randomBytes(6).toString('hex')}`;
}

function canMint(callerKind, unitType) {
  if (!UNIT_TYPES.includes(unitType)) return false;
  if (callerKind === 'user') return USER_MINTABLE.includes(unitType);
  if (callerKind === 'agent') return AGENT_MINTABLE.includes(unitType);
  return false;
}

// Incoming bodies: section names must be kernel top-level keys (+ unit_type
// to mint + subtype extension). Kernel Dict leaves stay schemaless.
function validateUnitInput(body) {
  const b = body || {};
  if (!b.unit_type) return { valid: false, error: 'unit_type is required.' };
  if (!UNIT_TYPES.includes(b.unit_type)) {
    return { valid: false, error: `Unknown unit_type. One of: ${UNIT_TYPES.join(', ')}.` };
  }
  const allowed = new Set([...KERNEL_TOP, 'unit_type', 'subtype']);
  for (const k of Object.keys(b)) {
    if (!allowed.has(k)) return { valid: false, error: `Unknown section '${k}'.` };
  }
  for (const k of KERNEL_TOP) {
    if (b[k] === undefined) continue;
    if (LIST_SECTIONS.includes(k)) {
      if (!Array.isArray(b[k])) return { valid: false, error: `${k} must be an array.` };
    } else if (typeof b[k] !== 'object' || b[k] === null || Array.isArray(b[k])) {
      return { valid: false, error: `${k} must be an object.` };
    }
  }
  if (b.subtype !== undefined && typeof b.subtype !== 'string') {
    return { valid: false, error: 'subtype must be a string.' };
  }
  return { valid: true };
}

function parseJson(v, fallback) {
  if (v === null || v === undefined) return fallback;
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

// Artifact-derived blank: lists for kernel List[...] sections, otherwise a
// null-filled object shaped by the kernel dataclass fields (Unit+Section).
function blankFor(section) {
  if (LIST_SECTIONS.includes(section)) return [];
  const cls = `Unit${section[0].toUpperCase()}${section.slice(1)}`;
  const fields = KERNEL_FIELDS[cls];
  if (!fields) return null;
  const o = {};
  for (const f of fields) o[f] = null;
  return o;
}

// DB row -> kernel-shaped Unit (+ fireflow.extensions + compat aliases).
function toUnit(row) {
  const r = row || {};
  const unit = {};
  for (const k of KERNEL_TOP) {
    if (k === 'identity') {
      const ident = parseJson(r.identity_json, {});
      unit.identity = {
        ...blankFor('identity'),
        ...ident,
        unit_id: r.unit_id !== undefined && r.unit_id !== null
          ? r.unit_id : (ident.unit_id || null),
        unit_type: r.unit_type || ident.unit_type || null,
        source: ident.source || 'fireflow',
      };
      continue;
    }
    const col = r[`${k}_json`];
    unit[k] = (col === undefined || col === null)
      ? blankFor(k)
      : parseJson(col, blankFor(k));
  }
  unit.fireflow = {
    extensions: {
      subtype: r.subtype !== undefined ? r.subtype : null,
      owner_user_id: r.owner_user_id !== undefined ? r.owner_user_id : null,
      verification_status: r.verification_status || 'unverified',
      timeline: {
        created_at: r.created_at || null,
        updated_at: r.updated_at || null,
      },
    },
  };
  // Compat aliases for routes (not kernel top-level keys — no shadowing).
  unit.unit_id = unit.identity.unit_id;
  unit.unit_type = unit.identity.unit_type;
  return unit;
}

// Kernel-shaped Unit -> DB row (inverse of toUnit; round-trip stable).
function toRow(unit) {
  const u = unit || {};
  const ident = u.identity && typeof u.identity === 'object' ? u.identity : {};
  const ext = (u.fireflow && u.fireflow.extensions) || {};
  const tl = ext.timeline || {};
  const row = {
    unit_id: ident.unit_id !== undefined && ident.unit_id !== null
      ? ident.unit_id : (u.unit_id !== undefined ? u.unit_id : null),
    unit_type: ident.unit_type || u.unit_type || null,
    subtype: ext.subtype !== undefined ? ext.subtype : (u.subtype !== undefined ? u.subtype : null),
    owner_user_id: ext.owner_user_id !== undefined ? ext.owner_user_id : null,
    identity_json: JSON.stringify(ident),
    verification_status: ext.verification_status || 'unverified',
    created_at: tl.created_at !== undefined ? tl.created_at : null,
    updated_at: tl.updated_at !== undefined ? tl.updated_at : null,
  };
  for (const k of KERNEL_TOP) {
    if (k === 'identity') continue;
    row[`${k}_json`] = JSON.stringify(u[k] !== undefined ? u[k] : blankFor(k));
  }
  return row;
}

// Kernel-shaped Unit -> sim-crossing Unit (keys straight from the artifact).
function toSimUnit(unit) {
  const u = unit || {};
  const out = {};
  for (const k of KERNEL_TOP) {
    out[k] = u[k] !== undefined ? u[k] : blankFor(k);
  }
  out.fireflow = u.fireflow && typeof u.fireflow === 'object'
    ? u.fireflow : { extensions: {} };
  return out;
}

module.exports = {
  KERNEL_SCHEMA_VERSION,
  UNIT_TYPES,
  USER_MINTABLE,
  AGENT_MINTABLE,
  genUnitId,
  canMint,
  validateUnitInput,
  toUnit,
  toRow,
  toSimUnit,
};
