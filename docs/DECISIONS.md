# Entscheidungsprotokoll

Kurz, datiert, verbindlich. Neue Entscheidungen oben. Was hier steht, gilt, bis ein neuer Eintrag es ändert.

## 22.11.2026 (Start als Zentrale, Gespräche im Projekt, „fürs Team sichtbar“)
- **Start ist die Zentrale** (Marco: „eine richtig gute Übersicht über die ganze Seite“): keine Projektspalte mehr daneben, auch auf dem Desktop nicht. Blöcke: Wartet auf dich, Gerade am Arbeiten, Projekte, Zuletzt bewegt, Dein ChatGPT (Kontingent und Verbrauch), Die letzten 7 Tage, Dein Team. Eine Abfrage `/api/overview` liefert alles; sie zählt nur, was die Person ohnehin lesen darf.
- **Im Projekt nur das Projekt**: links (Handy: Reiter „Gespräche“) alle Gespräche dieses Projekts: Projektchat, mit Agenten, mit Menschen, fürs Team sichtbare Chats anderer, Aufgaben. Andere Projekte erreicht man über „‹ Zentrale“.
- **Private Chats: Weg C** (Marco: „wir nehmen C“): jede Person entscheidet pro Chat, ob er privat bleibt oder **fürs Team sichtbar** ist. Mit einem Agenten entscheidet die Person allein, zwischen zwei Menschen müssen beide zustimmen. Sichtbar heißt: alle im Projekt lesen mit, nur die Beteiligten schreiben, Agenten lesen weiter nur den Projektchat. Gespeichert pro Chat in `workspace_meta` (`chat:v1:shared:…`), ohne neue Tabelle. Geprüft auf dem Server (`/api/room/chat`), nicht nur in der Oberfläche.
- **Kontingent**: ChatGPT schreibt in das Protokoll jedes Programmierlaufs, wie viel vom kurzen Fenster (einige Stunden) und vom Wochenfenster verbraucht ist. Studio liest das am Ende jedes Laufs mit und zeigt den neuesten Stand der eigenen Läufe auf Start („Stand <Zeit>“). Für Chat-Antworten gibt es diese Meldung nicht; ohne Programmierauftrag steht „Noch keine Angabe“.
- Handy und Desktop haben dieselben Funktionen, nur anders angeordnet.

## 20.11.2026 (Chat-Anmeldung selbst verbinden: gebaut)
- Wer in KI-Zugänge bei „Gespräche und Recherche“ auf „Mit ChatGPT verbinden“ tippt, bekommt einen freien **Platz** (eigener Benutzer und Dienst auf dem Server, beim Deploy einmal angelegt, Start mit 10). Der Dienst des Platzes führt die Geräte-Anmeldung aus, Studio zeigt Link und Code, danach beantwortet derselbe Dienst die Agenten dieser Person. Marcos bestehender Dienst bleibt fest ihm zugeordnet. Ausführlich: `docs/ENTWURF_CHAT_ANMELDUNG.md`.

## 20.11.2026 (Zwei Anmeldungen, jede Person selbst)
- **Beschluss (Marco):** Es bleibt bei **zwei Anmeldungen bei ChatGPT, und jede Person macht beide selbst**: (1) **Gespräche und Recherche**, (2) **Code ändern**. Beide einmalig pro Person, nicht pro Agent und nicht pro Projekt, beide in Mein Konto → KI-Zugänge. Niemand wartet darauf, dass der Inhaber etwas am Server einrichtet. Wer einen Agenten anstößt, zahlt mit dem eigenen Konto.
- **Ist-Stand:** (2) kann die Person selbst verbinden. (1) richtet heute der Betreiber von Hand ein (eigener Dienst und eigener Benutzer auf dem Server pro Person, `hermes auth add openai-codex`); nur Marco ist eingerichtet. Das ist die offene Lücke.
- **Ziel für (1):** „Verbinden“ in KI-Zugänge startet dieselbe Geräte-Anmeldung wie bei (2), aber für den Chat-Weg, mit einem eigenen, abgeschotteten Ordner pro Person. Ein gemeinsamer Chat-Dienst nimmt Aufträge für alle an und startet die Antwort jeweils mit dem Ordner der fragenden Person. Der Job-Starter arbeitet heute einen Auftrag nach dem anderen ab; ob Chat-Antworten darüber laufen dürfen oder ein eigener Weg nötig ist, wird vor dem Bau entschieden (Entwurf in `docs/`).

## 20.11.2026 (Verbrauch sichtbar)
- Studio liest am Ende jedes Programmierlaufs die Verbrauchszahlen von Codex (`turn.completed`: neu gelesen, aus dem Zwischenspeicher, geschrieben, Denkanteil), speichert sie im Ergebnis des Laufs und zeigt die Summe pro Aufgabe. Ohne Meldung keine Zahl; Läufe ohne Meldung werden nur gezählt. Eine Übersicht über Aufgaben und Zeit folgt, wenn echte Zahlen vorliegen.

## 20.11.2026 (Übergabepaket für Programmierläufe)
- Der Auftrag an Otto ist ein **Übergabepaket** in fester Reihenfolge: zuerst, was sich nie ändert (arbeite nur hier, lies nur Nötiges, nichts veröffentlichen), dann Aufgabe, „Fertig, wenn“ und Bereich, dann das **bisherige Gespräch der Aufgabe** (die letzten 8 Nachrichten von Menschen und Kollegen, mit Namen), zuletzt die Anweisung des Agenten. Die Anweisung steht hinten, damit das Kürzen sie nie wegnimmt. Gleicher Anfang heißt: der Anbieter kann seinen Zwischenspeicher nutzen.
- Agenten, die Otto beauftragen, schreiben hinein, was früher falsch war und was jetzt anders sein soll; er kennt sonst nur Aufgabe, Gespräch und Anweisung.
- **Nicht** Teil davon: die Sitzung der anderen Person (bleibt privat) und Änderungen in deren Arbeitskopie. Fortsetzen der Sitzung (Phase 4) folgt nach der Messung.

## 19.11.2026 (Modell und Denkstufe pro Agent, Modellkatalog)
- Jeder Agent hat sein **eigenes Modell und seine eigene Denkstufe**, getrennt für Gespräch und für Programmieren. Leer heißt Standard (Studio bzw. Codex). Vorher galt eine feste Liste (`STUDIO_AGENT_MODELS`) und für alle dieselbe Stufe; Ottos Programmierläufe bekamen gar keine Einstellung.
- Der **Modellkatalog** liegt in der App (Mein Konto → Studio verwalten → KI-Modelle), gefüllt aus dem Katalog des installierten Codex (`codex debug models`, 0.169.0). Geprüft wird nur die Schreibweise, nie gegen eine Liste. Ob ein Zugang ein Modell kennt, zeigt der Lauf (Fehler im Chat, „Nochmal“).
- Bestehende Profile hielten `gpt-5.6-sol`, liefen aber wegen der alten Liste mit `gpt-5.6-luna`. Damit nichts still teurer wird, wurden sie auf `gpt-5.6-luna` gesetzt.

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
