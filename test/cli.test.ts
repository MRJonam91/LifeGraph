// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
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
