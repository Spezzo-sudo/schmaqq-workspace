# SCHMAQQ Field Guild R2 — Offizielles Avatar-Paket (`field-guild-r2`)

Dieses Verzeichnis enthält die zwölf finalen Charakterportraits der **SCHMAQQ Field Guild R2** sowie automatisch erzeugte WebP-Varianten (`512×512` für Galerie/Profil, `128×128` für schnelle Kontaktlisten- und Chat-Badges).

## Die 12 Charakter-Assets (`public/avatars/field-guild-r2/`)

| Preset-ID | Originaldatei (1024×1024) | Optimiert (512×512) | Thumbnail (128×128) | Charakter & Empfohlene Rolle | Typ | Kürzel-Fallback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `leitwolf` | `leitwolf.png` | `leitwolf.webp` | `leitwolf-sm.webp` | **Leitwolf** – Koordinator | Mensch | `LW` |
| `herr-grau` | `herr-grau.png` | `herr-grau.webp` | `herr-grau-sm.webp` | **Herr Grau** – Technischer Berater | Mensch | `HG` |
| `mara` | `mara.png` | `mara.webp` | `mara-sm.webp` | **Mara** – Frontend / UX | Mensch | `MA` |
| `frau-kern` | `frau-kern.png` | `frau-kern.webp` | `frau-kern-sm.webp` | **Frau Kern** – Review / QA | Mensch | `FK` |
| `otto` | `otto.png` | `otto.webp` | `otto-sm.webp` | **Otto** – Operations | Mensch | `OT` |
| `nova` | `nova.png` | `nova.webp` | `nova-sm.webp` | **Nova** – Forschung / Strategie | Mensch | `NV` |
| `dachs` | `dachs.png` | `dachs.webp` | `dachs-sm.webp` | **Dachs** – Debugging / Qualität | Tier | `DA` |
| `fuchs` | `fuchs.png` | `fuchs.webp` | `fuchs-sm.webp` | **Fuchs** – Recherche / Ideen | Tier | `FU` |
| `baer` | `baer.png` | `baer.webp` | `baer-sm.webp` | **Bär** – Infrastruktur / Systeme | Tier | `BA` |
| `rabe` | `rabe.png` | `rabe.webp` | `rabe-sm.webp` | **Rabe** – Security | Tier | `RA` |
| `schaefer` | `schaefer.png` | `schaefer.webp` | `schaefer-sm.webp` | **Schäfer** – Support | Tier | `SC` |
| `eule` | `eule.png` | `eule.webp` | `eule-sm.webp` | **Eule** – Wissen / Dokumentation | Tier | `EU` |

## Grundsätze

- Die Originaldateien (`<id>.png`) sind unverändert im Verzeichnis abgelegt.
- `AgentAvatar` (`studio/agent-avatar.tsx`) lädt je nach Darstellungsgröße (`40px`, `48px`, `96px`, `256px`) über `<picture>` bevorzugt die optimierten WebP-Varianten und fällt automatisch auf `<id>.png` bzw. das SCHMAQQ-Kürzel (`fallbackCode`) zurück, falls eine Bilddatei in einem späteren Erweiterungspaket noch nicht vorhanden ist.
- Avatar, Name, Rolle, Modell, Beschreibung, Kommunikationsstil und serverseitige Berechtigungen sind voneinander unabhängig konfigurierbar.
