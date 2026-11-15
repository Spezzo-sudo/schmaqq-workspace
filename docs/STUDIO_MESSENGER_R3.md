# Messenger R3 – ein gemeinsamer Arbeitsplatz

**Stand: 15. November 2026.** Auf dem eigenen Branch `feat/studio-messenger-r3-20261115`, basierend auf PR #75. Kein Merge, kein Eingriff in Produktion, keine Datenbankmigration und keine Modellaufrufe.

## Ziel und Umsetzung

Studio wird nicht um eine zweite Agentenplattform erweitert. Der bestehende React-/Node-/SQLite-Arbeitsplatz erhält eine Messenger-zentrierte Informationsarchitektur. Bot HQ ist die Interaktionsreferenz; SCHMAQQ-Farben, Logo und die zwölf originalen Field-Guild-R2-Portraits bleiben erhalten. Es wurden keine Bot-HQ-Grafiken übernommen.

Der Projektbereich zeigt eine kompakte Gesprächs-/Kontaktliste, das ausgewählte Gespräch und bei Bedarf genau einen Detailbereich. Projekte wechseln über die Liste; globale Arbeit, Projekte, allgemeines Gespräch, Team, Konto und Hilfe bleiben im Workspace-Menü erreichbar. Beim ersten Einstieg wird das zuletzt berechtigte Projekt geöffnet, ausdrücklich verlinkte Seiten werden nicht überschrieben.

Der Chat bleibt während der Arbeit in den Projektwerkzeugen gemountet. Auf dem Smartphone wechseln Gesprächsliste und Chat als einzelne Ansichten; der Detailbereich ist ein fokussiertes Overlay. Eingabezeile und Ansichten reagieren auf die tatsächlich verfügbare Fensterhöhe.

## Funktionszuordnung – nichts parallel nachbauen

| Bestehende Funktion | Platz in R3 |
| --- | --- |
| Projektgespräch, Antworten, adressierte Beiträge | Zentrales Chatfenster mit eigenen Nachrichten rechts und Antwortzitaten |
| Personen und KI-Team | Kompakte aktuelle Gespräche; vollständiges Kontaktverzeichnis im zweiten Listenfilter |
| Themen, Aufgabenbezug, Koordinator-Übergaben | Bestehende Nachrichtenlogik; Zusatzangaben im Plus-Menü, aktive Adressierung weiterhin sichtbar |
| Nachrichten als Aufgabe oder Entscheidung | Kontextmenü an der Nachricht; per Tastatur und Touch erreichbar |
| Agentenprofile und Avatar-Konfigurator | Gemeinsamer Detailbereich; sämtliche bestehenden Profilfelder und Rechte bleiben erhalten |
| Aufgaben, Bearbeiten, Tests, Review und Vorschau | Aufgaben-Detailbereich und unveränderter bestehender Aufgabenablauf |
| Dateien und Arbeitskopien | Neuer Ordnerbaum vor dem bestehenden revisionengebundenen Runner-Dateieditor |
| Wissen, Entscheidungen, Links und Briefing | Detailbereich Wissen, bestehende Komponenten und APIs |
| Persönliche Modellaufträge und Kontextvorschau | Bestehender RoomAssistant im Bereich KI & Kontext |
| Projekt-, Repository- und Runner-Einrichtung | Detailbereich Einstellungen; die Einrichtung dominiert nicht mehr den Gesprächseinstieg |
| Allgemeines Gespräch, Team, Konto, Hilfe, Export | Bestehende globale Bereiche über das Workspace-Menü |

## Backend und Datenintegrität

- Nachrichten, Antwortbezüge, Profile und Aufgabenverknüpfungen bleiben in der vorhandenen SQLite-Struktur. Der neue Regressionstest startet den Server nach dem Schreiben neu und liest dieselben Daten mit einem zweiten Konto.
- Entwürfe sind nach Benutzer, Projekt und Gesprächsansicht getrennt. Der bisherige Schlüssel des Gruppenentwurfs bleibt kompatibel. Beim Ansichtswechsel werden Empfänger und Aufgabenbezug gemeinsam bestimmt; ein verzögertes Sende-Acknowledgement löscht nicht den Entwurf eines inzwischen ausgewählten Kontakts.
- Der Server lehnt eine Agenten-Übergabe ab, wenn der explizite Empfänger dem Übergabeziel widerspricht. Projektgrenzen, widerrufene Rollen und Idempotenz werden weiter serverseitig geprüft.
- Ein laufendes Modell allein ist kein Nachweis, dass eine bestimmte Agentenfigur arbeitet. Der Profilstatus berücksichtigt einen Lauf nur bei ausdrücklicher Agentenzuordnung.
- Der Dateibereich zeigt ausschliesslich eigene, abgeschlossene, nicht widerrufene Arbeitskopien des Projekts. Die ausgewählte Kopie bleibt beim Polling und beim Rückweg von einer Aufgabe stabil.
- Lesen, Anlegen und Speichern verwenden die existierenden Runner-Endpunkte, Pfadprüfungen und Revisionskonflikte. Kein Zugriff auf ein allgemeines Server-Dateisystem, keine neue Rechtefreigabe und kein zweiter Dateispeicher.

