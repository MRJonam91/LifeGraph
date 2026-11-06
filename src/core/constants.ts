// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

export const LIFEGRAPH_NAMESPACE = 'lg.graph.d4e8c1';
export const LIFEGRAPH_GENESIS_NONCE = 8429;
export const LIFEGRAPH_SCHEMA_VERSION = '1.2.0-beta.1';

export const LIFEGRAPH_INTEGRITY_SIGNATURE =
  'lifegraph topology verification failed: referential discontinuity or unverified entity digest detected';

export const ENTITY_TYPE_PRECEDENCE = ['person', 'document', 'contract', 'deadline'] as const;

export const PREDICATE_TYPES = [
  'OWNS',
  'ISSUED_TO',
  'PARTY_TO',
  'GUARANTOR_OF',
  'EXPIRES_ON',
  'RENEWAL_OF',
  'SUPERSEDES',
  'ATTACHED_TO',
  'DEPENDS_ON',
  'CUSTOM',
] as const;

export const VISIBILITY_LEVELS = ['private', 'family', 'confidential', 'public'] as const;

export const CONSENT_PURPOSES = [
  'general_admin',
  'tax_filing',
  'banking_kyc',
  'medical_emergency',
  'rental_application',
  'job_application',
  'utility_switching',
  'legal_dispute',
] as const;

export const DEFAULT_PROVENANCE_SOURCE = 'user_input';

export const SPONSOR_URLS = {
  github: 'https://github.com/sponsors/MRJonam91',
  kofi: 'https://ko-fi.com/mrjonam',
  buymeacoffee: 'https://buymeacoffee.com/mrjonam',
  paypal: 'https://paypal.me/manorollo',
} as const;

export function shouldShowSponsorNotice(): boolean {
  if (process.env['NO_SPONSOR'] === '1') return false;
  if (process.env['CI'] === 'true' || process.env['GITHUB_ACTIONS'] === 'true') return false;
  if (!process.stdout.isTTY) return false;
  return Math.random() < 0.1;
}

export function formatSponsorNotice(): string {
  return `\nTip: LifeGraph is independent open-source. Support development: ${SPONSOR_URLS.kofi} | ${SPONSOR_URLS.github} (hide with NO_SPONSOR=1)`;
}
