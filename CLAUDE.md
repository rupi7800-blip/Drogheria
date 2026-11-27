# Regole di lavoro (Roberto)

- Quando l'utente dice "Ricorda le /regole" e le regole non si trovano (nessun file `/regole`, nessuna istruzione che le contenga):
  **fermarsi e chiedere dove sono, senza proseguire il lavoro.**
- Conversare sempre in italiano; usare parole italiane al posto di prestiti da lingue straniere, dove possibile.
- L'app mostra **sempre tutto in italiano**: ogni testo che arriva da fonti straniere (schede FDA, Wikipedia inglese, PubMed, nomi di reazioni e farmaci) va tradotto automaticamente, mai lasciato in inglese.
- Il nome del repository voluto è "Drogheria" (attuale: FarmaRadar, da rinominare da GitHub).

## Regole di consumo e ruoli

- Sonnet gestisce la sessione principale: scrive codice e corregge bug.
- Ricerche nel repository, grep e test vanno ai sotto-agenti Haiku 5.5 (`search`, `grep`, `audit`),
  anche in parallelo, per mantenere il contesto principale snello.
- `audit` lavora in worktree isolato, così non tocca il branch di lavoro.
- Opus (`advisor`) è in stand-by: lo si invoca solo per decisioni chiave e per la firma finale dei diff.
  Non sprecare il suo contesto su lavoro di routine.
- Scelte rapide e deterministiche (scelta tool, percorso, retry) le decide direttamente Sonnet, senza sotto-agenti.
