// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import {
  DEFAULT_PROVENANCE_SOURCE,
  LIFEGRAPH_NAMESPACE,
  LIFEGRAPH_SCHEMA_VERSION,
} from './constants.ts';
import { computeEntityDigest } from './crypto.ts';
import type {
  GraphQueryFilter,
  LifeGraphData,
  LifeGraphEdge,
  LifeGraphNode,
  PersonNode,
  DocumentNode,
  ContractNode,
  VisibilityLevel,
} from './types.ts';

export class LifeGraph {
  public version: string;
  public namespace: string;
  public title: string;
  public description: string;
  public createdAt: string;
  public updatedAt: string;
  public metadata: Record<string, unknown>;

  private nodesMap = new Map<string, LifeGraphNode>();
  private edgesMap = new Map<string, LifeGraphEdge>();
  private outgoingMap = new Map<string, Set<string>>();
  private incomingMap = new Map<string, Set<string>>();

  constructor(data?: Partial<LifeGraphData>) {
    this.version = data?.version ?? LIFEGRAPH_SCHEMA_VERSION;
    this.namespace = data?.namespace ?? LIFEGRAPH_NAMESPACE;
    this.title = data?.title ?? 'Personal LifeGraph';
    this.description = data?.description ?? 'Personal knowledge graph connecting entities, contracts and deadlines';
    this.createdAt = data?.createdAt ?? new Date().toISOString();
    this.updatedAt = data?.updatedAt ?? this.createdAt;
    this.metadata = data?.metadata ?? {};

    if (data?.nodes) {
      for (const node of data.nodes) {
        this.addNodeInternal(node);
      }
    }
    if (data?.edges) {
      for (const edge of data.edges) {
        this.addEdgeInternal(edge);
      }
    }
  }

  public static createEmpty(title = 'Personal LifeGraph'): LifeGraph {
    return new LifeGraph({ title });
  }

  private addNodeInternal(node: LifeGraphNode): void {
    if (!node.provenance.digest) {
      node.provenance.digest = computeEntityDigest(node as unknown as Record<string, unknown>);
    }
    this.nodesMap.set(node.id, node);
    if (!this.outgoingMap.has(node.id)) this.outgoingMap.set(node.id, new Set());
    if (!this.incomingMap.has(node.id)) this.incomingMap.set(node.id, new Set());
  }

  private addEdgeInternal(edge: LifeGraphEdge): void {
    if (!edge.provenance.digest) {
      edge.provenance.digest = computeEntityDigest(edge as unknown as Record<string, unknown>);
    }
    this.edgesMap.set(edge.id, edge);
    this.outgoingMap.get(edge.sourceId)?.add(edge.id);
    this.incomingMap.get(edge.targetId)?.add(edge.id);
  }

  public addNode(node: LifeGraphNode): void {
    if (this.nodesMap.has(node.id)) {
      throw new Error(`Node with id '${node.id}' already exists.`);
    }
    this.addNodeInternal(node);
    this.touch();
  }

  public updateNode(id: string, updates: Partial<LifeGraphNode>): LifeGraphNode {
    const existing = this.nodesMap.get(id);
    if (!existing) {
      throw new Error(`Node '${id}' not found.`);
    }
    const updated = { ...existing, ...updates, id } as LifeGraphNode;
    updated.provenance = {
      ...updated.provenance,
      timestamp: new Date().toISOString(),
      digest: computeEntityDigest(updated as unknown as Record<string, unknown>),
    };
    this.nodesMap.set(id, updated);
    this.touch();
    return updated;
  }

