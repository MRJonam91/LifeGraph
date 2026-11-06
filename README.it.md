# LifeGraph — Modello Dati a Grafo Personale Portabile

[Italiano](README.it.md) • [English](README.md) • [Architettura](docs/ARCHITECTURE.md) • [Lancio & SEO](docs/LAUNCH.md)

[![Licenza](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![CI](https://github.com/MRJonam91/LifeGraph/actions/workflows/ci.yml/badge.svg)](https://github.com/MRJonam91/LifeGraph/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D22.18-brightgreen)](package.json)
[![Zero Dipendenze](https://img.shields.io/badge/dependencies-zero-success)](package.json)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-MRJonam91-ea4aaa?logo=githubsponsors)](https://github.com/sponsors/MRJonam91)

Modello dati e grafo deterministico per dati personali: connette persone, documenti, contratti e scadenze con provenienza crittografica, gestione granulare dei consensi, cifratura locale AES-256-GCM ed esportazione multiformato senza perdita di dati.

<p align="center">
  <img src="docs/assets/demo.svg" alt="Demo terminale LifeGraph" width="760"/>
</p>

---

## 💥 Il Problema

Documenti d'identità, contratti d'affitto, utenze luce/gas e scadenze burocratiche sono frammentati tra email, faldoni cartacei, portali bancari e silos proprietari:
- **Assenza di Topologia di Relazione**: Un contratto di locazione è collegato a un inquilino (persona), a documenti d'identità (CIE/passaporto), a un termine di disdetta e a bollette energetiche, ma non esiste uno standard aperto per connetterli senza vincoli proprietari.
- **Dichiarazioni di Dati Non Verificabili**: I record digitali e gli input per agenti AI mancano di prove crittografiche di integrità e tracciamento della provenienza.
- **Diffusione Incontrollata dei Dati Personali**: Condividere documenti per una pratica di mutuo o per una locazione finisce per esporre dati non pertinenti a causa dell'assenza di filtri per finalità di consenso (purpose limitation).
- **Scadenze e Costi Ricorrenti Dimenticati**: Finestre di recesso per locazioni, rinnovi di passaporto e disdette di contratti scadono inosservate, causando rinnovi taciti e spese impreviste.

---

## 💡 La Soluzione: LifeGraph

LifeGraph modella la propria amministrazione personale come un **Grafo Orientato a Proprietà** (`lifegraph.json`):
- **Entità Deterministiche Tipizzate**: Modelli per **Persone**, **Documenti**, **Contratti** e **Scadenze**, collegati da relazioni orientate (`OWNS`, `PARTY_TO`, `ATTACHED_TO`, `EXPIRES_ON`, `DEPENDS_ON`).
- **Provenienza Crittografica & Rilevamento Manomissioni**: Ogni nodo e arco possiede un digest deterministico SHA-256 e la fonte di generazione (`user_input`, `verified_issuer`, `file_import`, `agent_inferred`). Qualsiasi manomissione senza ricalcolo viene immediatamente segnalata.
- **Filtri di Consenso Granulari & Finalità GDPR**: Proietta ed esporta solo i sottografi autorizzati per una specifica finalità (es. `--consent banking_kyc` o `--consent rental_application`), garantendo la massima riservatezza.
- **Audit di Privacy & Igiene Documentale**: Calcola l'Health Score (0–100%) e intercetta fughe di PII in chiaro, pratiche orfane e scadenze sprovviste di promemoria.
- **Tracciamento Lineage & Rilevamento Cicli**: Ispeziona requisiti a monte e conseguenze a valle (`lifegraph trace`), scoprendo componenti connesse e cicli illegittimi.
- **Riconciliazione & Fusione Determinostica**: Unisce snapshot di grafi indipendenti con strategie selezionabili (`prefer-newer`, `prefer-incoming`, `prefer-base`).
- **Cifratura Locale AES-256-GCM del Vault**: Protegge i ledger sensibili con cifratura simmetrica autenticata e PBKDF2 a 100.000 iterazioni (`lifegraph seal` / `lifegraph unseal`).
- **Analisi Finanziaria & Burn Rate Ricorrente**: Calcola le uscite mensili fisse e l'impegno annuo contrattuale (`lifegraph costs`).
- **Acquisizione Dati Universale**: Ingestione di contatti vCard, CSV di abbonamenti bancari ed eventi iCalendar.
- **Esportazione Multiformato Senza Perdita**:
  - **JSON Canonico**: Serializzazione ordinata e deterministica con ri-importazione priva di discrepanze.
  - **W3C JSON-LD**: Linked Data conforme alle ontologie Schema.org e W3C PROV-O.
  - **Markdown Interattivo**: Report riassuntivo con diagramma Mermaid integrato per visualizzare le relazioni.
  - **RFC 5545 iCalendar (`.ics`)**: Feed di calendario con notifiche e allarmi di promemoria.
  - **Dashboard HTML Standalone**: Report visuale moderno e reattivo funzionante al 100% offline con ricerca istantanea.
  - **Graphviz DOT (`.dot`)**: Rappresentazione grafica colorata per Graphviz.
  - **Tabelle CSV**: Esportazione di nodi, archi e scadenze per fogli di calcolo.

---

## 🚀 Avvio rapido​‌​​‌‌​‌​‌​‌​​‌​​‌​​‌​‌​​​‌‌‌​​‌​​‌‌​​​‌​​‌​‌‌​‌​‌‌​‌‌​​​‌‌​​‌‌‌​​‌​‌‌​‌​‌‌​​‌​​​​‌‌​‌​​​‌‌​​‌​‌​​‌‌‌​​​​‌‌​​​‌‌​​‌‌​​​‌

```bash
# 1. Inizializza un ledger vuoto o genera un grafo di esempio
npx lifegraph init mio-grafo.json
npx lifegraph sample esempio.json

# 2. Ispeziona entità, statistiche e relazioni
npx lifegraph inspect esempio.json

# 3. Esegui l'audit di privacy e completezza documentale
npx lifegraph audit esempio.json

# 4. Calcola il burn rate mensile e i costi contrattuali fissi
npx lifegraph costs esempio.json

# 5. Consulta le scadenze nei prossimi 90 giorni
npx lifegraph deadlines esempio.json --days 90

# 6. Traccia la lineage delle dipendenze per un contratto o documento
npx lifegraph trace esempio.json ctr-rent-home

# 7. Cifra il vault con AES-256-GCM per backup sicuro su cloud
npx lifegraph seal esempio.json --pass "MiaPasswordSegreta!"

# 8. Esporta in Markdown con diagramma Mermaid o calendario RFC 5545 (.ics)
npx lifegraph export esempio.json --format markdown --out report.md
npx lifegraph export esempio.json --format ics --out scadenze.ics
```

---

## 🛠️ Riferimento Comandi CLI

```text
USO:
  lifegraph <comando> [opzioni]

COMANDI:
  init [file]                    Inizializza un file LifeGraph vuoto (default: lifegraph.json)
  sample [file]                  Genera un dataset sintetico dimostrativo
  validate <file>                Valida schema, integrità referenziale e digest crittografici
  inspect <file>                 Mostra riepilogo dettagliato e statistiche entità
  stats <file>                   Alias di 'inspect'
  audit <file>                   Esegue l'audit di igiene privacy e completezza pratiche
  costs <file>                   Calcola il burn rate ricorrente e gli impegni economici fissi
  trace <file> <nodeId>          Traccia la lineage delle dipendenze a monte e a valle
  deadlines <file> [--days N]    Elenca scadenze imminenti e scadute (default: 60 giorni)
  query <file> [opzioni]         Cerca entità per tipo, tag o parola chiave
  filter <file> --consent <p>    Esporta un sottografo ristretto al consenso indicato
  anonymize <file> [--out <f>]   Anonimizza i PII preservando la topologia delle relazioni
  merge <fileA> <fileB>          Riconcilia e fonde due ledger LifeGraph
  seal <file> --pass <pass>      Cifra il vault con crittografia locale AES-256-GCM
  unseal <file> --pass <pass>    Decifra il vault precedentemente cifrato
  import <file> --format <fmt>   Importa record esterni (vcard | csv | ics)
  export <file> --format <fmt>   Esporta in formato json, jsonld, markdown, ics, html, csv o dot
  diff <fileA> <fileB>           Confronta due file snapshot di LifeGraph
  sponsor                        Mostra i canali di donazione e supporto

OPZIONI:
  -f, --format <fmt>             Formato di esportazione o import: json | jsonld | markdown | ics | html | csv | dot | vcard
  -o, --out <path>               Scrive l'output su file anziché su stdout
  -c, --consent <purpose>        Filtro finalità di consenso (es. general_admin, tax_filing, banking_kyc)
  -t, --type <type>              Filtra per tipo di entità: person | document | contract | deadline
  -s, --search <keyword>         Stringa di ricerca
  -d, --days <number>            Giorni di anticipo per le scadenze (default: 60)
  -p, --pass, --passphrase <pwd> Password per cifrare / decifrare il vault
  --strategy <strategy>          Strategia conflitti merge: prefer-newer | prefer-incoming | prefer-base
  --into <targetLedger>          File LifeGraph su cui fondere i dati importati
  --strict                       Esce con codice 1 se presenti avvisi o criticità nell'audit
  --all                          Includi scadenze completate o archiviate
  --no-digests                   Ignora la verifica dei digest SHA-256
  -v, --version                  Mostra la versione
  -h, --help                     Mostra questo messaggio di aiuto
```

---

## 📐 Architettura ed Estendibilità

LifeGraph è progettato con **zero dipendenze di runtime esterne** su Node.js moderno (`>= 22.18`), con tipizzazione rigorosa e un core inferiore alle **1.500 righe di codice** per garantire audit immediato:

```text
src/
├── core/
│   ├── constants.ts        # Namespace, nonce, vocabolario predicati, URL sponsor
│   ├── types.ts            # Schema tipizzato per nodi, archi, provenienza, consensi
│   ├── crypto.ts           # Serializzazione JSON canonica e digest SHA-256
│   ├── graph.ts            # Gestione grafo a proprietà, lineage e rilevamento cicli
│   ├── validator.ts        # Validazione schema, integrità referenziale e digest
│   ├── deadlines.ts        # Calcolo stati scadenze e sintesi da contratti/documenti
│   ├── diff.ts             # Confronto deterministico snapshot
│   ├── stats.ts            # Metriche aggregate del grafo
│   ├── audit.ts            # Motore di audit privacy e completezza pratiche
│   └── merge.ts            # Riconciliazione deterministica ledger
├── security/
│   └── vault.ts            # Cifratura e decifratura vault con AES-256-GCM
├── analytics/
│   └── costs.ts            # Analisi economica impegni e burn rate mensile
├── adapters/
│   ├── vcard.ts            # Ingestione contatti vCard 3.0
│   ├── subscriptions-csv.ts# Ingestione CSV estratti conto / abbonamenti
│   └── ical-import.ts      # Ingestione eventi calendario RFC 5545
├── exporters/
│   ├── canonical-json.ts   # Serializzatore deterministico senza perdita
│   ├── jsonld.ts           # Linked Data W3C Schema.org & PROV-O
│   ├── markdown.ts         # Report Markdown con grafo Mermaid integrato
│   ├── ical.ts             # Calendario RFC 5545 (.ics) con allarmi
│   ├── html.ts             # Dashboard visuale offline con ricerca live
│   ├── dot.ts              # Esportazione Graphviz (.dot)
│   └── csv.ts              # Esportazioni tabellari (nodi, archi, scadenze)
├── sample.ts               # Scenario sintetico privacy-safe di pratiche personali
├── cli/
│   └── index.ts            # Interfaccia a riga di comando a zero dipendenze
└── index.ts                # API pubblica della libreria
```

Le specifiche dettagliate sono disponibili in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 💖 Supporto e Donazioni

LifeGraph è un progetto open-source indipendente sviluppato a supporto della sovranità digitale individuale. Se ti è utile per gestire contratti e scadenze, puoi sostenere lo sviluppo continuo:

- **GitHub Sponsors**: [github.com/sponsors/MRJonam91](https://github.com/sponsors/MRJonam91)
- **Ko-fi**: [ko-fi.com/mrjonam](https://ko-fi.com/mrjonam)
- **Buy Me a Coffee**: [buymeacoffee.com/mrjonam](https://buymeacoffee.com/mrjonam)
- **PayPal**: [paypal.me/manorollo](https://paypal.me/manorollo)

---

## 📜 Licenza e Attribuzione

Questo progetto è rilasciato sotto la licenza **Apache License, Version 2.0**.
Consulta [LICENSE](LICENSE) e [NOTICE](NOTICE) per i termini completi. La documentazione è distribuita con licenza [CC BY-SA 4.0](LICENSING.md).
