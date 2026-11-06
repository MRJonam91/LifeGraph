#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  formatSponsorNotice,
  LIFEGRAPH_SCHEMA_VERSION,
  shouldShowSponsorNotice,
  SPONSOR_URLS,
} from '../core/constants.ts';
import { LifeGraph } from '../core/graph.ts';
import { validateLifeGraph } from '../core/validator.ts';
import { computeGraphStats } from '../core/stats.ts';
import { getEvaluatedDeadlines } from '../core/deadlines.ts';
import { computeGraphDiff } from '../core/diff.ts';
import { auditLifeGraph } from '../core/audit.ts';
import { mergeLifeGraphs } from '../core/merge.ts';
import { exportCanonicalJson, importCanonicalJson } from '../exporters/canonical-json.ts';
import { exportJsonLd } from '../exporters/jsonld.ts';
import { exportMarkdown } from '../exporters/markdown.ts';
import { exportIcs } from '../exporters/ical.ts';
import { exportHtml } from '../exporters/html.ts';
import { exportNodesCsv, exportEdgesCsv, exportDeadlinesCsv } from '../exporters/csv.ts';
import { exportDot } from '../exporters/dot.ts';
import { createSampleLifeGraphData } from '../sample.ts';
import type { EntityType, MergeStrategy } from '../core/types.ts';

const HELP_TEXT = `LifeGraph CLI — v${LIFEGRAPH_SCHEMA_VERSION}
Deterministic personal knowledge graph connecting entities, contracts, and deadlines.

USAGE:
  lifegraph <command> [options]

COMMANDS:
  init [file]                    Initialize an empty LifeGraph file (default: lifegraph.json)
  sample [file]                  Generate a synthetic demonstration LifeGraph file
  validate <file>                Validate schema, referential integrity, and cryptographic digests
  inspect <file>                 Show detailed summary and entity statistics
  stats <file>                   Alias for 'inspect'
  audit <file>                   Run privacy hygiene & paperwork completeness audit
  trace <file> <nodeId>          Trace upstream and downstream dependency lineage
  deadlines <file> [--days N]    List impending and overdue deadlines (default: 60 days)
  query <file> [options]         Search entities by type, tag, or label keyword
  filter <file> --consent <p>    Export a consent-restricted subgraph
  anonymize <file> [--out <f>]   Sanitize PII while preserving relational topology
  merge <fileA> <fileB>          Reconcile & merge two LifeGraph ledgers
  export <file> --format <fmt>   Export to json, jsonld, markdown, ics, html, csv, or dot
  diff <fileA> <fileB>           Compare two LifeGraph snapshot files
  sponsor                        Show sponsorship and donation channels

OPTIONS:
  -f, --format <fmt>             Target export format: json | jsonld | markdown | ics | html | csv | dot
  -o, --out <path>               Write output to file instead of stdout
  -c, --consent <purpose>        Consent purpose filter (e.g. general_admin, tax_filing, banking_kyc)
  -t, --type <type>              Filter query by entity type: person | document | contract | deadline
  -s, --search <keyword>         Search query string
  -d, --days <number>            Lookahead days for deadlines (default: 60)
  --strategy <strategy>          Merge conflict strategy: prefer-newer | prefer-incoming | prefer-base
  --strict                       Exit with code 1 if audit warnings/critical issues exist
  --all                          Include completed/dismissed deadlines
  --no-digests                   Skip SHA-256 digest recalculation during validation
  -v, --version                  Print version
  -h, --help                     Print this help message

SPONSOR:
  Support development: ${SPONSOR_URLS.kofi} | ${SPONSOR_URLS.github}
`;

function parseArgs(args: string[]): {
  command?: string;
  positionals: string[];
  flags: Record<string, string | boolean>;
} {
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];

  let i = 0;
  while (i < args.length) {
    const arg = args[i]!;
    if (arg === '-h' || arg === '--help') {
      flags['help'] = true;
    } else if (arg === '-v' || arg === '--version') {
      flags['version'] = true;
    } else if (arg === '--all') {
      flags['all'] = true;
    } else if (arg === '--strict') {
      flags['strict'] = true;
    } else if (arg === '--no-digests') {
      flags['no-digests'] = true;
    } else if (arg === '-f' || arg === '--format') {
      flags['format'] = args[++i] ?? '';
    } else if (arg === '-o' || arg === '--out') {
      flags['out'] = args[++i] ?? '';
    } else if (arg === '-c' || arg === '--consent') {
      flags['consent'] = args[++i] ?? '';
    } else if (arg === '-t' || arg === '--type') {
      flags['type'] = args[++i] ?? '';
    } else if (arg === '-s' || arg === '--search') {
      flags['search'] = args[++i] ?? '';
    } else if (arg === '-d' || arg === '--days') {
      flags['days'] = args[++i] ?? '';
    } else if (arg === '--strategy') {
      flags['strategy'] = args[++i] ?? '';
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      flags[key] = true;
    } else {
      positionals.push(arg);
    }
    i++;
  }

  const command = positionals[0];
  return {
    command,
    positionals: positionals.slice(1),
    flags,
  };
}

