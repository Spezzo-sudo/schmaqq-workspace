# R28 – Eine klare Produktlinie und ein echter Zwei-Personen-Pilot

_Status: **Review-Entwurf der Produktentscheidung**, 25.10.2026. Keine Laufzeitänderung, kein Deployment, keine implizite Merge-/Providerfreigabe._

## Ein Satz, der alle Entscheidungen ordnet

**SCHMAQQ Workspace ist ein gemeinsamer, dauerhafter Arbeitsraum für Menschen. SCHMAQQ Studio ist darin die Entwicklungszentrale; persönliche Coding-Agenten können begrenzt mitarbeiten.**

Der erste nachzuweisende Nutzen ist **nicht** ein weiterer Agenten-Adapter, sondern:
**Marco und Markus erledigen in einem realen Projekt mit getrennten Konten und jeweils eigenen ChatGPT-/Codex-Zugängen eine Änderung bis zum gegenseitigen Code-Review – verständlich am Desktop und auf dem Handy.**

Daran messen wir jede neue Idee. Kein „Discord mit Terminal“, keine Kopie von VS Code, keine autonome KI-Firma und kein neues Orchestrierungsframework vor diesem Nachweis.

Diese Linie konkretisiert, ersetzt aber nicht die R1-Vision in [PRODUCT_VISION.md](PRODUCT_VISION.md) und die Sicherheitsgrenzen in [AGENTS.md](../AGENTS.md), [WORKSPACE_ROOMS.md](WORKSPACE_ROOMS.md) und [INTEGRATION_BOUNDARIES.md](INTEGRATION_BOUNDARIES.md).

## Was entschieden ist – was noch nicht

| Entscheidung für den ersten realen Pilot | Grenze |
| --- | --- |
| **Ein Projektraum** als Einstieg, nicht fünf isolierte Anwendungen | Diskussion, Aufgaben, Wissen, Ergebnisse und Codeansicht bleiben im selben Projekt |
| **Menschen entscheiden und besitzen den Arbeitskontext** | Agenten sind ausführende Helfer, keine Projekt-Owner oder automatische Teammitglieder mit Menschenrechten |
| **Studio = Entwicklungsansicht** | Git und eigene Arbeitskopien bleiben die Code-Wahrheit; ein Git-Review ist kein Merge und kein Deployment |
| **Zwei persönliche Konten und persönliche ChatGPT-/Codex-Zugänge** | Keine Abo-Pools, Weitergabe von Cookies/Tokens, automatisches Nutzen des anderen Kontingents oder zusätzliche gebührenpflichtige Modell-API |
| **Codex zuerst, über den vorhandenen persönlichen Runner** | Realer Codex-Zugang, Gerätebereitschaft und lokale Projektfreigaben sind erst zu prüfen, nicht als live bewiesen zu behaupten |
| **Projektgedächtnis ist strukturiertes Wissen** | Keine riesigen Chatprotokolle blind in Prompts, kein automatisches Erinnern jeder Unterhaltung, keine behaupteten garantierten Token-Ersparnisse |
| **Eine SCHMAQQ-Designfamilie** | Die aktuelle Website-Referenz gilt; keine neue unabhängige SaaS-Oberfläche, keine unfreigegebene Logo-Ablösung |

**Noch keine Architekturentscheidung:** Discord-Klon, mehrere Harnesses, ACP, AG-UI, OpenClaw, Hermes, Paperclip, DeepSeek Harness, OpenCode, Claude, Kimi, vollständige Browser-IDE, Yjs, autonome Heartbeats oder Multi-Tenant-SaaS. Diese Ideen bleiben im [R28-Ideenspeicher](R28_IDEAS_PARKING_LOT.md), nicht in der aktuellen Implementierung.

## Tatsächlich verfügbarer Ausgangspunkt