  public removeNode(id: string, options: { cascadeEdges?: boolean } = { cascadeEdges: true }): boolean {
    if (!this.nodesMap.has(id)) return false;

    if (options.cascadeEdges) {
      const outEdges = Array.from(this.outgoingMap.get(id) ?? []);
      const inEdges = Array.from(this.incomingMap.get(id) ?? []);
      for (const edgeId of [...outEdges, ...inEdges]) {
        this.removeEdge(edgeId);
      }
    } else {
      const outCount = this.outgoingMap.get(id)?.size ?? 0;
      const inCount = this.incomingMap.get(id)?.size ?? 0;
      if (outCount > 0 || inCount > 0) {
        throw new Error(`Cannot delete node '${id}' with ${outCount + inCount} connected edges without cascade.`);
      }
    }

    this.nodesMap.delete(id);
    this.outgoingMap.delete(id);
    this.incomingMap.delete(id);
    this.touch();
    return true;
  }

  public getNode(id: string): LifeGraphNode | undefined {
    return this.nodesMap.get(id);
  }

  public getNodes(): LifeGraphNode[] {
    return Array.from(this.nodesMap.values());
  }

  public addEdge(edge: LifeGraphEdge): void {
    if (this.edgesMap.has(edge.id)) {
      throw new Error(`Edge with id '${edge.id}' already exists.`);
    }
    if (!this.nodesMap.has(edge.sourceId)) {
      throw new Error(`Cannot add edge: source node '${edge.sourceId}' does not exist.`);
    }
    if (!this.nodesMap.has(edge.targetId)) {
      throw new Error(`Cannot add edge: target node '${edge.targetId}' does not exist.`);
    }
    this.addEdgeInternal(edge);
    this.touch();
  }

  public removeEdge(id: string): boolean {
    const edge = this.edgesMap.get(id);
    if (!edge) return false;
    this.outgoingMap.get(edge.sourceId)?.delete(id);
    this.incomingMap.get(edge.targetId)?.delete(id);
    this.edgesMap.delete(id);
    this.touch();
    return true;
  }

  public getEdge(id: string): LifeGraphEdge | undefined {
    return this.edgesMap.get(id);
  }

  public getEdges(): LifeGraphEdge[] {
    return Array.from(this.edgesMap.values());
  }

  public getOutgoingEdges(nodeId: string): LifeGraphEdge[] {
    const edgeIds = this.outgoingMap.get(nodeId);
    if (!edgeIds) return [];
    return Array.from(edgeIds).map((id) => this.edgesMap.get(id)!).filter(Boolean);
  }

  public getIncomingEdges(nodeId: string): LifeGraphEdge[] {
    const edgeIds = this.incomingMap.get(nodeId);
    if (!edgeIds) return [];
    return Array.from(edgeIds).map((id) => this.edgesMap.get(id)!).filter(Boolean);
  }

  public getNeighbors(nodeId: string): { node: LifeGraphNode; edge: LifeGraphEdge; direction: 'in' | 'out' }[] {
    const neighbors: { node: LifeGraphNode; edge: LifeGraphEdge; direction: 'in' | 'out' }[] = [];
    for (const edge of this.getOutgoingEdges(nodeId)) {
      const target = this.nodesMap.get(edge.targetId);
      if (target) neighbors.push({ node: target, edge, direction: 'out' });
    }
    for (const edge of this.getIncomingEdges(nodeId)) {
      const source = this.nodesMap.get(edge.sourceId);
      if (source) neighbors.push({ node: source, edge, direction: 'in' });
    }
    return neighbors;
  }

  public getConnectedComponent(nodeId: string): { nodes: LifeGraphNode[]; edges: LifeGraphEdge[] } {
    const startNode = this.nodesMap.get(nodeId);
    if (!startNode) return { nodes: [], edges: [] };

    const visitedNodes = new Set<string>([nodeId]);
    const visitedEdges = new Set<string>();
    const queue: string[] = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const outgoing = this.getOutgoingEdges(current);
      for (const edge of outgoing) {
        visitedEdges.add(edge.id);
        if (!visitedNodes.has(edge.targetId)) {
          visitedNodes.add(edge.targetId);
          queue.push(edge.targetId);
        }
      }
      const incoming = this.getIncomingEdges(current);
      for (const edge of incoming) {
        visitedEdges.add(edge.id);
        if (!visitedNodes.has(edge.sourceId)) {
          visitedNodes.add(edge.sourceId);
          queue.push(edge.sourceId);
        }
      }
    }

