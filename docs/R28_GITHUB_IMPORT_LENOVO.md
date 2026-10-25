# R28 / Issue #45 – GitHub-Import auf dem persönlichen Runner

**Status:** Implementierungsentwurf auf isoliertem Branch. R27 bleibt unverändert live; kein Merge und kein Deployment.

## Ziel und Grenzen

Ein bereits bestehendes privates GitHub-Repository wird per bewusst heruntergeladenem Studio-Einrichtungsplan auf **dem eigenen** Rechner geklont und anschliessend im **bestehenden** persönlichen Runnerprofil als neues Projekt freigegeben. Für Marcos Solo-Pilot ist die Quelle `Spezzo-sudo/schmaqq-studio-pilot` auf `main`. Nicht mit dem Produkt-Repository `schmaqq-workspace` verwechseln.

Nicht Teil dieses Schrittes: eine neue Runnerregistrierung, geteilte GitHub- oder Codex-Anmeldungen, automatische Paketinstallation, automatische Tests fremder Quellen, Git-Push, Merge, Veröffentlichungen und Production. Markus wird nicht benötigt. Der historische H3-Owner-Mismatch ist hiermit **nicht** behoben.

## Abfolge auf dem Lenovo (Windows)

1. **Git für Windows** inklusive **Git Credential Manager** und **Node.js >=24.15** verwenden. Versionskontrolle lokal in PowerShell: `git --version`, `node --version`. Bei SSH die eigene GitHub-Schlüsselkonfiguration verwenden. Weder GitHub-Passwort noch Tokens in Studio oder Chat kopieren.
2. Im vorhandenen Studio-Konto den gewünschten Projektraum öffnen, dort **Lokale Arbeitskopie einrichten** und **Bestehendes GitHub-Repository importieren** wählen. Falls noch kein Projekt existiert: ein persönliches Studio-Projekt zuerst anlegen. Der Assistent fragt bei der Anlage **nicht** nach einem fiktiven Laufwerkspfad.
3. Repository `https://github.com/Spezzo-sudo/schmaqq-studio-pilot` (oder die eigene SSH-Adresse) eintragen; Branch `main`. Lokal den **neuen, noch nicht existierenden** Zielordner ausdrücklich angeben – beispielsweise innerhalb eines selbst gewählten persönlichen Projektverzeichnisses. Der **übergeordnete Ordner muss existieren**. Keine Laufwerkswurzel, keine Junction oder Symlink, keine alte Arbeitskopie und kein Runnerzustandsordner.
4. Zielordner-Freigabe bestätigen und **Einrichtungsplan herunterladen**. Die Datei enthält Projekt-ID, ausgewählte Repository-Adresse, Pfad und Testargumente, **keine** Runner-/GitHub-Tokens. Sie bleibt privat auf dem Lenovo.
5. Den vorhandenen SCHMAQQ-Quellordner und die vorhandene persönliche Runnerprofil-JSON finden. Den lokalen Befehl **selbst** mit den wirklichen Pfaden ausführen (PowerShell; Leerzeichen in Pfaden jeweils quoten):

   `node selfhost/project-setup.mjs --apply "PFAD_ZUM_PLAN" "PFAD_ZUM_BESTEHENDEN_RUNNERPROFIL"`

6. Der Helfer fragt die Studio-Serverberechtigung mit dem **bereits gespeicherten Gerätezugang** ab, prüft den lokalen Zielbereich, startet `git clone` ohne Shell und registriert das Projekt **erst nach einem erfolgreichen Clone**. Falls Git Credential Manager Browseranmeldung anbietet: nur auf dem eigenen Rechner freigeben. Ein vorhandener Zielordner oder eine vorhandene Projektfreigabe wird **nie** überschrieben.
7. Profil-Backup lokal prüfen. Den **vorhandenen** Runner gezielt einmal neu starten: `node selfhost/runner.mjs "PFAD_ZUM_BESTEHENDEN_RUNNERPROFIL"`. Keine zweite Registrierung.
8. Im Studio den Projekt-**Git-Check** (`inspect`) ausführen. Nach grünem Lesecheck `prepare` für eine neue isolierte Aufgabenarbeitskopie durchführen. Ein Test-/Vorschauauftrag ist eine **weitere bewusste** Aktion. `allowCodex=false` und `publish=false` gelten für die neue Projektfreigabe; Codex benötigt später seine **separate** persönliche Anmeldung und Freigabe.

## Fehlersituationen

- **Keine GitHub-Rechte / Authentifizierung fehlt:** Auf dem Lenovo Git Credential Manager oder SSH konfigurieren; kein Passwort in den Plan. Fehlermeldungen übernehmen keine Git-Stderr-URLs oder Zugangsdaten.
- **Offline / Studio nicht erreichbar:** Projekt-/Gerätezuordnung vor dem Clone nicht bestätigt; der Zielordner wird nicht angelegt.
- **Ungültige Repository-URL:** Nur GitHub HTTPS oder `git@github.com:OWNER/REPO` ohne Benutzerinfo, Passwort, Fragmente, Query oder fremdes Protokoll.
- **Vorhandener/geschützter Zielpfad:** Abbruch ohne Änderungen; keine automatische Bereinigung.
- **Clone oder Checkout fehlgeschlagen:** Der neu angelegte Ordner bleibt zur manuellen Prüfung; das Runnerprofil und andere Projekte bleiben unverändert. Für einen erneuten Versuch einen anderen neuen Zielordner wählen.
- **Projekt vom falschen Account:** Der Server verweigert den Import, auch wenn ein Geräteprofil vorhanden ist.
- **Git-Identität fehlt:** `inspect` kann den Lesezugriff bestätigen, aber `ready=false` melden; die persönliche Git-Identität lokal setzen, nicht fremde Identitäten übernehmen.

