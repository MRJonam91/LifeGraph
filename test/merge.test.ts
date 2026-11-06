// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { LifeGraph } from '../src/core/graph.ts';
import { mergeLifeGraphs } from '../src/core/merge.ts';
import { createSampleLifeGraphData } from '../src/sample.ts';

test('Merge - integrates new nodes and edges seamlessly', () => {
  const base = new LifeGraph(createSampleLifeGraphData());

  const incoming = LifeGraph.createEmpty();
  incoming.addNode({
    id: 'doc-gym-subscription',
    type: 'contract',
    label: 'Palestra Torino',
    contractType: 'subscription',
    provider: 'GymFit',
    startDate: '2026-01-01',
    status: 'active',
    permissions: { visibility: 'family', consentPurposes: ['general_admin'] },
    provenance: { source: 'user_input', timestamp: '2026-11-06T12:00:00Z', digest: '' },
  });

  const res = mergeLifeGraphs(base, incoming);
  assert.equal(res.addedNodes.length, 1);
  assert.equal(res.addedNodes[0], 'doc-gym-subscription');
  assert.equal(res.conflicts.length, 0);

  const mergedGraph = new LifeGraph(res.graph);
  assert.equal(mergedGraph.getNodes().length, base.getNodes().length + 1);
});

test('Merge - resolves conflicts according to prefer-newer strategy', () => {
  const base = new LifeGraph(createSampleLifeGraphData());

  const incoming = new LifeGraph(createSampleLifeGraphData());
  // Update rental contract in incoming with newer timestamp
  const updatedRent = incoming.updateNode('ctr-rent-home', {
    label: 'Locazione Rinnovata 2026-2030',
  });
  // Ensure incoming has later timestamp
  updatedRent.provenance.timestamp = '2026-11-06T18:00:00Z';

  const res = mergeLifeGraphs(base, incoming, { strategy: 'prefer-newer' });
  assert.equal(res.updatedNodes.length, 1);
  assert.equal(res.conflicts.length, 1);

  const mergedGraph = new LifeGraph(res.graph);
  const rentNode = mergedGraph.getNode('ctr-rent-home')!;
  assert.equal(rentNode.label, 'Locazione Rinnovata 2026-2030');
});

test('Merge - respects prefer-base strategy and ignores incoming divergence', () => {
  const base = new LifeGraph(createSampleLifeGraphData());

  const incoming = new LifeGraph(createSampleLifeGraphData());
  incoming.updateNode('ctr-rent-home', {
    label: 'Unwanted Remote Override',
  });

  const res = mergeLifeGraphs(base, incoming, { strategy: 'prefer-base' });
  assert.equal(res.updatedNodes.length, 0);
  assert.ok(res.skippedNodes.includes('ctr-rent-home'));

  const mergedGraph = new LifeGraph(res.graph);
  const rentNode = mergedGraph.getNode('ctr-rent-home')!;
  assert.equal(rentNode.label, 'Locazione Appartamento Torino');
});
