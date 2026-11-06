// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { computeGraphStats } from '../core/stats.ts';
import { getEvaluatedDeadlines } from '../core/deadlines.ts';
import type { LifeGraph } from '../core/graph.ts';
import type { ContractNode, DocumentNode, PersonNode } from '../core/types.ts';

export function exportMarkdown(graph: LifeGraph): string {
  const data = graph.toJSON();
  const stats = computeGraphStats(graph);
  const deadlines = getEvaluatedDeadlines(graph, { daysAhead: 120, includeCompleted: true });

  const lines: string[] = [];

  lines.push(`# ${data.title}`);
  lines.push('');
  lines.push(`> ${data.description}`);
  lines.push('');
  lines.push(`- **Namespace**: \`${data.namespace}\``);
  lines.push(`- **Last Updated**: \`${data.updatedAt}\``);
  lines.push(`- **Entities**: ${stats.totalNodes} (${stats.nodesByType.person} persons, ${stats.nodesByType.document} documents, ${stats.nodesByType.contract} contracts, ${stats.nodesByType.deadline} deadlines)`);
  lines.push(`- **Relationships**: ${stats.totalEdges}`);
  lines.push('');

  // Mermaid Diagram
  lines.push('## 🗺️ Entity Relationship Graph');
  lines.push('');
  lines.push('```mermaid');
  lines.push('graph TD');
  lines.push('  %% Styles');
  lines.push('  classDef person fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1;');
  lines.push('  classDef document fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#15803d;');
  lines.push('  classDef contract fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,color:#7e22ce;');
  lines.push('  classDef deadline fill:#ffedd5,stroke:#ea580c,stroke-width:2px,color:#c2410c;');
  lines.push('');

  // Node definitions in Mermaid
  for (const node of data.nodes) {
    const safeLabel = node.label.replace(/["[\]()]/g, '');
    lines.push(`  ${node.id}["${safeLabel} (${node.type})"]:::${node.type}`);
  }

  // Edge definitions in Mermaid
  for (const edge of data.edges) {
    const safePred = edge.predicate.replace(/["[\]()]/g, '');
    lines.push(`  ${edge.sourceId} -->|"${safePred}"| ${edge.targetId}`);
  }

  lines.push('```');
  lines.push('');

  // Deadlines table
  lines.push('## ⏰ Deadlines & Expirations');
  lines.push('');
  if (deadlines.length === 0) {
    lines.push('_No pending deadlines registered._');
  } else {
    lines.push('| Status | Due Date | Days Remaining | Category | Action Required | Target Entity |');
    lines.push('|---|---|---|---|---|---|');
    for (const item of deadlines) {
      const badge =
        item.urgency === 'overdue'
          ? '🔴 Overdue'
          : item.urgency === 'due_soon'
          ? '🟡 Due Soon'
          : item.deadline.status === 'completed'
          ? '🟢 Done'
          : '⚪ Upcoming';
      const targetLabel = item.targetEntity ? item.targetEntity.label : item.deadline.targetEntityId ?? '—';
      const action = item.deadline.actionRequired ?? item.deadline.label;
      lines.push(
        `| ${badge} | \`${item.deadline.dueDate}\` | **${item.daysRemaining}d** | ${item.deadline.category} | ${action} | ${targetLabel} |`
      );
    }
  }
  lines.push('');

  // Persons Directory
  const persons = data.nodes.filter((n): n is PersonNode => n.type === 'person');
  if (persons.length > 0) {
    lines.push('## 👤 Persons');
    lines.push('');
    lines.push('| ID | Name | Fiscal Code | Email | Visibility | Consent Purposes |');
    lines.push('|---|---|---|---|---|---|');
    for (const p of persons) {
      const fc = p.fiscalCode ? `\`${p.fiscalCode}\`` : '—';
      const email = p.email ?? '—';
      const purposes = p.permissions.consentPurposes.join(', ') || 'general';
      lines.push(`| \`${p.id}\` | **${p.name}** | ${fc} | ${email} | \`${p.permissions.visibility}\` | ${purposes} |`);
    }
    lines.push('');
  }

  // Documents Directory
  const docs = data.nodes.filter((n): n is DocumentNode => n.type === 'document');
  if (docs.length > 0) {
    lines.push('## 📄 Documents');
    lines.push('');
    lines.push('| ID | Label | Type | Number | Issuer | Expiry Date | Visibility |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const d of docs) {
      const num = d.documentNumber ? `\`${d.documentNumber}\`` : '—';
      const exp = d.expiryDate ? `\`${d.expiryDate}\`` : '—';
      lines.push(`| \`${d.id}\` | ${d.label} | \`${d.documentType}\` | ${num} | ${d.issuer ?? '—'} | ${exp} | \`${d.permissions.visibility}\` |`);
    }
    lines.push('');
  }

  // Contracts Directory
  const contracts = data.nodes.filter((n): n is ContractNode => n.type === 'contract');
  if (contracts.length > 0) {
    lines.push('## 📑 Contracts & Subscriptions');
    lines.push('');
    lines.push('| ID | Provider | Type | Amount | Cycle | Start | End | Status | Notice |');
    lines.push('|---|---|---|---|---|---|---|---|---|');
    for (const c of contracts) {
      const amt = c.amount !== undefined ? `${c.amount} ${c.currency ?? 'EUR'}` : '—';
      const cycle = c.billingCycle ?? '—';
      const end = c.endDate ? `\`${c.endDate}\`` : 'Open-ended';
      const notice = c.noticePeriodDays ? `${c.noticePeriodDays}d` : '—';
      lines.push(
        `| \`${c.id}\` | **${c.provider}** | \`${c.contractType}\` | ${amt} | ${cycle} | \`${c.startDate}\` | ${end} | \`${c.status}\` | ${notice} |`
      );
    }
    lines.push('');
  }

  // Provenance & Integrity Audit
  lines.push('## 🛡️ Provenance & Cryptographic Verification');
  lines.push('');
  lines.push(`All ${data.nodes.length} entities and ${data.edges.length} relationships carry cryptographic SHA-256 digests verified upon load.`);
  lines.push('');
  lines.push('| Source Lineage | Count |');
  lines.push('|---|---|');
  for (const [source, count] of Object.entries(stats.provenanceSources)) {
    lines.push(`| \`${source}\` | ${count} |`);
  }
  lines.push('');

  return lines.join('\n');
}
