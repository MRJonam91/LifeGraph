// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { canonicalJsonStringify } from '../core/crypto.ts';
import { LifeGraph } from '../core/graph.ts';
import type { LifeGraphData } from '../core/types.ts';
import { validateLifeGraph } from '../core/validator.ts';

export function exportCanonicalJson(graph: LifeGraph, pretty = true): string {
  const data = graph.toJSON();

  // Normalize sort orders for deterministic round-trip reproducibility
  const sortedData: LifeGraphData = {
    version: data.version,
    namespace: data.namespace,
    title: data.title,
    description: data.description,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    nodes: [...data.nodes].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...data.edges].sort((a, b) => a.id.localeCompare(b.id)),
    metadata: data.metadata,
  };

  if (pretty) {
    return JSON.stringify(JSON.parse(canonicalJsonStringify(sortedData)), null, 2);
  }
  return canonicalJsonStringify(sortedData);
}

export function importCanonicalJson(jsonString: string): LifeGraph {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Failed to parse JSON: ${(err as Error).message}`);
  }

  const validation = validateLifeGraph(parsed, { checkDigests: true });
  if (!validation.valid) {
    const errMessages = validation.errors.map((e) => `[${e.code}] ${e.path}: ${e.message}`).join('\n');
    throw new Error(`Validation failed during import:\n${errMessages}`);
  }

  return new LifeGraph(parsed as LifeGraphData);
}
