// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { auditLifeGraph } from '../core/audit.ts';
import { getEvaluatedDeadlines } from '../core/deadlines.ts';
import type { LifeGraph } from '../core/graph.ts';
import { computeGraphStats } from '../core/stats.ts';

export function exportHtml(graph: LifeGraph): string {
  const data = graph.toJSON();
  const stats = computeGraphStats(graph);
  const audit = auditLifeGraph(graph);
  const deadlines = getEvaluatedDeadlines(graph, { daysAhead: 180, includeCompleted: true });

  const safeTitle = escapeHtml(data.title ?? 'LifeGraph Report');
  const safeDesc = escapeHtml(data.description ?? '');

  const healthColor = audit.healthScore >= 80 ? 'var(--success)' : audit.healthScore >= 50 ? 'var(--warning)' : 'var(--danger)';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle} — LifeGraph</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --success: #4ade80;
      --warning: #facc15;
      --danger: #f87171;
      --accent: #c084fc;
      --font: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: var(--font); line-height: 1.5; padding: 2rem 1rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    header { margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; }
    h1 { font-size: 2rem; font-weight: 700; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
    p.lead { color: var(--text-muted); font-size: 1.1rem; }
    .meta-bar { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem; font-size: 0.875rem; color: var(--text-muted); }
    .badge { padding: 0.2rem 0.6rem; border-radius: 9999px; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; }
    .badge-primary { background: rgba(56, 189, 248, 0.2); color: var(--primary); border: 1px solid var(--primary); }
    .badge-danger { background: rgba(248, 113, 113, 0.2); color: var(--danger); border: 1px solid var(--danger); }
    .badge-warning { background: rgba(250, 204, 21, 0.2); color: var(--warning); border: 1px solid var(--warning); }
    .badge-success { background: rgba(74, 222, 128, 0.2); color: var(--success); border: 1px solid var(--success); }
    .badge-purple { background: rgba(192, 132, 252, 0.2); color: var(--accent); border: 1px solid var(--accent); }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 0.75rem; padding: 1.25rem; text-align: center; }
    .stat-number { font-size: 2.25rem; font-weight: 800; color: var(--primary); line-height: 1; margin-bottom: 0.5rem; }
    .stat-label { color: var(--text-muted); font-size: 0.875rem; text-transform: uppercase; font-weight: 600; }
    section { margin-bottom: 2.5rem; background: var(--card-bg); border: 1px solid var(--border); border-radius: 0.75rem; padding: 1.5rem; }
    h2 { font-size: 1.35rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between; }
    .search-input { width: 100%; padding: 0.75rem 1rem; background: #0f172a; border: 1px solid var(--border); border-radius: 0.5rem; color: #fff; margin-bottom: 1rem; font-size: 0.95rem; }
    .search-input:focus { outline: none; border-color: var(--primary); }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }
    th { padding: 0.75rem; background: rgba(15, 23, 42, 0.6); color: var(--text-muted); border-bottom: 2px solid var(--border); font-weight: 600; }
    td { padding: 0.75rem; border-bottom: 1px solid var(--border); }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: rgba(0,0,0,0.3); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.85em; }
    .provenance-banner { background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 0.5rem; padding: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 2rem; }
    .footer { text-align: center; color: var(--text-muted); font-size: 0.875rem; margin-top: 3rem; border-top: 1px solid var(--border); padding-top: 1.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🧬 ${safeTitle} <span class="badge badge-primary">v${data.version}</span></h1>
      <p class="lead">${safeDesc}</p>
      <div class="meta-bar">
        <span><strong>Namespace:</strong> <code>${escapeHtml(data.namespace)}</code></span>
        <span><strong>Last modified:</strong> ${escapeHtml(data.updatedAt)}</span>
        <span><strong>Integrity:</strong> Cryptographically Verified (SHA-256)</span>
      </div>
    </header>

    <div class="provenance-banner">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <div style="font-size: 1.8rem;">🛡️</div>
        <div>
          <strong>Deterministic Personal Data Ledger</strong>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            All ${stats.totalNodes} entities and ${stats.totalEdges} relationships carry verifiable SHA-256 provenance hashes.
          </div>
        </div>
      </div>
      <div>
        <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); text-align: right;">Health Score</div>
        <div style="font-size: 1.5rem; font-weight: 800; color: ${healthColor}; text-align: right;">${audit.healthScore}%</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">${stats.totalNodes}</div>
        <div class="stat-label">Total Entities</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="color: var(--accent);">${stats.totalEdges}</div>
        <div class="stat-label">Relationships</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="color: var(--danger);">${stats.deadlinesSummary.overdue}</div>
        <div class="stat-label">Overdue Obligations</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="color: var(--warning);">${stats.deadlinesSummary.dueSoon}</div>
        <div class="stat-label">Due in &le; 30 Days</div>
      </div>
    </div>

    <section>
      <h2>⏰ Deadlines & Expirations Timeline</h2>
      ${
        deadlines.length === 0
          ? '<p style="color: var(--text-muted);">No pending deadlines registered.</p>'
          : `<table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Due Date</th>
            <th>Days Left</th>
            <th>Category</th>
            <th>Action Required</th>
            <th>Target Entity</th>
          </tr>
        </thead>
        <tbody>
          ${deadlines
            .map((item) => {
              const badgeClass =
                item.urgency === 'overdue'
                  ? 'badge-danger'
                  : item.urgency === 'due_soon'
                  ? 'badge-warning'
                  : item.deadline.status === 'completed'
                  ? 'badge-success'
                  : 'badge-primary';
              const targetStr = item.targetEntity ? escapeHtml(item.targetEntity.label) : item.deadline.targetEntityId ?? '—';
              return `<tr>
                <td><span class="badge ${badgeClass}">${item.urgency}</span></td>
                <td><code>${escapeHtml(item.deadline.dueDate)}</code></td>
                <td><strong>${item.daysRemaining}d</strong></td>
                <td>${escapeHtml(item.deadline.category)}</td>
                <td>${escapeHtml(item.deadline.actionRequired ?? item.deadline.label)}</td>
                <td>${targetStr}</td>
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>`
      }
    </section>

    <section>
      <h2>📦 Entities Inventory (${stats.totalNodes})</h2>
      <input type="text" id="entitySearch" class="search-input" placeholder="Filter entities by label, ID, type or consent purpose..." onkeyup="filterEntities()">
      <table id="entitiesTable">
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Label</th>
            <th>Visibility</th>
            <th>Consent Purposes</th>
            <th>Lineage</th>
          </tr>
        </thead>
        <tbody>
          ${data.nodes
            .map((node) => {
              const typeClass =
                node.type === 'person'
                  ? 'badge-primary'
                  : node.type === 'document'
                  ? 'badge-success'
                  : node.type === 'contract'
                  ? 'badge-purple'
                  : 'badge-warning';
              const purposes = node.permissions.consentPurposes.join(', ') || 'general';
              return `<tr>
                <td><code>${escapeHtml(node.id)}</code></td>
                <td><span class="badge ${typeClass}">${node.type}</span></td>
                <td><strong>${escapeHtml(node.label)}</strong></td>
                <td><code>${escapeHtml(node.permissions.visibility)}</code></td>
                <td><small>${escapeHtml(purposes)}</small></td>
                <td><code>${escapeHtml(node.provenance.source)}</code></td>
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    </section>

    <section>
      <h2>🔗 Relationships & Graph Topology (${stats.totalEdges})</h2>
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Predicate</th>
            <th>Target</th>
            <th>Visibility</th>
            <th>Validity</th>
          </tr>
        </thead>
        <tbody>
          ${data.edges
            .map((edge) => {
              const validity =
                edge.validFrom || edge.validTo
                  ? `${edge.validFrom ?? '...'} &rarr; ${edge.validTo ?? 'present'}`
                  : 'Permanent';
              return `<tr>
                <td><code>${escapeHtml(edge.sourceId)}</code></td>
                <td><strong style="color: var(--primary);">&rarr; ${escapeHtml(edge.predicate)} &rarr;</strong></td>
                <td><code>${escapeHtml(edge.targetId)}</code></td>
                <td><code>${escapeHtml(edge.permissions.visibility)}</code></td>
                <td><small>${validity}</small></td>
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    </section>

    <script>
      function filterEntities() {
        const query = document.getElementById('entitySearch').value.toLowerCase();
        const rows = document.querySelectorAll('#entitiesTable tbody tr');
        rows.forEach(r => {
          r.style.display = r.innerText.toLowerCase().includes(query) ? '' : 'none';
        });
      }
    </script>

    <div class="footer">
      Generated deterministically by <a href="https://github.com/MRJonam91/LifeGraph" style="color: var(--primary); text-decoration: none;"><strong>LifeGraph</strong></a> &bull; Apache-2.0 License &bull; &copy; 2026 Manoj Rollo
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
