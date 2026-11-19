# Entscheidungsprotokoll

Kurz, datiert, verbindlich. Neue Entscheidungen oben. Was hier steht, gilt, bis ein neuer Eintrag es ändert.

## 19.11.2026 (Antwort ohne @, feste Kopfzeile)
- **Antwort auf die Nachricht eines Agenten holt diesen Agenten**, ohne @ (Marco: „Ja!“). Dafür gibt es an Agenten-Nachrichten im Projektchat und in Aufgaben „Antworten“; über der Eingabe steht „Antwort an <Name>“. Menschen-Nachrichten und Nachrichten ohne Bezug holen niemanden. Ergänzt Konzept Regel 2 (vierter Weg).
- **Die Kopfzeile behält ihre volle Höhe** in jedem scrollenden Bildschirm (Projektinfo, Konto, Anleitung, Aufgabe rechts). Vorher wurde sie in Spaltenlayouts zusammengedrückt, und Titel und „⋯“ liefen über den Inhalt; das erzeugte auch die doppelte Linie. Der Rundgang prüft das jetzt auf jedem Bildschirm.
- **Hover nur mit Maus:** Auf dem Handy blieb „⋯“ nach dem Tippen hell. Hover-Farben gelten nur noch bei Geräten mit Zeiger.
- **Agenten voll einstellbar** (Marco, 19.11.): Name, Bild, Modell, Denkstufe, Rechte, jeder Agent einzeln, Rechte durch den Projekt-Admin. Modelle aus einem in der App pflegbaren Katalog; Eintragen eigener Namen bleibt möglich. Umsetzung in Phasen (siehe WORKLIST).

## 19.11.2026 (Kette Herr Grau → Kollege, Aufräumen)
- Im Projektchat steht pro Aufgabe nur **eine kurze Zeile** (höchstens etwa 140 Zeichen) mit „Öffnen ›“; der ganze Text steht in der Aufgabe.
- „Team erweitern“ steht fest neben dem Knopf „Team“ und wandert nicht mit der wischbaren Bilderleiste.
- Herr Grau sagt nur zu, was Studio kann: Er spricht nicht selbst mit Kollegen und fasst später nichts zusammen. Er nennt, wer welche Aufgabe bekommt; die Person nimmt an.
- Antwortet ein Kollege auf eine Aufgabe, die ihm ein Agent gegeben hat, gilt seine Antwort als **Ergebnis der Aufgabe** (derselbe Weg wie „Ergebnis festhalten“, kein neuer Mechanismus). Die Aufgabe steht dann auf „Zum Freigeben“ bzw. „Fertig – bitte abschliessen“, je nach Freigaberegel des Projekts. Eine Frage, die ein Mensch selbst stellt, und Antworten der Projektleitung zählen nicht; Code-Aufgaben behalten ihren Weg über Code und Prüfung. Herr Grau fasst nicht zusätzlich zusammen (das würde einen weiteren bezahlten Lauf kosten).
- **Noch offen, erst nach Marcos Ok:** Wer direkt auf die Nachricht eines Agenten antwortet, holt diesen Agenten ohne @. Das ändert Konzept Regel 1.
- Arbeitsliste neu geschrieben, alte unter `docs/archive/WORKLIST-20261119.md`.

## 19.11.2026 (Mehr Platz im Projektchat)
- Auf dem Handy zeigt die Team-Leiste zuerst kleine Bilder mit Arbeitsstatus. Namen, Jobs und Team erweitern lassen sich über „Team“ aufklappen. Chat und Aufgaben sind immer erreichbar.

## 19.11.2026 (Lesbare Kopfzeilen)
- Auf dem Handy stehen Name oder Überschrift und der passende Knopf unter der Leiste mit Zurück und SCHMAQQ Studio. Lange Namen und Titel brechen um.

## 18.11.2026 (Passwort und Wortmarke)
- Studio-Konten werden nur mit E-Mail eingeladen. Der Inhaber kann Konten einladen und entfernen. Ein neues Passwort setzt die Person selbst über den Link an ihre E-Mail-Adresse.
- Die SCHMAQQ-Wortmarke verwendet das Originalzeichen und die rote Welle, die sich vom Berührungspunkt ausbreitet.

## 18.11.2026 (Konto und Orientierung)
- Das Konto hat eine Übersicht und einzelne Bereiche für Profil, Sicherheit, KI-Zugänge und Daten. Die Teamverwaltung bleibt dem Inhaber vorbehalten.
- Menschen können ihr eigenes Profilfoto speichern oder entfernen. Studio zeigt es im Team und Chat. Der Server prüft, wer es abrufen darf.
- Die Wortmarke führt zu Start. Eine kurze Bewegung und der bedingte Scroll-Pfeil helfen bei der Orientierung.

