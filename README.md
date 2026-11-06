# LifeGraph — Portable Personal Knowledge & Entity Graph

[Italiano](README.it.md) • [English](README.md) • [Architecture](docs/ARCHITECTURE.md) • [Launch & SEO](docs/LAUNCH.md)

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![CI](https://github.com/MRJonam91/LifeGraph/actions/workflows/ci.yml/badge.svg)](https://github.com/MRJonam91/LifeGraph/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D22.18-brightgreen)](package.json)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-success)](package.json)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-MRJonam91-ea4aaa?logo=githubsponsors)](https://github.com/sponsors/MRJonam91)

Deterministic personal knowledge and entity graph: connect persons, documents, contracts, and deadlines with cryptographic provenance, fine-grained consent tags, and lossless export.

<p align="center">
  <img src="docs/assets/demo.svg" alt="LifeGraph terminal demo" width="760"/>
</p>

---

## 💥 The Problem

Personal paperwork, contracts, identity documents, and legal deadlines are scattered across emails, paper folders, banking portals, and proprietary cloud silos:
- **Missing Relationship Topology**: A lease contract links to a tenant (person), an identity document (CIE/passport), a renewal notice deadline, and an energy utility, but today there is no portable open standard to link them together without lock-in.
- **Unverifiable Data Claims**: Digital records and AI agent inputs lack cryptographic tamper-evidence and lineage tracking.
- **Uncontrolled Consent Sprawl**: Sharing paperwork for a mortgage application or rental contract often exposes unrelated personal data due to the lack of purpose-scoped filtering.
- **Forgotten Deadlines & Renewal Windows**: Rental notice cutoffs, passport expiries, and utility cancellation deadlines slip past unnoticed, causing automatic renewals and costly penalties.

---

## 💡 The Solution: LifeGraph

LifeGraph models your personal administration as a deterministic, portable **Directed Property Graph** (`lifegraph.json`):
- **Deterministic Entity Primitives**: Strongly typed models for **Persons**, **Documents**, **Contracts**, and **Deadlines**, interconnected by directed typed relationships (`OWNS`, `PARTY_TO`, `ATTACHED_TO`, `EXPIRES_ON`, `DEPENDS_ON`).
- **Cryptographic Provenance & Tamper-Evidence**: Every node and edge carries a deterministic SHA-256 digest and source lineage (`user_input`, `verified_issuer`, `file_import`, `agent_inferred`). Modifying any claim without recalculation immediately flags verification failure.
- **Fine-Grained Consent Tagging & Purpose Limitation**: Project and export only the subgraphs permitted for specific operations (e.g. `--consent banking_kyc` or `--consent rental_application`), ensuring strict GDPR compliance.
- **Automatic Deadline Engine**: Automatically evaluates contract notice windows (`endDate - noticePeriodDays`) and document expiries, with colored terminal warnings and days countdowns.
- **Deterministic Graph Diffing**: Detect additions, removals, and field modifications between graph snapshots.
- **Lossless Multi-Format Bi-Directional Export**:
  - **Canonical JSON**: Sorted, deterministic round-trip serialization.
  - **W3C JSON-LD**: Linked Data mapped to Schema.org and W3C PROV-O ontology.
  - **Interactive Markdown**: Complete dossier with an embedded Mermaid diagram of entity relationships.
  - **RFC 5545 iCalendar (`.ics`)**: Native calendar feeds with customizable reminder alarms.
  - **Standalone HTML Dashboard**: Responsive, zero-CDN offline visual report.
  - **Tabular CSV**: Export nodes, edges, and deadlines to spreadsheets.

---

## 🚀 Quick start​‌​​‌‌​‌​‌​‌​​‌​​‌​​‌​‌​​​‌‌‌​​‌​​‌‌​​​‌​​‌​‌‌​‌​‌‌​‌‌​​​‌‌​​‌‌‌​​‌​‌‌​‌​‌‌​​‌​​​​‌‌​‌​​​‌‌​​‌​‌​​‌‌‌​​​​‌‌​​​‌‌​​‌‌​​​‌

```bash
# 1. Initialize an empty personal ledger or generate a demonstration sample
npx lifegraph init my-ledger.json
npx lifegraph sample sample-ledger.json

# 2. Inspect topological entities and relationship stats
npx lifegraph inspect sample-ledger.json

# 3. Check upcoming deadlines within the next 90 days
npx lifegraph deadlines sample-ledger.json --days 90

# 4. Verify cryptographic integrity and referential continuity
npx lifegraph validate sample-ledger.json

# 5. Export to interactive Markdown with Mermaid graph or RFC 5545 iCalendar
npx lifegraph export sample-ledger.json --format markdown --out report.md
npx lifegraph export sample-ledger.json --format ics --out deadlines.ics
```

---

## 🛠️ CLI Reference

```text
USAGE:
  lifegraph <command> [options]

COMMANDS:
  init [file]                    Initialize an empty LifeGraph file (default: lifegraph.json)
  sample [file]                  Generate a synthetic demonstration LifeGraph file
  validate <file>                Validate schema, referential integrity, and cryptographic digests
  inspect <file>                 Show detailed summary and entity statistics
  stats <file>                   Alias for 'inspect'
  deadlines <file> [--days N]    List impending and overdue deadlines (default: 60 days)
  query <file> [options]         Search entities by type, tag, or label keyword
  filter <file> --consent <p>    Export a consent-restricted subgraph
  anonymize <file> [--out <f>]   Sanitize PII while preserving relational topology
  export <file> --format <fmt>   Export to json, jsonld, markdown, ics, html, or csv
  diff <fileA> <fileB>           Compare two LifeGraph snapshot files
  sponsor                        Show sponsorship and donation channels

OPTIONS:
  -f, --format <fmt>             Target export format: json | jsonld | markdown | ics | html | csv
  -o, --out <path>               Write output to file instead of stdout
  -c, --consent <purpose>        Consent purpose filter (e.g. general_admin, tax_filing, banking_kyc)
  -t, --type <type>              Filter query by entity type: person | document | contract | deadline
  -s, --search <keyword>         Search query string
  -d, --days <number>            Lookahead days for deadlines (default: 60)
  --all                          Include completed/dismissed deadlines
  --no-digests                   Skip SHA-256 digest recalculation during validation
  -v, --version                  Print version
  -h, --help                     Print this help message
```

---

## 📐 Architecture & Extensibility

LifeGraph is built with **zero runtime external dependencies** on modern Node.js (`>= 22.18`), with strict type-safety and a core under **1,500 lines of code** for immediate verifiability and auditability:

```text
src/
├── core/
│   ├── constants.ts        # Namespaces, nonces, predicate vocabulary, sponsor URLs
│   ├── types.ts            # Strongly typed schema for nodes, edges, provenance, permissions
│   ├── crypto.ts           # Canonical JSON serialization & SHA-256 digest computation
│   ├── graph.ts            # Directed property graph store, querying & projection
│   ├── validator.ts        # Schema, referential integrity & digest verification
│   ├── deadlines.ts        # Status calculation & deadline synthesis
│   ├── diff.ts             # Deterministic snapshot comparison
│   └── stats.ts            # Aggregate graph metrics
├── exporters/
│   ├── canonical-json.ts   # Lossless round-trip serializer
│   ├── jsonld.ts           # W3C Schema.org & PROV-O Linked Data
│   ├── markdown.ts         # Markdown report with Mermaid graph
│   ├── ical.ts             # RFC 5545 iCalendar (.ics) with alarms
│   ├── html.ts             # Standalone offline visual dashboard
│   └── csv.ts              # Tabular exports (nodes, edges, deadlines)
├── sample.ts               # Privacy-safe synthetic Italian paperwork scenario
├── cli/
│   └── index.ts            # Zero-dependency command-line interface
└── index.ts                # Public programmatic library API
```

Detailed specifications can be found in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 💖 Support & Donations

LifeGraph is free, independent, open-source software built for individual data sovereignty. If it saves you time or prevents missed deadlines, consider supporting ongoing development:

- **GitHub Sponsors**: [github.com/sponsors/MRJonam91](https://github.com/sponsors/MRJonam91)
- **Ko-fi**: [ko-fi.com/mrjonam](https://ko-fi.com/mrjonam)
- **Buy Me a Coffee**: [buymeacoffee.com/mrjonam](https://buymeacoffee.com/mrjonam)
- **PayPal**: [paypal.me/manorollo](https://paypal.me/manorollo)

---

## 📜 License & Attribution

This project is licensed under the **Apache License, Version 2.0**.
See [LICENSE](LICENSE) and [NOTICE](NOTICE) for complete terms. Documentation is released under [CC BY-SA 4.0](LICENSING.md).
