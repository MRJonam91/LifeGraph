// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import type { LifeGraph } from '../core/graph.ts';
import type { DeadlineNode } from '../core/types.ts';

export function exportIcs(graph: LifeGraph): string {
  const deadlines = graph.getNodes().filter((n): n is DeadlineNode => n.type === 'deadline');
  const now = new Date();
  const dtstamp = formatDateToIcsTimestamp(now);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LifeGraph//Deterministic Personal LifeGraph//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${sanitizeIcs(graph.title)}`,
    `X-WR-CALDESC:${sanitizeIcs(graph.description)}`,
  ];

  for (const dl of deadlines) {
    const dueFormatted = dl.dueDate.replace(/-/g, '');
    const summary = sanitizeIcs(`[LifeGraph] ${dl.label}`);
    const target = dl.targetEntityId ? graph.getNode(dl.targetEntityId) : undefined;
    const targetDesc = target ? `Target: ${target.label} (${target.type})` : '';
    const actionDesc = dl.actionRequired ? `Action: ${dl.actionRequired}` : '';
    const description = sanitizeIcs([actionDesc, targetDesc, `Category: ${dl.category}`, `Status: ${dl.status}`].filter(Boolean).join('\n'));

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:dl-${dl.id}@lifegraph`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dueFormatted}`);
    lines.push(`DTEND;VALUE=DATE:${dueFormatted}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push(`STATUS:${dl.status === 'completed' ? 'CONFIRMED' : 'TENTATIVE'}`);

    // Alarm reminder: trigger 7 days before, or noticeDays before
    const alertDays = dl.noticeDays ?? 7;
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:${summary}`);
    lines.push(`TRIGGER:-P${alertDays}D`);
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

function formatDateToIcsTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function sanitizeIcs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}
