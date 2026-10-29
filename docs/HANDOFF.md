## Einstieg fÃ¼r den nÃ¤chsten Agenten (Codex oder Claude Code), Stand 29.10.2026 abends

Live: Studio `9f1bf1fâ€¦`, Server-Worker `bff2951â€¦` (Isolation pro Auftrag). Claude und ChatGPT
sind als KI-Assistenten verbunden. Alle Commits liegen lokal auf
`local/studio-plugin-worker-prototype` (nicht gepusht). Live-Schalten nur nach
[OPERATIONS.md](OPERATIONS.md) und mit aktuellem Owner-GO. Nachweise des Tages:
[M1](evidence/M1_VPS_WORKER_PLACEMENT_20261029.md), [HÃ¤rtung](evidence/WORKER_HARDENING_20261029.md),
[Stufe 1](evidence/STAGE1_JOB_ISOLATION_20261029.md). Offene Richtung: Teamfreigabe des Workers
(Freigaben, Kontingente, eigene Git-ZugÃ¤nge), Full-Stack-Vorschau, GitHub-Zugang des Workers,
Onboarding Markus. Plan: [NETWORK_ROADMAP.md](NETWORK_ROADMAP.md).

## 29.10.2026: M1 â€“ VPS als Hauptrechner, offen fÃ¼r jede KI

Live auf studio.schmaqq.com (Quelle und RÃ¼ckweg im [Nachweis](evidence/M1_VPS_WORKER_PLACEMENT_20261029.md)):
- **Server-Worker** auf dem VPS, isoliert (eigener Nutzer, 3-GB-Volume, keine fremden
  Dienste/Daten, kein Loopback/private Netze, RAM/CPU/Prozess-Limits); Sandbox-Probe 22/22.
  Ein echter Ablauf PrÃ¼fen â†’ Arbeitskopie â†’ Test 1/1 â†’ Vorschau lief dort automatisch vermittelt.
- **Vermittlung v1:** Runner melden PC/Server und FÃ¤higkeiten; Projektregel automatisch /
  nur PC / nur Server; `device: "auto"`; Grund steht am Auftrag. Nur eigene GerÃ¤te.
- **Mehrere KIs:** dynamische Registrierung und Client-Metadatendokumente zusÃ¤tzlich zum
  ChatGPT-Client; Warnhinweis fÃ¼r selbst registrierte Clients; Trennen unter
  â€žVerbundene KI-Assistentenâ€œ. Anleitung: [AI_CLIENT_SETUP.md](AI_CLIENT_SETUP.md).
- Schema-Preflight von Production war seit der Plugin-Aktivierung BLOCKED; behoben.
PrÃ¼fung: 244 Tests, 223 PASS, 0 FAIL, 21 Plattform-Skips; Guard, TypeScript, Build PASS.
Offen: echte Kontoverbindungen ChatGPT/Claude/Gemini (Owner), Live-Sicht mit echtem Login,
Isolation pro Auftrag vor Teamfreigabe. Weg dahin: [NETWORK_ROADMAP.md](NETWORK_ROADMAP.md).
Kein Push, PR oder Merge.

## Lokaler Plugin-/Workerprototyp

Neue lokale Arbeit: [Umfang und Grenzen](STUDIO_PLUGIN_WORKER_PROTOTYPE.md).
MCP-Werkzeuge fuer revisionsgebundene Codeaenderungen, Tests und Vorschau nutzen
die bestehenden persoenlichen Studio-Operationen. Echte lokale HTTP-/Git-/Runner-
Kette mit zwei synthetischen Konten geprueft. Runner-Paketabhaengigkeit korrigiert.
Neu: persistentes SQLite-Mutationsledger mit Personen-/Grantbindung, Abbruch-
schutz und Wiederverwendung echter Job-IDs nach Adapterneustart. Der Produkthost
muss es noch verbindlich konfigurieren. [Autorisierungsvertrag](PLUGIN_AUTHORIZATION_CONTRACT.md).
29.10.: Persoenliche Plugin-Autorisierung implementiert: OAuth Authorization Code
mit S256-PKCE, registrierte Clients/Redirects, Resource-/Scope-Bindung
(`studio:read`, `studio:code`), gehashte Tokens, Widerruf, Discovery-Metadaten,
Zustimmungsseite ohne GET-Seiteneffekt und MCP-Endpunkt `/mcp` ueber den
offiziellen Streamable-HTTP-Transport. Ledger ist an Mitglied und Grant gebunden.
Nur aktiv, wenn `STUDIO_PLUGIN_CLIENTS` gesetzt ist; sonst unveraendertes Verhalten.
Lokale Gesamtpruefung: 231 Tests, 210 PASS, 0 FAIL, 21 Plattform-Skips; Source Guard,
TypeScript und Vite PASS. Browserdurchlauf Zustimmung -> Tokenaustausch PASS mit
synthetischem Konto. Kein ChatGPT-/VPS-/Installer-PASS.
Production am 29.10. nach Owner-GO auf diesen Stand umgeschaltet und Plugin-
Client `schmaqq-chatgpt` aktiviert: [Nachweis und Rueckweg](evidence/PLUGIN_OAUTH_DEPLOY_20261029.md).
Naechster Schritt: echte Verbindung im normalen ChatGPT-Chat herstellen und einen
Werkzeugaufruf pruefen; danach isolierter Serverworker.

## Vorherige Ãœbergabe

FÃ¼r VerÃ¶ffentlichung und Hermes zuerst [RELEASE_NEXT.md](RELEASE_NEXT.md) lesen.
Kombinierte lokale QuellprÃ¼fung: 211 Tests, 190 PASS, 0 FAIL, 21 Plattform-Skips;
Guard, TypeScript, Build PASS. Linux-/Betriebsabnahme separat offen.

## 28.10.2026: Projektkonfiguration Ã¼ber Studio

Bestehende Runner Ã¼bernehmen Projekteinstellungen live und dauerhaft Ã¼ber den
vorhandenen EigentÃ¼merauftrag. Automatische begrenzte Erkennung von Tests/Preview,
getrennte Freigaben, sicherer VerÃ¶ffentlichungsstandard, Updatehinweis fÃ¼r Ã¤ltere
Runner und unmittelbare Git-Diagnose ergÃ¤nzt. 6 gezielte Tests, TypeScript, Guard
und Build bestanden; echter Pilot erfolgreich per Browser eingerichtet.
Nachweis/Grenzen: [GefÃ¼hrte Einrichtung](evidence/GUIDED_RUNNER_SETUP_20261028.md).
Einmalige lokale Installation/Anmeldung bleibt erforderlich. Kein Push/Deployment.

## 28.10.2026: PersÃ¶nlicher GitHub-/Runner-Pilot tatsÃ¤chlich bedient

Echte GitHub-KontobestÃ¤tigung und ein persÃ¶nlicher Runner am lokalen aktuellen
Stand funktionieren. Privates Pilot-Repository lesend erreicht; zunÃ¤chst fehlende
Git-AutorenidentitÃ¤t nach Nutzerangabe nur im Pilotklon ergÃ¤nzt. Genau eine
gezielte Git-Wiederholung bestand; eigene Aufgaben-Arbeitskopie angelegt;
einmaliger Pilot-Testlauf Ã¼ber Studio: 2 PASS, 0 FAIL, 0 SKIP. Keine Quelldatei
im Pilot geÃ¤ndert. Keine allgemeine unverÃ¤nderte Suite erneut ausgefÃ¼hrt.

Kein vollstÃ¤ndiger Onboarding-PASS: fehlende konkrete Git-Diagnose vor dem
Arbeitskopiestart; Runner-Download erlaubt VerÃ¶ffentlichung standardmÃ¤ÃŸig ohne
eigene Auswahl; private Konfiguration ausdrÃ¼cklich gesperrt. Weitere WidersprÃ¼che
in Bereitschaft/AktionsknÃ¶pfen und technische EinrichtungsaufwÃ¤nde dokumentiert.
[Verlauf, UX-Befunde und Grenzen](evidence/PERSONAL_PILOT_20261028.md).
NÃ¤chster Schritt: diese konkreten EinstiegslÃ¼cken gezielt korrigieren. Echte
Vorschau, persÃ¶nliche KI, zwei Menschen/GerÃ¤te und GitHub-Schreibablauf bleiben
offen. Kein Push, Merge, Deployment oder neue Freigabe dafÃ¼r.

## 28.10.2026: Einstiegskorrekturen und Vorbereitung fÃ¼r morgen

Die drei von Terra benannten Einstiegsstellen sind lokal korrigiert. Der
Bereitschaftsknopf Ã¶ffnet eine fokussierte Ãœbersicht mit fehlenden Schritten;
Rechnerverbindung ist direkt erreichbar; gespeicherte Repository-Adresse wird
ausdrÃ¼cklich von bestÃ¤tigten Zugriffsrechten unterschieden. TypeScript, Build,
Source Guard und drei gezielte deterministische BrowserfÃ¤lle bestanden.
Kein erneuter Backend-/GesamtprÃ¼flauf. Terra-NachprÃ¼fung wegen Browseranbindung
nicht ausgefÃ¼hrt und ausdrÃ¼cklich offen; kein Terra-PASS daraus abgeleitet.

Morgen fortsetzen: [START_MORGEN.md](START_MORGEN.md).
[Genauer Nachweis und Grenzen](evidence/ONBOARDING_PREPARATION_20261028.md).
Alle Ã„nderungen liegen weiterhin lokal auf dem eigenen Folgebranch; kein Push,
Merge, Deployment oder Eingriff in persÃ¶nliche ZugÃ¤nge/Runner.

## 27.10.2026: Veraltete Codefreigaben direkt verstÃ¤ndlich fortsetzen

