// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { LifeGraph } from '../src/core/graph.ts';
import { auditLifeGraph } from '../src/core/audit.ts';
import { createSampleLifeGraphData } from '../src/sample.ts';

test('Audit - sample dataset has high health score and zero critical issues', () => {
  const sample = createSampleLifeGraphData();
  const graph = new LifeGraph(sample);

  const report = auditLifeGraph(graph);
  assert.ok(report.healthScore >= 90);
  assert.equal(report.privacyRiskCount, 0);
  assert.equal(report.orphanCount, 0);
});

test('Audit - detects critical PII exposure on public person', () => {
  const sample = createSampleLifeGraphData();
  const mario = sample.nodes.find((n) => n.id === 'person-mario-rossi')!;
  mario.permissions.visibility = 'public'; // Exposing fiscalCode, phone, address publicly!

  const graph = new LifeGraph(sample);
  const report = auditLifeGraph(graph);

  assert.ok(report.privacyRiskCount > 0);
  const piiIssue = report.issues.find((i) => i.code === 'PUBLIC_PII_EXPOSURE');
  assert.ok(piiIssue);
  assert.equal(piiIssue.severity, 'critical');
  assert.ok(report.healthScore < 85);
});

test('Audit - flags orphan contracts and unlinked documents', () => {
  const graph = LifeGraph.createEmpty();
  // Orphan document (no OWNS edge)
  graph.addNode({
    id: 'orphan-doc',
    type: 'document',
    label: 'Unlinked Passport',
    documentType: 'passport',
    permissions: { visibility: 'private', consentPurposes: ['general_admin'] },
    provenance: { source: 'user_input', timestamp: '2026-11-06T12:00:00Z', digest: '' },
  });

  const report = auditLifeGraph(graph);
  assert.equal(report.orphanCount, 1);
  assert.ok(report.issues.some((i) => i.code === 'ORPHAN_DOCUMENT'));
});

test('Audit - flags overdue deadlines as critical', () => {
  const graph = LifeGraph.createEmpty();
  graph.addNode({
    id: 'dl-overdue',
    type: 'deadline',
    label: 'Old Tax Deadline',
    category: 'tax_payment',
    dueDate: '2020-01-01', // strongly overdue
    status: 'pending',
    permissions: { visibility: 'private', consentPurposes: ['general_admin'] },
    provenance: { source: 'user_input', timestamp: '2026-11-06T12:00:00Z', digest: '' },
  });

  const report = auditLifeGraph(graph, new Date('2026-11-06T12:00:00Z'));
  assert.ok(report.issues.some((i) => i.code === 'OVERDUE_DEADLINE'));
});
