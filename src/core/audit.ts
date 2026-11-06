// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { evaluateDeadlineTime } from './deadlines.ts';
import type { LifeGraph } from './graph.ts';
import type {
  AuditIssue,
  AuditReport,
  ContractNode,
  DeadlineNode,
  DocumentNode,
  PersonNode,
} from './types.ts';

export function auditLifeGraph(graph: LifeGraph, referenceDate = new Date()): AuditReport {
  const issues: AuditIssue[] = [];
  let orphanCount = 0;
  let unprotectedExpirationsCount = 0;
  let privacyRiskCount = 0;

  for (const node of graph.getNodes()) {
    // 1. Privacy & PII Exposure Audit
    if (node.type === 'person') {
      const p = node as PersonNode;
      if (node.permissions.visibility === 'public' && (p.fiscalCode || p.phone || p.address)) {
        privacyRiskCount++;
        issues.push({
          severity: 'critical',
          entityId: node.id,
          code: 'PUBLIC_PII_EXPOSURE',
          message: `Person '${p.name}' is marked public with sensitive PII (fiscalCode/phone/address).`,
          recommendation: "Change visibility to 'private' or 'confidential'.",
        });
      }
    } else if (node.type === 'document') {
      const d = node as DocumentNode;
      if (node.permissions.visibility === 'public' && (d.documentNumber || d.fileSha256)) {
        privacyRiskCount++;
        issues.push({
          severity: 'critical',
          entityId: node.id,
          code: 'PUBLIC_DOCUMENT_EXPOSURE',
          message: `Official document '${d.label}' is marked public with identifier/hash.`,
          recommendation: "Change document visibility to 'confidential'.",
        });
      }

      const hasOwner = graph.getIncomingEdges(node.id).some((e) => e.predicate === 'OWNS');
      if (!hasOwner) {
        orphanCount++;
        issues.push({
          severity: 'warning',
          entityId: node.id,
          code: 'ORPHAN_DOCUMENT',
          message: `Document '${d.label}' has no person linked via 'OWNS'.`,
          recommendation: "Add an 'OWNS' edge from the person who owns this document.",
        });
      }

      if (d.expiryDate) {
        const hasExpiryDeadline = graph
          .getOutgoingEdges(node.id)
          .some((e) => e.predicate === 'EXPIRES_ON' && graph.getNode(e.targetId)?.type === 'deadline');
        if (!hasExpiryDeadline) {
          unprotectedExpirationsCount++;
          issues.push({
            severity: 'warning',
            entityId: node.id,
            code: 'UNPROTECTED_DOC_EXPIRY',
            message: `Document '${d.label}' expires on ${d.expiryDate} with no linked reminder deadline.`,
            recommendation: "Add an 'EXPIRES_ON' deadline before expiry.",
          });
        }
      }
    } else if (node.type === 'contract') {
      const c = node as ContractNode;
      const hasSignatory = graph.getIncomingEdges(node.id).some((e) => e.predicate === 'PARTY_TO');
      if (!hasSignatory) {
        orphanCount++;
        issues.push({
          severity: 'warning',
          entityId: node.id,
          code: 'ORPHAN_CONTRACT',
          message: `Contract '${c.label}' has no person linked via 'PARTY_TO'.`,
          recommendation: "Link this contract to a signatory person.",
        });
      }

      if (c.endDate && c.status === 'active') {
        const hasRenewal = graph.getOutgoingEdges(node.id).some((e) => graph.getNode(e.targetId)?.type === 'deadline');
        if (!hasRenewal) {
          unprotectedExpirationsCount++;
          issues.push({
            severity: 'warning',
            entityId: node.id,
            code: 'UNPROTECTED_CONTRACT_END',
            message: `Active contract '${c.label}' ends on ${c.endDate} with no renewal notice deadline.`,
            recommendation: "Attach a renewal or cancellation notice deadline.",
          });
        }
      }
    } else if (node.type === 'deadline') {
      const dl = node as DeadlineNode;
      if (dl.status === 'pending') {
        const { urgency, daysRemaining } = evaluateDeadlineTime(dl.dueDate, dl.noticeDays ?? 30, referenceDate);
        if (urgency === 'overdue') {
          issues.push({
            severity: 'critical',
            entityId: node.id,
            code: 'OVERDUE_DEADLINE',
            message: `Deadline '${dl.label}' is overdue by ${Math.abs(daysRemaining)} days!`,
            recommendation: "Fulfill action or mark status as 'completed' / 'dismissed'.",
          });
        }
      }
    }

    if (node.permissions.consentPurposes.length === 0) {
      issues.push({
        severity: 'info',
        entityId: node.id,
        code: 'EMPTY_CONSENT_PURPOSE',
        message: `Entity '${node.label}' has empty consent purposes.`,
        recommendation: "Assign at least one purpose tag (e.g. 'general_admin').",
      });
    }
  }

  const penalty =
    issues.filter((i) => i.severity === 'critical').length * 20 +
    issues.filter((i) => i.severity === 'warning').length * 8 +
    issues.filter((i) => i.severity === 'info').length * 2;

  return {
    healthScore: Math.max(0, 100 - penalty),
    issues,
    orphanCount,
    unprotectedExpirationsCount,
    privacyRiskCount,
  };
}
