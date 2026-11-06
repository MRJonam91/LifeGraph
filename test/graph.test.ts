// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { LifeGraph } from '../src/core/graph.ts';
import { createSampleLifeGraphData } from '../src/sample.ts';
import type { PersonNode } from '../src/core/types.ts';

test('LifeGraph - creates empty graph with default metadata', () => {
  const graph = LifeGraph.createEmpty('Test Vault');
  assert.equal(graph.title, 'Test Vault');
  assert.equal(graph.getNodes().length, 0);
  assert.equal(graph.getEdges().length, 0);
});

test('LifeGraph - loads sample data with nodes and edges', () => {
  const sample = createSampleLifeGraphData();
  const graph = new LifeGraph(sample);

  assert.equal(graph.getNodes().length, 7);
  assert.equal(graph.getEdges().length, 7);

  const mario = graph.getNode('person-mario-rossi') as PersonNode;
  assert.ok(mario);
  assert.equal(mario.name, 'Mario Rossi');
});

test('LifeGraph - node additions and cascading deletion', () => {
  const graph = LifeGraph.createEmpty();
  const personNode: PersonNode = {
    id: 'p1',
    type: 'person',
    label: 'Alice',
    name: 'Alice',
    permissions: { visibility: 'private', consentPurposes: ['general_admin'] },
    provenance: { source: 'user_input', timestamp: new Date().toISOString(), digest: '' },
  };
  graph.addNode(personNode);
  assert.equal(graph.getNodes().length, 1);

  // Add second node and edge
  graph.addNode({
    id: 'd1',
    type: 'document',
    label: 'Passport',
    documentType: 'passport',
    permissions: { visibility: 'private', consentPurposes: ['general_admin'] },
    provenance: { source: 'user_input', timestamp: new Date().toISOString(), digest: '' },
  });

  graph.addEdge({
    id: 'e1',
    sourceId: 'p1',
    targetId: 'd1',
    predicate: 'OWNS',
    permissions: { visibility: 'private', consentPurposes: ['general_admin'] },
    provenance: { source: 'user_input', timestamp: new Date().toISOString(), digest: '' },
  });

  assert.equal(graph.getEdges().length, 1);
  assert.equal(graph.getNeighbors('p1').length, 1);

  // Cascading deletion of p1 removes e1 too
  graph.removeNode('p1', { cascadeEdges: true });
  assert.equal(graph.getNodes().length, 1);
  assert.equal(graph.getEdges().length, 0);
});

test('LifeGraph - referential integrity prevents dangling edges', () => {
  const graph = LifeGraph.createEmpty();
  assert.throws(
    () => {
      graph.addEdge({
        id: 'e1',
        sourceId: 'nonexistent-1',
        targetId: 'nonexistent-2',
        predicate: 'OWNS',
        permissions: { visibility: 'private', consentPurposes: [] },
        provenance: { source: 'user_input', timestamp: new Date().toISOString(), digest: '' },
      });
    },
    { message: /Cannot add edge/ }
  );
});

test('LifeGraph - projectByConsent filters permitted subgraphs', () => {
  const sample = createSampleLifeGraphData();
  const graph = new LifeGraph(sample);

  const kycSubgraph = graph.projectByConsent('banking_kyc');
  assert.ok(kycSubgraph.nodes.some((n) => n.id === 'person-mario-rossi'));
  assert.ok(kycSubgraph.nodes.some((n) => n.id === 'doc-cie-mario'));
  // Electricity contract should NOT be included in banking_kyc
  assert.ok(!kycSubgraph.nodes.some((n) => n.id === 'ctr-power-energy'));
});

test('LifeGraph - anonymization preserves topology while scrubbing PII', () => {
  const sample = createSampleLifeGraphData();
  const graph = new LifeGraph(sample);
  const anon = graph.anonymize();

  assert.equal(anon.nodes.length, graph.getNodes().length);
  assert.equal(anon.edges.length, graph.getEdges().length);

  const anonMario = anon.nodes.find((n) => n.id === 'person-mario-rossi') as PersonNode;
  assert.ok(anonMario);
  assert.notEqual(anonMario.name, 'Mario Rossi');
  assert.equal(anonMario.fiscalCode, 'ANON000000X000Y');
  assert.ok(anonMario.email?.includes('anonymized'));
});
