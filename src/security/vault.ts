// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { exportCanonicalJson, importCanonicalJson } from '../exporters/canonical-json.ts';
import type { LifeGraph } from '../core/graph.ts';

export interface SealedVault {
  format: 'lifegraph-sealed-vault';
  version: string;
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string; // hex
  iv: string; // hex
  tag: string; // hex
  ciphertext: string; // hex
  metadata: {
    title: string;
    sealedAt: string;
    nodeCount: number;
    edgeCount: number;
  };
}

const PBKDF2_ITERATIONS = 100_000;
const KEY_LEN = 32; // 256 bits

export function sealVault(graph: LifeGraph, passphrase: string): SealedVault {
  if (!passphrase || passphrase.length < 4) {
    throw new Error('Passphrase must be at least 4 characters long.');
  }

  const salt = randomBytes(16);
  const iv = randomBytes(12); // Standard 96-bit IV for AES-GCM
  const key = pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, KEY_LEN, 'sha256');

  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = exportCanonicalJson(graph, false);

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    format: 'lifegraph-sealed-vault',
    version: graph.version,
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
    metadata: {
      title: graph.title,
      sealedAt: new Date().toISOString(),
      nodeCount: graph.getNodes().length,
      edgeCount: graph.getEdges().length,
    },
  };
}

export function unsealVault(sealed: SealedVault, passphrase: string): LifeGraph {
  if (sealed.format !== 'lifegraph-sealed-vault') {
    throw new Error("Invalid vault format. Expected 'lifegraph-sealed-vault'.");
  }

  const salt = Buffer.from(sealed.salt, 'hex');
  const iv = Buffer.from(sealed.iv, 'hex');
  const tag = Buffer.from(sealed.tag, 'hex');
  const ciphertext = Buffer.from(sealed.ciphertext, 'hex');

  const key = pbkdf2Sync(passphrase, salt, sealed.iterations ?? PBKDF2_ITERATIONS, KEY_LEN, 'sha256');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let decrypted: string;
  try {
    decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8');
  } catch {
    throw new Error('Failed to unseal vault: incorrect passphrase or corrupted/tampered ciphertext.');
  }

  return importCanonicalJson(decrypted);
}
