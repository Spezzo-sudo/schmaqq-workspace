# SCHMAQQ Studio — Einstieg für Codex, Work und andere Engineering-Agenten

Ziel: Marco und Markus entwickeln gemeinsam digitale Services, mit eigenen Konten,
eigenen Arbeitskopien und gegenseitigem Review. Designreferenz ist SCHMAQQ.

Vor Arbeit zuerst `docs/CONTEXT_ENTRY.md` lesen; dann nur auftragsrelevante Abschnitte
von `docs/PLAN.md`, `docs/WORKLIST.md` und gezielt ausgewählte Einträge aus
`docs/STATUS.json` einsehen. Die gesamte STATUS.json nicht routinemäßig laden
(sie ist ein umfangreiches Statusarchiv). Für Detailfragen relevante Originalquellen
lesen und den Befund belegen; keine wichtigen Prüfungen auslassen.
Offizieller Stand ist `main`. Historische Dokumente liegen in `docs/archive/` und sind kein Auftrag.
Dieses Repository ist die eigenständige Anwendung `Spezzo-sudo/schmaqq-workspace`.
Alle Befehle laufen im Repository-Root. Der frühere NetzKontor-Übergabe-Snapshot
ist historische Evidence; neue Studio-Arbeit erfolgt hier. NetzKontor und dessen
Kundenanwendung/Marketing-Website sind ein getrenntes Repository.

## Arbeit und Nachweis

- Arbeit auf einem eigenen Branch/Worktree; keine überlappende Schreibarbeit.
- Node.js >=24.15, Git und Python 3 für die vollständigen Checks.
- Installieren: `npm ci --no-audit --no-fund`.
- Prüfen: `npm run studio:verify`; fokussierte Tests zuerst, voller Check vor Übergabe.
- Persönliches Studio: `npm run studio:build`, dann `npm run studio:start`.
- Isolierte Demo: `npm run studio:demo`; Zugangsdaten bleiben lokal in `.studio/`.
- UI-Änderungen benötigen zusätzlich sichtbare Browserprüfung. Ein Build beweist
  weder mobile Bedienbarkeit noch einen vollständigen Nutzerablauf.
- Bei Abschluss Fähigkeiten und Blocker in STATUS.json anpassen, Tests mit Ergebnis
  im Übergabebericht nennen. Keine aktuellen Commit-SHAs in dauerhaftem Text pflegen;
  tatsächlichen Stand mit Git ermitteln.


## Produktbild und sichere Entwicklung

SCHMAQQ Workspace ist die übergeordnete, langfristig universelle Kollaborationsplattform; Studio ist der erste Fachbereich für Softwareentwicklung. **Nicht** als reine ChatGPT-App oder schon existierendes öffentliches Compute-Netzwerk darstellen. Verbindliche R1-Vision/Zielarchitektur stehen in `docs/PRODUCT_VISION.md`, `docs/ARCHITECTURE.md`, `docs/PLAN.md` (Etappen) sowie historisch `docs/archive/ROADMAP.md` und `docs/archive/INTEGRATION_BOUNDARIES.md`. Deren Zukunftsziele nicht als derzeit implementiert ausgeben; für den Ist-Zustand ist `docs/STATUS.json` maßgeblich. Entwürfe/ADRs gelten erst nach Owner-Review/Merge.

Keine fremden Aufträge auf private Runner erweitern, keine externe Selbstregistrierung oder providerübergreifende Kontonutzung ohne separate Security-, Consent- und Berechtigungsprüfung. Workspace-, Agenten-, Runner- und Provideridentitäten trennen. NetzKontor-Integration nur über eigenen, gesondert geprüften Plattform-PR.

## Grenzen

- `selfhost/` + `studio/` sind die tatsächliche Node/SQLite-Anwendung.
- Die ursprünglichen Sites/Cloudflare-Routen in `app/api/`, `db/` und `build/` sind
  ein separater Starterpfad. Sie sind kein Beleg für selbst gehostete Anmeldung.
- Studio-Identitätslogin, persönliche Codex-Modellnutzung und lokale KI-Freigabe
  sind getrennte Berechtigungen. Keine fremden Codex-Clients oder Auth-Caches nutzen.
- `.studio/`, Runnerprofile, Datenbanken, Einladungs-/Gerätetokens, private ENV und
  Modell-Auth gehören niemals nach GitHub oder in Chat-Übergaben.
- Kein automatisches Deployment, kein Merge und keine Production-/Provider-Mutation.
  Hermes führt einen gesondert freigegebenen Betriebsschritt aus; der vorbereitete
  Auftrag steht in `docs/archive/HERMES_HANDOFF.md` (historisch; Rolle von Hermes wird laut PLAN.md neu geklärt).
- GitHub-/Cloud-Sicherung ist kein laufender Studio-Server. Offline-PCs führen keine
  Runnerjobs aus. Keine Live-Integration behaupten, solange sie nicht nachgewiesen ist.
