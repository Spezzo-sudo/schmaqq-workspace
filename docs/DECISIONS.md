# Entscheidungsprotokoll

Kurz, datiert, verbindlich. Neue Entscheidungen oben. Was hier steht, gilt, bis ein neuer Eintrag es ändert.

## 17.11.2026 (Abend)
- **Reihenfolge:** Schritt 3 (Karten) vor Schritt 2, weil Aufgaben ohne Agenten leer wirkten. Inhalt unverändert.
- **Gespräch einer Aufgabe = Projektnachrichten mit Aufgabenbezug**; im Projektchat steht dafür **eine** Karte.
  Ältere Aufgabenkommentare bleiben sichtbar.
- **Markieren:** vier Farben (blau, grün, orange, lila), eine pro Anfrage; der Agent liest nur die markierten Nachrichten.
- **Agent ↔ Agent:** Werkzeug „anderen Agenten fragen“ nur in Aufgaben, nur für Agenten mit Freigabe „Delegieren“,
  B gibt nicht weiter, B's Antwort geht nicht automatisch an A zurück. „Weitermachen“ erlaubt 6 weitere Antworten ab dem aktuellen Stand.
- **Zuständigkeitsbereich** legt nur der Projekt-Admin fest; Studio warnt beim Anschauen, blockiert aber nicht.
- **Programmierläufe durch Agenten** (#105): nur mit Berechtigung „Code bearbeiten“, nur in Code-Aufgaben, nur in der eigenen
  Arbeitskopie der fragenden Person mit ihrer Anmeldung für Programmierläufe; die systemd-Unit des Job-Starters ist die Sandbox.
  Der Agent teilt, prüft und führt nichts zusammen.
- **Webrecherche** (#105): nur öffentliche https-Seiten, alle Adressen geprüft, höchstens 3 pro Antwort; Berechtigung
  „Im Web recherchieren“, für die Projektleitung an.
- **Konzept Fassung 2 vollständig gebaut und live** (17.11.2026), danach Aufräumen (#106). Bewertet wird das Endergebnis.

## 17.11.2026
- **Jeder Bauschritt geht nach bestandener Prüfung direkt live** (Owner, 17.11.2026), nicht erst das ganze Konzept.
  Ablauf je Schritt: Tests und Sichtprüfung Handy/Desktop, GitHub-Prüfung grün, Merge, `studio-deploy.sh release`, Bericht.
- **Start zeigt nur Projekte** (plus „Wartet auf dich“ und eine eingeklappte Zeile für Direktnachrichten mit Menschen);
  Agenten-Direktchats nur im Projekt über die **Agentenleiste**.
- **Projekt mit zwei Reitern: Chat | Aufgaben.**
- **Agenten sollen wirklich arbeiten:** Programmierläufe und Webrecherche in Schritt 5; bis dahin zeigt das Profil
  ehrlich, was ein Agent kann.
- **Konzept abgeschlossen** (Owner: „belassen wir es bei dem Konzept“). Weitere Ideen nur unter „Später“.
- **Ein Projekt ist ein Chat für Menschen**; Agenten schweigen dort, bis man sie holt (@Name, Nachrichten markieren,
  Direktchat). Ersetzt „Gruppenchat, in dem Agenten auf @Name antworten“ und die Idee eines separaten Projektverlaufs.
- **Direktchat mit jedem Agenten** bleibt, nicht nur über die Projektleitung.
- **Arbeit wird immer als Karte im Projektchat sichtbar**, auch wenn sie in einem Direktchat entstand.
- **„Das Thema ist die Einheit; eine Aufgabe ist eine Karte mit prüfbarem Ziel“** präzisiert „Die Aufgabe ist die Einheit“.
- **Agent ↔ Agent** nur an Karten, sichtbar, höchstens 2 Ebenen und 6 Antworten pro Auftrag, Stopp jederzeit.
- **Wer anstößt, zahlt**, auch für weitergegebene Schritte.
- **Start zeigt eine Zeile pro Projekt**, nicht eine flache Liste aller Chats (PR #95 geht so nicht live).
- **Desktop nutzt die Breite** mit Spalten nebeneinander; nicht das Handy-Layout gestreckt.
- **Mehrere Projekte pro Repository** erlaubt, mit Zuständigkeitsbereichen; **vor** Programmierläufen umzusetzen.
- **Agenten in Produktion** für Marco eingeschaltet; Projektverwaltung über das Menü hinter dem Avatar.
- **Konzept-Disziplin:** Gebaut wird nur, was in `CONCEPT_MESSENGER.md` steht; neue Ideen unter „Später“.

## 16.11.2026
- Agenten gehören zum Projekt; wer fragt, zahlt mit dem eigenen KI-Zugang.
- Einzelchats sind privat.
- Projektleitung („Guru“) in jedem Projekt, bearbeitbar, nicht entfernbar.
- Kein Motorname in der Oberfläche.