    const nodes = Array.from(visitedNodes).map((id) => this.nodesMap.get(id)!).filter(Boolean);
    const edges = Array.from(visitedEdges).map((id) => this.edgesMap.get(id)!).filter(Boolean);
    return { nodes, edges };
  }

  public findLineage(nodeId: string, maxDepth = 10): { targetNode: LifeGraphNode; upstream: LifeGraphNode[]; downstream: LifeGraphNode[]; edges: LifeGraphEdge[] } {
    const targetNode = this.nodesMap.get(nodeId);
    if (!targetNode) {
      throw new Error(`Node '${nodeId}' not found.`);
    }

    const upstreamIds = new Set<string>();
    const downstreamIds = new Set<string>();
    const traversedEdges = new Set<string>();

    // Trace upstream (incoming paths)
    const traceUp = (currId: string, depth: number) => {
      if (depth >= maxDepth) return;
      for (const edge of this.getIncomingEdges(currId)) {
        traversedEdges.add(edge.id);
        if (!upstreamIds.has(edge.sourceId) && edge.sourceId !== nodeId) {
          upstreamIds.add(edge.sourceId);
          traceUp(edge.sourceId, depth + 1);
        }
      }
    };

    // Trace downstream (outgoing paths)
    const traceDown = (currId: string, depth: number) => {
      if (depth >= maxDepth) return;
      for (const edge of this.getOutgoingEdges(currId)) {
        traversedEdges.add(edge.id);
        if (!downstreamIds.has(edge.targetId) && edge.targetId !== nodeId) {
          downstreamIds.add(edge.targetId);
          traceDown(edge.targetId, depth + 1);
        }
      }
    };

    traceUp(nodeId, 0);
    traceDown(nodeId, 0);

    const upstream = Array.from(upstreamIds).map((id) => this.nodesMap.get(id)!).filter(Boolean);
    const downstream = Array.from(downstreamIds).map((id) => this.nodesMap.get(id)!).filter(Boolean);
    const edges = Array.from(traversedEdges).map((id) => this.edgesMap.get(id)!).filter(Boolean);

    return { targetNode, upstream, downstream, edges };
  }

  public detectCycles(predicates?: string[]): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string) => {
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      const outEdges = this.getOutgoingEdges(nodeId).filter(
        (e) => !predicates || predicates.includes(e.predicate)
      );

      for (const edge of outEdges) {
        if (!visited.has(edge.targetId)) {
          dfs(edge.targetId);
        } else if (recStack.has(edge.targetId)) {
          const cycleStartIdx = path.indexOf(edge.targetId);
          if (cycleStartIdx !== -1) {
            cycles.push([...path.slice(cycleStartIdx), edge.targetId]);
          }
        }
      }

      path.pop();
      recStack.delete(nodeId);
    };

    for (const node of this.getNodes()) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    return cycles;
  }

  public query(filter: GraphQueryFilter): LifeGraphNode[] {
    return this.getNodes().filter((node) => {
      if (filter.type && node.type !== filter.type) return false;
      if (filter.visibility && !filter.visibility.includes(node.permissions.visibility)) return false;
      if (filter.consentPurpose && !node.permissions.consentPurposes.includes(filter.consentPurpose)) return false;
      if (filter.tags && filter.tags.length > 0) {
        const nodeTags = node.tags ?? [];
        if (!filter.tags.some((t) => nodeTags.includes(t))) return false;
      }
      if (filter.search) {
        const needle = filter.search.toLowerCase();
        const matchesLabel = node.label.toLowerCase().includes(needle);
        const matchesId = node.id.toLowerCase().includes(needle);
        if (!matchesLabel && !matchesId) return false;
      }
      return true;
    });
  }

  public projectByConsent(consentPurpose: string): LifeGraphData {
    const permittedNodes = this.getNodes().filter(
      (n) => n.permissions.consentPurposes.includes(consentPurpose) && n.permissions.exportPolicy !== 'excluded'
    );
    const permittedNodeIds = new Set(permittedNodes.map((n) => n.id));

    const permittedEdges = this.getEdges().filter(
      (e) =>
        permittedNodeIds.has(e.sourceId) &&
        permittedNodeIds.has(e.targetId) &&
        e.permissions.consentPurposes.includes(consentPurpose)
    );

    return {
      version: this.version,
      namespace: this.namespace,
      title: `${this.title} (Consent filter: ${consentPurpose})`,
      description: `Projected subgraph permitted under consent purpose: ${consentPurpose}`,
      createdAt: this.createdAt,
      updatedAt: new Date().toISOString(),
      nodes: permittedNodes,
      edges: permittedEdges,
      metadata: { ...this.metadata, projectedForConsent: consentPurpose },
    };
  }

  public projectByVisibility(allowedVisibilities: VisibilityLevel[]): LifeGraphData {
    const permittedNodes = this.getNodes().filter((n) => allowedVisibilities.includes(n.permissions.visibility));
    const permittedNodeIds = new Set(permittedNodes.map((n) => n.id));

    const permittedEdges = this.getEdges().filter(
      (e) =>
        permittedNodeIds.has(e.sourceId) &&
        permittedNodeIds.has(e.targetId) &&
        allowedVisibilities.includes(e.permissions.visibility)
    );

    return {
      version: this.version,
      namespace: this.namespace,
      title: `${this.title} (${allowedVisibilities.join(', ')})`,
      description: `Projected subgraph by visibility levels`,
      createdAt: this.createdAt,
      updatedAt: new Date().toISOString(),
      nodes: permittedNodes,
      edges: permittedEdges,
      metadata: { ...this.metadata, allowedVisibilities },
    };
  }

  public anonymize(): LifeGraphData {
    let pCount = 1;
    let dCount = 1;
    let cCount = 1;

    const anonymizedNodes: LifeGraphNode[] = this.getNodes().map((node) => {
      const copy = JSON.parse(JSON.stringify(node)) as LifeGraphNode;
      if (copy.type === 'person') {
        const p = copy as PersonNode;
        p.name = `Person ${pCount++}`;
        p.fiscalCode = 'ANON000000X000Y';
        if (p.email) p.email = `anonymized_${pCount}@example.org`;
        if (p.phone) p.phone = '+39 000 0000000';
        if (p.address) p.address = 'Anonymized Address';
      } else if (copy.type === 'document') {
        const d = copy as DocumentNode;
        if (d.documentNumber) d.documentNumber = `DOC-ANON-${dCount++}`;
      } else if (copy.type === 'contract') {
        const c = copy as ContractNode;
        if (c.contractNumber) c.contractNumber = `CTR-ANON-${cCount++}`;
      }
      copy.provenance = {
        source: 'migration',
        timestamp: new Date().toISOString(),
        digest: computeEntityDigest(copy as unknown as Record<string, unknown>),
      };
      return copy;
    });

    const anonymizedEdges: LifeGraphEdge[] = this.getEdges().map((edge) => {
      const copy = JSON.parse(JSON.stringify(edge)) as LifeGraphEdge;
      copy.provenance = {
        source: 'migration',
        timestamp: new Date().toISOString(),
        digest: computeEntityDigest(copy as unknown as Record<string, unknown>),
      };
      return copy;
    });

    return {
      version: this.version,
      namespace: this.namespace,
      title: `${this.title} (Anonymized)`,
      description: 'Anonymized topological view of LifeGraph with sanitized PII',
      createdAt: this.createdAt,
      updatedAt: new Date().toISOString(),
      nodes: anonymizedNodes,
      edges: anonymizedEdges,
      metadata: { ...this.metadata, anonymized: true },
    };
  }

  public toJSON(): LifeGraphData {
    return {
      version: this.version,
      namespace: this.namespace,
      title: this.title,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      nodes: this.getNodes(),
      edges: this.getEdges(),
      metadata: this.metadata,
    };
  }

  private touch(): void {
    this.updatedAt = new Date().toISOString();
  }
}
