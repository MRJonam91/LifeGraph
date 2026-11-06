// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import type { LifeGraph } from '../core/graph.ts';
import type { BillingCycle, ContractCategory, ContractNode } from '../core/types.ts';

export interface ContractCostSummary {
  contractId: string;
  label: string;
  provider: string;
  category: ContractCategory;
  rawAmount: number;
  currency: string;
  cycle: BillingCycle;
  monthlyEquivalent: number;
  annualEquivalent: number;
}

export interface CostReport {
  currency: string;
  activeContractCount: number;
  totalMonthlyBurn: number;
  totalAnnualFixedCosts: number;
  byCategory: Record<string, { count: number; annualTotal: number; percentage: number }>;
  byProvider: Record<string, { count: number; annualTotal: number }>;
  contracts: ContractCostSummary[];
}

export function computeCostAnalytics(graph: LifeGraph, primaryCurrency = 'EUR'): CostReport {
  const contracts = graph.getNodes().filter((n): n is ContractNode => n.type === 'contract' && n.status === 'active');
  const summaries: ContractCostSummary[] = [];

  let totalAnnual = 0;
  const categoryTotals: Record<string, { count: number; annualTotal: number }> = {};
  const providerTotals: Record<string, { count: number; annualTotal: number }> = {};

  for (const c of contracts) {
    if (c.amount === undefined || c.amount <= 0) continue;

    const currency = c.currency ?? primaryCurrency;
    const cycle = c.billingCycle ?? 'monthly';
    const rawAmount = c.amount;

    let monthly = 0;
    let annual = 0;

    switch (cycle) {
      case 'monthly':
        monthly = rawAmount;
        annual = rawAmount * 12;
        break;
      case 'yearly':
        monthly = rawAmount / 12;
        annual = rawAmount;
        break;
      case 'quarterly':
        monthly = rawAmount / 3;
        annual = rawAmount * 4;
        break;
      case 'one_off':
        monthly = 0;
        annual = 0;
        break;
    }

    totalAnnual += annual;

    const summary: ContractCostSummary = {
      contractId: c.id,
      label: c.label,
      provider: c.provider,
      category: c.contractType,
      rawAmount,
      currency,
      cycle,
      monthlyEquivalent: Math.round(monthly * 100) / 100,
      annualEquivalent: Math.round(annual * 100) / 100,
    };
    summaries.push(summary);

    // Group by category
    const cat = c.contractType;
    if (!categoryTotals[cat]) categoryTotals[cat] = { count: 0, annualTotal: 0 };
    categoryTotals[cat]!.count++;
    categoryTotals[cat]!.annualTotal += annual;

    // Group by provider
    const prov = c.provider;
    if (!providerTotals[prov]) providerTotals[prov] = { count: 0, annualTotal: 0 };
    providerTotals[prov]!.count++;
    providerTotals[prov]!.annualTotal += annual;
  }

  const byCategory: Record<string, { count: number; annualTotal: number; percentage: number }> = {};
  for (const [cat, data] of Object.entries(categoryTotals)) {
    byCategory[cat] = {
      count: data.count,
      annualTotal: Math.round(data.annualTotal * 100) / 100,
      percentage: totalAnnual > 0 ? Math.round((data.annualTotal / totalAnnual) * 1000) / 10 : 0,
    };
  }

  const byProvider: Record<string, { count: number; annualTotal: number }> = {};
  for (const [prov, data] of Object.entries(providerTotals)) {
    byProvider[prov] = {
      count: data.count,
      annualTotal: Math.round(data.annualTotal * 100) / 100,
    };
  }

  // Sort contracts by annual cost descending
  summaries.sort((a, b) => b.annualEquivalent - a.annualEquivalent);

  return {
    currency: primaryCurrency,
    activeContractCount: summaries.length,
    totalMonthlyBurn: Math.round((totalAnnual / 12) * 100) / 100,
    totalAnnualFixedCosts: Math.round(totalAnnual * 100) / 100,
    byCategory,
    byProvider,
    contracts: summaries,
  };
}
