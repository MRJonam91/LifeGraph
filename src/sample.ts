// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { LIFEGRAPH_NAMESPACE, LIFEGRAPH_SCHEMA_VERSION } from './core/constants.ts';
import { computeEntityDigest } from './core/crypto.ts';
import type { LifeGraphData, LifeGraphEdge, LifeGraphNode } from './core/types.ts';

export function createSampleLifeGraphData(): LifeGraphData {
  const timestamp = '2026-11-06T12:00:00.000Z';

  const rawNodes: LifeGraphNode[] = [
    {
      id: 'person-mario-rossi',
      type: 'person',
      label: 'Mario Rossi',
      name: 'Mario Rossi',
      fiscalCode: 'RSSMRA85M01H501Z',
      email: 'mario.rossi.trial@example.org',
      phone: '+39 340 1234567',
      dateOfBirth: '1985-08-01',
      address: 'Via Roma 42, 10121 Torino, Italia',
      tags: ['family', 'head_of_household'],
      permissions: {
        visibility: 'private',
        consentPurposes: ['general_admin', 'tax_filing', 'banking_kyc', 'rental_application'],
        exportPolicy: 'exportable',
      },
      provenance: {
        source: 'user_input',
        timestamp,
        author: 'Mario Rossi',
        digest: '',
      },
    },
    {
      id: 'doc-cie-mario',
      type: 'document',
      label: 'CIE - Carta d Identita Elettronica',
      documentType: 'identity_card',
      documentNumber: 'CA00000AA',
      issuer: 'Comune di Torino',
      issueDate: '2020-05-15',
      expiryDate: '2030-05-15',
      fileSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      tags: ['identity', 'official_id'],
      permissions: {
        visibility: 'confidential',
        consentPurposes: ['general_admin', 'banking_kyc', 'rental_application'],
        exportPolicy: 'exportable',
      },
      provenance: {
        source: 'verified_issuer',
        timestamp,
        author: 'Comune di Torino',
        digest: '',
      },
    },
    {
      id: 'doc-passport-mario',
      type: 'document',
      label: 'Passaporto Italiano',
      documentType: 'passport',
      documentNumber: 'YA1234567',
      issuer: 'Questura di Torino',
      issueDate: '2017-09-20',
      expiryDate: '2027-09-20',
      tags: ['identity', 'travel'],
      permissions: {
        visibility: 'confidential',
        consentPurposes: ['general_admin', 'travel'],
        exportPolicy: 'exportable',
      },
      provenance: {
        source: 'verified_issuer',
        timestamp,
        author: 'Questura di Torino',
        digest: '',
      },
    },
    {
      id: 'ctr-rent-home',
      type: 'contract',
      label: 'Locazione Appartamento Torino',
      contractType: 'rental',
      provider: 'Immobiliare Serenissima SRL',
      contractNumber: 'LOC-2024-88',
      startDate: '2024-01-01',
      endDate: '2027-12-31',
      autoRenew: true,
      noticePeriodDays: 180,
      amount: 750,
      currency: 'EUR',
      billingCycle: 'monthly',
      status: 'active',
      tags: ['home', 'housing', 'fixed_cost'],
      permissions: {
        visibility: 'family',
        consentPurposes: ['general_admin', 'tax_filing'],
        exportPolicy: 'exportable',
      },
      provenance: {
        source: 'file_import',
        timestamp,
        author: 'Mario Rossi',
        digest: '',
      },
    },
    {
      id: 'ctr-power-energy',
      type: 'contract',
      label: 'Fornitura Energia Elettrica 100% Green',
      contractType: 'utility_power',
      provider: 'Octopus Energy Italia',
      contractNumber: 'OCT-99381',
      startDate: '2025-03-01',
      autoRenew: true,
      noticePeriodDays: 30,
      amount: 65,
      currency: 'EUR',
      billingCycle: 'monthly',
      status: 'active',
      tags: ['utilities', 'electricity', 'variable_cost'],
      permissions: {
        visibility: 'family',
        consentPurposes: ['general_admin', 'utility_switching'],
        exportPolicy: 'exportable',
      },
      provenance: {
        source: 'user_input',
        timestamp,
        author: 'Mario Rossi',
        digest: '',
      },
    },
    {
      id: 'dl-passport-renewal',
      type: 'deadline',
      label: 'Rinnovo Passaporto Italiano',
      category: 'document_expiry',
      targetEntityId: 'doc-passport-mario',
      dueDate: '2027-07-20',
      noticeDays: 60,
      status: 'pending',
      recurrence: 'none',
      actionRequired: 'Prenotare appuntamento sulla piattaforma Passaporto Elettronico Questura',
      tags: ['travel', 'bureaucracy'],
      permissions: {
        visibility: 'confidential',
        consentPurposes: ['general_admin'],
        exportPolicy: 'exportable',
      },
      provenance: {
        source: 'agent_inferred',
        timestamp,
        digest: '',
      },
    },
    {
      id: 'dl-rent-notice-cutoff',
      type: 'deadline',
      label: 'Termine Disdetta / Rinnovo Locazione',
      category: 'contract_renewal',
      targetEntityId: 'ctr-rent-home',
      dueDate: '2027-07-04',
      noticeDays: 90,
      status: 'pending',
      recurrence: 'none',
      actionRequired: 'Inviare raccomandata A/R entro 6 mesi dalla scadenza se si intende recedere',
      tags: ['housing', 'legal'],
      permissions: {
        visibility: 'family',
        consentPurposes: ['general_admin'],
        exportPolicy: 'exportable',
      },
      provenance: {
        source: 'agent_inferred',
        timestamp,
        digest: '',
      },
    },
  ];

  const nodes = rawNodes.map((n) => {
    n.provenance.digest = computeEntityDigest(n as unknown as Record<string, unknown>);
    return n;
  });

  const rawEdges: LifeGraphEdge[] = [
    {
      id: 'edge-mario-owns-cie',
      sourceId: 'person-mario-rossi',
      targetId: 'doc-cie-mario',
      predicate: 'OWNS',
      permissions: { visibility: 'confidential', consentPurposes: ['general_admin', 'banking_kyc'] },
      provenance: { source: 'user_input', timestamp, digest: '' },
    },
    {
      id: 'edge-mario-owns-passport',
      sourceId: 'person-mario-rossi',
      targetId: 'doc-passport-mario',
      predicate: 'OWNS',
      permissions: { visibility: 'confidential', consentPurposes: ['general_admin', 'travel'] },
      provenance: { source: 'user_input', timestamp, digest: '' },
    },
    {
      id: 'edge-mario-party-rent',
      sourceId: 'person-mario-rossi',
      targetId: 'ctr-rent-home',
      predicate: 'PARTY_TO',
      validFrom: '2024-01-01',
      validTo: '2027-12-31',
      permissions: { visibility: 'family', consentPurposes: ['general_admin', 'tax_filing'] },
      provenance: { source: 'user_input', timestamp, digest: '' },
    },
    {
      id: 'edge-mario-party-power',
      sourceId: 'person-mario-rossi',
      targetId: 'ctr-power-energy',
      predicate: 'PARTY_TO',
      validFrom: '2025-03-01',
      permissions: { visibility: 'family', consentPurposes: ['general_admin', 'utility_switching'] },
      provenance: { source: 'user_input', timestamp, digest: '' },
    },
    {
      id: 'edge-cie-attached-to-rent',
      sourceId: 'doc-cie-mario',
      targetId: 'ctr-rent-home',
      predicate: 'ATTACHED_TO',
      permissions: { visibility: 'confidential', consentPurposes: ['rental_application'] },
      provenance: { source: 'file_import', timestamp, digest: '' },
    },
    {
      id: 'edge-passport-expires-on',
      sourceId: 'doc-passport-mario',
      targetId: 'dl-passport-renewal',
      predicate: 'EXPIRES_ON',
      permissions: { visibility: 'confidential', consentPurposes: ['general_admin'] },
      provenance: { source: 'agent_inferred', timestamp, digest: '' },
    },
    {
      id: 'edge-rent-depends-on-notice',
      sourceId: 'ctr-rent-home',
      targetId: 'dl-rent-notice-cutoff',
      predicate: 'DEPENDS_ON',
      permissions: { visibility: 'family', consentPurposes: ['general_admin'] },
      provenance: { source: 'agent_inferred', timestamp, digest: '' },
    },
  ];

  const edges = rawEdges.map((e) => {
    e.provenance.digest = computeEntityDigest(e as unknown as Record<string, unknown>);
    return e;
  });

  return {
    version: LIFEGRAPH_SCHEMA_VERSION,
    namespace: LIFEGRAPH_NAMESPACE,
    title: 'Mario Rossi — Personal Paperwork & Entity Graph',
    description: 'Sample LifeGraph linking identity documents, home lease, energy contract, and renewal deadlines',
    createdAt: timestamp,
    updatedAt: timestamp,
    nodes,
    edges,
    metadata: {
      trial: 'Seed MVP 1.0',
      pilotCase: 'Italian Personal Administration (Privacy-safe synthetic data)',
    },
  };
}
