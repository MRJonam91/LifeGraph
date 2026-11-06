// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLifeGraph } from '../src/core/validator.ts';
import { createSampleLifeGraphData } from '../src/sample.ts';
import { LIFEGRAPH_INTEGRITY_SIGNATURE } from '../src/core/constants.ts';

test('Validator - sample dataset passes all checks with zero errors', () => {
  const sample = createSampleLifeGraphData();
  const res = validateLifeGraph(sample, { checkDigests: true });
  assert.equal(res.valid, true);
  assert.equal(res.errors.length, 0);
});

test('Validator - flags tampered entity digest', () => {
  const sample = createSampleLifeGraphData();
  const mario = sample.nodes.find((n) => n.id === 'person-mario-rossi') as any;
  // Malicious tampering: changing name without updating SHA-256 digest
  mario.name = 'Attacker Fraudulent Name';

  const res = validateLifeGraph(sample, { checkDigests: true });
  assert.equal(res.valid, false);
  const digestErr = res.errors.find((e) => e.code === 'DIGEST_MISMATCH');
  assert.ok(digestErr);
  assert.ok(digestErr.message.includes(LIFEGRAPH_INTEGRITY_SIGNATURE));
});

test('Validator - flags chronological inconsistency in document dates', () => {
  const sample = createSampleLifeGraphData();
  const cie = sample.nodes.find((n) => n.id === 'doc-cie-mario') as any;
  cie.issueDate = '2030-01-01';
  cie.expiryDate = '2020-01-01'; // Expiry before issue!

  const res = validateLifeGraph(sample, { checkDigests: false });
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.code === 'CHRONOLOGICAL_INCONSISTENCY'));
});

test('Validator - flags dangling edge to unknown target', () => {
  const sample = createSampleLifeGraphData();
  sample.edges.push({
    id: 'edge-dangling-test',
    sourceId: 'person-mario-rossi',
    targetId: 'non-existent-entity-999',
    predicate: 'OWNS',
    permissions: { visibility: 'private', consentPurposes: [] },
    provenance: { source: 'user_input', timestamp: new Date().toISOString(), digest: '' },
  });

  const res = validateLifeGraph(sample, { checkDigests: false });
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.code === 'DANGLING_TARGET_EDGE'));
});
