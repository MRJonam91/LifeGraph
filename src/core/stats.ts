// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { evaluateDeadlineTime } from './deadlines.ts';
import type { LifeGraph } from './graph.ts';
import type { DeadlineNode, EntityType, GraphStats, VisibilityLevel } from './types.ts';

export function computeGraphStats(graph: LifeGraph, referenceDate = new Date()): GraphStats {
  const nodes = graph.getNodes();
  const edges = graph.getEdges();

  const nodesByType: Record<EntityType, number> = {
    person: 0,
    document: 0,
    contract: 0,
    deadline: 0,
  };

  const edgesByPredicate: Record<string, number> = {};
  const visibilityBreakdown: Record<VisibilityLevel, number> = {
    private: 0,
    family: 0,
    confidential: 0,
    public: 0,
  };
  const provenanceSources: Record<string, number> = {};

  const deadlinesSummary = {
    overdue: 0,
    dueSoon: 0,
    upcoming: 0,
    completed: 0,
  };

  for (const node of nodes) {
    nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1;
    visibilityBreakdown[node.permissions.visibility] =
      (visibilityBreakdown[node.permissions.visibility] ?? 0) + 1;

    const source = node.provenance.source ?? 'unknown';
    provenanceSources[source] = (provenanceSources[source] ?? 0) + 1;

    if (node.type === 'deadline') {
      const dl = node as DeadlineNode;
      if (dl.status === 'completed' || dl.status === 'dismissed') {
        deadlinesSummary.completed++;
      } else {
        const { urgency } = evaluateDeadlineTime(dl.dueDate, dl.noticeDays ?? 30, referenceDate);
        if (urgency === 'overdue') deadlinesSummary.overdue++;
        else if (urgency === 'due_soon') deadlinesSummary.dueSoon++;
        else deadlinesSummary.upcoming++;
      }
    }
  }

  for (const edge of edges) {
    edgesByPredicate[edge.predicate] = (edgesByPredicate[edge.predicate] ?? 0) + 1;
    const source = edge.provenance.source ?? 'unknown';
    provenanceSources[source] = (provenanceSources[source] ?? 0) + 1;
  }

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    nodesByType,
    edgesByPredicate,
    visibilityBreakdown,
    deadlinesSummary,
    provenanceSources,
  };
}
