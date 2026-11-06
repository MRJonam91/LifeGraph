// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { LifeGraph } from '../src/core/graph.ts';
import { createSampleLifeGraphData } from '../src/sample.ts';
import { exportCanonicalJson, importCanonicalJson } from '../src/exporters/canonical-json.ts';
import { exportJsonLd } from '../src/exporters/jsonld.ts';
import { exportMarkdown } from '../src/exporters/markdown.ts';
import { exportIcs } from '../src/exporters/ical.ts';
import { exportHtml } from '../src/exporters/html.ts';
import { exportNodesCsv, exportEdgesCsv, exportDeadlinesCsv } from '../src/exporters/csv.ts';

test('Exporters - Lossless Canonical JSON Round-trip (SEED.md Trial 1)', () => {
  const original = new LifeGraph(createSampleLifeGraphData());
  const serialized = exportCanonicalJson(original);

  const reimported = importCanonicalJson(serialized);
  const reSerialized = exportCanonicalJson(reimported);

  // Exact lossless byte-for-byte round-trip
  assert.equal(serialized, reSerialized);
  assert.equal(reimported.getNodes().length, original.getNodes().length);
  assert.equal(reimported.getEdges().length, original.getEdges().length);
});

test('Exporters - JSON-LD includes Schema.org and PROV-O mappings', () => {
  const graph = new LifeGraph(createSampleLifeGraphData());
  const jsonld = exportJsonLd(graph);
  const parsed = JSON.parse(jsonld);

  assert.ok(parsed['@context']);
  assert.ok(parsed['@graph'].length >= 7);
  const person = parsed['@graph'].find((item: any) => item['@type'] === 'Person');
  assert.ok(person);
  assert.equal(person.name, 'Mario Rossi');
  assert.ok(person['prov:wasGeneratedBy']);
});

test('Exporters - Markdown includes Mermaid flowchart syntax', () => {
  const graph = new LifeGraph(createSampleLifeGraphData());
  const md = exportMarkdown(graph);

  assert.ok(md.includes('```mermaid'));
  assert.ok(md.includes('graph TD'));
  assert.ok(md.includes('classDef person'));
  assert.ok(md.includes('## ⏰ Deadlines & Expirations'));
  assert.ok(md.includes('Mario Rossi'));
});

test('Exporters - iCal generates valid RFC 5545 VCALENDAR & VEVENTs', () => {
  const graph = new LifeGraph(createSampleLifeGraphData());
  const ics = exportIcs(graph);

  assert.ok(ics.startsWith('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('BEGIN:VEVENT'));
  assert.ok(ics.includes('BEGIN:VALARM'));
  assert.ok(ics.includes('END:VCALENDAR'));
});

test('Exporters - HTML generates standalone responsive report', () => {
  const graph = new LifeGraph(createSampleLifeGraphData());
  const html = exportHtml(graph);

  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('Mario Rossi'));
  assert.ok(html.includes('Total Entities'));
  assert.ok(html.includes('Cryptographically Verified'));
});

test('Exporters - CSV produces tabular data for nodes, edges, deadlines', () => {
  const graph = new LifeGraph(createSampleLifeGraphData());
  const nodesCsv = exportNodesCsv(graph);
  assert.ok(nodesCsv.startsWith('id,type'));
  assert.ok(nodesCsv.includes('person-mario-rossi'));

  const edgesCsv = exportEdgesCsv(graph);
  assert.ok(edgesCsv.startsWith('id,sourceId'));
  assert.ok(edgesCsv.includes('OWNS'));

  const dlCsv = exportDeadlinesCsv(graph);
  assert.ok(dlCsv.startsWith('id,label'));
  assert.ok(dlCsv.includes('Rinnovo Passaporto'));
});
