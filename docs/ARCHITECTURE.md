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
                      │   - Lineage Tracing & Cycle Detector   │
                      │   - SHA-256 Tamper Detection           │
                      └───────────────────┬────────────────────┘
                                          │
         ┌──────────────────┬─────────────┼──────────────────┬──────────────────┐
         │                  │             │                  │                  │
         ▼                  ▼             ▼                  ▼                  ▼
┌──────────────────┐┌──────────────┐┌──────────────┐┌──────────────────┐┌──────────────────┐
│  Security/Vault  ││  Financial   ││   Adapters   ││  W3C JSON-LD /   ││  HTML, CSV &     │
│  AES-256-GCM     ││  Burn Rate & ││  vCard, CSV, ││  Markdown /      ││  Graphviz DOT    │
│  Encryption      ││  Commitments ││  iCal Import ││  iCal Exporters  ││  Audit Dashboards│
└──────────────────┘└──────────────┘└──────────────┘└──────────────────┘└──────────────────┘
```

## Core Modules (`src/core/`)

1. **`types.ts`**:
   - Strongly typed primitives:
     - `PersonNode`: Personal identity, tax/fiscal code, contact credentials.
     - `DocumentNode`: ID cards, passports, driving licenses, tax filings, diplomas, with file hashes and expiry.
     - `ContractNode`: Employment, rentals, utility power/gas, telecoms, insurance, notice windows, and recurring costs.
     - `DeadlineNode`: Actionable obligations (renewal windows, document expirations, tax due dates) with reminders.
     - `LifeGraphEdge`: Directed relationships (`OWNS`, `PARTY_TO`, `ATTACHED_TO`, `EXPIRES_ON`, `RENEWAL_OF`, `DEPENDS_ON`).
     - `Provenance`: Source lineage (`user_input`, `verified_issuer`, `file_import`, `agent_inferred`), ISO timestamp, and SHA-256 cryptographic digest.
     - `Permissions`: Visibility classification (`private`, `family`, `confidential`, `public`) and consent purpose limitations.

2. **`graph.ts`**:
   - Directed property graph implementation with adjacency indexing.
   - Referential integrity checks preventing orphaned or dangling edges.
   - Purpose limitation projection (`projectByConsent`): extracts subgraphs authorized under a specific consent purpose (e.g., `banking_kyc`, `tax_filing`).
   - Lineage tracing (`findLineage`): separates upstream requirements and downstream consequences.
   - Connected component discovery (`getConnectedComponent`) and directed cycle detection (`detectCycles`).
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

7. **`audit.ts`**:
   - Privacy hygiene and paperwork completeness audit engine.
   - Flags public PII exposure, orphan paperwork, and unprotected document/contract expirations.
   - Computes a health score (0–100%).

8. **`merge.ts`**:
   - Deterministic graph reconciler supporting multiple conflict resolution strategies (`prefer-newer`, `prefer-incoming`, `prefer-base`) and automated digest recomputation.

## Security & Vault Sealing (`src/security/`)

- **AES-256-GCM Vault Sealing (`vault.ts`)**:
  - Offline local-first encryption using PBKDF2 (100,000 iterations, SHA-256) and AES-256-GCM authenticated cipher.
  - Generates tamper-resistant sealed vaults (`lifegraph.sealed.json`) protecting confidential and private entities.

## Financial & Cost Analytics (`src/analytics/`)

- **Recurring Cost Engine (`costs.ts`)**:
  - Normalizes billing cycles (monthly, quarterly, yearly, one_off).
  - Calculates recurring monthly burn rates, annual fixed commitments, category totals, and top spend providers.

## Universal Adapters (`src/adapters/`)

- **vCard Ingestion (`vcard.ts`)**: Ingests vCard contacts into cryptographically verified `PersonNode`s.
- **Subscriptions CSV (`subscriptions-csv.ts`)**: Imports bank statements and subscription exports into `ContractNode`s.
- **iCalendar Import (`ical-import.ts`)**: Ingests calendar events into `DeadlineNode`s.

## Exporters (`src/exporters/`)

- **Canonical JSON (`canonical-json.ts`)**: Lossless, sorted, deterministic serialization guaranteeing byte-identical round-trip import.
- **W3C JSON-LD (`jsonld.ts`)**: Semantic web interoperability conforming to Schema.org and W3C PROV-O provenance.
- **Markdown (`markdown.ts`)**: Complete dossier with an interactive Mermaid diagram rendering relationship topologies.
- **iCalendar (`ical.ts`)**: Standard RFC 5545 calendar file with alerts for iOS, macOS, Android, Google Calendar, and Thunderbird.
- **HTML (`html.ts`)**: Zero-dependency, responsive offline audit dashboard with live client-side search.
- **Graphviz DOT (`dot.ts`)**: Graphviz format with custom styling and node shaping.
- **CSV (`csv.ts`)**: Tables for spreadsheet import.