## 18.11.2026 (Datenauszug und Navigation)
- Mitglieder sehen beim Auswählen von Studio-Konten deren Namen. E-Mail-Adressen anderer Konten sieht im Datenauszug nur der Inhaber.
- Das Handymenü hat einen Schließen-Knopf. Alte Links zu archivierten Projekten öffnen den Archivhinweis.

## 18.11.2026 (Projekteinladungen)
- Studio-Konto und Teilnahme an Projekten sind getrennt. Beim Anlegen ist nur die Person dabei, die das Projekt anlegt, plus die ausgewählten Studio-Konten.
- In der Projektinfo kann die Projektleitung Menschen dazunehmen, Rollen ändern, Menschen herausnehmen und ein neues Konto direkt für ihr Projekt einladen. Der Inhaber kann unter Mein Konto auch ohne Projekt oder für mehrere Projekte einladen. Die Einladung schaltet die ausgewählten Projekte beim Annehmen frei. Bisherige Projektmitglieder bleiben dabei.

## 18.11.2026 (Nacht)
- **„Bei uns ansehen“** (Owner: „erstmal lokal aufm VPS, erreichbar zum Anschauen“): Nach jedem Übernehmen baut Studio
  den gemeinsamen Stand und zeigt ihn unter `studio-preview.schmaqq.com/ansehen/<name>-<schlüssel>/`. Eigene Domain
  (kein Zugriff auf Studio-Anmeldungen), Schlüssel macht die Adresse unerratbar, „Neuer Link“ widerruft. Zunächst nur
  Websites mit Build-Ausgabe. Eigener Hoster (Hostinger u. ä.) ausdrücklich später.

## 18.11.2026 (später Abend)
- **Einrichtung verschwindet in Fragen** (Owner: „was ist mit Server vorbereiten gemeint?“): Statt einer Checkliste fragt
  Studio nur „Wo liegt euer Code?“ (Neu anfangen / Vorhandener Code) und richtet den Arbeitsplatz des Teams selbst ein.
  Ohne Tests (leerer Code): „So anfangen“, später „Neu einrichten“.
- **Erst fragen, wenn es gebraucht wird:** „Wie kommt eine Änderung online?“ beim ersten Übernehmen; die eigene
  ChatGPT-Verbindung fürs Programmieren in der Aufgabe, wenn Otto das erste Mal für einen arbeiten soll.
- **„online“ statt „live“**; „Server vorbereiten“, „Probelauf“, „Programmierläufe“ gibt es in der App nicht mehr.

## 18.11.2026 (Abend)
- **Oberfläche neu aus der Liste gebaut** (Owner: „wir haben auf eine alte Oberfläche eine neue aufgedrückt … mach das endlich
  ordentlich“). Verbindlich ist [OBERFLAECHE.md](OBERFLAECHE.md); die alte Oberfläche, ihre 16 Stylesheets und die
  „Bisherige Ansicht“ sind gelöscht, nicht versteckt. Der Test `studio-surface.test.mjs` erlaubt nur die Dateien der Liste,
  ein Stylesheet und keine verbotenen Begriffe.
- **Menschen reden und geben frei.** Kein Datei-Editor, keine Testknöpfe, kein eigenes ChatGPT als Connector in der App.
- **Code läuft auf dem Server.** Wo gearbeitet wird, bleibt eine Angabe des Projekts, damit ein eigener PC später dazukommt.
- **Wissen, Rollen, Daten herunterladen, Archiv** bleiben, in Projektinfo bzw. Mein Konto.
- **Auch Menschen stellen höchstens sechs ein, pro Job einen** (Server prüft es wie beim Einstellen durch Herrn Grau).

## 18.11.2026
- **Firma statt Rechteliste** (#109): Die Rolle bestimmt den Job (Entwicklung ändert Code, Recherche sucht im Web,
  Prüfung prüft). Herr Grau plant, verteilt und stellt ein, programmiert und recherchiert nicht selbst. Höchstens 6 im Team, eine Person pro Rolle.
- **Alle Agenten auf dem günstigsten Modell, niedrige Stufe**; Recherche nutzt die eingebaute Websuche (#111).
- **Der Ablauf hängt zusammen:** Beim Annehmen eines Plans legt bei jeder Aufgabe der genannte Kollege los („Mensch“ wartet).
  Jede Aufgabe ist eine eigene Kette. Endet Ottos Programmierlauf, schreibt er ins Gespräch der Aufgabe, was er geändert hat
  oder warum es nicht ging; hat er etwas geändert und gibt es eine Prüfung im Team, wird sie sofort gefragt und liest genau diese Änderung.
  Freigeben bleibt beim Menschen.
- **Agenten-Dienst kommt mit dem Deploy** und prüft beim Start, ob Websuche und Stufe greifen; sonst startet er nicht
  (alter Stand wird wiederhergestellt). Nichts fällt still weg.

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
