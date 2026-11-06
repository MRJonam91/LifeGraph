// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import type {
  ENTITY_TYPE_PRECEDENCE,
  PREDICATE_TYPES,
  VISIBILITY_LEVELS,
} from './constants.ts';

export type EntityType = (typeof ENTITY_TYPE_PRECEDENCE)[number];
export type PredicateType = (typeof PREDICATE_TYPES)[number];
export type VisibilityLevel = (typeof VISIBILITY_LEVELS)[number];

export type ProvenanceSource =
  | 'user_input'
  | 'file_import'
  | 'verified_issuer'
  | 'agent_inferred'
  | 'migration';

export interface Provenance {
  source: ProvenanceSource;
  timestamp: string;
  author?: string;
  digest: string; // SHA-256 canonical hash
}

export interface Permissions {
  visibility: VisibilityLevel;
  consentPurposes: string[];
  encrypted?: boolean;
  exportPolicy?: 'exportable' | 'redacted' | 'excluded';
}

export interface BaseNode {
  id: string;
  type: EntityType;
  label: string;
  provenance: Provenance;
  permissions: Permissions;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface PersonNode extends BaseNode {
  type: 'person';
  name: string;
  fiscalCode?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
}

export type DocumentClassification =
  | 'identity_card'
  | 'passport'
  | 'driving_license'
  | 'tax_declaration'
  | 'medical_record'
  | 'diploma'
  | 'warranty'
  | 'custom';

export interface DocumentNode extends BaseNode {
  type: 'document';
  documentType: DocumentClassification;
  documentNumber?: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  fileSha256?: string;
  filePath?: string;
}

export type ContractStatus = 'draft' | 'active' | 'suspended' | 'cancelled' | 'expired';
export type ContractCategory =
  | 'employment'
  | 'rental'
  | 'utility_power'
  | 'utility_gas'
  | 'telecom'
  | 'insurance'
  | 'banking_loan'
  | 'subscription'
  | 'custom';
export type BillingCycle = 'monthly' | 'yearly' | 'quarterly' | 'one_off';

export interface ContractNode extends BaseNode {
  type: 'contract';
  contractType: ContractCategory;
  provider: string;
  contractNumber?: string;
  startDate: string;
  endDate?: string;
  autoRenew?: boolean;
  noticePeriodDays?: number;
  amount?: number;
  currency?: string;
  billingCycle?: BillingCycle;
  status: ContractStatus;
}

export type DeadlineStatus = 'pending' | 'completed' | 'dismissed' | 'overdue';
export type DeadlineCategory =
  | 'contract_renewal'
  | 'document_expiry'
  | 'tax_payment'
  | 'inspection'
  | 'cancellation_notice'
  | 'custom';
export type RecurrenceRule = 'none' | 'monthly' | 'quarterly' | 'yearly';

export interface DeadlineNode extends BaseNode {
  type: 'deadline';
  category: DeadlineCategory;
  targetEntityId?: string;
  dueDate: string;
  noticeDays?: number;
  status: DeadlineStatus;
  recurrence?: RecurrenceRule;
  actionRequired?: string;
}

export type LifeGraphNode = PersonNode | DocumentNode | ContractNode | DeadlineNode;

export interface LifeGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  predicate: PredicateType | string;
  provenance: Provenance;
  permissions: Permissions;
  validFrom?: string;
  validTo?: string;
  metadata?: Record<string, unknown>;
}

export interface LifeGraphData {
  version: string;
  namespace: string;
  title?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  nodes: LifeGraphNode[];
  edges: LifeGraphEdge[];
  metadata?: Record<string, unknown>;
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface GraphQueryFilter {
  type?: EntityType;
  tags?: string[];
  consentPurpose?: string;
  visibility?: VisibilityLevel[];
  search?: string;
}

export interface GraphDiffResult {
  addedNodes: LifeGraphNode[];
  removedNodes: LifeGraphNode[];
  modifiedNodes: { before: LifeGraphNode; after: LifeGraphNode; changes: string[] }[];
  addedEdges: LifeGraphEdge[];
  removedEdges: LifeGraphEdge[];
  modifiedEdges: { before: LifeGraphEdge; after: LifeGraphEdge; changes: string[] }[];
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<EntityType, number>;
  edgesByPredicate: Record<string, number>;
  visibilityBreakdown: Record<VisibilityLevel, number>;
  deadlinesSummary: {
    overdue: number;
    dueSoon: number;
    upcoming: number;
    completed: number;
  };
  provenanceSources: Record<string, number>;
}

export interface LineageResult {
  targetNode: LifeGraphNode;
  upstream: LifeGraphNode[];
  downstream: LifeGraphNode[];
  edges: LifeGraphEdge[];
}

export type AuditSeverity = 'critical' | 'warning' | 'info';

export interface AuditIssue {
  severity: AuditSeverity;
  entityId?: string;
  code: string;
  message: string;
  recommendation: string;
}

export interface AuditReport {
  healthScore: number;
  issues: AuditIssue[];
  orphanCount: number;
  unprotectedExpirationsCount: number;
  privacyRiskCount: number;
}

export type MergeStrategy = 'prefer-newer' | 'prefer-incoming' | 'prefer-base';

export interface MergeResult {
  graph: LifeGraphData;
  addedNodes: string[];
  updatedNodes: string[];
  skippedNodes: string[];
  addedEdges: string[];
  conflicts: Array<{ id: string; resolution: string; message: string }>;
}
