// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { computeEntityDigest } from '../core/crypto.ts';
import type { PersonNode } from '../core/types.ts';

export function importVCard(vcardText: string): PersonNode[] {
  const unfolded = vcardText.replace(/\r?\n[ \t]/g, '');
  const persons: PersonNode[] = [];
  const cards = unfolded.split(/BEGIN:VCARD/i).slice(1);

  let counter = 1;
  const now = new Date().toISOString();

  for (const card of cards) {
    const lines = card.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    let fn = '';
    let email = '';
    let phone = '';
    let bday = '';
    let adr = '';

    for (const line of lines) {
      if (line.startsWith('END:VCARD')) break;

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const prop = line.slice(0, colonIdx).toUpperCase();
      const val = line.slice(colonIdx + 1).trim();

      if (prop === 'FN' || (!fn && prop === 'N')) {
        fn = val.replace(/;/g, ' ').trim();
      } else if (prop.startsWith('EMAIL')) {
        email = val;
      } else if (prop.startsWith('TEL')) {
        phone = val;
      } else if (prop === 'BDAY') {
        bday = val;
      } else if (prop.startsWith('ADR')) {
        adr = val.replace(/;+/g, ', ').replace(/^,\s*|,\s*$/g, '');
      }
    }

    if (!fn) continue;

    const id = `person-vcard-${counter++}`;
    const person: PersonNode = {
      id,
      type: 'person',
      label: fn,
      name: fn,
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...(bday ? { dateOfBirth: bday } : {}),
      ...(adr ? { address: adr } : {}),
      tags: ['imported', 'vcard'],
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

    person.provenance.digest = computeEntityDigest(person as unknown as Record<string, unknown>);
    persons.push(person);
  }

  return persons;
}

export function exportVCard(persons: PersonNode[]): string {
  const cards: string[] = [];
  for (const person of persons) {
    const displayName = person.name || person.label;
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${displayName}`,
      `N:${displayName};;;;`,
    ];
    if (person.email) lines.push(`EMAIL;TYPE=INTERNET:${person.email}`);
    if (person.phone) lines.push(`TEL;TYPE=CELL:${person.phone}`);
    if (person.dateOfBirth) lines.push(`BDAY:${person.dateOfBirth}`);
    if (person.address) lines.push(`ADR;TYPE=HOME:;;${person.address};;;`);
    lines.push('END:VCARD');
    cards.push(lines.join('\r\n'));
  }
  return cards.join('\r\n\r\n');
}
