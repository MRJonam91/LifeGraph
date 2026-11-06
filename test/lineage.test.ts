// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { LifeGraph } from '../src/core/graph.ts';
import { createSampleLifeGraphData } from '../src/sample.ts';

test('Lineage - getConnectedComponent retrieves all connected nodes and edges', () => {
  const sample = createSampleLifeGraphData();
  const graph = new LifeGraph(sample);

  const comp = graph.getConnectedComponent('person-mario-rossi');
  // All 7 nodes are connected together in the sample
  assert.equal(comp.nodes.length, 7);
  assert.equal(comp.edges.length, 7);
});

test('Lineage - findLineage tracks upstream and downstream paths', () => {
  const sample = createSampleLifeGraphData();
  const graph = new LifeGraph(sample);

  // For contract-rent:
  // Upstream: person-mario-rossi (PARTY_TO), doc-cie-mario (ATTACHED_TO)
  // Downstream: dl-rent-notice-cutoff (DEPENDS_ON)
  const lineage = graph.findLineage('ctr-rent-home');
  assert.equal(lineage.targetNode.id, 'ctr-rent-home');

  assert.ok(lineage.upstream.some((n) => n.id === 'person-mario-rossi'));
  assert.ok(lineage.upstream.some((n) => n.id === 'doc-cie-mario'));
  assert.ok(lineage.downstream.some((n) => n.id === 'dl-rent-notice-cutoff'));
});

test('Lineage - detectCycles identifies circular dependencies', () => {
  const graph = LifeGraph.createEmpty();

  // Create an intentional cycle: N1 -> N2 -> N3 -> N1
  graph.addNode({
    id: 'n1',
    type: 'contract',
    label: 'Contract A',
    contractType: 'custom',
    provider: 'Test',
    startDate: '2025-01-01',
    status: 'active',
    permissions: { visibility: 'private', consentPurposes: [] },
    provenance: { source: 'user_input', timestamp: '2026-11-06T12:00:00Z', digest: '' },
  });
  graph.addNode({
    id: 'n2',
    type: 'contract',
    label: 'Contract B',
    contractType: 'custom',
    provider: 'Test',
    startDate: '2025-01-01',
    status: 'active',
    permissions: { visibility: 'private', consentPurposes: [] },
    provenance: { source: 'user_input', timestamp: '2026-11-06T12:00:00Z', digest: '' },
  });
  graph.addNode({
    id: 'n3',
    type: 'contract',
    label: 'Contract C',
    contractType: 'custom',
    provider: 'Test',
    startDate: '2025-01-01',
    status: 'active',
    permissions: { visibility: 'private', consentPurposes: [] },
    provenance: { source: 'user_input', timestamp: '2026-11-06T12:00:00Z', digest: '' },
  });

  graph.addEdge({
    id: 'e1',
    sourceId: 'n1',
    targetId: 'n2',
    predicate: 'SUPERSEDES',
    permissions: { visibility: 'private', consentPurposes: [] },
    provenance: { source: 'user_input', timestamp: '2026-11-06T12:00:00Z', digest: '' },
  });
  graph.addEdge({
    id: 'e2',
    sourceId: 'n2',
    targetId: 'n3',
    predicate: 'SUPERSEDES',
    permissions: { visibility: 'private', consentPurposes: [] },
    provenance: { source: 'user_input', timestamp: '2026-11-06T12:00:00Z', digest: '' },
  });
  graph.addEdge({
    id: 'e3',
    sourceId: 'n3',
    targetId: 'n1',
    predicate: 'SUPERSEDES',
    permissions: { visibility: 'private', consentPurposes: [] },
    provenance: { source: 'user_input', timestamp: '2026-11-06T12:00:00Z', digest: '' },
  });

  const cycles = graph.detectCycles(['SUPERSEDES']);
  assert.ok(cycles.length >= 1);
  assert.deepEqual(cycles[0], ['n1', 'n2', 'n3', 'n1']);
});
