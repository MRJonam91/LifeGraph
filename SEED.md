# LifeGraph: decision seed & v1.0.0 status

IT — Scopo: Manca un modello portabile delle relazioni tra dati personali. Soluzione: Grafo orientato a proprietà deterministico per persone, documenti, contratti e scadenze, con provenienza crittografica, consensi granulari, cifratura locale AES-256-GCM ed esportazione lossless multiformato.

EN — Purpose: A portable model of links among personal data is missing. Solution: Deterministic directed property graph linking persons, documents, contracts, and deadlines, with cryptographic provenance, granular consent tags, local-first AES-256-GCM vault sealing, and lossless multi-format export.

## Stato di Rilascio / Release Status: v1.0.0 Stable

- [x] Schema unificato e strongly-typed (`LifeGraphData`) con nodi `Person`, `Document`, `Contract` e `Deadline`.
- [x] Provenienza crittografica con digest SHA-256 su ogni entità e arco per tracciabilità e rilevamento manomissioni.
- [x] Modello di permessi e consensi conforme al principio di minimizzazione e limitazione delle finalità GDPR (`projectByConsent`).
- [x] Motore di calcolo scadenze e preavvisi di rinnovo/disdetta con avvisi di imminenza e countdown.
- [x] Navigazione topologica e tracciamento della lineage (`findLineage`, `getConnectedComponent`, `detectCycles`).
- [x] Motore di audit su privacy e igiene documentale (`auditLifeGraph`) con calcolo dell'Health Score (0–100%).
- [x] Riconciliazione e merge deterministico tra ledger diversi (`mergeLifeGraphs` con strategie `prefer-newer`, `prefer-incoming`, `prefer-base`).
- [x] Cifratura locale del vault con AES-256-GCM e derivazione chiave PBKDF2 (100.000 iterazioni) per archiviazione sicura.
- [x] Analisi finanziaria dei costi ricorrenti con calcolo del burn rate mensile e impegni annuali fissi.
- [x] Adattatori universali di importazione da sorgenti esterne (vCard `.vcf`, CSV estratti conto/abbonamenti, iCalendar `.ics`).
- [x] Esportatori multiformato lossless: JSON Canonico (round-trip testato), W3C JSON-LD (Schema.org + PROV-O), Markdown con diagramma Mermaid, RFC 5545 iCalendar, HTML offline interattivo, Graphviz DOT e CSV.
- [x] CLI completa a zero dipendenze con 17 comandi e opzioni.
- [x] Test suite automatizzata completa con 44 test verdi su Node.js 22/24.
- [x] Standard di repository MRJonam91 applicati (Apache-2.0, NOTICE, LICENSING.md, FUNDING.yml, CI con guardia core < 1500 righe).
