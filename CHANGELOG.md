# Changelog — LifeGraph

Tutte le modifiche rilevanti a questo progetto sono documentate in questo file.
Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e aderisce a [Semantic Versioning](https://semver.org/).

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-06

### Added
- **Core Entity Graph Engine**: Strongly typed, deterministic directed graph model linking Persons, Documents, Contracts, and Deadlines.
- **Provenance & Integrity**: SHA-256 cryptographic digests computed across all entities and edges, preserving source lineage, timestamps, and detection of data tampering.
- **Privacy & Consent Tagging**: Fine-grained visibility classification (`private`, `family`, `confidential`, `public`) and consent purpose limitations (e.g. `tax_filing`, `banking_kyc`, `emergency`).
- **Referential Integrity & Consistency Validator**: Validates entity schemas, chronological constraints (issue before expiry, start before end), and flags dangling or circular invalid edges.
- **Deadline Engine**: Automatically calculates imminent deadlines, overdue obligations, renewal notice windows, and reminder countdowns.
- **Deterministic Diff Engine**: Computes exact additions, removals, and modifications between graph snapshots.
- **Multi-Format Lossless Exporters**:
  - W3C JSON-LD / Linked Data with PROV-O provenance ontology mapping.
  - Canonical deterministic JSON for git diffability and lossless round-trip importing.
  - Markdown summary report with interactive Mermaid graph diagram.
  - RFC 5545 iCalendar (`.ics`) for native calendar sync with reminder triggers.
  - Standalone HTML interactive visual report with zero external CDN dependencies.
  - CSV tabular exports for spreadsheet integration.
- **Zero-Dependency CLI**: Command-line interface with `init`, `sample`, `validate`, `inspect`, `deadlines`, `query`, `filter`, `anonymize`, `export`, `diff`, and `sponsor`.
- Complete test suite, bilingual documentation, JSON Schema, and CI workflows.
