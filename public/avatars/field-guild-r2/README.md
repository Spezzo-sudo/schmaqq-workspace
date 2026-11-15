# SCHMAQQ Field Guild R2 – Avatar-Assets

Dieses Verzeichnis enthält die Charakterportraits für das **SCHMAQQ Field Guild R2** Avatar- und Agentenprofilsystem.
Alle Dateien unter `public/avatars/field-guild-r2/` werden beim Build (`npm run studio:build`) automatisch unter `/avatars/field-guild-r2/<dateiname>` ausgeliefert.

## Dateinamenskonvention (12 Standard-Presets)

Um ein Einzelportrait für eine Figur bereitzustellen oder zu aktualisieren, genügt es, die jeweilige PNG-Datei (quadratisch, empfohlen `512×512` bis `1024×1024` px) unter exakt diesem Namen abzulegen – **ohne Codeänderung**:

| Preset-ID | Pfad im Repository | Typ | Empfohlene Rolle | Status |
| :--- | :--- | :--- | :--- | :--- |
| `leitwolf` | `public/avatars/field-guild-r2/leitwolf.png` | Mensch | Koordinator | Bereit für Einzelbild (Kürzel-Fallback `LW` aktiv) |
| `herr-grau` | `public/avatars/field-guild-r2/herr-grau.png` | Mensch | Technischer Berater | **Einzelportrait hinterlegt** (`herr-grau.png`) |
| `mara` | `public/avatars/field-guild-r2/mara.png` | Mensch | Frontend / UX | Bereit für Einzelbild (Kürzel-Fallback `MA` aktiv) |
| `frau-kern` | `public/avatars/field-guild-r2/frau-kern.png` | Mensch | Review / QA | Bereit für Einzelbild (Kürzel-Fallback `FK` aktiv) |
| `otto` | `public/avatars/field-guild-r2/otto.png` | Mensch | Operations | Bereit für Einzelbild (Kürzel-Fallback `OT` aktiv) |
| `nova` | `public/avatars/field-guild-r2/nova.png` | Mensch | Forschung / Strategie | Bereit für Einzelbild (Kürzel-Fallback `NV` aktiv) |
| `dachs` | `public/avatars/field-guild-r2/dachs.png` | Tier | Debugging / Qualität | Bereit für Einzelbild (Kürzel-Fallback `DA` aktiv) |
| `fuchs` | `public/avatars/field-guild-r2/fuchs.png` | Tier | Recherche / Ideen | Bereit für Einzelbild (Kürzel-Fallback `FU` aktiv) |
| `baer` | `public/avatars/field-guild-r2/baer.png` | Tier | Infrastruktur / Systeme | Bereit für Einzelbild (Kürzel-Fallback `BR` aktiv) |
| `rabe` | `public/avatars/field-guild-r2/rabe.png` | Tier | Security | Bereit für Einzelbild (Kürzel-Fallback `RA` aktiv) |
| `schaefer` | `public/avatars/field-guild-r2/schaefer.png` | Tier | Support | Bereit für Einzelbild (Kürzel-Fallback `SC` aktiv) |
| `eule` | `public/avatars/field-guild-r2/eule.png` | Tier | Wissen / Dokumentation | Bereit für Einzelbild (Kürzel-Fallback `EU` aktiv) |

Zusätzlich liegt die 4×3-Charakterübersicht als Referenz unter `public/avatars/field-guild-r2/reference-team-12.png`.
Solange für ein Preset noch keine eigene `.png`-Datei hinterlegt ist, zeigt die Komponente `<AgentAvatar>` automatisch den typografischen SCHMAQQ-Kürzel-Avatar im jeweiligen Farbakzent der Figur an.