Lokaler Folgeauftrag zum Ã¼ber GitHub gelesenen Draft-PR #51: Nach spÃ¤teren
DateiÃ¤nderungen oder geÃ¤nderten Abschlussbedingungen sperrt die Aufgabenansicht
jetzt die ZusammenfÃ¼hrung. Die verantwortliche Person bekommt â€žNeue Fassung
zur PrÃ¼fung teilenâ€œ, der Kollege eine konkrete ErklÃ¤rung. EntwÃ¼rfe und laufende
Arbeit sperren das erneute Teilen; nach Erfolg wird der neue PrÃ¼fstand ausgewÃ¤hlt.
Serverregeln und Providerrechte sind unverÃ¤ndert.

TatsÃ¤chlich ausgefÃ¼hrt: lokale QuellprÃ¼fung 208 Tests, 187 PASS, 0 FAIL,
21 ausdrÃ¼ckliche Plattform-Skips; Source Guard, TypeScript und Vite PASS.
Echter Edge/Playwright-Lauf: 21 PrÃ¼fgruppen und 7 gezielte UI-RegressionsfÃ¤lle
PASS, 67 Screenshots, erneute unabhÃ¤ngige Freigabe und tatsÃ¤chliche lokale
Git-Integration bestÃ¤tigt. Keine unerwarteten HTTP-/JavaScript-Fehler.
Originale, Wiederholungsbefehl und Grenzen:
[Abnahmebericht](evidence/STALE_REVIEW_GUIDANCE.md).

Eigener lokaler Branch `fix/stale-review-guidance-20261027`; dieser Auftrag
verÃ¶ffentlicht nichts auf GitHub und erteilt keine Merge-/Deploymentfreigabe.
NÃ¤chster Schritt ist die PrÃ¼fung des lokalen Diffs und bei gesondertem Auftrag
die VerÃ¶ffentlichung des geprÃ¼ften Folgefixes.

## Team workflow candidate

The current local candidate uses one project workspace and one task flow. Read `docs/TEAM_WORKFLOW.md` for implemented contracts, personal setup, provider boundaries and acceptance scope. Existing R23/R24 operator and historical evidence below remains historical; this change does not authorize a deployment or migration. Final test and browser evidence is recorded in `docs/evidence/TEAM_WORKFLOW_ACCEPTANCE.md`.

# SCHMAQQ Studio â€” Fortsetzen ohne alten Chat

## 25.10.2026: Isolierte Reparatur des R27-Datei-Ereignisprotokolls (kein Rollout)

Ausgangs-R27: Der bestehende Review-Integrationstest scheitert am fehlenden Dateinamen in den privatisierten Ereignissen fÃ¼r `files`, `read-file` und `save-file`. Ursache: Im Runner fehlen die Erfolgsmeldungen, obwohl der Server Datei-Ereignisse bereits nur dem Job-EigentÃ¼mer ausliefert. Das ist unabhÃ¤ngig von R28 / Import-PR #46.

Separater Review-Fix: drei begrenzte `type:'files'`-Meldungen nach erfolgreichen Aktionen, ausschliesslich erlaubte Dateinamen, keine Inhalte oder geheimen Daten. Die Regression prÃ¼ft 401/403-Zugriff, keine Inhaltsweitergabe und keine Erfolgsereignisse bei gesperrten Dateien. **5/5 fokussierte Tests PASS; vollstÃ¤ndiges `studio:verify` PASS: 190 Tests, 187 PASS, 3 erwartete Skips, 0 FAIL; TypeScript/Vite/Guard PASS.** R27 und PR #46 bleiben unverÃ¤ndert, kein Merge/Deployment. [Repro und Details](R27_FILE_EVENTS_REVIEW_FIX.md).

NÃ¤chster Schritt: getrennten Fix-Draft und zusammen mit R28 einen kombinierten, lokalen Testkandidaten prÃ¼fen. Danach Lenovo-EigentÃ¼merabnahme, erst mit gesonderter Freigabe produktive Schritte.

## 25.10.2026: R27 â€“ Designkonvergenz und gemeinsamer Git-Diff (noch nicht live)

Die bestehende SCHMAQQ-Website ist das verbindliche Designvorbild.
Die R27-Quelle fixiert das Marketing-Commit 92aad747 und Ã¼bernimmt die
benutzten Farben, Schriften, AbstÃ¤nde und Linien statt weiterer freier
Workspace-Farben. In jedem Projektraum sind die Referenzen unter Wissen
sichtbar, die neuere V1-Markenrichtung bleibt als Entwurf gekennzeichnet.

Das bisher verborgene Git-Review zeigt jetzt **direkt in der Aufgabe**
einen vollstÃ¤ndigen, taskgebundenen Diff mit grÃ¼nen ErgÃ¤nzungen, roten
LÃ¶schungen, Commit und Warnung vor mÃ¶glicher Veraltung. Andere Personen
mit eigener Studiositzung kÃ¶nnen denselben *abgeschlossenen PrÃ¼fstand*
sehen; ungespeicherte Editor-EntwÃ¼rfe und private Runnerinhalte werden
niemals dazu synchronisiert. Laufende Aufgaben zeigen die letzte
bestÃ¤tigte Aktion (nur Typ/Status/Zeit) bei bestehendem 5-Sekunden-Poll.

Source-PrÃ¼fung: 190 Tests / 187 PASS / 0 FAIL / 3 erwartete Skips;
Source Guard, TypeScript und Vite PASS. Chrome: 8/8 isolierte checks
mit zwei synthetischen Konten, 390px-Handy, normalem Desktop, keinem
SeitenÃ¼berlauf und keinen ungefangenen Browser-Fehlern. Das Diff stammt
fÃ¼r den Browsernachweis aus ausdrÃ¼cklich **synthetischen Fixture-Daten**.

**Kein** Live-Editing desselben Dokuments, keine WebSockets oder
CursorÃ¼bertragung, keine persÃ¶nlichen GerÃ¤te/Accounts geprÃ¼ft. R26
bleibt produktiv. H3-Historiengrenze bleibt offen.

[Design-/Diff-Plan](R27_DESIGN_AND_TEAM_DIFF.md) Â·
[Browserbelege](evidence/R27_DESIGN_DIFF_ACCEPTANCE_20261025.md)


## 25.10.2026: R26 â€“ Markus direkt in einer Aufgabe einladen

Die zuerst gebaute R26-Aufgabenansicht musste fÃ¼r den tatsÃ¤chlichen
Single-Owner-Produktionszustand einen weiteren Navigationsbruch vermeiden.
Owner kann jetzt direkt unter â€žMit dem Teamâ€œ eine **persÃ¶nliche Einladung**
erzeugen, ohne den Aufgabenbereich zu verlassen. Single-use-Link mit
48 Stunden Laufzeit; kein SMTP-Versand, keine Konto-/Runner-Ãœbernahme.

Echter isolierter Chrome-Lauf: ein synthetischer Owner startet ohne
zweites Konto, erstellt den Link, ein zweites eigenes Konto registriert
sich, Wiederverwendung des Links wird abgewiesen, der Owner Ã¼bergibt
dieselbe Aufgabe und bekommt eine Antwort zurÃ¼ck. **7/7 PASS.**
PersÃ¶nliche Registrierung von Markus und der lokale Git-Runner sind noch
nicht ausgefÃ¼hrt. R25-Produktion bleibt unverÃ¤ndert.

[Onboarding-Runbook](R26_REAL_TEAM_ONBOARDING.md).


## 25.10.2026: R26 â€“ ein einziger Aufgabenablauf (Review-Kandidat)

Die tatsÃ¤chliche Handy-Bedienung von R25 war trotz erfolgreicher Integration
zu technisch und tablastig. R26 entfernt die vier Pflicht-Reiter aus der Aufgabe
und verbindet Auftrag, tatsÃ¤chlichen Arbeitsstatus, Ãœbergabe an Teammitglied,
optionale persÃ¶nliche Git-/KI-AusfÃ¼hrung, Ergebnis und GesprÃ¤ch auf einer
scrollbaren Seite. Direkt im Raum werden die nÃ¤chsten Aufgaben gezeigt.

Neue API-Aktionen `handoff` (atomare erwartete ZustÃ¤ndigkeit, kein vorgetÃ¤uschter
Job) und `brief` (revisionierte Ã„nderung in bestehender workspace_meta).
Task-Kommentare, Git-Berechtigungen, persÃ¶nliche Modellfreigaben und bisherige
R25-Daten bleiben erhalten. Kein Datenbankschema-Migrationsschritt.

Source-Gesamtcheck: 190 Tests, 187 PASS, 0 FAIL, 3 erwartete Linux-Skips.
Chrome-Browser mit zwei synthetischen Konten, echtem isoliertem Git-Runner und
390px-Handy: 13/13 PASS; keine Browser-Ausnahmen. Ein zuvor beobachteter
doppelter Editor wurde korrigiert und anschliessend neu geprÃ¼ft. Kein reales
Markus-GerÃ¤t, kein echtes privates KI-Abo und keine automatisierte GitHub-
Einrichtung wurden behauptet oder angetastet.

R25 bleibt bis zum gesondert freigegebenen Deployment produktiv; der
R26-Branch ist ein Ã¼berprÃ¼fbarer Kandidat und **noch nicht live**.

[Detaillierter Scope](R26_TASK_FLOW.md) Â·
[Browser-Abnahme](evidence/R26_TASK_FLOW_ACCEPTANCE_20261025.md).


## 25.10.2026: R25 Workspace Rooms â€“ zusammenhÃ¤ngender Arbeitsweg

