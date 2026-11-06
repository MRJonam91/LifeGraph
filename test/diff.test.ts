// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { computeGraphDiff } from '../src/core/diff.ts';
import { createSampleLifeGraphData } from '../src/sample.ts';

test('Diff - detects added, removed, and modified nodes', () => {
  const before = createSampleLifeGraphData();
  const after = JSON.parse(JSON.stringify(before));

  // Add new node
  after.nodes.push({
    id: 'doc-new-warranty',
    type: 'document',
    label: 'MacBook Pro Warranty',
    documentType: 'warranty',
    permissions: { visibility: 'private', consentPurposes: [] },
    provenance: { source: 'user_input', timestamp: '2026-11-06T12:00:00Z', digest: 'dummy' },
  });

  // Remove passport
  after.nodes = after.nodes.filter((n: any) => n.id !== 'doc-passport-mario');

  // Modify rent contract label
  const rent = after.nodes.find((n: any) => n.id === 'ctr-rent-home');
  rent.label = 'Locazione Modificata 2026';

  const diff = computeGraphDiff(before, after);
  assert.equal(diff.addedNodes.length, 1);
  assert.equal(diff.addedNodes[0]!.id, 'doc-new-warranty');

  assert.equal(diff.removedNodes.length, 1);
  assert.equal(diff.removedNodes[0]!.id, 'doc-passport-mario');

  assert.equal(diff.modifiedNodes.length, 1);
  assert.equal(diff.modifiedNodes[0]!.after.id, 'ctr-rent-home');
  assert.ok(diff.modifiedNodes[0]!.changes.includes('label'));
});
