// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { computeEntityDigest } from './crypto.ts';
import { LifeGraph } from './graph.ts';
import type {
  LifeGraphData,
  LifeGraphEdge,
  LifeGraphNode,
  MergeResult,
  MergeStrategy,
} from './types.ts';

export function mergeLifeGraphs(
  base: LifeGraph,
  incoming: LifeGraph,
  options: { strategy?: MergeStrategy } = {}
): MergeResult {
  const strategy: MergeStrategy = options.strategy ?? 'prefer-newer';

  const merged = new LifeGraph(base.toJSON());
  const addedNodes: string[] = [];
  const updatedNodes: string[] = [];
  const skippedNodes: string[] = [];
  const addedEdges: string[] = [];
  const conflicts: Array<{ id: string; resolution: string; message: string }> = [];

  // Merge Nodes
  for (const incNode of incoming.getNodes()) {
    const existing = merged.getNode(incNode.id);
    if (!existing) {
      merged.addNode(incNode);
      addedNodes.push(incNode.id);
    } else {
      // Compare digests
      if (existing.provenance.digest === incNode.provenance.digest) {
        skippedNodes.push(incNode.id);
      } else {
        // Conflict
        let chosen: LifeGraphNode = existing;
        let resolution = 'retained base';

        if (strategy === 'prefer-incoming') {
          chosen = incNode;
          resolution = 'overwritten with incoming';
        } else if (strategy === 'prefer-newer') {
          const baseTime = Date.parse(existing.provenance.timestamp) || 0;
          const incTime = Date.parse(incNode.provenance.timestamp) || 0;
          if (incTime > baseTime) {
            chosen = incNode;
            resolution = `incoming is newer (${incNode.provenance.timestamp} > ${existing.provenance.timestamp})`;
          } else {
            resolution = `base is newer or equal (${existing.provenance.timestamp} >= ${incNode.provenance.timestamp})`;
          }
        }

        conflicts.push({
          id: incNode.id,
          resolution,
          message: `Divergent node '${incNode.label}' between base and incoming.`,
        });

        if (chosen !== existing) {
          merged.updateNode(existing.id, chosen);
          updatedNodes.push(incNode.id);
        } else {
          skippedNodes.push(incNode.id);
        }
      }
    }
  }

  // Merge Edges
  for (const incEdge of incoming.getEdges()) {
    const existingEdge = merged.getEdge(incEdge.id);
    if (!existingEdge) {
      // Ensure source and target exist in merged graph
      if (merged.getNode(incEdge.sourceId) && merged.getNode(incEdge.targetId)) {
        merged.addEdge(incEdge);
        addedEdges.push(incEdge.id);
      }
    }
  }

  return {
    graph: merged.toJSON(),
    addedNodes,
    updatedNodes,
    skippedNodes,
    addedEdges,
    conflicts,
  };
}
