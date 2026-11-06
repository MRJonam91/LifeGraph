// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { canonicalJsonStringify } from './crypto.ts';
import type { GraphDiffResult, LifeGraphData, LifeGraphEdge, LifeGraphNode } from './types.ts';

export function computeGraphDiff(before: LifeGraphData, after: LifeGraphData): GraphDiffResult {
  const beforeNodes = new Map<string, LifeGraphNode>(before.nodes.map((n) => [n.id, n]));
  const afterNodes = new Map<string, LifeGraphNode>(after.nodes.map((n) => [n.id, n]));

  const addedNodes: LifeGraphNode[] = [];
  const removedNodes: LifeGraphNode[] = [];
  const modifiedNodes: { before: LifeGraphNode; after: LifeGraphNode; changes: string[] }[] = [];

  for (const [id, afterNode] of afterNodes.entries()) {
    const beforeNode = beforeNodes.get(id);
    if (!beforeNode) {
      addedNodes.push(afterNode);
    } else {
      const changes = detectNodeChanges(beforeNode, afterNode);
      if (changes.length > 0) {
        modifiedNodes.push({ before: beforeNode, after: afterNode, changes });
      }
    }
  }

  for (const [id, beforeNode] of beforeNodes.entries()) {
    if (!afterNodes.has(id)) {
      removedNodes.push(beforeNode);
    }
  }

  const beforeEdges = new Map<string, LifeGraphEdge>(before.edges.map((e) => [e.id, e]));
  const afterEdges = new Map<string, LifeGraphEdge>(after.edges.map((e) => [e.id, e]));

  const addedEdges: LifeGraphEdge[] = [];
  const removedEdges: LifeGraphEdge[] = [];
  const modifiedEdges: { before: LifeGraphEdge; after: LifeGraphEdge; changes: string[] }[] = [];

  for (const [id, afterEdge] of afterEdges.entries()) {
    const beforeEdge = beforeEdges.get(id);
    if (!beforeEdge) {
      addedEdges.push(afterEdge);
    } else {
      const changes = detectEdgeChanges(beforeEdge, afterEdge);
      if (changes.length > 0) {
        modifiedEdges.push({ before: beforeEdge, after: afterEdge, changes });
      }
    }
  }

  for (const [id, beforeEdge] of beforeEdges.entries()) {
    if (!afterEdges.has(id)) {
      removedEdges.push(beforeEdge);
    }
  }

  return {
    addedNodes,
    removedNodes,
    modifiedNodes,
    addedEdges,
    removedEdges,
    modifiedEdges,
  };
}

function detectNodeChanges(a: LifeGraphNode, b: LifeGraphNode): string[] {
  const changes: string[] = [];
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of allKeys) {
    if (key === 'provenance') {
      // compare digest specifically
      if (a.provenance?.digest !== b.provenance?.digest) {
        changes.push('provenance.digest');
      }
      continue;
    }
    const valA = (a as unknown as Record<string, unknown>)[key];
    const valB = (b as unknown as Record<string, unknown>)[key];
    if (canonicalJsonStringify(valA) !== canonicalJsonStringify(valB)) {
      changes.push(key);
    }
  }
  return changes;
}

function detectEdgeChanges(a: LifeGraphEdge, b: LifeGraphEdge): string[] {
  const changes: string[] = [];
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of allKeys) {
    if (key === 'provenance') {
      if (a.provenance?.digest !== b.provenance?.digest) {
        changes.push('provenance.digest');
      }
      continue;
    }
    const valA = (a as unknown as Record<string, unknown>)[key];
    const valB = (b as unknown as Record<string, unknown>)[key];
    if (canonicalJsonStringify(valA) !== canonicalJsonStringify(valB)) {
      changes.push(key);
    }
  }
  return changes;
}
