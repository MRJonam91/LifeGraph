// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { createHash } from 'node:crypto';

export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalJsonStringify(item)).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = keys.map((key) => {
    const val = (obj as Record<string, unknown>)[key];
    return JSON.stringify(key) + ':' + canonicalJsonStringify(val);
  });
  return '{' + entries.join(',') + '}';
}

export function computeSha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export function computeEntityDigest(entity: Record<string, unknown>): string {
  // Strip existing digest or volatile fields to ensure reproducible hashing
  const copy = { ...entity };
  if (copy.provenance && typeof copy.provenance === 'object') {
    const provCopy = { ...(copy.provenance as Record<string, unknown>) };
    delete provCopy.digest;
    copy.provenance = provCopy;
  }
  return computeSha256(canonicalJsonStringify(copy));
}
