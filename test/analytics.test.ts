// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { LifeGraph } from '../src/core/graph.ts';
import { computeCostAnalytics } from '../src/analytics/costs.ts';
import { createSampleLifeGraphData } from '../src/sample.ts';

test('Analytics - calculates recurring burn rate and annual fixed commitments', () => {
  const graph = new LifeGraph(createSampleLifeGraphData());
  const report = computeCostAnalytics(graph);

  // In sample data:
  // Rent: 750 EUR/month = 9,000 EUR/year
  // Power: 65 EUR/month = 780 EUR/year
  // Total annual = 9,780 EUR/year
  // Total monthly = 815 EUR/month
  assert.equal(report.activeContractCount, 2);
  assert.equal(report.totalAnnualFixedCosts, 9780);
  assert.equal(report.totalMonthlyBurn, 815);

  assert.ok(report.byCategory['rental']);
  assert.equal(report.byCategory['rental']!.annualTotal, 9000);

  assert.ok(report.byCategory['utility_power']);
  assert.equal(report.byCategory['utility_power']!.annualTotal, 780);

  assert.equal(report.contracts[0]!.provider, 'Immobiliare Serenissima SRL');
  assert.equal(report.contracts[0]!.annualEquivalent, 9000);
});

test('Analytics - handles quarterly and yearly billing cycles', () => {
  const graph = LifeGraph.createEmpty();
  graph.addNode({
    id: 'ctr-quarterly',
    type: 'contract',
    label: 'Quarterly Insurance',
    contractType: 'insurance',
    provider: 'Allianz',
    startDate: '2025-01-01',
    amount: 150,
    billingCycle: 'quarterly', // 150 * 4 = 600/year, 50/month
    status: 'active',
    permissions: { visibility: 'private', consentPurposes: [] },
    provenance: { source: 'user_input', timestamp: '2026-11-06T12:00:00Z', digest: '' },
  });

  const report = computeCostAnalytics(graph);
  assert.equal(report.totalAnnualFixedCosts, 600);
  assert.equal(report.totalMonthlyBurn, 50);
});
