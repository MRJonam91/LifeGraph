// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import type { LifeGraph } from '../core/graph.ts';
import type { ContractNode, DeadlineNode, DocumentNode, LifeGraphNode, PersonNode } from '../core/types.ts';

export function exportJsonLd(graph: LifeGraph): string {
  const data = graph.toJSON();

  const context = {
    '@vocab': 'https://schema.org/',
    prov: 'http://www.w3.org/ns/prov#',
    lg: 'https://lifegraph.dev/schema#',
    id: '@id',
    type: '@type',
    label: 'name',
    provenance: 'prov:wasGeneratedBy',
    timestamp: 'prov:generatedAtTime',
    digest: 'lg:sha256Digest',
    source: 'lg:sourceLineage',
    visibility: 'lg:visibilityLevel',
    consentPurposes: 'lg:consentPurposes',
    Person: 'Person',
    Document: 'DigitalDocument',
    Contract: 'Order',
    Deadline: 'Schedule',
  };

  const graphItems = data.nodes.map((node) => {
    const item: Record<string, unknown> = {
      '@id': `urn:lifegraph:node:${node.id}`,
      name: node.label,
      'lg:visibility': node.permissions.visibility,
      'lg:consentPurposes': node.permissions.consentPurposes,
      'prov:wasGeneratedBy': {
        'prov:generatedAtTime': node.provenance.timestamp,
        'lg:sourceLineage': node.provenance.source,
        'lg:sha256Digest': node.provenance.digest,
        ...(node.provenance.author ? { 'prov:wasAttributedTo': node.provenance.author } : {}),
      },
    };

    switch (node.type) {
      case 'person': {
        const p = node as PersonNode;
        item['@type'] = 'Person';
        item.name = p.name;
        if (p.email) item.email = p.email;
        if (p.phone) item.telephone = p.phone;
        if (p.fiscalCode) item.taxID = p.fiscalCode;
        if (p.address) item.address = p.address;
        break;
      }
      case 'document': {
        const d = node as DocumentNode;
        item['@type'] = 'DigitalDocument';
        item['lg:documentType'] = d.documentType;
        if (d.documentNumber) item.identifier = d.documentNumber;
        if (d.issuer) item.publisher = d.issuer;
        if (d.issueDate) item.dateCreated = d.issueDate;
        if (d.expiryDate) item.expires = d.expiryDate;
        if (d.fileSha256) item.contentHash = d.fileSha256;
        break;
      }
      case 'contract': {
        const c = node as ContractNode;
        item['@type'] = 'Order';
        item['lg:contractCategory'] = c.contractType;
        item.seller = { '@type': 'Organization', name: c.provider };
        item.orderStatus = c.status;
        item.orderDate = c.startDate;
        if (c.endDate) item.validThrough = c.endDate;
        if (c.amount) item.price = c.amount;
        if (c.currency) item.priceCurrency = c.currency;
        if (c.noticePeriodDays) item['lg:noticePeriodDays'] = c.noticePeriodDays;
        break;
      }
      case 'deadline': {
        const dl = node as DeadlineNode;
        item['@type'] = 'Schedule';
        item['lg:category'] = dl.category;
        item.endTime = dl.dueDate;
        item['lg:status'] = dl.status;
        if (dl.actionRequired) item.description = dl.actionRequired;
        if (dl.targetEntityId) item['lg:targetEntity'] = `urn:lifegraph:node:${dl.targetEntityId}`;
        break;
      }
    }

    // Attach outgoing relationships
    const outgoing = data.edges.filter((e) => e.sourceId === node.id);
    if (outgoing.length > 0) {
      item['lg:relationships'] = outgoing.map((e) => ({
        '@id': `urn:lifegraph:edge:${e.id}`,
        predicate: e.predicate,
        target: `urn:lifegraph:node:${e.targetId}`,
        visibility: e.permissions.visibility,
        ...(e.validFrom ? { validFrom: e.validFrom } : {}),
        ...(e.validTo ? { validTo: e.validTo } : {}),
      }));
    }

    return item;
  });

  return JSON.stringify(
    {
      '@context': context,
      '@id': `urn:lifegraph:graph:${data.namespace}`,
      title: data.title,
      description: data.description,
      dateModified: data.updatedAt,
      '@graph': graphItems,
    },
    null,
    2
  );
}
