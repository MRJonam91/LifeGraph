// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { computeEntityDigest } from '../core/crypto.ts';
import type { BillingCycle, ContractCategory, ContractNode } from '../core/types.ts';

export function importSubscriptionsCsv(csvContent: string): ContractNode[] {
  const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const firstLine = lines[0]!;
  const delimiter = firstLine.includes(';') && (!firstLine.includes(',') || firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';
  const headers = parseCsvLine(firstLine, delimiter).map((h) => h.toLowerCase());
  const providerIdx = headers.findIndex((h) => h.includes('provider') || h.includes('service') || h.includes('name') || h.includes('nome') || h.includes('fornitore'));
  const amountIdx = headers.findIndex((h) => h.includes('amount') || h.includes('cost') || h.includes('prezzo') || h.includes('importo') || h.includes('canone'));
  const cycleIdx = headers.findIndex((h) => h.includes('cycle') || h.includes('frequency') || h.includes('frequenza') || h.includes('periodicità'));
  const categoryIdx = headers.findIndex((h) => h.includes('category') || h.includes('categoria') || h.includes('tipo'));

  if (providerIdx === -1) {
    throw new Error("CSV must contain a 'provider' or 'service' column.");
  }

  const contracts: ContractNode[] = [];
  const now = new Date().toISOString();
  let count = 1;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!, delimiter);
    const provider = cols[providerIdx]?.trim();
    if (!provider) continue;

    let amount: number | undefined;
    if (amountIdx !== -1 && cols[amountIdx]) {
      const parsedAmount = parseFloat(cols[amountIdx]!.replace(/[€$]/g, '').replace(/,/g, '.').trim());
      if (!isNaN(parsedAmount)) amount = parsedAmount;
    }

    let cycle: BillingCycle = 'monthly';
    if (cycleIdx !== -1 && cols[cycleIdx]) {
      const cStr = cols[cycleIdx]!.toLowerCase();
      if (cStr.includes('year') || cStr.includes('ann')) cycle = 'yearly';
      else if (cStr.includes('quart') || cStr.includes('trim')) cycle = 'quarterly';
      else if (cStr.includes('one') || cStr.includes('singol')) cycle = 'one_off';
    }

    let category: ContractCategory = 'subscription';
    if (categoryIdx !== -1 && cols[categoryIdx]) {
      const catStr = cols[categoryIdx]!.toLowerCase();
      if (catStr.includes('rent') || catStr.includes('affitt') || catStr.includes('locaz')) category = 'rental';
      else if (catStr.includes('power') || catStr.includes('luce') || catStr.includes('energ')) category = 'utility_power';
      else if (catStr.includes('gas')) category = 'utility_gas';
      else if (catStr.includes('telecom') || catStr.includes('inter') || catStr.includes('fibra')) category = 'telecom';
      else if (catStr.includes('insur') || catStr.includes('assicur')) category = 'insurance';
    }

    const id = `ctr-imported-${count++}`;
    const contract: ContractNode = {
      id,
      type: 'contract',
      label: provider,
      provider,
      contractType: category,
      startDate: now.split('T')[0]!,
      billingCycle: cycle,
      status: 'active',
      ...(amount !== undefined ? { amount, currency: 'EUR' } : {}),
      tags: ['imported', 'csv', category],
      permissions: {
        visibility: 'family',
        consentPurposes: ['general_admin'],
        exportPolicy: 'exportable',
      },
      provenance: {
        source: 'file_import',
        timestamp: now,
        digest: '',
      },
    };

    contract.provenance.digest = computeEntityDigest(contract as unknown as Record<string, unknown>);
    contracts.push(contract);
  }

  return contracts;
}

function parseCsvLine(line: string, delimiter = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
