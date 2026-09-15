// FF-A drift tests: FireFlow adapter stays built FROM the kernel artifact.
// Kernel owns the schema; fireflow.extensions must never shadow a kernel key.
const path = require('path');
const fs = require('fs');
const adapter = require('./unitSchema');
const vendored = require('./kernel_unit_schema.json');

const KERNEL_ARTIFACT = '/home/manigupt/Hello/Agentic_Unit_PIE/codebase/kernel/schemas/unit_schema.v1.json';

test('vendored artifact is fresh: matches kernel canonical v1.0.0', () => {
  const canonical = JSON.parse(fs.readFileSync(KERNEL_ARTIFACT, 'utf8'));
  expect(canonical.schema_version).toBe('1.0.0');
  expect(vendored).toEqual(canonical);
  expect(adapter.KERNEL_SCHEMA_VERSION).toBe('1.0.0');
});

test('adapter key lists come from the artifact; extensions never shadow kernel keys', () => {
  const kernelTop = new Set(vendored.required);
  // every kernel top key round-trips through toUnit/toRow/toSimUnit
  const row = { unit_id: 'u1', unit_type: 'Person', subtype: 'x',
    owner_user_id: 7, identity_json: '{}', verification_status: 'verified' };
  const unit = adapter.toUnit(row);
  for (const k of vendored.required) expect(unit).toHaveProperty(k);
  // extension keys must not collide with kernel top keys
  for (const k of Object.keys(unit.fireflow.extensions)) {
    expect(kernelTop.has(k)).toBe(false);
  }
  expect(new Set(['unit_id', 'unit_type', 'subtype'])
    .isDisjointFrom?.(kernelTop) ?? true);
});

test('validateUnitInput + canMint enforce kernel sections and RBAC', () => {
  expect(adapter.validateUnitInput({ unit_type: 'Person', identity: {} }).valid).toBe(true);
  expect(adapter.validateUnitInput({ unit_type: 'Person', bogus: 1 }).valid).toBe(false);
  expect(adapter.validateUnitInput({ unit_type: 'Nope' }).valid).toBe(false);
  expect(adapter.canMint('user', 'AI Agent')).toBe(false);
  expect(adapter.canMint('user', 'Person')).toBe(true);
  expect(adapter.canMint('agent', 'Dataset')).toBe(true);
  expect(adapter.canMint('agent', 'Business')).toBe(false);
});

test('toRow(toUnit(row)) round-trip preserves identity', () => {
  const row = { unit_id: 'u9', unit_type: 'Machine', subtype: 'rig',
    owner_user_id: 3, identity_json: JSON.stringify({ unit_id: 'u9', source: 'fireflow' }),
    verification_status: 'verified' };
  const back = adapter.toRow(adapter.toUnit(row));
  expect(back.unit_id).toBe('u9');
  expect(back.unit_type).toBe('Machine');
  expect(back.verification_status).toBe('verified');
  expect(back.owner_user_id).toBe(3);
});
