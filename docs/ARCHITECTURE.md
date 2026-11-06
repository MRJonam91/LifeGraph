# LifeGraph Architecture

LifeGraph is a deterministic, portable entity and knowledge graph for personal paperwork, contracts, identity documents, and deadlines. It solves data fragmentation, vendor lock-in, and unverified data claims by combining a property graph ontology with cryptographic SHA-256 provenance hashes and purpose-scoped consent tagging.

## System Design & Component Overview

```
                      ┌────────────────────────────────────────┐
                      │            lifegraph.json              │
                      │  (Nodes: Person, Doc, Contract, Due)   │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │          LifeGraph Graph Engine        │
                      │   - In-memory Property Graph Index     │
                      │   - Referential Integrity Validator    │
                      │   - SHA-256 Tamper Detection           │
                      └───────────────────┬────────────────────┘
                                          │
         ┌──────────────────┬─────────────┴──────┬──────────────────┐
         │                  │                    │                  │
         ▼                  ▼                    ▼                  ▼
┌──────────────────┐┌──────────────────┐┌──────────────────┐┌──────────────────┐
│  W3C JSON-LD     ││  Markdown &      ││  RFC 5545 iCal   ││  HTML & CSV      │
│  (Schema.org +   ││  Mermaid Graph   ││  (Native Sync +  ││  (Visual Audit & │
│  PROV-O Lineage) ││  Relationship)   ││  Calendar Alarm) ││  Spreadsheets)   │
└──────────────────┘└──────────────────┘└──────────────────┘└──────────────────┘
```

## Core Modules (`src/core/`)

1. **`types.ts`**:
   - Strongly typed primitives:
     - `PersonNode`: Personal identity, tax/fiscal code, contact credentials.
     - `DocumentNode`: ID cards, passports, driving licenses, tax filings, diplomas, with file hashes and expiry.
     - `ContractNode`: Employment, rentals, utility power/gas, telecoms, insurance, notice windows, and recurring costs.
     - `DeadlineNode`: Actionable obligations (renewal windows, document expirations, tax due dates) with reminders.
     - `LifeGraphEdge`: Directed relationships (`OWNS`, `ISSUED_TO`, `PARTY_TO`, `EXPIRES_ON`, `RENEWAL_OF`, `DEPENDS_ON`, `ATTACHED_TO`).
     - `Provenance`: Source lineage (`user_input`, `verified_issuer`, `file_import`, `agent_inferred`), ISO timestamp, and SHA-256 cryptographic digest.
     - `Permissions`: Visibility classification (`private`, `family`, `confidential`, `public`) and consent purpose limitations.

2. **`graph.ts`**:
   - Directed property graph implementation with adjacency indexing.
   - Referential integrity checks preventing orphaned or dangling edges.
   - Purpose limitation projection (`projectByConsent`): extracts subgraphs authorized under a specific consent purpose (e.g., `banking_kyc`, `tax_filing`).
   - PII anonymizer (`anonymize`): scrubs sensitive identifiers while maintaining exact topology for auditing.

3. **`validator.ts`**:
   - Validates node schemas, edge referential continuity, and chronological consistency (e.g. issue date before expiry date).
   - Recalculates and verifies SHA-256 digests across all entities, instantly detecting unauthorized modifications.

4. **`deadlines.ts`**:
   - Evaluates deadline urgency (`overdue`, `due_soon`, `upcoming`).
   - Auto-synthesizes deadlines from contract notice windows (`endDate - noticePeriodDays`) and document expirations.

5. **`diff.ts`**:
   - Deterministic structural diff between graph versions (added/removed/modified nodes and edges).

6. **`stats.ts`**:
   - Aggregate telemetry, node/edge distribution, visibility breakdown, and deadline summaries.

## Exporters (`src/exporters/`)

- **Canonical JSON (`canonical-json.ts`)**: Lossless, sorted, deterministic serialization guaranteeing byte-identical round-trip import.
- **JSON-LD (`jsonld.ts`)**: Semantic web interoperability conforming to Schema.org and W3C PROV-O provenance.
- **Markdown (`markdown.ts`)**: Complete dossier with an interactive Mermaid diagram rendering relationship topologies.
- **iCalendar (`ical.ts`)**: Standard RFC 5545 calendar file with alerts for iOS, macOS, Android, Google Calendar, and Thunderbird.
- **HTML (`html.ts`)**: Zero-dependency, responsive offline audit dashboard.
- **CSV (`csv.ts`)**: Tables for spreadsheet import.