Eigener Engineering-Branch `feat/workspace-rooms-r25-20261025`, auf der
PR38-Linie statt ungeprÃ¼ftem main. Neue normale OberflÃ¤che ist der Projektraum:
RaumgesprÃ¤ch, Aufgaben, Ergebnisse, Wissen und Code/KI gehÃ¶ren zusammen.
Projektanlage am Handy verlangt keinen Rechnerpfad. Nachrichten lassen sich
mit Herkunft in Aufgaben und Entscheidungen Ã¼berfÃ¼hren. Zwei Benutzer kÃ¶nnen
an derselben Aufgabe diskutieren; Code-Arbeitskopien und PrÃ¼frechte bleiben
personengetrennt. Kontext fÃ¼r Codex wird sichtbar und optional mitgegeben.

Lokale Textmodelle verwenden bestehende persÃ¶nliche Freigaben des Rechner-
besitzers. Eine Antwort ist zuerst privat fÃ¼r Auftraggeber und GerÃ¤tebesitzer;
der Auftraggeber teilt sie ausdrÃ¼cklich im Raum. ChatGPT/GitHub-Verweise
werden nicht als automatisch synchronisierte Chats oder geklonte Repos ausgegeben.

Source-Gesamtcheck: 188 Tests, 185 PASS, 0 FAIL, 3 erwartete Skips; TypeScript,
Vite, Source Guard PASS. Source-Chromium-Pilot: 22 Punkte, echte isolierte
Git-Arbeitskopie/Runner/Datei/Tests/Vorschau und ZweitprÃ¼fung. Modelloutput im
Pilot ist synthetisch; persÃ¶nliche Accounts/Hardware bleiben ungeprÃ¼ft.
Der abschliessende PrÃ¼flauf am unverÃ¤nderten Release wird im privaten
Handoff und PR dokumentiert. Kein Merge, Deployment oder Production-Mutation.

[Produkt und Abzweigungen](WORKSPACE_ROOMS.md) Â·
[Abnahme](evidence/WORKSPACE_R25_ACCEPTANCE_20261025.md) Â·
[BetreiberÃ¼bergabe](HERMES_R25_ROOMS_HANDOFF.md).


## 25.10.2026: Zod-LÃ¼cke im Recovery-Kandidaten gezielt adressiert

Zod 3.25.76 durch 4.6.7 ersetzt, record-Schnittstelle migriert und
Runner-Preview-Dateizahl vor Zod geprÃ¼ft. Studio-Gesamtsuite, gezielte
Runner-HTTP-Regressionen und unabhÃ¤ngiger Audit bestÃ¤tigen: der frÃ¼here
Zod-HIGH-Befund entfÃ¤llt. FÃ¼nf Warnungen fÃ¼r nicht im separaten Studio-Runtime-
Paket enthaltene Monorepo-AbhÃ¤ngigkeiten bleiben bestehen. Keine Production-
Ã„nderung. SMTP-Betreiberkonfiguration und echte Mail-/Browser-End-to-End-
Freigabe sind weiterhin offen. Siehe PASSWORD_RECOVERY_SECURITY.md.

## 25.10.2026: Sicherheitsfunktion â€žPasswort vergessenâ€œ â€“ isolierter Kandidat

Auf eigenem Review-Branch auf der unverÃ¤nderten produktiven R24-Quelle: Einmalige
15-Minuten-Links Ã¼ber ausschliesslich TLS-geschÃ¼tzten, operator-konfigurierten
SMTP-Versand. SHA256 statt Roh-Token in der vorhandenen workspace_meta-Tabelle,
kein neues Schema, neutrale Anfrageantworten, Rate-Limits und atomarer Widerruf
aller Studio-Sitzungen/GerÃ¤tetokens beim Passwortwechsel. Anmeldung, Bearbeitung
und vorhandene Konten bleiben bis zu einer separaten Deploymentfreigabe unverÃ¤ndert.

Die Betreiber-Konfiguration fÃ¼r die SCHMAQQ-Absenderdomain und ein echter
Postfachempfang stehen noch aus. Test- und Sicherheitsumfang sowie Grenzen:
[Passwort-Wiederherstellung](PASSWORD_RECOVERY_SECURITY.md).


## 24.10.2026: Navigation, Vorschau und verstÃ¤ndliche RÃ¼ckwege

Der vorherige persÃ¶nliche Test war fÃ¼r den Owner nicht selbstÃ¤ndig bedienbar.
Mit aktuellem Owner-Auftrag wurde deshalb die Struktur auf fÃ¼nf Haupteinstiege
plus â€žSo funktioniert Studioâ€œ ausgerichtet. Team-GesprÃ¤ch/Wissen liegen bei Team,
Einrichtung/Verbindungen/technische Werkzeuge unter einem gemeinsamen Einstieg.
Bestehende Direktlinks bleiben gÃ¼ltig. Einladungen liegen jetzt bei Team und
nutzen unverÃ¤ndert die geschÃ¼tzte EigentÃ¼mer-Schnittstelle.

Aufgaben haben einen erklÃ¤rten Startknopf, sichtbares Ziel und eigene Reiter fÃ¼r
Bearbeitung, Vorschau, Ergebnis & PrÃ¼fung, GesprÃ¤ch und Verlauf. Aktionen nennen
vorher ihre Wirkung. Vorherige Dateifassung kann nach einem erfolgreichen Save
zuerst als Entwurf geladen werden; erst ein erneuter Save schreibt, mit dem
bestehenden Revisions-/Konfliktschutz. Anleitung benennt die Grenzen ausdrÃ¼cklich.

Selbst ausgefÃ¼hrt: lokaler Gesamtcheck 151 PASS, 0 FAIL, 21 Linux-Skips;
Source Guard/TypeScript/Build PASS. Nach letzter reiner Vorschau-Textkorrektur
8 gezielte Tests und TypeScript/Build erneut PASS. Eigene interaktive Browser-
prÃ¼fung auf 1280x900 und 390x844: echter Start, Save, Entwurferhalt Ã¼ber Hilfe,
DateirÃ¼ckweg, Diff, Tests, gebaute Vorschau und lokaler PrÃ¼fstand. Neue Konten,
Einladungen, KI-AusfÃ¼hrung, Peer-Freigabe und Git-Ãœbertragung nicht ausgefÃ¼hrt.
[Arbeitsauftrag, Abnahme und Grenzen](evidence/UX_NAVIGATION_20261024.md).

Lokaler Branch: `local/studio-navigation-20261024`. Kein Push/Deployment.
NÃ¤chster Schritt ist die erneute selbstÃ¤ndige Bedienabnahme durch den Owner.
Technische Erstverbindung, vollstÃ¤ndige Projektwiederherstellung und automatische
Ãœbergabe des Aufgaben-/GesprÃ¤chskontexts an Codex sind damit noch nicht gelÃ¶st.
Der vorhandene isolierte Probelauf auf 127.0.0.1:4394/4395 bleibt fÃ¼r die Auswertung
erreichbar, mit bestehendem privaten Profil (KI und Git-VerÃ¶ffentlichung gesperrt).




## 23.10.2026: Aufgabenorientierung E1â€“E8 lokal umgesetzt und geprÃ¼ft

Der freie Rundgang wurde mit Owner-GO umgesetzt: Aufgabenmodus strikt an passende
Kopien gebunden, historische PrÃ¼fstÃ¤nde mit deutlicher AktualitÃ¤tswarnung,
Speichern vor PrÃ¼fen auch in der Kopfzeile, stabile Reiter-/DialogrÃ¼ckwege,
einheitlicher Einstieg Ã¼ber Aufgabentitel aus Ãœbersicht, Board und Teamkarte.
Einrichtung fÃ¼hrt zu Aufgaben; projektweite Funktionen bleiben unter â€žWeitere
Werkzeugeâ€œ. Ziel, Metadaten und Hilfen aufklappbar, nur eine Speicherleiste.

Selbst ausgefÃ¼hrt: finaler lokaler Gesamtcheck 147 PASS, 0 FAIL, 21 Linux-Skips;
Source Guard/TypeScript/Build PASS. ZusÃ¤tzlich interaktiver eigener Browserlauf
auf 1280x900 und 390x844 mit bestehenden TestidentitÃ¤ten: echter Dateisave,
Testlauf, gebaute Vorschau und lokaler PrÃ¼fstand; Entwurf und Reiter erhalten,
Warnung vor historischer Freigabe auch nach neuerem PrÃ¼fstand korrekt. Editor
im gemessenen Bearbeitungszustand ab ca. 689 statt 1239 px. Details, TestanlÃ¤ufe,
Grenzen und Abnahme: [Aufgabenorientierung](evidence/UX_ORIENTATION_20261023.md).
Der frÃ¼here Audit unten bleibt als Befund vor diesen Korrekturen erhalten.

NÃ¤chster Schritt: Owner fÃ¼hrt eine kleine Aufgabe ohne Klickanweisungen aus und
nimmt sie spÃ¤ter wieder auf. E9 Einladungsverwaltung und E10 Anmeldung bleiben
separat; Ersteinrichtung/Kopienanlage weiterhin technisch. Keine unabhÃ¤ngige
menschliche Bedienfreigabe, keine Linux-/Betriebsfreigabe. Kein Push/Deployment.

## 23.10.2026: freier UX-Rundgang â€“ Bedienabnahme weiterhin offen

Nach dem technischen P1-Abschluss wurde die OberflÃ¤che persÃ¶nlich Ã¼ber die
interaktive Browsersteuerung erkundet (kein vorgegebenes Ablaufskript).
Dabei wurden Aufgaben-/Kopien-Kontextfehler, fehlende AktualitÃ¤tswarnung im
historischen PrÃ¼fstand und weitere OrientierungsbrÃ¼che beobachtet. PrioritÃ¤ten,
Reproduktion und Screenshotverweise: [Freier UX-Rundgang](evidence/UX_EXPLORATORY_REVIEW_20261023.md).
Kein Produktcode geÃ¤ndert. NÃ¤chster Schritt zuerst Aufgabenbindung und historische
PrÃ¼fstandsdarstellung; die technische P1-Abnahme ist keine vollstÃ¤ndige UX-Freigabe.

