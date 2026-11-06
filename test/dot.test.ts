// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { LifeGraph } from '../src/core/graph.ts';
import { exportDot } from '../src/exporters/dot.ts';
import { createSampleLifeGraphData } from '../src/sample.ts';

test('DOT Exporter - generates Graphviz digraph syntax', () => {
  const graph = new LifeGraph(createSampleLifeGraphData());
  const dot = exportDot(graph);

  assert.ok(dot.startsWith('digraph LifeGraph {'));
  assert.ok(dot.includes('"person-mario-rossi"'));
  assert.ok(dot.includes('"doc-cie-mario"'));
  assert.ok(dot.includes('->'));
  assert.ok(dot.includes('label="OWNS"'));
  assert.ok(dot.includes('fillcolor="#e0f2fe"'));
  assert.ok(dot.endsWith('}\n'));
});