## Abnahme

### Automatisierte Prüfungen

Der vollständige Linux-Lauf `npm run studio:verify` bestand mit **337 Tests: 334 bestanden, 0 fehlgeschlagen, 3 übersprungen**. Source Guard, TypeScript und Vite-Build bestanden. Nach den Navigationskorrekturen wurde der fokussierte Satz erneut geprüft: **23/23 bestanden**.

`selfhost/messenger-r3.test.mjs` ergänzt neun Regressionen: sichere Gesprächs-URLs, Empfänger-/Themenwechsel, getrennte Entwurfschlüssel, Wiederanmeldung mit Detailansicht, eigene Arbeitskopien, Ordnerbaum, ehrliche Agentenaktivität, SQLite-Persistenz nach Neustart sowie Projekt-/Übergabegrenzen.

### Echte Browserprüfung, keine Fetch-Mocks

`tests/studio-messenger-r3.browser.py` prüft gegen den isolierten lokalen Node-/SQLite-Demodienst mit zwei Testkonten und zwei lokalen Beispiel-Runnern. Der Test verweigert Nicht-Loopback-Adressen und Konten ausserhalb `fixture.invalid`.

Geprüft wurden Anmeldung, getrennte Chatentwürfe, Profilbearbeitung mit persistierter Änderung, alle eingebundenen Projektbereiche, echte Dateiliste, Lesen, Speichern und Wiederladen, Rückweg vom Aufgabenablauf, Nachrichten beim zweiten Konto sowie mobile Navigation, Browser-Zurück und Overlay-Fokus. Keine JavaScript-Laufzeitfehler.

Ansichten: **1440 × 960**, **390 × 844** und ein reduzierter **390 × 470**-Viewport. Die reduzierte Höhe prüft die Layoutreaktion, ersetzt aber keinen Test mit einer echten Android-Bildschirmtastatur.

Belege liegen in `docs/evidence/messenger-r3/`: Desktop-Chat, Agentenprofil, Datei-Explorer, mobile Liste, mobiler Chat und maschinenlesbare Browserergebnisse. Alle dargestellten Inhalte sind eigens angelegte Testdaten.

## CI und Vorschau

Die CI-Erweiterung ist unter `docs/patches/STUDIO_CI_R3.patch` vorbereitet, aber **nicht angewendet**: Der verbundene GitHub-OAuth-Zugang besitzt keine `workflow`-Schreibberechtigung; GitHub hat den ersten Push mit der Workflow-Änderung abgewiesen. Der Code-PR enthält deshalb keine aktive Änderung an `.github/workflows/`. Der Patch erweitert den vorhandenen Lauf um gestapelte PRs und ein privates Full-Stack-Artefakt für 14 Tage, statt einen zweiten vollständigen Testlauf hinzuzufügen. Er muss gesondert mit einem berechtigten Zugang geprüft und übernommen werden. Der notwendige Build-vor-Avatar-Tests-Fix aus PR #77 in `selfhost/verify.mjs` ist dagegen unverändert übernommen.

Der normale Build verwendet das echte Backend. Nur der ausdrückliche Schalter `VITE_STUDIO_UI_PREVIEW=1` aktiviert die weiterhin klar gekennzeichnete Pages-UI-Demo. Eine erfolgreiche Pages-Veröffentlichung belegt daher **keinen** laufenden Staging-Server.

## Bewusste Grenzen

Kontaktansichten sind adressierte, **projektweit sichtbare** Beiträge; sie werden nicht als vertrauliche Direktnachrichten ausgegeben. Agentenübergaben sind nachvollziehbare Auftragsaufzeichnungen, keine automatisch gestarteten Modellschleifen.

Der Dateibereich bindet den vorhandenen Textdatei-Editor ein. Binäre Anhänge und vollständige PDF-/Office-Dokumentvorschauen wurden nicht als neue Funktionen hinzugefügt. Dateien und Vorschauen innerhalb der bestehenden Aufgabenabläufe bleiben erreichbar.

Die bestehenden Runner liefern keine belastbaren Tokenzahlen, Kontextfenster-Prozente oder verbleibenden Provider-Abokontingente. Die Oberfläche nennt diese Grenze, statt erfundene Verbrauchsanzeigen zu zeichnen.

Für dauerhaft öffentliches Full-Stack-Staging fehlen weiterhin ein gesondert freigegebener, persistenter Dienst mit eigener Datenhaltung, geschützter HTTPS-Zugang und ein begrenzter Deploy-Kanal. Dafür wurden weder der Produktivdienst noch DNS, Cloudflare Access oder Secrets geändert. Der erfolgreiche isolierte Backend-Test und das Release-Paket ersetzen diesen Betriebsschritt nicht.
