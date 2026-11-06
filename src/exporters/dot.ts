// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import type { LifeGraph } from '../core/graph.ts';

export function exportDot(graph: LifeGraph): string {
  const data = graph.toJSON();
  const lines: string[] = [
    'digraph LifeGraph {',
    '  rankdir=LR;',
    '  bgcolor="#0f172a";',
    '  fontname="Helvetica";',
    '  node [fontname="Helvetica", fontsize=10, style="filled,rounded", shape=box, fontcolor="#0f172a"];',
    '  edge [fontname="Helvetica", fontsize=9, fontcolor="#94a3b8", color="#64748b", arrowhead=vee];',
    '',
  ];

  for (const node of data.nodes) {
    let fill = '#ffffff';
    let stroke = '#0284c7';
    let shape = 'box';

    switch (node.type) {
      case 'person':
        fill = '#e0f2fe';
        stroke = '#0284c7';
        shape = 'box';
        break;
      case 'document':
        fill = '#dcfce7';
        stroke = '#16a34a';
        shape = 'note';
        break;
      case 'contract':
        fill = '#f3e8ff';
        stroke = '#9333ea';
        shape = 'component';
        break;
      case 'deadline':
        fill = '#ffedd5';
        stroke = '#ea580c';
        shape = 'ellipse';
        break;
    }

    const safeLabel = `${node.label}\\n(${node.type})`.replace(/"/g, '\\"');
    lines.push(`  "${node.id}" [label="${safeLabel}", fillcolor="${fill}", color="${stroke}", shape=${shape}];`);
  }

  lines.push('');

  for (const edge of data.edges) {
    const safePred = edge.predicate.replace(/"/g, '\\"');
    lines.push(`  "${edge.sourceId}" -> "${edge.targetId}" [label="${safePred}"];`);
  }

  lines.push('}');
  return lines.join('\n') + '\n';
}