- R27 läuft laut Hermes-Releasebericht und unabhängig kontrolliertem Release-Pointer auf `studio.schmaqq.com`; HTTPS und unauthentifizierter Git-Diff-Zugriff wurden geprüft. Die alte R26/R27-Projektstatushistorie im Repository ist keine Aussage über den neuesten Live-Pointer.
- Projektraum, Nachrichten, Aufgaben, Kommentare, Wissen, Datei-Editor, persönliche Runner, Git-Arbeitskopien, Tests, Vorschau, abgeschlossener Git-Diff und lokale Codex-Ausführungspfade existieren bereits.
- Die bestehenden Browserabnahmen verwendeten **synthetische** Konten und für Teile des Git-Diffs synthetische Daten. Der echte Zwei-Personen-Alltag ist damit **nicht** bewiesen.
- Beim letzten Betreiberbericht waren **1 reales Mitglied**, 6 Projekte und 4 Aufgaben vorhanden. Markus' tatsächliche Registrierung, eigener Runner und persönliche Codex-Ausführung bleiben offen.
- H3: `H3_HISTORICAL_OWNER_MISMATCH` bleibt **unresolved**. Keine Änderung an Produktionsbackup, Provider, Studio-Identitäten oder anderen Services durch dieses Dokument.

## Ein einziger aktiver Meilenstein: R28-0 „Wir arbeiten wirklich zusammen“

Wir verwenden **ein vorhandenes Projekt und ein vorhandenes Repository**, keine neue Feature-Demo und keine neue Infrastruktur. Der Pilot kann mit einer ungefährlichen kleinen Änderung in einem geschützten Branch beginnen. Keine ungeprüften Kundendaten und keine Produktionsänderung.

1. **Echte Teamidentitäten.** Marco lädt Markus über die bestehende 48h-Einladung ein. Markus registriert sich selbst, mit **eigener** Anmeldung. Im Raum sind beide nachweisbar getrennte Personen. Getestete Rollen und sichtbare Zuständigkeiten sind noch keine Online-Präsenz.
2. **Ein echter Projektraum.** Projektziel, eine kleine konkret prüfbare Aufgabe, verantwortliche Person und Kontext-/Designentscheidung stehen an einer auffindbaren Stelle. Beide öffnen und kommentieren dieselbe Aufgabe, ohne eine zweite Aufgabenliste anzulegen.
3. **Ausführung zunächst mit dem vorhandenen Stack.** Mindestens ein persönlicher Runner erhält begrenzten Zugriff auf die passende Git-Arbeitskopie. Persönliches `codex login status` und lokales `allowCodex` werden pro Gerät getrennt geprüft. Kein Studio-Login wird als Modellfreigabe ausgegeben.
4. **Erster echter Codex-Durchlauf.** Berechtigter Nutzer startet einen kleinen aufgabengebundenen Codex-Auftrag mit dem begrenzten, einsehbaren Kontext. Ergebnis entsteht in einer eigenen Kopie, nicht direkt in `main` oder Production. Fehlende Quota, Offline-Gerät oder Auth-Problem werden offen angezeigt.
5. **Artefakt und Gegenprüfung.** Tatsächliche geänderte Dateien, Git-Diff, dazugehöriger Commit, Tests und – falls konfiguriert – Vorschau erscheinen am **selben Task**. Die andere Person liest den Diff, stellt eine Rückfrage und gibt den exakt geprüften Commit frei oder lehnt ihn ab.
6. **Wiederaufnahme und zweite Person.** Nach neuem Browseraufruf bleibt der Zusammenhang erhalten. Markus führt einen **eigenen** begrenzten Auftrag mit **seiner** privaten Codex-Anmeldung aus; Marco prüft. Falls sein Gerät noch nicht verfügbar ist, gilt der Pilot ausdrücklich nur als Teilabnahme.
7. **Abschlussbefund.** Beide können ohne Entwicklerführung erklären: Was ist das Ziel? Wer macht was? Was wurde geändert? Was wurde tatsächlich geprüft? Was ist der nächste Schritt? Offene Hürden kommen in genau dieselbe Pilot-Aufgabe.

**Fertig ist R28-0 erst, wenn zwei echte Nutzer und ihre getrennten Codex-Zugänge praktisch nachgewiesen sind.** Synthetische Browser-Tests, ein einzelner Owner oder reine Runner-Statusanzeigen genügen nicht. Ein erster nur manueller Menschen-zu-Menschen-Durchlauf zählt als Teilfortschritt, nicht als fertiger Agenten-Pilot.

## Nur wenn der Pilot die Lücke belegt: R28-1 und R28-2

