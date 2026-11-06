// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CLI_PATH = resolve(process.cwd(), 'dist/cli/index.js');

function runCliCmd(args: string[]): { stdout: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, [CLI_PATH, ...args], {
      encoding: 'utf-8',
      env: { ...process.env, NO_SPONSOR: '1' },
    });
    return { stdout, status: 0 };
  } catch (err: any) {
    return { stdout: (err.stdout ?? '') + (err.stderr ?? ''), status: err.status ?? 1 };
  }
}

function runCliCmdWithInput(args: string[], input: string): { stdout: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, [CLI_PATH, ...args], {
      input,
      encoding: 'utf-8',
      env: { ...process.env, NO_SPONSOR: '1' },
    });
    return { stdout, status: 0 };
  } catch (err: any) {
    return { stdout: (err.stdout ?? '') + (err.stderr ?? ''), status: err.status ?? 1 };
  }
}

test('CLI - prints version and help', () => {
  const versionRes = runCliCmd(['--version']);
  assert.equal(versionRes.status, 0);
  assert.ok(versionRes.stdout.includes('lifegraph v1.0.0'));

  const helpRes = runCliCmd(['--help']);
  assert.equal(helpRes.status, 0);
  assert.ok(helpRes.stdout.includes('USAGE:'));
});

test('CLI - sponsor command prints donation links', () => {
  const res = runCliCmd(['sponsor']);
  assert.equal(res.status, 0);
  assert.ok(res.stdout.includes('Ko-fi'));
  assert.ok(res.stdout.includes('GitHub Sponsors'));
  assert.ok(res.stdout.includes('PayPal'));
});

test('CLI - costs, seal, unseal, and import cycle', () => {
  const tmpLedger = resolve(process.cwd(), 'temp-beta-ledger.json');
  const tmpSealed = resolve(process.cwd(), 'temp-beta-vault.sealed.json');
  const tmpUnsealed = resolve(process.cwd(), 'temp-beta-unsealed.json');
  const tmpCsv = resolve(process.cwd(), 'temp-subscriptions.csv');
  const tmpImported = resolve(process.cwd(), 'temp-imported.json');

  try {
    // 1. Generate sample
    runCliCmd(['sample', tmpLedger]);

    // 2. Costs analysis
    const costsRes = runCliCmd(['costs', tmpLedger]);
    assert.equal(costsRes.status, 0);
    assert.ok(costsRes.stdout.includes('Monthly Recurring Burn:'));
    assert.ok(costsRes.stdout.includes('Annual Fixed Commitments:'));

    // 3. Seal vault
    const sealRes = runCliCmd(['seal', tmpLedger, '--pass', 'Passphrase123!', '--out', tmpSealed]);
    assert.equal(sealRes.status, 0);
    assert.ok(existsSync(tmpSealed));

    // 4. Unseal vault
    const unsealRes = runCliCmd(['unseal', tmpSealed, '--pass', 'Passphrase123!', '--out', tmpUnsealed]);
    assert.equal(unsealRes.status, 0);
    assert.ok(existsSync(tmpUnsealed));

    // 5. Import subscriptions CSV
    writeFileSync(tmpCsv, 'provider,amount,cycle\nSpotify,10.99,monthly\n', 'utf-8');
    const importRes = runCliCmd(['import', tmpCsv, '--format', 'csv', '--out', tmpImported]);
    assert.equal(importRes.status, 0);
    assert.ok(existsSync(tmpImported));
  } finally {
    if (existsSync(tmpLedger)) unlinkSync(tmpLedger);
    if (existsSync(tmpSealed)) unlinkSync(tmpSealed);
    if (existsSync(tmpUnsealed)) unlinkSync(tmpUnsealed);
    if (existsSync(tmpCsv)) unlinkSync(tmpCsv);
    if (existsSync(tmpImported)) unlinkSync(tmpImported);
  }
});

