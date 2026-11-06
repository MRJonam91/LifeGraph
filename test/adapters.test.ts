// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { importVCard, exportVCard } from '../src/adapters/vcard.ts';
import { importSubscriptionsCsv } from '../src/adapters/subscriptions-csv.ts';
import { importIcsDeadlines } from '../src/adapters/ical-import.ts';

test('Adapters - vCard import parses contacts into PersonNodes', () => {
  const vcardSample = `BEGIN:VCARD
VERSION:3.0
FN:Giulia Bianchi
EMAIL:giulia.bianchi@example.org
TEL:+39 347 9876543
BDAY:1990-03-15
ADR:;;Corso Francia 10;Torino;Piemonte;10138;Italia
END:VCARD`;

  const persons = importVCard(vcardSample);
  assert.equal(persons.length, 1);
  const p = persons[0]!;
  assert.equal(p.name, 'Giulia Bianchi');
  assert.equal(p.email, 'giulia.bianchi@example.org');
  assert.equal(p.phone, '+39 347 9876543');
  assert.equal(p.dateOfBirth, '1990-03-15');
  assert.ok(p.address?.includes('Corso Francia 10'));
  assert.equal(p.provenance.source, 'file_import');
  assert.ok(p.provenance.digest.length === 64);
});

test('Adapters - CSV subscriptions import parses rows into ContractNodes', () => {
  const csvSample = `provider,amount,cycle,category
Netflix,17.99,monthly,subscription
Spotify,10.99,monthly,subscription
Fastweb Fibra,29.95,monthly,telecom`;

  const contracts = importSubscriptionsCsv(csvSample);
  assert.equal(contracts.length, 3);
  assert.equal(contracts[0]!.provider, 'Netflix');
  assert.equal(contracts[0]!.amount, 17.99);
  assert.equal(contracts[0]!.billingCycle, 'monthly');
  assert.equal(contracts[2]!.provider, 'Fastweb Fibra');
  assert.equal(contracts[2]!.contractType, 'telecom');
});

test('Adapters - iCalendar import parses events into DeadlineNodes', () => {
  const icsSample = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Example Corp.//Calendar//EN
BEGIN:VEVENT
UID:evt-101@example.org
DTSTART;VALUE=DATE:20270520
SUMMARY:Visita Medica di Revisione Patente
DESCRIPTION:Portare fototessera e marca da bollo
END:VEVENT
END:VCALENDAR`;

  const deadlines = importIcsDeadlines(icsSample);
  assert.equal(deadlines.length, 1);
  const dl = deadlines[0]!;
  assert.equal(dl.label, 'Visita Medica di Revisione Patente');
  assert.equal(dl.dueDate, '2027-05-20');
  assert.equal(dl.actionRequired, 'Portare fototessera e marca da bollo');
  assert.equal(dl.status, 'pending');
});

test('Adapters - vCard unfolds long wrapped lines and supports exportVCard', () => {
  const foldedCard = `BEGIN:VCARD
VERSION:3.0
FN:Marco
  Rossi
EMAIL:marco.
 rossi@example.com
TEL:+39 333
 1122334
ADR:;;Via Roma
  12;Milano;MI;20121;Italia
END:VCARD`;

  const persons = importVCard(foldedCard);
  assert.equal(persons.length, 1);
  assert.equal(persons[0]!.name, 'Marco Rossi');
  assert.equal(persons[0]!.email, 'marco.rossi@example.com');
  assert.equal(persons[0]!.phone, '+39 3331122334');
  assert.ok(persons[0]!.address?.includes('Via Roma 12'));

  const exported = exportVCard(persons);
  assert.ok(exported.includes('BEGIN:VCARD'));
  assert.ok(exported.includes('FN:Marco Rossi'));
  assert.ok(exported.includes('EMAIL;TYPE=INTERNET:marco.rossi@example.com'));
});

test('Adapters - CSV subscriptions handles semicolon delimiters and European decimal commas', () => {
  const semiCsv = `fornitore;importo;ciclo;categoria
Palestra Virgin;65,50;monthly;wellness
Telepass Family;3,90;monthly;transport`;

  const contracts = importSubscriptionsCsv(semiCsv);
  assert.equal(contracts.length, 2);
  assert.equal(contracts[0]!.provider, 'Palestra Virgin');
  assert.equal(contracts[0]!.amount, 65.5);
  assert.equal(contracts[0]!.billingCycle, 'monthly');
  assert.equal(contracts[1]!.provider, 'Telepass Family');
  assert.equal(contracts[1]!.amount, 3.9);
});
