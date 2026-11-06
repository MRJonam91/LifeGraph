// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import {
  ENTITY_TYPE_PRECEDENCE,
  LIFEGRAPH_INTEGRITY_SIGNATURE,
  VISIBILITY_LEVELS,
} from './constants.ts';
import { computeEntityDigest } from './crypto.ts';
import type {
  ContractNode,
  DeadlineNode,
  DocumentNode,
  LifeGraphData,
  LifeGraphEdge,
  LifeGraphNode,
  PersonNode,
  ValidationError,
  ValidationResult,
} from './types.ts';

export function validateLifeGraph(
  data: unknown,
  options: { checkDigests?: boolean } = { checkDigests: true }
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    errors.push({
      path: '$',
      message: 'LifeGraph document must be a valid JSON object.',
      code: 'INVALID_ROOT',
    });
    return { valid: false, errors, warnings };
  }

  const graph = data as Partial<LifeGraphData>;

  if (!graph.version || typeof graph.version !== 'string') {
    errors.push({ path: '$.version', message: 'Version is required and must be a string.', code: 'MISSING_VERSION' });
  }
  if (!graph.namespace || typeof graph.namespace !== 'string') {
    errors.push({ path: '$.namespace', message: 'Namespace is required and must be a string.', code: 'MISSING_NAMESPACE' });
  }
  if (!Array.isArray(graph.nodes)) {
    errors.push({ path: '$.nodes', message: 'Nodes must be an array.', code: 'INVALID_NODES' });
  }
  if (!Array.isArray(graph.edges)) {
    errors.push({ path: '$.edges', message: 'Edges must be an array.', code: 'INVALID_EDGES' });
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const nodeMap = new Map<string, LifeGraphNode>();
  const edgeIds = new Set<string>();

  // Validate Nodes
  for (let i = 0; i < (graph.nodes ?? []).length; i++) {
    const node = graph.nodes![i]!;
    const path = `$.nodes[${i}]`;

    if (!node.id || typeof node.id !== 'string') {
      errors.push({ path: `${path}.id`, message: 'Node id is required and must be a string.', code: 'INVALID_NODE_ID' });
      continue;
    }

    if (nodeMap.has(node.id)) {
      errors.push({ path: `${path}.id`, message: `Duplicate node ID: ${node.id}`, code: 'DUPLICATE_NODE_ID' });
    } else {
      nodeMap.set(node.id, node);
    }

    if (!node.type || !ENTITY_TYPE_PRECEDENCE.includes(node.type)) {
      errors.push({
        path: `${path}.type`,
        message: `Node type must be one of: ${ENTITY_TYPE_PRECEDENCE.join(', ')}`,
        code: 'INVALID_NODE_TYPE',
      });
    }

    if (!node.label || typeof node.label !== 'string') {
      errors.push({ path: `${path}.label`, message: 'Node label is required and must be a string.', code: 'MISSING_LABEL' });
    }

    // Provenance validation
    if (!node.provenance || typeof node.provenance !== 'object') {
      errors.push({ path: `${path}.provenance`, message: 'Provenance is required.', code: 'MISSING_PROVENANCE' });
    } else {
      if (!node.provenance.source || typeof node.provenance.source !== 'string') {
        errors.push({ path: `${path}.provenance.source`, message: 'Provenance source is required.', code: 'MISSING_PROV_SOURCE' });
      }
      if (!node.provenance.timestamp || isNaN(Date.parse(node.provenance.timestamp))) {
        errors.push({ path: `${path}.provenance.timestamp`, message: 'Valid ISO timestamp required.', code: 'INVALID_PROV_TIMESTAMP' });
      }
      if (options.checkDigests) {
        if (!node.provenance.digest) {
          warnings.push({ path: `${path}.provenance.digest`, message: 'Entity digest missing.', code: 'MISSING_DIGEST' });
        } else {
          const expected = computeEntityDigest(node as unknown as Record<string, unknown>);
          if (expected !== node.provenance.digest) {
            errors.push({
              path: `${path}.provenance.digest`,
              message: `${LIFEGRAPH_INTEGRITY_SIGNATURE} (node: ${node.id})`,
              code: 'DIGEST_MISMATCH',
            });
          }
        }
      }
    }

    // Permissions validation
    if (!node.permissions || typeof node.permissions !== 'object') {
      errors.push({ path: `${path}.permissions`, message: 'Permissions object is required.', code: 'MISSING_PERMISSIONS' });
    } else {
      if (!VISIBILITY_LEVELS.includes(node.permissions.visibility)) {
        errors.push({
          path: `${path}.permissions.visibility`,
          message: `Visibility must be one of: ${VISIBILITY_LEVELS.join(', ')}`,
          code: 'INVALID_VISIBILITY',
        });
      }
      if (!Array.isArray(node.permissions.consentPurposes)) {
        errors.push({
          path: `${path}.permissions.consentPurposes`,
          message: 'consentPurposes must be an array of strings.',
          code: 'INVALID_CONSENT_PURPOSES',
        });
      }
    }

    // Type-specific field validations
    validateTypeSpecificNode(node, path, errors, warnings);
  }

  // Validate Edges
  for (let i = 0; i < (graph.edges ?? []).length; i++) {
    const edge = graph.edges![i]!;
    const path = `$.edges[${i}]`;

    if (!edge.id || typeof edge.id !== 'string') {
      errors.push({ path: `${path}.id`, message: 'Edge id is required.', code: 'INVALID_EDGE_ID' });
    } else if (edgeIds.has(edge.id)) {
      errors.push({ path: `${path}.id`, message: `Duplicate edge ID: ${edge.id}`, code: 'DUPLICATE_EDGE_ID' });
    } else {
      edgeIds.add(edge.id);
    }

    // Referential integrity check
    if (!edge.sourceId || !nodeMap.has(edge.sourceId)) {
      errors.push({
        path: `${path}.sourceId`,
        message: `Dangling edge: sourceId '${edge.sourceId}' does not exist in nodes.`,
        code: 'DANGLING_SOURCE_EDGE',
      });
    }

    if (!edge.targetId || !nodeMap.has(edge.targetId)) {
      errors.push({
        path: `${path}.targetId`,
        message: `Dangling edge: targetId '${edge.targetId}' does not exist in nodes.`,
        code: 'DANGLING_TARGET_EDGE',
      });
    }

    if (!edge.predicate || typeof edge.predicate !== 'string') {
      errors.push({ path: `${path}.predicate`, message: 'Edge predicate is required.', code: 'MISSING_PREDICATE' });
    }

    if (edge.validFrom && edge.validTo) {
      if (Date.parse(edge.validFrom) > Date.parse(edge.validTo)) {
        errors.push({
          path: `${path}.validFrom`,
          message: `validFrom (${edge.validFrom}) cannot be after validTo (${edge.validTo}).`,
          code: 'CHRONOLOGICAL_INCONSISTENCY',
        });
      }
    }

    if (options.checkDigests && edge.provenance?.digest) {
      const expectedEdgeDigest = computeEntityDigest(edge as unknown as Record<string, unknown>);
      if (expectedEdgeDigest !== edge.provenance.digest) {
        errors.push({
          path: `${path}.provenance.digest`,
          message: `${LIFEGRAPH_INTEGRITY_SIGNATURE} (edge: ${edge.id})`,
          code: 'DIGEST_MISMATCH',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateTypeSpecificNode(
  node: LifeGraphNode,
  path: string,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  switch (node.type) {
    case 'person': {
      const person = node as PersonNode;
      if (!person.name || person.name.trim().length === 0) {
        errors.push({ path: `${path}.name`, message: 'Person name is required.', code: 'MISSING_PERSON_NAME' });
      }
      if (person.fiscalCode && !/^[A-Z0-9]{11,16}$/i.test(person.fiscalCode.replace(/\s+/g, ''))) {
        warnings.push({ path: `${path}.fiscalCode`, message: 'Fiscal code / Tax ID format appears non-standard.', code: 'WARN_FISCAL_CODE' });
      }
      break;
    }
    case 'document': {
      const doc = node as DocumentNode;
      if (!doc.documentType) {
        errors.push({ path: `${path}.documentType`, message: 'Document classification type is required.', code: 'MISSING_DOC_TYPE' });
      }
      if (doc.issueDate && doc.expiryDate) {
        if (Date.parse(doc.issueDate) > Date.parse(doc.expiryDate)) {
          errors.push({
            path: `${path}.issueDate`,
            message: `Document issueDate (${doc.issueDate}) cannot be after expiryDate (${doc.expiryDate}).`,
            code: 'CHRONOLOGICAL_INCONSISTENCY',
          });
        }
      }
      break;
    }
    case 'contract': {
      const contract = node as ContractNode;
      if (!contract.provider || contract.provider.trim().length === 0) {
        errors.push({ path: `${path}.provider`, message: 'Contract provider is required.', code: 'MISSING_PROVIDER' });
      }
      if (!contract.startDate || isNaN(Date.parse(contract.startDate))) {
        errors.push({ path: `${path}.startDate`, message: 'Valid contract startDate is required.', code: 'INVALID_START_DATE' });
      }
      if (contract.startDate && contract.endDate) {
        if (Date.parse(contract.startDate) > Date.parse(contract.endDate)) {
          errors.push({
            path: `${path}.startDate`,
            message: `Contract startDate (${contract.startDate}) cannot be after endDate (${contract.endDate}).`,
            code: 'CHRONOLOGICAL_INCONSISTENCY',
          });
        }
      }
      break;
    }
    case 'deadline': {
      const deadline = node as DeadlineNode;
      if (!deadline.dueDate || isNaN(Date.parse(deadline.dueDate))) {
        errors.push({ path: `${path}.dueDate`, message: 'Valid dueDate is required.', code: 'INVALID_DUE_DATE' });
      }
      if (!deadline.status) {
        errors.push({ path: `${path}.status`, message: 'Deadline status is required.', code: 'MISSING_STATUS' });
      }
      break;
    }
  }
}