**R28-1 – Eine kleine Projektzentrale statt zusätzlicher Menüs.**
Erst die tatsächlich beobachteten Verwirrungen beheben. Ein kompakter Überblick soll mindestens Projektziel, Personen und getrennte Zustände (im Raum / Gerät erreichbar / Auftrag läuft), zuständige Aufgabe, letzte bestätigte Änderung, Tests, Review und nächsten Schritt erklären. Menschenpräsenz darf nicht aus Runner-Heartbeats abgeleitet werden. Kein vollwertiger VS-Code-Klon; Dateiliste und Review in den vorhandenen Komponenten weiterverwenden.

**R28-2 – Ein begrenztes gemeinsames Kontextpaket.**
Vorhandene `AGENTS.md`-Regeln im jeweiligen Repository sind verbindlich; genau **eine** kurze Projektübersicht, bestätigte Entscheidungen mit Quellenverweis, ausgewählte Aufgabenbeschreibung und relevante Dateiverweise ergänzen sie. Nicht einfach `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` und KI-Zusammenfassungen doppelt fortschreiben. Der Nutzer sieht, was für den Auftrag freigegeben wird. Personal-Chats, Tokens, private Entwürfe und fremde Runnerdaten bleiben ausgeschlossen. Kontextumfang begrenzen und nach Relevanz wählen; keine Behauptung, dass ChatGPT-Projekte die vollständigen Prompt-Tokens automatisch sparen.

**Kein Automatismus:** Ein Gespräch wird erst nach menschlicher Bestätigung zur verbindlichen Entscheidung. Eine KI-Zusammenfassung ist ein Vorschlag mit Quelle und Status, nicht automatisch Projekt-Wahrheit.

## Abnahme und Messung

Für jeden Pilot-Schritt notieren: tatsächlicher Benutzer / tatsächliches Gerät / Projekt / Aufgabe / betroffener Git-Zustand / belegtes Ergebnis / Fehler oder fehlende Evidenz.

- Kein „Online“, wenn nur der Runner noch einen alten Heartbeat hat.
- Kein „Tests bestanden“, wenn der Stand seit dem Test geändert wurde.
- Keine Freigabe für nicht nachweisbar vollständige Diffs.
- Keine automatische Codeübernahme, Git-Push, Merge oder Production-Aktion.
- Kein implizites Anlaufen eines Agenten auf fremder Hardware.
- Fehlender zweiter Account, persönliche Codex-Quota, fehlendes Git-Remote oder Offline-Gerät sind **Blocker mit konkreter Benutzerführung**, kein Vorwand für eine neue Plattform.
- Pilot muss mit echten Sitzungen, Handy/PC und Wiederaufnahme getestet sein; technische Fixture-Tests bleiben eigene Evidenz.

## Nächster konkreter Auftrag – und nichts daneben

**„R28-0: Mit Marco und Markus eine echte kleine Aufgabe in SCHMAQQ Studio über persönliche Codex-Runner vollständig erledigen und gegenseitig prüfen.“**

Erster Bedien-Schritt: bestehendes Owner-Konto öffnet `https://studio.schmaqq.com`, legt im vorhandenen Projektraum einen kleinen Auftrag an und verschickt eine **einmalige Einladung** an Markus. Der Invite-Link und persönliche Zugangsdaten werden nicht im GitHub-Issue oder Chat-Übergabedokument gespeichert.

Engineering erst dann, wenn der reale Durchlauf eine reproduzierbare Lücke zeigt; für diese genau **einen** abgegrenzten Fix-PR mit Browsernachweis und ohne Nebenfeatures.

## Quellen und Fortsetzung

- [Produktvision](PRODUCT_VISION.md) – langfristiger Nordstern.
- [R25-Projektraumvertrag](WORKSPACE_ROOMS.md) – heutige Begriffe und Daten-/Rechtegrenzen.
- [Bestehende Roadmap](ROADMAP.md) – historische S1–S5-Pakete und technische Verpflichtungen; R28-0 ist die aktuelle Produktpriorität.
- [Technische Wahrheit](STATUS.json) / [Fortsetzungsnotiz](HANDOFF.md) – reale Implementierung und offene Blocker.
- [Ideenspeicher ohne Implementierungsfreigabe](R28_IDEAS_PARKING_LOT.md).

_Dieser Text bewahrt die in der SCHMAQQ-Planung diskutierten Optionen. Er setzt keinen neuen Dienst auf und autorisiert keine Rechteerweiterung._