test('CLI - audit, trace, merge, and dot export lifecycle', () => {
  const tmpFileA = resolve(process.cwd(), 'temp-test-a.json');
  const tmpFileB = resolve(process.cwd(), 'temp-test-b.json');
  const tmpMerged = resolve(process.cwd(), 'temp-test-merged.json');
  const tmpDot = resolve(process.cwd(), 'temp-test-graph.dot');

  try {
    // 1. Generate samples
    runCliCmd(['sample', tmpFileA]);
    runCliCmd(['sample', tmpFileB]);
    assert.ok(existsSync(tmpFileA));

    // 2. Audit
    const auditRes = runCliCmd(['audit', tmpFileA, '--strict']);
    assert.equal(auditRes.status, 0);
    assert.ok(auditRes.stdout.includes('Health Score:'));

    // 3. Trace lineage
    const traceRes = runCliCmd(['trace', tmpFileA, 'ctr-rent-home']);
    assert.equal(traceRes.status, 0);
    assert.ok(traceRes.stdout.includes('Relational Lineage for:'));
    assert.ok(traceRes.stdout.includes('Upstream Dependencies'));

    // 4. Merge
    const mergeRes = runCliCmd(['merge', tmpFileA, tmpFileB, '--strategy', 'prefer-newer', '--out', tmpMerged]);
    assert.equal(mergeRes.status, 0);
    assert.ok(existsSync(tmpMerged));

    // 5. Export DOT
    const dotRes = runCliCmd(['export', tmpFileA, '--format', 'dot', '--out', tmpDot]);
    assert.equal(dotRes.status, 0);
    assert.ok(existsSync(tmpDot));
  } finally {
    if (existsSync(tmpFileA)) unlinkSync(tmpFileA);
    if (existsSync(tmpFileB)) unlinkSync(tmpFileB);
    if (existsSync(tmpMerged)) unlinkSync(tmpMerged);
    if (existsSync(tmpDot)) unlinkSync(tmpDot);
  }
});

test('CLI - sample, validate, inspect, and export cycle', () => {
  const tmpFile = resolve(process.cwd(), 'temp-test-ledger.json');
  const tmpHtml = resolve(process.cwd(), 'temp-test-report.html');

  try {
    // 1. Generate sample
    const sampleRes = runCliCmd(['sample', tmpFile]);
    assert.equal(sampleRes.status, 0);
    assert.ok(existsSync(tmpFile));

    // 2. Validate
    const valRes = runCliCmd(['validate', tmpFile]);
    assert.equal(valRes.status, 0);
    assert.ok(valRes.stdout.includes('100% valid'));

    // 3. Inspect
    const inspectRes = runCliCmd(['inspect', tmpFile]);
    assert.equal(inspectRes.status, 0);
    assert.ok(inspectRes.stdout.includes('Total Nodes: 7'));

    // 4. Deadlines
    const dlRes = runCliCmd(['deadlines', tmpFile, '--days', '500']);
    assert.equal(dlRes.status, 0);
    assert.ok(dlRes.stdout.includes('Found'));

    // 5. Export to HTML
    const exportRes = runCliCmd(['export', tmpFile, '--format', 'html', '--out', tmpHtml]);
    assert.equal(exportRes.status, 0);
    assert.ok(existsSync(tmpHtml));
  } finally {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
    if (existsSync(tmpHtml)) unlinkSync(tmpHtml);
  }
});

test('CLI - supports query with --tag, sample with -o, and reading ledger from stdin', () => {
  const tmpOut = resolve(process.cwd(), 'temp-sample-flag.json');

  try {
    // 1. Test sample with -o flag
    const sampleRes = runCliCmd(['sample', '-o', tmpOut]);
    assert.equal(sampleRes.status, 0);
    assert.ok(existsSync(tmpOut));

    // 2. Test query with --tag flag
    const queryTagRes = runCliCmd(['query', tmpOut, '--tag', 'identity']);
    assert.equal(queryTagRes.status, 0);
    assert.ok(queryTagRes.stdout.includes('Query returned'));
    assert.ok(queryTagRes.stdout.includes('doc-cie-mario'));

    // 3. Test validate via stdin (-)
    const jsonContent = readFileSync(tmpOut, 'utf-8');
    const stdinValRes = runCliCmdWithInput(['validate', '-'], jsonContent);
    assert.equal(stdinValRes.status, 0);
    assert.ok(stdinValRes.stdout.includes('100% valid'));
  } finally {
    if (existsSync(tmpOut)) unlinkSync(tmpOut);
  }
});
