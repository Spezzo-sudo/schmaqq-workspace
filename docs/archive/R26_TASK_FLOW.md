# R26 — Eine Aufgabe, ein Arbeitsfluss (erster nutzbarer Schnitt)

## Anlass / konkret beobachteter Bruch

Realtest R25 auf einem Samsung zeigte: Nach „Aufgabe anlegen“ führt
„Bearbeiten“ auf die komplette Runner-/Git-Einrichtung. „Ich übernehme“
markiert die Aufgabe als „In Arbeit“, obwohl keine Codeausführung begonnen
hat. KI und Ergebnisse sitzen in weiteren, oft leeren Reitern. Der
Nutzer versteht nicht, wie er Markus eine Aufgabe übergeben oder am
selben Ort das Ergebnis verfolgen soll.

Die neue R26-Aufgabenansicht ist **kein vollständiger Agenten-Marktplatz
und keine universelle ChatGPT-Synchronisierung**. Sie setzt zuerst die
gerade fehlende Verbindung zwischen Aufgabe, Mensch und Ausführung um.

## Umsetzung in diesem PR

1. **Ein Aufgabenbildschirm** anstelle von vier Aufgaben-Tabs: Auftrag,
   tatsächlicher Arbeitszustand, drei Arbeitswege, Ergebnis, gemeinsames
   Gespräch. Vorerst keine neue SQL-Tabelle.
2. **Auftrag direkt präzisieren**: Titel/Ziel ändern und als editierbaren,
   revisionsgeschützten Arbeitsgegenstand behalten. Gleichzeitige
   Änderungen verursachen HTTP 409 statt stiller Überschreibung.
3. **Mit dem Team**: konkrete vorhandene Teammitglieder auswählen,
   übergeben, wieder ansehen; alte Kommentare und Arbeitsstände
   behalten den Aufgabenbezug. Keine technische Einrichtung erforderlich.
   Eine übergebene Aufgabe bleibt „Bearbeitung noch nicht gestartet“,
   solange noch keine Ausführung stattgefunden hat.
4. **Selbst bearbeiten**: bestehender eigener Git-/Node-/Codex-
   Werkzeugweg öffnet sich nur auf Wunsch, an genau derselben Aufgabe.
   Ist der Rechner nicht verbunden, verweist der Ablauf auf die einmalige
   Verbindung, statt am Handy einen angeblich lokalen Pfad zu verlangen.
5. **Mit KI**: dieselbe echte bereits unterstützte lokale Modellstrecke,
   jetzt **aufgabenbezogen** mit Projekt-/Aufgaben-Kontext. Ist kein
   Modell verfügbar, wird dies ausdrücklich erklärt; kein Fake-
   ChatGPT-Login oder unautorisierte Provider-Aufrufe.
6. **Ergebnis und Gespräch** sind ohne Reiterwechsel erreichbar.
   Worktree, Checks, Review und Vorschau bleiben getrennte Zustände.
7. **Projektraum** zeigt drei offene Aufgaben direkt unter „Hier geht
   es weiter“. Der Kanban bleibt erreichbar, ist aber nicht mehr die
   einzige Einstiegsstelle.

## Sicherheits-/Datenvertrag

- Bestehende private Single-Team-Accounts, Projekte, Aufgaben, Kommentare,
  Reviews, Jobs und Tokens bleiben erhalten.
- `/api/collaboration/task` besitzt zusätzlich `handoff` und `brief`:
  authentifiziert, Origin geprüft, geparste Eingaben, eine atomare
  Transaktion. Eine Übergabe prüft den **vorherigen tatsächlichen
  Zuständigen**. Fremde aktive Aufgaben dürfen nicht heimlich übernommen
  werden. Bestehende Worktree-Reservierungen dürfen durch Übergabe
  nicht umgangen werden.
- Revisionsstand wird ausschliesslich in bestehendem `workspace_meta`
  unter `taskflow:v1:brief:<taskId>` gespeichert.
- KI-Auftrag bindet `taskId` in den vorbereiteten begrenzten Kontext
  und in den Job; Modell-Opt-in, privates Ergebnis, explizites Teilen
  und die bestehende Gerätegrenze bleiben bestehen.
- Kein GitHub-Konto, kein ChatGPT-Login, keine neue Server-/Provider-
  Integration, keine automatische Ausführung, keine Veröffentlichung.
- Alte API-Konsumenten bleiben unverändert verwendbar; das
  legacy-Verhalten des bisherigen `claim` ist separat vorhanden.
  Die **neue** Aufgabenansicht verwendet ausschliesslich das
  nicht-ausführende `handoff`.

## Akzeptanz

- Nutzer kann auf einem Handy eine Aufgabe ohne Dateipfad erstellen.
- Er sieht nach wenigen Sekunden die eine nächste Entscheidung
  (mit Mensch, selbst, mit freigegebener KI).
- Die Aufgabe lässt sich an ein zweites Konto übergeben, ohne sie
  fälschlich als tatsächlich ausgeführt darzustellen.
- Zweites Konto sieht dieselbe Aufgabe, kann kommentieren und mit
  der eigenen Arbeitskopie weiterarbeiten.
- Erster Nutzer sieht Kommentar in derselben Aufgabe.
- Nach Neuladen bleibt die Aufgabe über dieselbe URL erreichbar;
  ein nicht abgeschickter Kommentarentwurf bleibt im Tab erhalten.
- Sobald eine echte isolierte lokale Git-Arbeitskopie existiert,
  bleibt der vorhandene Editor an die Aufgabe gebunden.
- Keine Produktionsmutation. R25 bleibt live, bis eine separate
  reale Nutzungsabnahme und Betreiberfreigabe stattfinden.

## Bewusste offene Punkte (nicht als fertig darstellen)

- Bestehende Repo-Verknüpfung ist zunächst ein Referenz-Link, keine
  vollautomatische GitHub-OAuth-/Clone-Integration.
- Der erste lokale Runner-/Projektabgleich benötigt weiterhin die
  existierende PC-seitige Einrichtung.
- ChatGPT-Chats von anderen Apps werden nicht stillschweigend
  synchronisiert. Codex benötigt eine echte persönliche Anmeldung.
- Die reale Zusammenarbeit mit **Markus' tatsächlichem Konto und
  Rechner** ist noch nicht nachgewiesen; synthetische Browserkonten
  ersetzen keine persönliche Abnahme.
- Datenbank-/Backup-/H3-Operatorfragen gehören zu einem gesonderten
  Production-Go. Das historische Owner-Mismatch aus R25 ist
  damit nicht behoben.
- Die R26-Aufgabenansicht nutzt erst einmal SCHMAQQ-Farb- und Typoregeln.
  Eine vollständige Wiederverwendung der Marketing-Designvorlage und
  ein zweiter visueller Design-Audit bleiben eigene Folgeschritte.