## 23.10.2026: vier P1-Korrekturen nach dem UX-Umbau abgeschlossen

Auf `local/studio-a0-terms-20261023` wurden die zwei Ã¼bernommenen uncommitteten
Korrekturen vervollstÃ¤ndigt und zwei fehlende Wege ergÃ¤nzt: PrÃ¼fstand zÃ¤hlt als
tatsÃ¤chlicher revisionsgebundener Testlauf; Kopfzeile und Ergebnis kennen dieselbe
VorschaufÃ¤higkeit; angeforderte Ã„nderungen erscheinen direkt bei der Aufgabe mit
Link zum exakten PrÃ¼fstand; wartende aktuelle FremdprÃ¼fstÃ¤nde stehen auf der
Startseite. Bestehende Berechtigungen und getrennte VerÃ¶ffentlichungsaktionen
bleiben erhalten. Kein Push, Merge, Deployment oder Eingriff am VPS.

Selbst ausgefÃ¼hrt: lokaler Gesamtcheck 143 PASS, 0 FAIL, 21 Linux-Skips,
Source Guard/TypeScript/Build PASS. Sichtbarer Zwei-Rollen-Edge-Test mit echten
lokalen Jobs bei 1280/390px PASS, nach Diagnose einer alten Reservierung in der
isolierten Testkopie. Eigene Prozesse beendet, ursprÃ¼ngliche Testdaten per Hash
unverÃ¤ndert. Nachweis und Grenzen: [UX-P1-Abschluss](evidence/UX_P1_COMPLETION_20261023.md).
Historische Statusfelder weiter unten sind keine neu ausgefÃ¼hrten Tests.

Damals vorgesehener nÃ¤chster Schritt: Owner wiederholt eine kleine Aufgabe ohne
Klickanweisungen. Nach dem oben dokumentierten freien Rundgang zuerst dessen
P1-Fundstellen beheben; der menschliche Wiederholungstest bleibt danach offen.
Die technische Abnahme ersetzt diese noch offene Bedienabnahme nicht.

## Aktuell: Produktkandidat fÃ¼r GitHub und neuen Chat

Die ProduktÃ¤nderungen liegen zusÃ¤tzlich in `../schmaqq-studio-use-candidate`
auf `local/studio-use-candidate-20261022`. Originalarbeitsverzeichnis und Index
wurden erhalten. Das Paket enthÃ¤lt ProduktoberflÃ¤che, Windows-PortabilitÃ¤t,
feste Tests und zugehÃ¶rige Dokumentation; keine neuen Qwen-/Modell-/Browserhelfer.
Eine `node_modules`-Junction verwendet die bereits vorhandenen AbhÃ¤ngigkeiten.

TatsÃ¤chlich neu geprÃ¼ft: lokale GesamtprÃ¼fung 100 PASS, 0 FAIL, 21 ausdrÃ¼cklich
als Linux-spezifisch ausgelassene Tests, Source Guard, TypeScript und Build PASS.
Sichtbarer frischer Edge-Lauf mit synthetischen Daten: 7 Schritte PASS, Desktop
und 390px Mobilbreite, keine Browserfehler, eigene Prozesse beendet. Der erste
Browserversuch lief vor Fertigstellung des Builds und schlug deshalb fehl;
Sandbox-Prozessbereinigung war gesperrt. Der eigene Prozess wurde gezielt
beendet. Die GesamtprÃ¼fung wurde nach Diagnose des blockierten Prozess-Tests
mit lokalen Prozessrechten wiederholt; Git-Ausnahme galt nur im Testprozess.
Globale Git-Konfiguration wurde nicht geÃ¤ndert.

Vergleich mit dem tatsÃ¤chlich durchgespielten Zwei-Host-Snapshot: 44/44
Laufzeitmodule und 8/8 gebaute OberflÃ¤chendateien bytegleich. Das ersetzt keinen
Linux-Release-/Recovery-Nachweis fÃ¼r ein neu gebautes Archiv. Der Owner hat
die GitHub-Sicherung des eigenen Kandidatenbranches ausdrÃ¼cklich beauftragt.
Die Commit-Metadaten werden Ã¼ber das angemeldete GitHub-Konto gesetzt.
Einstieg: [START_HERE.md](../START_HERE.md); portable Testzusammenfassung:
[evidence/USE_CANDIDATE_20261022.json](evidence/USE_CANDIDATE_20261022.json).
Der Branch ist kein Live-Release; kein Merge oder Dienstwechsel daraus.

Der konkrete Weg zum Alltag steht in [GETTING_TO_DAILY_USE.md](GETTING_TO_DAILY_USE.md).
NÃ¤chste Schritte: Kandidaten festhalten, persÃ¶nliche Projekt-/Runner-Einrichtung,
eine echte Aufgabe mit Tests, Vorschau und Wiederaufnahme vollstÃ¤ndig erledigen.
GitHub-Vollintegration und dauerhafte zentrale PrÃ¼fung bleiben eigene Pakete.
Lokale Originalnachweise: `.studio/use-candidate-20261022/` im ursprÃ¼nglichen
Repository. Die externe Arbeitsbasis ist hier nicht beschreibbar; diese Notiz
ist ein Vorschlag zur spÃ¤teren geprÃ¼ften Ãœbernahme, keine automatische Ablage.

## Aktuell: Zwei-Host-Pilot technisch bestanden

Nach ausdrÃ¼cklicher Freigabe des dokumentierten Payloads/Ziels wurde der aktuelle
diagnostische Snapshot auf dem VPS verifiziert und isoliert getestet. Sichtbarer
Edge mit zwei Testkonten; tatsÃ¤chliche Runner auf Windows-Laptop und Linux-VPS.
AufgabenÃ¼bernahme, RÃ¼ckfragen, eigene verknÃ¼pfte Kopien, Edit/Save, gleichzeitig
laufende echte Checks, gebaute Vorschauen und gegenseitige Commitfreigaben PASS.
Ãœberschneidung, fremder GerÃ¤teauftrag und Selbstfreigabe abgewiesen. Neuer Commit
verlangt neue Freigabe. Offline-/Reconnect-Test erhÃ¤lt GerÃ¤t, Kopie und Datei.

Der Lauf wurde nach Korrekturen am Testablauf fortgesetzt; kein fehlerfreier
Einzellauf behauptet. Zwei anfÃ¤nglich unverknÃ¼pfte Fixture-Kopien sind archiviert
erhalten, die zwei aktiven Kopien nachweislich mit den Aufgaben verknÃ¼pft. Details
und Originalbelege in [TWO_HOST_PILOT_PLAN.md](TWO_HOST_PILOT_PLAN.md).

Alle eigenen Testprozesse und Tunnel beendet, lokale und entfernte Testports
geschlossen, temporÃ¤rer SSH-Zugang und lokale SchlÃ¼ssel entfernt. Production
unverÃ¤ndert auf R23, active/running, NRestarts=0. Keine Modelljobs, kein Push,
Merge oder Production-Deployment. Markus/macOS ist fÃ¼r diesen technischen
Nachweis kein Blocker. Offen bleiben persÃ¶nliche Alltagsabnahme und die separate
Konsolidierung/Freigabe eines tatsÃ¤chlichen Nutzungskandidaten aus dem Dirty-Stand.

## Aktuell: Hilfe bei fehlender Git-AutorenidentitÃ¤t

Ein abgeschlossener Git-Check mit fehlender lokaler IdentitÃ¤t zeigt jetzt eine
konkrete Anleitung mit kopierbaren `git -C ... config --local`-Befehlen. Pfad,
Name und E-Mail bleiben bewusst vom Nutzer einzutragen; der Unterordner
`repository` beim lokalen Startprojekt wird erklÃ¤rt. Erneute PrÃ¼fung bleibt an
Projekt/PC des angezeigten eigenen Auftrags gebunden; offline oder bei laufendem
Auftrag ist der Knopf gesperrt. Kein automatischer Konfigurationsschreibzugriff.