function loadGraph(filePath: string): LifeGraph {
  const absPath = resolve(process.cwd(), filePath);
  if (!existsSync(absPath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }
  const raw = readFileSync(absPath, 'utf-8');
  try {
    return importCanonicalJson(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}: ${(err as Error).message}`);
    process.exit(1);
  }
}

function writeOutput(content: string, outPath?: string): void {
  if (outPath) {
    const target = resolve(process.cwd(), outPath);
    writeFileSync(target, content, 'utf-8');
    console.log(`Saved output to: ${outPath}`);
  } else {
    process.stdout.write(content + (content.endsWith('\n') ? '' : '\n'));
  }
}

export function runCli(argv: string[] = process.argv.slice(2)): void {
  const { command, positionals, flags } = parseArgs(argv);

  if (flags['version']) {
    console.log(`lifegraph v${LIFEGRAPH_SCHEMA_VERSION}`);
    return;
  }

  if (flags['help'] || !command) {
    console.log(HELP_TEXT);
    return;
  }

  switch (command) {
    case 'sponsor': {
      console.log('LifeGraph Sponsorship & Support:');
      console.log(`  • GitHub Sponsors: ${SPONSOR_URLS.github}`);
      console.log(`  • Ko-fi:           ${SPONSOR_URLS.kofi}`);
      console.log(`  • Buy Me A Coffee: ${SPONSOR_URLS.buymeacoffee}`);
      console.log(`  • PayPal:          ${SPONSOR_URLS.paypal}`);
      return;
    }

    case 'init': {
      const dest = positionals[0] ?? 'lifegraph.json';
      const abs = resolve(process.cwd(), dest);
      if (existsSync(abs)) {
        console.error(`Error: File already exists: ${dest}`);
        process.exit(1);
      }
      const emptyGraph = LifeGraph.createEmpty('My LifeGraph');
      const canonical = exportCanonicalJson(emptyGraph);
      writeFileSync(abs, canonical, 'utf-8');
      console.log(`✨ Created empty LifeGraph ledger at: ${dest}`);
      break;
    }

    case 'sample': {
      const dest = positionals[0] ?? 'lifegraph-sample.json';
      const sample = createSampleLifeGraphData();
      const graph = new LifeGraph(sample);
      const canonical = exportCanonicalJson(graph);
      const abs = resolve(process.cwd(), dest);
      writeFileSync(abs, canonical, 'utf-8');
      console.log(`✨ Created sample demonstration LifeGraph at: ${dest} (7 entities, 7 relationships)`);
      break;
    }

    case 'validate': {
      const targetFile = positionals[0];
      if (!targetFile) {
        console.error('Usage: lifegraph validate <file.json>');
        process.exit(1);
      }
      const absPath = resolve(process.cwd(), targetFile);
      if (!existsSync(absPath)) {
        console.error(`Error: File not found: ${targetFile}`);
        process.exit(1);
      }
      const raw = readFileSync(absPath, 'utf-8');
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.error(`Invalid JSON: ${(e as Error).message}`);
        process.exit(1);
      }

      const checkDigests = !flags['no-digests'];
      const result = validateLifeGraph(parsed, { checkDigests });

      if (result.valid && result.warnings.length === 0) {
        console.log(`\x1b[32m✔ LifeGraph file is 100% valid. (referential integrity & digests verified)\x1b[0m`);
        process.exit(0);
      }

      if (result.warnings.length > 0) {
        console.log(`\x1b[33mWarnings (${result.warnings.length}):\x1b[0m`);
        for (const w of result.warnings) {
          console.log(`  ⚠ [${w.code}] ${w.path}: ${w.message}`);
        }
      }

      if (!result.valid) {
        console.error(`\x1b[31mValidation Errors (${result.errors.length}):\x1b[0m`);
        for (const err of result.errors) {
          console.error(`  ✖ [${err.code}] ${err.path}: ${err.message}`);
        }
        process.exit(1);
      }
      break;
    }

    case 'inspect':
    case 'stats': {
      const targetFile = positionals[0];
      if (!targetFile) {
        console.error('Usage: lifegraph inspect <file.json>');
        process.exit(1);
      }
      const graph = loadGraph(targetFile);
      const stats = computeGraphStats(graph);

      console.log(`\x1b[1m=== LifeGraph Summary: ${graph.title} ===\x1b[0m`);
      console.log(`Namespace:   ${graph.namespace}`);
      console.log(`Version:     ${graph.version}`);
      console.log(`Total Nodes: ${stats.totalNodes}`);
      console.log(`  • Persons:   ${stats.nodesByType.person}`);
      console.log(`  • Documents: ${stats.nodesByType.document}`);
      console.log(`  • Contracts: ${stats.nodesByType.contract}`);
      console.log(`  • Deadlines: ${stats.nodesByType.deadline}`);
      console.log(`Total Edges: ${stats.totalEdges}`);
      for (const [pred, count] of Object.entries(stats.edgesByPredicate)) {
        console.log(`  • ${pred.padEnd(14)}: ${count}`);
      }
      console.log(`Visibility Levels:`);
      for (const [vis, count] of Object.entries(stats.visibilityBreakdown)) {
        console.log(`  • ${vis.padEnd(14)}: ${count}`);
      }
      console.log(`Deadlines:`);
      console.log(`  • Overdue:   \x1b[31m${stats.deadlinesSummary.overdue}\x1b[0m`);
      console.log(`  • Due Soon:  \x1b[33m${stats.deadlinesSummary.dueSoon}\x1b[0m`);
      console.log(`  • Upcoming:  ${stats.deadlinesSummary.upcoming}`);
      console.log(`  • Completed: \x1b[32m${stats.deadlinesSummary.completed}\x1b[0m`);
      break;
    }

    case 'audit': {
      const targetFile = positionals[0];
      if (!targetFile) {
        console.error('Usage: lifegraph audit <file.json> [--strict]');
        process.exit(1);
      }
      const graph = loadGraph(targetFile);
      const audit = auditLifeGraph(graph);

      const color =
        audit.healthScore >= 80 ? '\x1b[32m' : audit.healthScore >= 50 ? '\x1b[33m' : '\x1b[31m';
      console.log(`\x1b[1m=== LifeGraph Hygiene & Completeness Audit ===\x1b[0m`);
      console.log(`Health Score:             ${color}${audit.healthScore}%\x1b[0m`);
      console.log(`Orphan Entities:          ${audit.orphanCount}`);
      console.log(`Unprotected Expirations:  ${audit.unprotectedExpirationsCount}`);
      console.log(`Public PII Risks:         ${audit.privacyRiskCount}`);

      if (audit.issues.length > 0) {
        console.log(`\nIssues detected (${audit.issues.length}):`);
        for (const iss of audit.issues) {
          const badge =
            iss.severity === 'critical'
              ? '\x1b[31m[CRITICAL]\x1b[0m'
              : iss.severity === 'warning'
              ? '\x1b[33m[WARNING]\x1b[0m'
              : '\x1b[36m[INFO]\x1b[0m';
          console.log(` ${badge} (${iss.code}): ${iss.message}`);
          console.log(`    ↳ Recommendation: ${iss.recommendation}`);
        }
      } else {
        console.log(`\x1b[32m✔ No hygiene or privacy issues found.\x1b[0m`);
      }

      if (flags['strict'] && (audit.privacyRiskCount > 0 || audit.healthScore < 70)) {
        process.exit(1);
      }
      break;
    }

    case 'trace': {
      const targetFile = positionals[0];
      const targetId = positionals[1];
      if (!targetFile || !targetId) {
        console.error('Usage: lifegraph trace <file.json> <nodeId>');
        process.exit(1);
      }
      const graph = loadGraph(targetFile);
      const lineage = graph.findLineage(targetId);

      console.log(`\x1b[1m=== Relational Lineage for: ${lineage.targetNode.label} (${lineage.targetNode.id}) ===\x1b[0m`);
      console.log(`Type:       ${lineage.targetNode.type}`);
      console.log(`Visibility: ${lineage.targetNode.permissions.visibility}`);

      console.log(`\n⬆ Upstream Dependencies (${lineage.upstream.length}):`);
      if (lineage.upstream.length === 0) console.log('  (none)');
      for (const up of lineage.upstream) {
        console.log(`  • [${up.type.toUpperCase()}] ${up.label} (${up.id})`);
      }

      console.log(`\n⬇ Downstream Consequences (${lineage.downstream.length}):`);
      if (lineage.downstream.length === 0) console.log('  (none)');
      for (const down of lineage.downstream) {
        console.log(`  • [${down.type.toUpperCase()}] ${down.label} (${down.id})`);
      }
      break;
    }

    case 'merge': {
      const fileA = positionals[0];
      const fileB = positionals[1];
      if (!fileA || !fileB) {
        console.error('Usage: lifegraph merge <fileA.json> <fileB.json> [--strategy <prefer-newer|prefer-incoming|prefer-base>] [--out <dest>]');
        process.exit(1);
      }
      const graphA = loadGraph(fileA);
      const graphB = loadGraph(fileB);
      const strategy = (flags['strategy'] as MergeStrategy) || 'prefer-newer';

      const result = mergeLifeGraphs(graphA, graphB, { strategy });
      const mergedGraph = new LifeGraph(result.graph);
      const output = exportCanonicalJson(mergedGraph);

      console.log(`\x1b[1m=== Merge Results (Strategy: ${strategy}) ===\x1b[0m`);
      console.log(`Added Nodes:    ${result.addedNodes.length}`);
      console.log(`Updated Nodes:  ${result.updatedNodes.length}`);
      console.log(`Skipped Nodes:  ${result.skippedNodes.length}`);
      console.log(`Added Edges:    ${result.addedEdges.length}`);
      console.log(`Conflicts:      ${result.conflicts.length}`);
      for (const c of result.conflicts) {
        console.log(`  ⚠ ${c.id}: ${c.message} -> ${c.resolution}`);
      }

      writeOutput(output, flags['out'] as string | undefined);
      break;
    }

    case 'deadlines': {
      const targetFile = positionals[0];
      if (!targetFile) {
        console.error('Usage: lifegraph deadlines <file.json> [--days N]');
        process.exit(1);
      }
      const graph = loadGraph(targetFile);
      const days = flags['days'] ? parseInt(String(flags['days']), 10) : 60;
      const includeCompleted = Boolean(flags['all']);
      const deadlines = getEvaluatedDeadlines(graph, { daysAhead: days, includeCompleted });

      if (deadlines.length === 0) {
        console.log(`No deadlines found within the next ${days} days.`);
      } else {
        console.log(`Found ${deadlines.length} deadline(s) within ${days} days:`);
        for (const item of deadlines) {
          const color =
            item.urgency === 'overdue' ? '\x1b[31m' : item.urgency === 'due_soon' ? '\x1b[33m' : '\x1b[36m';
          const badge = `[${item.urgency.toUpperCase().padEnd(8)}]`;
          const remaining = `${item.daysRemaining}d`.padStart(5);
          const targetStr = item.targetEntity ? ` (target: ${item.targetEntity.label})` : '';
          console.log(
            ` ${color}${badge}\x1b[0m ${remaining} | ${item.deadline.dueDate} | ${item.deadline.label}${targetStr}`
          );
          if (item.deadline.actionRequired) {
            console.log(`    ↳ Action: ${item.deadline.actionRequired}`);
          }
        }
      }
      break;
    }

    case 'query': {
      const targetFile = positionals[0];
      if (!targetFile) {
        console.error('Usage: lifegraph query <file.json> [options]');
        process.exit(1);
      }
      const graph = loadGraph(targetFile);
      const typeFilter = flags['type'] as EntityType | undefined;
      const search = flags['search'] as string | undefined;

      const results = graph.query({
        type: typeFilter,
        search,
      });

      console.log(`Query returned ${results.length} node(s):`);
      for (const node of results) {
        console.log(` • [${node.type.toUpperCase()}] ${node.label} (id: ${node.id})`);
        const outgoing = graph.getOutgoingEdges(node.id);
        for (const e of outgoing) {
          const target = graph.getNode(e.targetId);
          console.log(`    └─ ${e.predicate} ──> ${target?.label ?? e.targetId}`);
        }
      }
      break;
    }

    case 'filter': {
      const targetFile = positionals[0];
      const consentPurpose = flags['consent'] as string;
      if (!targetFile || !consentPurpose) {
        console.error('Usage: lifegraph filter <file.json> --consent <purpose> [--out <dest>]');
        process.exit(1);
      }
      const graph = loadGraph(targetFile);
      const projectedData = graph.projectByConsent(consentPurpose);
      const projectedGraph = new LifeGraph(projectedData);
      const output = exportCanonicalJson(projectedGraph);
      writeOutput(output, flags['out'] as string | undefined);
      break;
    }

    case 'anonymize': {
      const targetFile = positionals[0];
      if (!targetFile) {
        console.error('Usage: lifegraph anonymize <file.json> [--out <dest>]');
        process.exit(1);
      }
      const graph = loadGraph(targetFile);
      const anonData = graph.anonymize();
      const anonGraph = new LifeGraph(anonData);
      const output = exportCanonicalJson(anonGraph);
      writeOutput(output, flags['out'] as string | undefined);
      break;
    }

    case 'export': {
      const targetFile = positionals[0];
      const format = (flags['format'] as string) ?? 'json';
      if (!targetFile) {
        console.error('Usage: lifegraph export <file.json> --format <json|jsonld|markdown|ics|html|csv|dot> [--out <file>]');
        process.exit(1);
      }
      const graph = loadGraph(targetFile);
      let output = '';

      switch (format.toLowerCase()) {
        case 'json':
          output = exportCanonicalJson(graph);
          break;
        case 'jsonld':
          output = exportJsonLd(graph);
          break;
        case 'markdown':
        case 'md':
          output = exportMarkdown(graph);
          break;
        case 'ics':
        case 'ical':
          output = exportIcs(graph);
          break;
        case 'html':
          output = exportHtml(graph);
          break;
        case 'dot':
        case 'graphviz':
          output = exportDot(graph);
          break;
        case 'csv':
        case 'csv-nodes':
          output = exportNodesCsv(graph);
          break;
        case 'csv-edges':
          output = exportEdgesCsv(graph);
          break;
        case 'csv-deadlines':
          output = exportDeadlinesCsv(graph);
          break;
        default:
          console.error(`Error: Unknown format '${format}'. Available: json, jsonld, markdown, ics, html, csv, dot`);
          process.exit(1);
      }

      writeOutput(output, flags['out'] as string | undefined);
      break;
    }

    case 'diff': {
      const fileA = positionals[0];
      const fileB = positionals[1];
      if (!fileA || !fileB) {
        console.error('Usage: lifegraph diff <fileA.json> <fileB.json>');
        process.exit(1);
      }
      const graphA = loadGraph(fileA);
      const graphB = loadGraph(fileB);
      const diff = computeGraphDiff(graphA.toJSON(), graphB.toJSON());

      console.log(`\x1b[1m=== LifeGraph Diff: ${fileA} <-> ${fileB} ===\x1b[0m`);
      console.log(`Added Nodes:    ${diff.addedNodes.length}`);
      for (const n of diff.addedNodes) console.log(`  + [${n.type}] ${n.label} (${n.id})`);

      console.log(`Removed Nodes:  ${diff.removedNodes.length}`);
      for (const n of diff.removedNodes) console.log(`  - [${n.type}] ${n.label} (${n.id})`);

      console.log(`Modified Nodes: ${diff.modifiedNodes.length}`);
      for (const m of diff.modifiedNodes) {
        console.log(`  ~ [${m.after.type}] ${m.after.label} (${m.after.id}): changes in [${m.changes.join(', ')}]`);
      }

      console.log(`Added Edges:    ${diff.addedEdges.length}`);
      for (const e of diff.addedEdges) console.log(`  + ${e.sourceId} -(${e.predicate})-> ${e.targetId}`);

      console.log(`Removed Edges:  ${diff.removedEdges.length}`);
      for (const e of diff.removedEdges) console.log(`  - ${e.sourceId} -(${e.predicate})-> ${e.targetId}`);
      break;
    }

    default:
      console.error(`Unknown command: '${command}'. Run 'lifegraph --help' for usage.`);
      process.exit(1);
  }

  if (shouldShowSponsorNotice()) {
    console.log(formatSponsorNotice());
  }
}

// Only invoke runCli if executed directly from terminal
const isDirectRun =
  process.argv[1] &&
  (resolve(process.argv[1]) === resolve(import.meta.filename ?? '') ||
    process.argv[1].endsWith('lifegraph') ||
    process.argv[1].endsWith('index.ts') ||
    process.argv[1].endsWith('index.js'));

if (isDirectRun) {
  runCli();
}
