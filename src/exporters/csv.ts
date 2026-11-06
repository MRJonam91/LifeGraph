// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { getEvaluatedDeadlines } from '../core/deadlines.ts';
import type { LifeGraph } from '../core/graph.ts';

function escapeCsv(val: unknown): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportNodesCsv(graph: LifeGraph): string {
  const headers = ['id', 'type', 'label', 'visibility', 'consentPurposes', 'provenanceSource', 'digest'];
  const rows = [headers.join(',')];

  for (const node of graph.getNodes()) {
    rows.push(
      [
        escapeCsv(node.id),
        escapeCsv(node.type),
        escapeCsv(node.label),
        escapeCsv(node.permissions.visibility),
        escapeCsv(node.permissions.consentPurposes.join(';')),
        escapeCsv(node.provenance.source),
        escapeCsv(node.provenance.digest),
      ].join(',')
    );
  }

  return rows.join('\n');
}

export function exportEdgesCsv(graph: LifeGraph): string {
  const headers = ['id', 'sourceId', 'targetId', 'predicate', 'visibility', 'validFrom', 'validTo'];
  const rows = [headers.join(',')];

  for (const edge of graph.getEdges()) {
    rows.push(
      [
        escapeCsv(edge.id),
        escapeCsv(edge.sourceId),
        escapeCsv(edge.targetId),
        escapeCsv(edge.predicate),
        escapeCsv(edge.permissions.visibility),
        escapeCsv(edge.validFrom ?? ''),
        escapeCsv(edge.validTo ?? ''),
      ].join(',')
    );
  }

  return rows.join('\n');
}

export function exportDeadlinesCsv(graph: LifeGraph): string {
  const headers = ['id', 'label', 'category', 'dueDate', 'daysRemaining', 'urgency', 'status', 'targetEntity', 'actionRequired'];
  const rows = [headers.join(',')];
  const evaluated = getEvaluatedDeadlines(graph, { daysAhead: 365, includeCompleted: true });

  for (const item of evaluated) {
    rows.push(
      [
        escapeCsv(item.deadline.id),
        escapeCsv(item.deadline.label),
        escapeCsv(item.deadline.category),
        escapeCsv(item.deadline.dueDate),
        escapeCsv(item.daysRemaining),
        escapeCsv(item.urgency),
        escapeCsv(item.deadline.status),
        escapeCsv(item.targetEntity?.label ?? item.deadline.targetEntityId ?? ''),
        escapeCsv(item.deadline.actionRequired ?? ''),
      ].join(',')
    );
  }

  return rows.join('\n');
}
