// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { computeEntityDigest } from '../core/crypto.ts';
import type { DeadlineNode } from '../core/types.ts';

export function importIcsDeadlines(icsText: string): DeadlineNode[] {
  const deadlines: DeadlineNode[] = [];
  const events = icsText.split(/BEGIN:VEVENT/i).slice(1);

  let counter = 1;
  const now = new Date().toISOString();

  for (const ev of events) {
    const lines = ev.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    let summary = '';
    let dtstart = '';
    let description = '';

    for (const line of lines) {
      if (line.startsWith('END:VEVENT')) break;

      if (line.startsWith('SUMMARY:')) {
        summary = line.slice(8).replace(/\\,/g, ',').replace(/\\n/g, ' ').trim();
      } else if (line.startsWith('DTSTART')) {
        const val = line.slice(line.indexOf(':') + 1).trim();
        dtstart = formatIcsDate(val);
      } else if (line.startsWith('DESCRIPTION:')) {
        description = line.slice(12).replace(/\\,/g, ',').replace(/\\n/g, ' ').trim();
      }
    }

    if (!summary || !dtstart) continue;

    const id = `dl-imported-${counter++}`;
    const deadline: DeadlineNode = {
      id,
      type: 'deadline',
      label: summary,
      category: 'custom',
      dueDate: dtstart,
      noticeDays: 14,
      status: 'pending',
      ...(description ? { actionRequired: description } : {}),
      tags: ['imported', 'ical'],
      permissions: {
        visibility: 'private',
        consentPurposes: ['general_admin'],
        exportPolicy: 'exportable',
      },
      provenance: {
        source: 'file_import',
        timestamp: now,
        digest: '',
      },
    };

    deadline.provenance.digest = computeEntityDigest(deadline as unknown as Record<string, unknown>);
    deadlines.push(deadline);
  }

  return deadlines;
}

function formatIcsDate(val: string): string {
  // Handles YYYYMMDD or YYYYMMDDTHHMMSSZ
  const clean = val.replace(/[^0-9]/g, '');
  if (clean.length >= 8) {
    const year = clean.slice(0, 4);
    const month = clean.slice(4, 6);
    const day = clean.slice(6, 8);
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().split('T')[0]!;
}
