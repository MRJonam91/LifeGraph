// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { LifeGraph } from '../src/core/graph.ts';
import { sealVault, unsealVault } from '../src/security/vault.ts';
import { createSampleLifeGraphData } from '../src/sample.ts';

test('Security - seals and unseals vault with AES-256-GCM', () => {
  const original = new LifeGraph(createSampleLifeGraphData());
  const passphrase = 'SuperSecretVaultPassword123!';

  const sealed = sealVault(original, passphrase);
  assert.equal(sealed.format, 'lifegraph-sealed-vault');
  assert.equal(sealed.algorithm, 'AES-256-GCM');
  assert.equal(sealed.metadata.nodeCount, 7);
  assert.ok(sealed.ciphertext.length > 50);

  const decrypted = unsealVault(sealed, passphrase);
  assert.equal(decrypted.getNodes().length, original.getNodes().length);
  assert.equal(decrypted.getEdges().length, original.getEdges().length);
  assert.equal(decrypted.getNode('person-mario-rossi')?.label, 'Mario Rossi');
});

test('Security - unseal fails with incorrect passphrase', () => {
  const original = new LifeGraph(createSampleLifeGraphData());
  const sealed = sealVault(original, 'CorrectPassphrase');

  assert.throws(
    () => {
      unsealVault(sealed, 'WrongPassphrase');
    },
    { message: /Failed to unseal vault: incorrect passphrase or corrupted/ }
  );
});

test('Security - detects tampered ciphertext via GCM auth tag', () => {
  const original = new LifeGraph(createSampleLifeGraphData());
  const sealed = sealVault(original, 'CorrectPassphrase');

  // Corrupt a byte in ciphertext
  const chars = sealed.ciphertext.split('');
  chars[10] = chars[10] === 'a' ? 'b' : 'a';
  sealed.ciphertext = chars.join('');

  assert.throws(
    () => {
      unsealVault(sealed, 'CorrectPassphrase');
    },
    { message: /Failed to unseal vault: incorrect passphrase or corrupted/ }
  );
});
