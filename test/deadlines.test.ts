// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { LifeGraph } from '../src/core/graph.ts';
import { createSampleLifeGraphData } from '../src/sample.ts';
import {
  autoSynthesizeDeadlines,
  evaluateDeadlineTime,
  getEvaluatedDeadlines,
} from '../src/core/deadlines.ts';

test('Deadlines - evaluateDeadlineTime categorizes overdue, due soon, upcoming', () => {
  const refDate = new Date('2026-11-06T12:00:00Z');

  // Past date -> overdue
  const overdueRes = evaluateDeadlineTime('2026-10-01', 30, refDate);
  assert.equal(overdueRes.urgency, 'overdue');
  assert.ok(overdueRes.daysRemaining < 0);

  // 10 days ahead -> due soon (within notice window of 30 days)
  const dueSoonRes = evaluateDeadlineTime('2026-11-16', 30, refDate);
  assert.equal(dueSoonRes.urgency, 'due_soon');
  assert.ok(dueSoonRes.daysRemaining > 0 && dueSoonRes.daysRemaining <= 30);

  // 90 days ahead -> upcoming
  const upcomingRes = evaluateDeadlineTime('2027-02-06', 30, refDate);
  assert.equal(upcomingRes.urgency, 'upcoming');
  assert.ok(upcomingRes.daysRemaining > 30);
});

test('Deadlines - getEvaluatedDeadlines returns sorted list with target entities', () => {
  const sample = createSampleLifeGraphData();
  const graph = new LifeGraph(sample);
  const refDate = new Date('2026-11-06T12:00:00Z');

  const evaluated = getEvaluatedDeadlines(graph, { daysAhead: 500, referenceDate: refDate });
  assert.ok(evaluated.length >= 2);
  // Verify sorted by days remaining
  for (let i = 0; i < evaluated.length - 1; i++) {
    assert.ok(evaluated[i]!.daysRemaining <= evaluated[i + 1]!.daysRemaining);
  }
});

test('Deadlines - autoSynthesizeDeadlines extracts contract and document obligations', () => {
  const sample = createSampleLifeGraphData();
  const synthetic = autoSynthesizeDeadlines(sample.nodes);

  assert.ok(synthetic.length >= 2);
  const docExpiry = synthetic.find((d) => d.category === 'document_expiry');
  assert.ok(docExpiry);
  assert.equal(docExpiry.targetEntityId, 'doc-cie-mario');

  const contractNotice = synthetic.find((d) => d.category === 'contract_renewal');
  assert.ok(contractNotice);
  assert.equal(contractNotice.targetEntityId, 'ctr-rent-home');
});

test('Deadlines - evaluateDeadlineTime handles invalid or unparseable dates safely', () => {
  const refDate = new Date('2026-11-06T12:00:00Z');
  const invalidRes = evaluateDeadlineTime('not-a-valid-date', 30, refDate);
  assert.equal(invalidRes.urgency, 'overdue');
  assert.equal(invalidRes.daysRemaining, 0);

  const emptyRes = evaluateDeadlineTime('', 30, refDate);
  assert.equal(emptyRes.urgency, 'overdue');
  assert.equal(emptyRes.daysRemaining, 0);
});
