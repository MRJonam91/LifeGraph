// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { computeEntityDigest } from './crypto.ts';
import type { LifeGraph } from './graph.ts';
import type {
  ContractNode,
  DeadlineNode,
  DocumentNode,
  LifeGraphNode,
} from './types.ts';

export interface EvaluatedDeadline {
  deadline: DeadlineNode;
  daysRemaining: number;
  urgency: 'overdue' | 'due_soon' | 'upcoming';
  targetEntity?: LifeGraphNode;
}

export function evaluateDeadlineTime(
  dueDateStr: string,
  noticeDays = 30,
  referenceDate = new Date()
): { urgency: 'overdue' | 'due_soon' | 'upcoming'; daysRemaining: number } {
  const due = new Date(dueDateStr);
  const now = new Date(referenceDate);
  if (isNaN(due.getTime())) {
    return { urgency: 'overdue', daysRemaining: 0 };
  }
  // Compare at day granularity
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.ceil((due.getTime() - now.getTime()) / msPerDay);

  if (daysRemaining < 0) {
    return { urgency: 'overdue', daysRemaining };
  } else if (daysRemaining <= noticeDays) {
    return { urgency: 'due_soon', daysRemaining };
  } else {
    return { urgency: 'upcoming', daysRemaining };
  }
}

export function getEvaluatedDeadlines(
  graph: LifeGraph,
  options: { daysAhead?: number; includeCompleted?: boolean; referenceDate?: Date } = {}
): EvaluatedDeadline[] {
  const daysAhead = options.daysAhead ?? 60;
  const includeCompleted = options.includeCompleted ?? false;
  const refDate = options.referenceDate ?? new Date();

  const deadlines = graph.getNodes().filter((n): n is DeadlineNode => n.type === 'deadline');
  const evaluated: EvaluatedDeadline[] = [];

  for (const dl of deadlines) {
    if (!includeCompleted && (dl.status === 'completed' || dl.status === 'dismissed')) {
      continue;
    }

    const { urgency, daysRemaining } = evaluateDeadlineTime(dl.dueDate, dl.noticeDays ?? 30, refDate);

    if (daysRemaining <= daysAhead || urgency === 'overdue') {
      const target = dl.targetEntityId ? graph.getNode(dl.targetEntityId) : undefined;
      evaluated.push({
        deadline: dl,
        daysRemaining,
        urgency,
        targetEntity: target,
      });
    }
  }

  // Sort by urgency: overdue first, then lowest days remaining
  return evaluated.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function autoSynthesizeDeadlines(nodes: LifeGraphNode[]): DeadlineNode[] {
  const generated: DeadlineNode[] = [];
  const nowStr = new Date().toISOString();

  for (const node of nodes) {
    if (node.type === 'contract') {
      const c = node as ContractNode;
      if (c.endDate && c.status === 'active') {
        // Contract renewal / cancellation deadline
        const noticeDays = c.noticePeriodDays ?? 30;
        const endDt = new Date(c.endDate);
        const noticeDt = new Date(endDt.getTime() - noticeDays * 24 * 60 * 60 * 1000);

        const dlId = `dl-renewal-${c.id}`;
        const syntheticNode: DeadlineNode = {
          id: dlId,
          type: 'deadline',
          label: `Notice/Renewal deadline for ${c.label}`,
          category: c.autoRenew ? 'contract_renewal' : 'cancellation_notice',
          targetEntityId: c.id,
          dueDate: noticeDt.toISOString().split('T')[0]!,
          noticeDays,
          status: 'pending',
          actionRequired: c.autoRenew
            ? `Decide whether to cancel or let contract auto-renew (${noticeDays} days notice required)`
            : `Contract ending on ${c.endDate}. Renew or switch provider.`,
          tags: ['auto-synthesized', 'contract', ...((c.tags as string[]) ?? [])],
          permissions: { ...c.permissions },
          provenance: {
            source: 'agent_inferred',
            timestamp: nowStr,
            digest: '',
          },
        };
        syntheticNode.provenance.digest = computeEntityDigest(syntheticNode as unknown as Record<string, unknown>);
        generated.push(syntheticNode);
      }
    } else if (node.type === 'document') {
      const d = node as DocumentNode;
      if (d.expiryDate) {
        const dlId = `dl-expiry-${d.id}`;
        const syntheticNode: DeadlineNode = {
          id: dlId,
          type: 'deadline',
          label: `Document expiration: ${d.label}`,
          category: 'document_expiry',
          targetEntityId: d.id,
          dueDate: d.expiryDate,
          noticeDays: 60,
          status: 'pending',
          actionRequired: `Renew document ${d.documentNumber ?? d.label} before expiration`,
          tags: ['auto-synthesized', 'document', ...((d.tags as string[]) ?? [])],
          permissions: { ...d.permissions },
          provenance: {
            source: 'agent_inferred',
            timestamp: nowStr,
            digest: '',
          },
        };
        syntheticNode.provenance.digest = computeEntityDigest(syntheticNode as unknown as Record<string, unknown>);
        generated.push(syntheticNode);
      }
    }
  }

  return generated;
}