Lokale GesamtprÃ¼fung: 121 Backendtests, 100 PASS, 0 FAIL, 21 explizite Plattform-
Skips; Source Guard, TypeScript und Build PASS. Sichtbarer isolierter Edge-Test:
fehlende IdentitÃ¤t, Kopieren, tatsÃ¤chliche lokale BefehlsausfÃ¼hrung, erfolgreicher
erneuter Check, ausgeblendete Hilfe und aktualisierte Bereitschaft PASS. Desktop
1440 und Mobil 390 geprÃ¼ft. Windows-CRLF im Clipboard-Test berÃ¼cksichtigt.
Keine persÃ¶nlichen Runner oder globalen Git-Einstellungen geÃ¤ndert. Belege im
[Abnahmebericht](evidence/LOCAL_PROJECT_START_20261022.md#git-autorenhilfe).

## Aktuell: lokaler Projektstart verstÃ¤ndlicher fortsetzen

Die gefÃ¼hrte Einrichtung erklÃ¤rt nach dem Plan-Download jetzt die drei lokalen
Schritte, benennt Quellordner und vorhandenes Runnerprofil, bietet KopierknÃ¶pfe
fÃ¼r Einrichtungs- und Neustartbefehl und verweist erst danach auf Bereitschaft und
Git-Lesecheck. Gezielt zuvor geprÃ¼ft: Projektstart-API 2/2, TypeScript und Build PASS.
Am 22.10.2026 anschlieÃŸend vollstÃ¤ndig mit neuen isolierten Testdaten geprÃ¼ft:
Browser-Projektstart und echter Plan-Download, Helfer-CLI, Profilsicherung,
Runnerneustart mit demselben GerÃ¤tezugang, Arbeitskopie, Edit/Save, echter Test
(1 PASS, 0 FAIL) und gebaute Vorschau derselben Dateirevision. Sichtbarer Edge,
1440/390px; eigene Prozesse beendet. Der Ablauf wurde nach Test-/Umgebungsfehlern
fortgesetzt, kein fehlerfreier Einzellauf. Fehlende Git-IdentitÃ¤t wird korrekt als
nicht bereit angezeigt; nur das neue Testrepository erhielt lokale Autorenangaben.
PersÃ¶nliche Runner und Production unverÃ¤ndert. Belege und Grenzen:
[Lokaler Projektstart](evidence/LOCAL_PROJECT_START_20261022.md).

## Aktuell: automatischer Testauftrag mit direkter Abschlussmeldung

`scripts/local_browser_standalone.py --enable-ai --job` als direkten Prozess
ausfÃ¼hren und dessen Ende abwarten. Eine kompakte JSON-Werkzeugantwort und
`completion.json` liefern Erfolg/Fehler/Schrittgrenze/Zeitgrenze/Abbruch mit
entsprechendem Exitcode. Automatisches Fenster schlieÃŸt; manueller --keep-open-
Modus bleibt getrennt. Kein neuer MCP-Dienst. 27 gezielte PrÃ¼fungen bestanden.
ZusÃ¤tzlicher Befund der sichtbaren Wiederholung: Git-Besitzerabweichung zwischen
Sandbox-/Benutzerkonto blockierte die alte synthetische Arbeitskopie. Nur die
ignorierte isolierte Fixture erhÃ¤lt prozessbezogene Freigaben fÃ¼r ihre zwei
Testkopien; globale Einstellungen unverÃ¤ndert. Sichtbare Editorfehler werden
jetzt unmittelbar gemeldet (APPLICATION_ERROR), statt Qwen weiter warten zu lassen.
Beobachtete Navigationsschleife durch phasenabhÃ¤ngige Klickgrenzen verhindert;
keine Behauptung allgemeiner Qwen-ZuverlÃ¤ssigkeit. Anleitung:
[Lokaler Browserhelfer](LOCAL_BROWSER_HELPER.md).

## Aktuell: eigenstÃ¤ndiges lokales Qwen-Browserfenster

Begrenzte Messung ergÃ¤nzt: drei echte Wiederholungen PASS in 21â€“27 Sekunden,
5/6/5 lokale Modellaufrufe, GPU-Spitzen 99/100/100 Prozent (71 Messpunkte).
Starter `../Qwen-Browsertest-Messen.cmd`, Bericht und Roh-CSV unter
`.studio/local-intelligence/browser-measurements/20261022T142042432815Z-800f9cbf/`.
Ein redundantes Dateiladen bleibt sichtbar; keine allgemeine Browserkompetenz
oder gemessene Abo-Prozentersparnis daraus ableiten.

`../Qwen-Browsertest.cmd` verwendet `scripts/local_browser_standalone.py` mit
vorhandener Playwright-/Edge-Installation und lokalem Qwen. Keine CUA-/Codex-
Sitzung im Testprogramm nÃ¶tig. Begrenzter lesender Fall auf synthetischer Demo
Port 4360, eigenes flÃ¼chtiges Browserprofil. Berichte liegen im ausgegebenen
`.studio/local-intelligence/browser/<Lauf>/report.md`. Kein allgemeiner
Browseragent und keine gemessene Prozentersparnis. Siehe den neuen Einstieg in
[Lokaler Browserhelfer](LOCAL_BROWSER_HELPER.md).

## Aktuell: begrenzter lokaler Qwen-Browserhelfer

Qwen hat in einer aktiven CUA-Sitzung fÃ¼nf echte Navigationsentscheidungen bis
zum sichtbaren Datei-Editor selbst gewÃ¤hlt; Route und Ergebnis unabhÃ¤ngig geprÃ¼ft.
DateibrÃ¼cke und Executor sind in `scripts/local_browser_worker.py` und
`scripts/local_browser_bridge.mjs`. Nur synthetische Demo auf Port 4360, lesender
fester Fall, kein eigenstÃ¤ndiger Browserdienst. Screenshots als Beleg, separate
lokale Bildbeschreibung; keine allgemeine visuelle Steuerung oder Limitersparnis
behaupten. Anleitung und Grenzen: [Lokaler Browserhelfer](LOCAL_BROWSER_HELPER.md).

## Aktuell: erster echter Entwicklungsdurchlauf mit Qwen-Vorauswertung

Lokale HÃ¼rde im Ablauf Aufgabe â†’ eigene Kopie â†’ Ã„nderung prÃ¼fen behoben:
Ansichtswechsel beginnen oben; â€žDateien bearbeitenâ€œ fÃ¼hrt vom Arbeitsbereich
direkt zum Editor und fokussiert den vorhandenen Ladebutton. Auch â€žWeiterarbeitenâ€œ
an einer eigenen Kopie springt zum Editor. DateiauftrÃ¤ge bleiben ausdrÃ¼cklich.
Keine Backend-/BerechtigungsÃ¤nderung und keine automatische VerÃ¶ffentlichung.

Mit einer neu angelegten isolierten Demo sichtbar durchlaufen: Aufgabe wÃ¤hlen,
eigene Kopie, Datei laden/Ã¶ffnen, Entwurf beim Bereichswechsel erhalten, speichern,
echte Beispieltests und gebaute Vorschau. Desktop 1280 und Mobil 390 geprÃ¼ft,
kein horizontaler Ãœberlauf. Qwen-Bildaussagen wurden gegen UI und Source geprÃ¼ft;
die falsche Deutung des Suchfilters als Pflichtpfad wurde verworfen.
Abnahme und Grenzen: [Lokaler Workflow-Einstieg](evidence/LOCAL_WORKFLOW_ENTRY_20261022.md).
NÃ¤chster Entwicklungsschritt: verbleibende S2-Bereitschaft und S3-PR-Ãœbergang anhand
des vorhandenen Plans konkretisieren; kein Provider-/Serverauftrag daraus ableiten.

## Aktuell: Qwen3.5 als lokaler Standard

Am 22.10.2026 ausdrÃ¼cklich freigegebene Modelltests: Qwen3.5 9B Q4_K_M mit
Ollama v0.30.0 funktioniert fÃ¼r begrenzte Text-, Code- und Bildaufgaben. Standard
in `config/local-intelligence.json`; Lifecycle und alter Checkhelfer lesen dieselbe
Auswahl. HÃ¶chstens ein geladenes Modell, keine automatische Inferenz oder Autostart.
`Start-Lokale-KI.cmd` wÃ¤hlt die neue separate Laufzeit; Alternativen bleiben Dateien.

Der Windows-Absturz war in der systemweiten C++-Bibliothek `msvcp140.dll` verortet.
Lokale, zum selben offiziellen Archiv gehÃ¶rende MSVC-DLLs neben `llama-server.exe`
beheben den reproduzierten Startfehler. Keine Systembibliothek geÃ¤ndert. Installer
und Hashnachweise bilden die lokale ErgÃ¤nzung ab; eigene Controller-Kinder Ã¶ffnen
bei nativen AbstÃ¼rzen keine Fehlerdialoge mehr, melden aber weiterhin Fehler.
v0.17.5 passt nicht zum aktuellen getrennten Qwen3.5-Modell/Projektor-Format.

42 gezielte Regressionen PASS. Drei echte synthetische ModellfÃ¤lle PASS,
einschlieÃŸlich Bildtext/Statusfarben und leerem Array; zusÃ¤tzlich echter Ã¼bergebener
Absturz-Screenshot Ã¼ber `image --enable-ai` ausgelesen. Antworten bleiben UNREVIEWED:
der kleine Codefall zeigt teils unprÃ¤zise ErlÃ¤uterungen trotz korrekter Kernkorrektur.
Kein umfassender Vergleich, keine Aussage Ã¼ber fehlerfreie CodequalitÃ¤t.
Nachweise und Bedienung: [Local Intelligence](LOCAL_INTELLIGENCE.md).
Abschlussbeleg im Ã¼bergeordneten Arbeitsbereich:
`local-evidence/2026-10-22_Qwen35-Einrichtung.json`.

## Vorbereitungsstand vor der Modellfreigabe (historisch)

Neuer opt-in Ablauf mit `Studio-Bereitschaft.cmd`, `Studio-Kontext.cmd`,
`Studio-Workflow.cmd` und `Studio-Fehler-Auswerten.cmd`. Echte PrÃ¼fungen bleiben
im vorhandenen Helfer; ergÃ¤nzende Hypothesen verÃ¤ndern dessen Exitcode nicht.
KI standardmÃ¤ssig deaktiviert. Vergleichsmodelle und separate Runtime werden nur
durch den ausdrÃ¼cklich gestarteten Dateidownload eingerichtet. Keine heutigen
Modell-/GPU-/Studio-TestlÃ¤ufe daraus ableiten. Anleitung und manuelle Abnahme:
[Local Intelligence](LOCAL_INTELLIGENCE.md).

Am 22.10.2026 wurde der neue Ablauf ohne LLM geprÃ¼ft: 11 eigene und 21 bestehende
Helfer-Regressionen PASS; echte Python-Unterprozesse mit synthetischem Erfolg und
absichtlichem Fehler behielten Exitcodes 0/1 bis zum Zusatzbericht. Kontextpaket
und Originalquellenvalidierung PASS. Dabei wurden zwei Logmaskierungsfehler
behoben: vollstÃ¤ndig maskierte zitierte/JSON-Credentials und erhaltene Logzeilen
bei mehrzeiligen SchlÃ¼sselblÃ¶cken. Wiederholen ohne Modelle:
`../.local-tools/python/python.exe -B scripts/verify_local_intelligence.py`.
Dies ist keine Studio-Produkt-, Build-, GPU- oder ModellqualitÃ¤tsabnahme.

Danach am 22.10.2026 echter Windows-Studio-PrÃ¼flauf ohne LLM: Source Guard PASS,
121 Backendtests (100 PASS, 0 FAIL, 21 begrÃ¼ndete Skips), TypeScript und Build PASS,
originaler Exitcode 0, erfasster Quellstand wÃ¤hrend des Laufs unverÃ¤ndert.
Die Sandbox behinderte den Prozessabbruchtest; auÃŸerhalb der Sandbox bestanden
zuerst dessen 3 PrÃ¼fungen und anschlieÃŸend der volle lokale Ablauf. Der neue
synthetische PEM-Test wird zur Laufzeit zusammengesetzt, damit der Secret-Scanner
keinen SchlÃ¼sselkopf im Quelltext sieht; Schutzregeln unverÃ¤ndert. Nach dem Lauf
unterstÃ¼tzt der Zusatzreport auch Node-Spec-Testzahlen (12 Python-Regressionen PASS,
Original-Log erneut verarbeitet). Keine Ã„nderung an Backend-/Frontend-Quellen.
Nachweis: `.studio/local-checks/20261022T073825Z-e7d7cda027bc4a21b291b7e858dd0805/summary.json`.
Linux-Operator, Browser und ModellqualitÃ¤t bleiben getrennt ungeprÃ¼ft.

## Lokaler Windows-PrÃ¼fweg und Modellhelfer

FÃ¼r wiederholbare lokale PrÃ¼fungen `npm.cmd run studio:check:local` verwenden.
Der Helfer sammelt Logs, Exitcodes und den erfassten Quellstand unter
`.studio/local-checks/`. Der lokale Qwen2.5-Coder-14B-Helfer kann ein ausgewÃ¤hltes
Ã¤lteres Fehlerlog parallel zu einem Testjob oder zur Codex-Arbeit analysieren;
seine Ausgabe bleibt `UNREVIEWED`, echte Testresultate gelten separat.
Aufrufe, Installation und Grenzen: [Lokale Checks und LLM](LOCAL_CHECKS_AND_LLM.md).
Feste Tests brauchen keine Modellaufrufe. Bei schwierigen/umfangreichen Logs
zuerst eine begrenzte lokale Vorauswertung erwÃ¤gen und deren Aussagen prÃ¼fen.
Keine Ã„nderung persÃ¶nlicher Runnerprofile oder Live-Anbindung daraus ableiten.
Windows-PASS ersetzt weiterhin keinen Linux-Operator- oder Release-Nachweis.

Wir bauen eine echte gemeinsame Entwicklungsumgebung fÃ¼r Marco in der Schweiz
und Markus in Thailand. Beide verwenden ihre eigenen ChatGPT-Konten. GitHub
bewahrt Code und Review; der vorhandene Hostinger-VPS betreibt bereits
den geprÃ¼ften Kollaborationskandidaten. Der Heim-PC soll dafÃ¼r nicht stÃ¤ndig laufen mÃ¼ssen.


## Langfristiges Produktbild (separat vom heutigen Status)

Workspace ist die universelle Arbeitsplattform fÃ¼r Menschen und Agenten; Studio ist der erste Bereich. Freiwilliges Peer-Compute und Monetarisierung sind spÃ¤tere, sicherheitskritische Entwicklungsphasen. Vor Architektur-/Produktarbeit [Produktvision](PRODUCT_VISION.md), [Zielarchitektur](ARCHITECTURE.md), [Roadmap](ROADMAP.md) und [Integrationsgrenzen](INTEGRATION_BOUNDARIES.md) lesen. **Nur** [STATUS.json](STATUS.json) enthÃ¤lt den aktuellen technischen FÃ¤higkeitsnachweis. Plattform-Repo und dessen Runtime bleiben unabhÃ¤ngig.

## Aktiver Umsetzungsplan vom 18.10.2026

Owner hat nach dem dokumentierten Plan die schrittweise Codearbeit beauftragt.
MaÃŸgeblich ist jetzt die S1â€“S5-Reihenfolge in [ROADMAP.md](ROADMAP.md):
Ã„nderungsansicht â†’ Projektstart/Bereitschaft â†’ GitHub-VerknÃ¼pfung â†’ isolierte
Linux-PrÃ¼fung â†’ echter Zwei-Personen-Pilot und kontrollierter Release.
Die nachfolgenden Ã¤lteren P-/R-PrioritÃ¤ten sind Hintergrund, keine parallelen AuftrÃ¤ge.

Erster begrenzter Teil von S1 lokal umgesetzt: change-overview in selfhost/app
verbindet bestehende Aufgaben/Kopien mit letztem Test, Vorschau, Review und
VerÃ¶ffentlichung. Metadaten ohne private Jobinhalte. Eigene/Team-Aktionen getrennt,
Projektauswahl nach Reload erhalten. VollprÃ¼fung 20 PASS, 1 POSIX-SKIP, 0 FAIL,
TypeScript/Build/Guard PASS; zwei Browserkonten und drei Breiten geprÃ¼ft.
Noch nicht deployed. Details im S1-Abschnitt von evidence/OVERNIGHT_ACCEPTANCE.md.

S1 inzwischen erweitert und lokal abgenommen: source-revision bindet Tests,
statische Build-Vorschauen und Reviews an versionierte/nicht ignorierte Quelldateien.
Vor-/Nachabgleich erkennt instabile LÃ¤ufe. Eigene Aktion Dateistand abgleichen
verwendet einen Statusjob; Unterschiede zu extern bearbeiteten Dateien werden
sichtbar. Keine dauerhafte Ãœberwachung, keine Aussage Ã¼ber ignorierte Dependencies
oder Umgebung. Fallback bei alten Runnern, Links, sensiblen Pfaden oder GrÃ¶ÃŸenlimits:
unbestÃ¤tigt. Erst aktualisierte Runner liefern neue Nachweise; Live-Runner unverÃ¤ndert.

Ã„nderungstyp und Beschreibung liegen additiv in change_notes. Nur EigentÃ¼mer der
Kopie darf Ã¤ndern; Stale-Save 409 erhÃ¤lt Entwurf. Team kann lesen. Server-/Runnerpakete
um neue AbhÃ¤ngigkeiten ergÃ¤nzt, lokaler Release-Smoke und Paketimport PASS.
Letzte VollprÃ¼fung: 21 PASS, 1 POSIX-SKIP, 0 FAIL, TypeScript/Build/Guard PASS.
Zwei Browserkonten, externer Edit/Restore, geteilter Text, Konflikt und drei Breiten
geprÃ¼ft. Noch nicht deployed. Details im letzten Abschnitt des Abnahmeberichts.

S2 ist nun auf eigenem gestapeltem Branch `feat/studio-project-start` lokal geprÃ¼ft
(Basis bleibt der bestehende Kandidat, kein Merge nach main). Neuer gefÃ¼hrter Start
fÃ¼r vorhandenes Repo oder lokales Startprojekt, privater Plan und lokaler Helfer
mit Profilsicherung und Wiederverwendung des Zugangs. KI/Publish fÃ¼r neue Projekte
gesperrt; Online/Projekt/Git/KI/VerÃ¶ffentlichung getrennt. Additive Tabellen
project_starts und runner_project_state, keine vorhandenen Spalten/Zeilen ersetzt.
24 Tests: 23 PASS, 1 POSIX-SKIP; TypeScript/Build/Guard PASS. Echter sichtbarer
Fixture-Ablauf inklusive neuer Kopie, Edit/Save, 1/1 Test und geÃ¤nderter statischer
Vorschau PASS; 390/1024/1440px ohne SeitenÃ¼berlauf. Ausgepackter Runtime-Smoke PASS.
Nachweis: letzter S2-Abschnitt in evidence/OVERNIGHT_ACCEPTANCE.md.

Verbleibende EinstiegshÃ¼rde: Plan einmal lokal mit project-setup.mjs anwenden und
bestehenden Runner neu starten; kein Ein-Klick-Installer. Der beschrÃ¤nkte Pilotstarter
akzeptiert weiterhin nur sein Pilotprojekt; ergÃ¤nzte Profile explizit mit runner.mjs
starten. Ein neues lokales Startprojekt hat noch kein externes gemeinsames Remote.
Nicht deployed, persÃ¶nlicher Live-Runner unverÃ¤ndert, kein KI-Auftrag oder Actions-Lauf.
NÃ¤chstes Paket S3: GitHub-VerknÃ¼pfung/PR-Ãœbergang; Mac/Fernpilot bleibt S5.

## Aktueller Abschluss der begrenzten technischen Abnahme

Die Matrix ist eingeordnet: docs/evidence/OVERNIGHT_ACCEPTANCE.md. Vier lokale
Korrekturen sind geprÃ¼ft: Dateijob-Eventzugriff, Dialogfokus, sofortige Freigabe
nach Jobabschluss und dauerhafte Wissenskonfliktwarnung. VollprÃ¼fung nach Fixes:
19 PASS, 1 POSIX-SKIP, 0 FAIL, TypeScript/Build/Source Guard PASS. Acht Hauptansichten
bei drei Breiten ohne SeitenÃ¼berlauf. Noch nicht deployed. Keine unverÃ¤nderten
Tests erneut starten. NÃ¤chste Produktarbeit: PR-Ãœbergang, Runner-FreigabefÃ¼hrung
und komfortable WissenskonfliktauflÃ¶sung; kein neuer KI-Job oder Live-Eingriff.

## UrsprÃ¼nglicher autonomer Testauftrag

Owner hat eine stÃ¼ndliche lokale Fortsetzung dieses Chats fÃ¼r die technische Abnahme
beauftragt. Endliche Matrix und Grenzen: `docs/OVERNIGHT_TEST_ORDER.md`. Fortschritt:
`docs/evidence/OVERNIGHT_ACCEPTANCE.md`. VollstÃ¤ndige Suite jetzt PASS: 19 bestanden,
1 Windows-bedingter POSIX-Skip, TypeScript/Build PASS. NÃ¤chste Arbeit sind gezielte
noch unbelegte Browser-/FehlerfÃ¤lle; keine erneuten KI-AuftrÃ¤ge, Push-Freigaben,
ProduktionsÃ¤nderungen oder endlosen identischen TestlÃ¤ufe.

## Aktuelle PrioritÃ¤t nach dem vollstÃ¤ndigen Pilotlauf

Owner priorisiert die technische Strecke unabhÃ¤ngig von Markus. Ein echter begrenzter
Codex-Auftrag, 3/3 Studio-Tests, neue Desktop-/Mobilvorschau und Branch-Push sind belegt.
Draft-PR im privaten Pilot: https://github.com/Spezzo-sudo/schmaqq-studio-pilot/pull/1.
PR-Erstellung erfolgte auÃŸerhalb Studio Ã¼ber GitHub-Connector; CI fehlt.
Nachweis und konkrete LÃ¼cken: `docs/evidence/P3_FULL_FLOW_20261017.md`.
UrsprÃ¼ngliche Runner-Sperren fÃ¼r KI und Push sind wieder aktiv; direkte Integration
bleibt gesperrt. Kein Merge/Deployment. NÃ¤chste Produktarbeit: direkten PR-Ãœbergang
und klare FreigabefÃ¼hrung umsetzen. Markus und weitere Anbieter sind dafÃ¼r kein Blocker.
Die folgende frÃ¼here P3/P4-Reihenfolge bleibt als Hintergrund erhalten.

## NÃ¤chster Meilenstein und Konsolidierung

Die operative Gesamtplanung steht in [ROADMAP.md](ROADMAP.md). Aktives Paket ist
**P3: Markus auf macOS und gemeinsamen Testremote verbinden**. P1 und P2 sind
abgeschlossen: `docs/evidence/P1_CANDIDATE_LINUX_20261017.md` und
`docs/evidence/P2_SWITCH_ACCEPTANCE_20261017.md`. Der Mac ist noch nicht
angebunden; vorbereiteter Ablauf in `docs/MARKUS_MAC_ONBOARDING.md`.
Der Owner hat inzwischen `Spezzo-sudo/schmaqq-studio-pilot` als privaten
Testremote genehmigt; Repository, Seed und zwei Aufgaben im Live-Projekt
â€žStudio-Pilottestâ€œ sind angelegt. Markus hat laut Owner noch kein GitHub-Konto; persÃ¶nliche Registrierung
steht vor der gezielten Einladung. Evidence: `docs/evidence/P3_PILOT_SETUP_20261017.md`.
Marcos vorhandener Runner ist inzwischen am Pilotprojekt mit eigener Kopie,
Tests und neuer Vorschau angebunden. EingeschrÃ¤nktes Mac-Paket vorbereitet,
noch kein Mac-Test: `docs/evidence/P3_RUNNER_SAFETY_20261017.md`.
Der klare UI-Arbeitsvorgang steht jetzt in `docs/PILOT_PLAN.md`. Ein aktueller
Live-Browserlauf Ã¼ber Kommentare, Editieren/Speichern, Tests, neue Vorschau und
lokalen PrÃ¼fstand ist belegt: `docs/evidence/P3_LIVE_BROWSER_WORKFLOW_20261017.md`.
Die Pilotaufgabe steht auf Zur PrÃ¼fung; keine Selbstfreigabe oder VerÃ¶ffentlichung.
Nach blockiertem Work-Browser in Codex fortgesetzt: Demo-/Live-Verwechslung
und gleiche Demo-Avatare diagnostiziert, getrennte Fixture-Sessions und isolierte
Abmeldung geprÃ¼ft. Evidence: `docs/evidence/P3_IDENTITY_AND_ENVIRONMENT_20261017.md`.
Keine vermischten IDs in dieser PrÃ¼fung; reale zweite Person weiterhin offen.
Danach P4 echte gemeinsame Abnahme. Vorhandene Setup-/Live-Checks
nicht pauschal wiederholen. Langfristige Anbieter-/Compute-Arbeit bleibt Backlog.

Der verbindliche Ablauf fÃ¼r Sicherung, Review, kontrollierte Bereitstellung und
anschlieÃŸende menschliche Abnahme steht in `PILOT_PLAN.md`. Neueste technische
PrÃ¼fung: `STATUS.json` unter `verification`; die frÃ¼here R4-PrÃ¼fung ist ausdrÃ¼cklich
als `historical_verification_r4` erhalten. Quellcode-Backup und Draft-Review erteilen
keine Deployment-Freigabe. Zwei zusÃ¤tzliche Review-Korrekturen schÃ¼tzen Kommentare
wÃ¤hrend des Speicherns und Ã¶ffnen vorhandene Aufgabenkopien auf ihrem richtigen
PC. Runtimeprofile, SQLite-Daten und Browser-Screenshots bleiben lokal ignoriert.

## Aktuelle PrioritÃ¤t: gemeinsam parallel arbeiten

Die lokale Studio-Startseite ist jetzt die gemeinsame ProjektÃ¼bersicht. Aufgaben
kÃ¶nnen atomar Ã¼bernommen, kommentiert und aus ihrem Kontext in eigene Arbeitskopien
geÃ¶ffnet werden. PrÃ¼fstÃ¤nde sind direkt an Aufgaben verlinkt. Zwei getrennte
Testkonten, Browserkontexte und echte Runner haben diesen Ablauf inklusive
parallel laufender Tests, Vorschauen und gegenseitiger Freigabe durchlaufen.
Dies ersetzt keinen tatsÃ¤chlichen Fernpilot mit Marco und Markus. Details,
Datenmigration und offene Grenzen: `docs/PARALLEL_COLLABORATION_HANDOFF.md`.
Die Ã„nderungen gehÃ¶ren zum separaten Kandidatenbranch; VerÃ¶ffentlichung/Review-Stand siehe `STATUS.json` und Git. Der freigegebene Betreiberwechsel ist abgeschlossen, main bleibt ungemerged.

## Aktuelle Fortsetzung: Windows-Runner und Bedienbarkeit

R5-A hat den persÃ¶nlichen Windows-Runner mit dem Live-Studio verbunden und
Git, Arbeitskopie, Dateispeicherung, Tests, gebaute Vorschau und Runner-Neustart
mit einem isolierten lokalen Testrepository nachgewiesen. Details stehen in
`R5_A_TECH_HANDOFF.md`. Das ist kein Nachweis fÃ¼r Markus' Fernzugriff, persÃ¶nliche
KI-AuftrÃ¤ge oder die AusfÃ¼hrung bei ausgeschaltetem Heim-PC.

Die anschlieÃŸenden Korrekturen fÃ¼r die erste Arbeitskopie und den responsiven
Editor liegen auf `fix/studio-first-workspace-layout`. Sie sind lokal geprÃ¼ft und inzwischen durch den befugten Betreiber deployed. Siehe `docs/USABILITY_FIRST_WORKSPACE.md`.
Der neue Bereich â€žVerbindungenâ€œ ergÃ¤nzt eine lokal getestete GitHub-KontoverknÃ¼pfung
und tatsÃ¤chliche Codex-Statusanzeigen. Echte GitHub-Clientregistrierung und Live-
Freigabe fehlen noch; Claude/Copilot sind nicht integriert. Aktuelle Details:
`docs/CONNECTIONS_HANDOFF.md`. Historische Aussagen
zu einem noch nicht eingerichteten VPS weiter unten sind keine aktuelle
Betriebsbestandsaufnahme. Der lesende Live-Audit vom 17.10.2026 ist nun in
`docs/LIVE_PREFLIGHT_20261017.md` dokumentiert (historischer Stand vor dem Update): alter main-Stand aktiv, eigener
Node-24-Dienst, gÃ¼ltiges HTTPS, persÃ¶nlicher Runner online. Der neue Kandidat lÃ¤uft inzwischen live; aktueller Nachweis in
`docs/evidence/P2_SWITCH_ACCEPTANCE_20261017.md`. Hermes hat die Live-Snapshot-/Restore-Probe inzwischen als bestanden gemeldet
(Owner-Weiterleitung: `docs/evidence/P2_HERMES_BACKUP_REPORT_20261017.md`).
Finaler Snapshot und Dienstwechsel sind laut anschlieÃŸendem Hermes-Bericht
abgeschlossen; aktives Release, OberflÃ¤che und erhaltener Runner direkt geprÃ¼ft.
Das geprÃ¼fte Paket samt `HERMES_README.md` liegt geschÃ¼tzt unter
`/home/dc-remote/schmaqq-studio-handoff/p2-4a0092b-20261017`; Hermes benÃ¶tigt
fÃ¼r die Ãœbernahme keinen GitHub-Zugriff. Hash/Quelle in STATUS.json unter
`operator_delivery`. Dieses Paket wurde nach Owner-Freigabe deployed; weitere Ã„nderungen sind damit nicht freigegeben.

## Wo der Stand liegt

Die zentrale Codebasis ist das private Repository
`https://github.com/Spezzo-sudo/schmaqq-workspace`, Remote-Hauptbranch `main`.
Der gesamte Code liegt direkt im Repository-Root. Die vorhandene lokale
Git-Historie wird unverÃ¤ndert als Vorgeschichte Ã¼bernommen; Git zeigt den
aktuellen Commit und Branch. Ein vorhandener lokaler Branch namens `main`
kann noch den alten Starter zeigen: maÃŸgeblich ist `origin/main`.

Der frÃ¼here NetzKontor-Branch `chatgpt/391-studio-cloud-handoff` und PR #392
sind historische Ãœbergabe-Snapshots. Sie sind nicht die neue Studio-Codebasis.
Das NetzKontor-Repository wird durch diese Ãœbertragung nicht verÃ¤ndert.
`STATUS.json` beschreibt FÃ¤higkeiten und offene Nachweise, nicht den aktuellen
Betriebszustand des VPS.

## Codekarte und wichtige Entscheidungen

- `studio/main.tsx`: eigenstÃ¤ndiger Einstieg und Anmeldung.
- `studio/brand.css`, `app/studio-brand.tsx`: Design aus der Live-Preview, originale
  Logo-Vektorpfade, vereinfachte lokale Welle; Logo-Klick verwirft keine EntwÃ¼rfe.
- `app/workspace.tsx`: Projekte, Aufgaben, Chat, Wissen, Navigation und Team.
- `app/development.tsx`, `source-editor.tsx`, `team-workspaces.tsx`, `code-review.tsx`:
  echte EntwicklerablÃ¤ufe; keine simulierten Erfolgsmeldungen als Testergebnis.
- `selfhost/server.mjs`, `store.mjs`: Node HTTP und SQLite WAL.
- `selfhost/runner.mjs`: ausgehende Verbindung zum Studio; Code lÃ¤uft auf dem
  konfigurierten GerÃ¤t. Own-device-Grenze fÃ¼r Codejobs bleibt erhalten.
- `selfhost/oidc.mjs`: IdentitÃ¤tslogin mit PKCE/Nonce/JWKS; echter OpenAI-Client fehlt.
- `selfhost/local-ai.mjs`, `ai-routes.mjs`: ausdrÃ¼cklich freigegebene lokale Modelle.
- `selfhost/release.mjs`, `backup.mjs`, `deploy/`: leichtes Runtime-Paket, konsistentes
  Backup, Preflight und Deployment-Vorlagen; aktueller Kandidat kontrolliert
  deployed und lesend nachgeprÃ¼ft.
- `app/api/`, `db/`, `build/`: ursprÃ¼nglicher Sites-Starter, anderer Hostingpfad.
  FÃ¼r dieses Vorhaben `studio:*` verwenden. Root-`npm run dev` startet den Starter.

Sitzungen sind pro Person. Einladungen binden an die E-Mail. Eigene Git-Worktrees
verhindern gleichzeitiges Schreiben in dieselben Dateien. Aufgaben/Dateibereiche
kÃ¶nnen reserviert werden. Stale-Save-PrÃ¼fung schÃ¼tzt den Editor; inhaltliche
Git-Konflikte bleiben mÃ¶glich und werden angehalten. Review gilt exakt einem
Commit und muss von der anderen Person stammen. Vorschau lÃ¤uft auf anderer Origin.

## Was nicht durch einen Quellcode-Upload Ã¼bertragen wird

Private Datenbanken, ChatGPT-/Codex-Sitzungen, Runnerprofile, persÃ¶nliche Programme,
lokale Modelle und der gesamte Chatverlauf bleiben auÃŸerhalb des Git-Repositories.
Die vorhandene lokale Git-Historie wird vollstÃ¤ndig in das eigenstÃ¤ndige
Repository Ã¼bertragen und zusÃ¤tzlich als lokales Git-Bundle gesichert. Private
Runtime-Daten werden dabei nicht Ã¼bertragen; eine neue Installation erzeugt
eigene Daten, Konten und Zugangsdaten.

Neue Standardinstallationen binden an localhost. Das in R5-A geprÃ¼fte Live-Studio
ist unter https://studio.schmaqq.com erreichbar; dessen Betrieb wurde hier nicht
vollstÃ¤ndig auditiert. Ein
Cloud-Entwickler kann Code bearbeiten/testen, auch wenn dieser PC aus ist; er
ersetzt weder automatisch das Studio-Hosting noch einen ausgeschalteten Runner.
Ein normaler Chat hat nur die tatsÃ¤chlich verbundenen Tools und kann nicht
allein wegen dieser Dokumentation Befehle auf einem Rechner ausfÃ¼hren.

## Einstieg in Codex Cloud oder Work

1. Der GitHub-Verbindung Zugriff auf `Spezzo-sudo/schmaqq-workspace` geben.
2. Den Remote-Branch `main` oder den gewÃ¼nschten Entwicklungsbranch wÃ¤hlen.
3. Im Repository-Root arbeiten. Node >=24.15, Python 3 und Git bereitstellen.
4. Setup: `node selfhost/cloud-setup.mjs`. Das installiert aus dem Lockfile und
   baut das Studio. Keine echten KI-/VPS-/Provider-Secrets fÃ¼r diese Arbeit nÃ¶tig.
5. `npm run studio:verify` ausfÃ¼hren. Linux-Fehler tatsÃ¤chlich beheben und berichten.
6. Eigener Branch, eng begrenzte Ã„nderung, Tests, PR und Review. Ein Merge ist
   keine Deployment-Freigabe. NetzKontor bleibt ein getrenntes Projekt.

Offizielle Referenz: https://learn.chatgpt.com/docs/environments/cloud-environment
Die tatsÃ¤chliche VerfÃ¼gbarkeit und Freigabe der Umgebung im Konto separat prÃ¼fen.

## Starttext fÃ¼r einen neuen Codex-/Work-Chat

> Wir entwickeln SCHMAQQ Studio weiter. Ã–ffne main im privaten Repository
> Spezzo-sudo/schmaqq-workspace und arbeite im Repository-Root. Lies
> AGENTS.md, docs/STATUS.json und
> docs/HANDOFF.md. PrÃ¼fe den tatsÃ¤chlichen Git-Stand. Starte mit studio:verify.
> Keine private Runtime aus dem alten PC voraussetzen. NÃ¤chste Aufgabe: Linux-
> Reproduzierbarkeit und sichtbare Abnahme des neuesten Layouts, danach den
> vollstÃ¤ndigen Zwei-Personen-Ablauf prÃ¼fen. Ã„nderungen nur im Studio-Bereich.
> Melde echte Testresultate und noch offene Voraussetzungen; kein Deployment.

## Starttext fÃ¼r einen normalen ChatGPT-Chat

> Lies im verbundenen privaten GitHub-Repository Spezzo-sudo/schmaqq-workspace
> auf main die Dateien docs/STATUS.json und docs/HANDOFF.md. Wenn dieser Branch nicht zugÃ¤nglich ist, sage das ausdrÃ¼cklich und
> verlange die beiden Dateien. Arbeite am nÃ¤chsten eng begrenzten Arbeitspaket.
> Behaupte keine AusfÃ¼hrung, wenn keine AusfÃ¼hrungsumgebung verbunden ist.

## Test mit zwei Rollen

Zugangsdaten werden lokal von `node selfhost/demo.mjs` erzeugt und nur in `.studio/`
gespeichert. Zwei Browserprofile verwenden, da zwei Tabs dieselbe Sitzung teilen.
Marco: Datei Ã¶ffnen â†’ Ã¤ndern â†’ speichern â†’ Tests â†’ Vorschau â†’ TeamprÃ¼fung.
Markus: Diff ansehen â†’ RÃ¼ckmeldung/Freigabe. Marco: geprÃ¼ften Stand verÃ¶ffentlichen
und zusammenfÃ¼hren. Das lokale Demo-Remote ist ein echtes isoliertes Bare-Repository.
Die echte NetzKontor-Quelle verlangt weiterhin Issue/PR/CI und wird dadurch nicht
automatisch freigegeben oder deployed.


## Historische PrÃ¼f-Evidence und offene Cloud-Abnahme

Lokal am 17.10.2026: `npm run studio:verify` bestanden (13 Tests, TypeScript,
Frontend-Build und Source-Guard). Die GitHub-Ãœbertragung wurde als vollstÃ¤ndiger
Baum geprÃ¼ft. Entwurfs-PR: https://github.com/Spezzo-sudo/NetzKontor/pull/392.

Im frÃ¼heren NetzKontor-Snapshot wurde der erste Studio-CI-Lauf https://github.com/Spezzo-sudo/NetzKontor/actions/runs/39011115243
wird von GitHub als fehlgeschlagen gemeldet; es wurden keine Jobschritte oder
abrufbaren Logs zurÃ¼ckgegeben. Auch die Ã¼bergeordnete CI meldete einen Fehler.
Die Ursache ist nicht bewiesen. Dies ist kein grÃ¼ner Linux-Nachweis. Zuerst die
GitHub-LaufausfÃ¼hrung prÃ¼fen; alternativ in einer echten Cloud-Entwicklungsumgebung
installieren und prÃ¼fen. Kein Neustarten einer Schleife ohne neue Evidence.

Die Codex-Cloud-Umgebung selbst ist noch nicht angelegt/aktiviert. DafÃ¼r muss die
bereits GitHub-Verbindung Zugriff auf das neue Repository haben und
Node >=24.15 bereitstehen. Die Projektdateien und der obige Starttext sind dafÃ¼r
vorbereitet. Ein Chat-/Cloud-Wechsel Ã¼bertrÃ¤gt keine laufende lokale Sitzung.


Im eigenstÃ¤ndigen Studio-Repository ist noch kein GitHub-Actions-Workflow
konfiguriert. Der fehlgeschlagene historische NetzKontor-Lauf ist kein aktueller
Studio-CI-Lauf. MaÃŸgeblicher lokaler PrÃ¼feinstieg bleibt `npm run studio:verify`.