## Security und technische Nachweise

- Besitzer-/Geräteprüfung auf dem Studio-Server: `/api/runner/project-setup-verify`. Ein über diesen Assistenten angelegtes Projekt darf **ausschliesslich mit einem Gerät seines anlegenden Kontos** importiert werden – selbst die globale Studio-Owner-Rolle ist keine Ausnahme. Die globale Owner-Rolle bleibt nur für historische Projekte ohne `project_starts`-Eigentümernachweis zugelassen.
- Lokal: strikte GitHub-URL-Zulassung, symlinkfreie Elternpfade, exklusiv neue Zielverzeichnisse, Schutz bestehender Runnerprofile/Arbeitskopien, `shell:false`, Git-Hooks/Fsmonitor beim Clone deaktiviert, keine automatische Submodul-Initialisierung.
- Git-Credentials bleiben im Betriebssystem/Git Credential Manager bzw. persönlichen SSH-Agenten. Studio speichert sie nicht.
- Bestehende Runner-`inspect`-, `prepare`-, `check`- und `review`-Pfadlogik wird **wiederverwendet**.
- Regression: `node --test selfhost/github-import.test.mjs selfhost/github-import.integration.test.mjs selfhost/project-start.test.mjs`.
- Vollprüfung: `npm run studio:verify`. Browser-UX-Abnahme separat, `npm run studio:verify` beweist allein keine reale Lenovo- oder Browser-Bedienung.

**Abnahmegrenze:** Ein isolierter Linux-Integrations-Clone ist nicht dasselbe wie Marcos echter Windows-Lenovo mit privatem Git Credential Manager. Der letzte Schritt bleibt eine gesonderte Owner-Abnahme nach Review/Deployment-Freigabe; hier keine Live-Änderung.

## Nachweise des R28-Implementierungs-Branches (25.10.2026)

Ausgangsstand: `feat/r27-design-and-activity-20261025`, SHA `07b785cc377b80e1fee349843d42f718d17d88ed`. Alle Befehle liefen im isolierten temporären Linux-Worktree, **nicht** im produktiven Studio-Dienst und **nicht** auf Marcos Lenovo.

- **Gezielte Regressionen:** `node --test selfhost/github-import*.test.mjs selfhost/project-start.test.mjs selfhost/workflow-terms.test.mjs` — **10/10 PASS**. Dabei wurden strikte GitHub-URLs, Credential-/URL-Injection, bestehende/geschützte/symlinkende Zielordner, Server-Owner-Grenzen, Offline-Studios, bestehendes Runnerprofil, echter lokaler Git-Clone, `inspect` und `prepare`, Wiederholung und fehlgeschlagener Branch mit erhaltenem Profil geprüft.
- **TypeScript:** `node node_modules/typescript/bin/tsc --noEmit --incremental false` — **PASS**.
- **Vite:** `node node_modules/vite/bin/vite.js build --config studio/vite.config.ts` — **PASS** (1847 Module).
- **Vollprüfung:** `npm run studio:verify` — **NICHT PASS**: 194 Tests, 190 PASS, 3 SKIP, 1 FAIL. Das isoliert reproduzierte `selfhost/review.test.mjs:49` scheitert beim Ereignistext `value.txt`. **Identischer Fehler auf unverändertem R27-Basiscommit separat bestätigt**. Der bestehende Review-Fehler wurde bewusst nicht im GitHub-Import-PR verändert oder als grün deklariert.
- **Reale Browser-Bedienung (isolierte Demo):** lokal gestarteter Studio-Server mit synthetischem Eigentümerkonto, Google Chrome via DevTools-Protokoll: Projekt geöffnet → `Code & KI` → `Lokale Arbeitskopie einrichten` → GitHub-URL und Windows-Zielordner eingegeben → absichtlich fehlende Freigabe zeigt erklärenden Fehler → Freigabe gesetzt → Planhilfe/Download sichtbar. **Desktop 1320×920 und mobile Emulation 390×844 PASS**, keine Fixture-Passwörter in der UI.
- **Screenshots (synthetisch, keine realen Konten):** [Import Desktop](evidence/issue45/browser-import-desktop.png), [Fehlende Freigabe](evidence/issue45/browser-import-validation.png), [Mobile Einrichtungsanleitung](evidence/issue45/browser-import-mobile.png).
- **Ausstehend:** echter Lenovo/Windows-/Git-Credential-Manager-Login und Privat-Repo-Clone sowie nachfolgende persönliche Codex-Anmeldung und ein eigener Git-Task. Ohne Owner-Lenovo-Abnahme nicht als bestanden melden. Keine unabhängige Teamabnahme durch Markus.
