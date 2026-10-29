# Projekte unabhängig von der Programmiersprache einrichten

Lokaler Entwicklungsstand, 29.10.2026. Kein Live-Rollout. Auftrag und Grenzen:
[PROJECT_SETUP_WORK_ORDER.md](PROJECT_SETUP_WORK_ORDER.md).

## Ein Ablauf

In den Projekteinstellungen einen eigenen PC oder Server auswählen und **Projekt
prüfen**. Studio klont das Repository beziehungsweise verwendet dessen bestehende
Kopie und liest begrenzte Projektdateien. Dabei laufen keine Projektbefehle.
Der Vorschlag zeigt benötigte Programme, Vorbereitung, Test und Vorschau.
**Einrichtung bestätigen** speichert die Konfiguration. Ein geänderter lokaler
HEAD oder geänderte gelesene Projektdateien erfordern einen neuen Vorschlag.
Bestätigt wird eine Konfiguration, kein erfolgreicher Build oder Test.

Die automatische Erkennung bietet begrenzte Vorschläge aus Node-Testskripten,
bekannten statischen Builds, Make-Zielen `build-check`/`test`/`check` sowie
pytest-Konfigurationen. Ein Make-Ziel `build-bootstrap` wird als Vorbereitung
vorgeschlagen. Ein eindeutig literaler `--output "$(CURDIR)/..."` im Make-Ziel
`build` kann den statischen Ausgabeordner liefern. Das ist eine überprüfbare
Heuristik, kein vollständiger Make-/Python-Interpreter.

## Gemeinsame Konfiguration

Eine reguläre UTF-8-Datei **studio.project.json** im Repository-Root hat Vorrang
vor der Erkennung. Eine verbundene KI oder ein Entwickler kann diese Datei aus
den vorhandenen Build-/Testanleitungen erarbeiten. Alternativ lässt sich das
JSON unter **Erweiterte Projektkonfiguration** einfügen und prüfen, bevor es
ins Repository übernommen wird. Studio ruft dafür keinen neuen Modelldienst auf.

Beispiel für ein Python-Projekt mit Make-Vertrag (die Ziele und Ordner müssen
zum jeweiligen Repository passen):

```json
{
  "version": 1,
  "prepare": [["make", "build-bootstrap"]],
  "check": ["make", "build-check"],
  "requires": ["make", "python3"],
  "generated": [".venv-build", "build"],
  "preview": {"build": ["make", "build"], "directory": "build/site"}
}
```

`check` ist erforderlich. `prepare`, `requires` und `generated` sind optional
und standardmäßig leer. Befehle sind Argumentlisten, keine Shell-Zeichenketten.
Andere Sprachen/Buildsysteme nutzen denselben Vertrag, etwa `cargo test` oder
`./gradlew test`, sofern ihre Laufzeit vorhanden ist. Relative Programme wie
`.venv/bin/python` werden innerhalb der Arbeitskopie aufgelöst; Traversal wird
abgewiesen. Mehrere Vorbereitungsschritte stehen als einzelne Argumentlisten
in `prepare` (höchstens acht). Ein Arbeitsverzeichnis lässt sich bei Bedarf
über ein versioniertes Projektskript oder die Optionen des Buildsystems wählen.

Eine alternative Server-Live-Vorschau wird ausschließlich so beschrieben:

```json
{"version":1,"check":["node","--test"],"preview":{"serve":{"argv":["node","server.mjs"],"port":3000}}}
```

Statischer Build und Live-App sind alternative Vorschauarten. Die bestehende
Live-Isolation und Anforderung an `HOST`/`PORT` bleiben bestehen.

## Ausführung und Freigaben

- Die Programmprüfung prüft Präsenz/Ausführbarkeit im vorgesehenen PATH, ohne
  Programme auszuführen. Versionen, Python-Module, Compilerbibliotheken und
  erfolgreiche Paketdownloads sind dadurch **nicht** geprüft.
- Vorbereitung läuft vor jedem Test und vor jeder Vorschau erneut in der
  jeweiligen Aufgaben-Arbeitskopie. Sie muss wiederholbar sein. Kein Cache, der
  geänderte Abhängigkeitsdateien unbemerkt übergeht.
- Auf dem Server laufen Vorbereitung, Tests und Builds über denselben isolierten
  Job-Starter wie bisher. Im Repository-Klon mit Workerrechten läuft kein
  Projektcode. Keine automatische Systeminstallation oder Netzfreigabe.
- `generated` und der Vorschau-Ausgabeordner werden nur lokal als Git-Ausnahmen
  eingetragen. Bereits getrackte Dateien bleiben weiter prüfbar. Verändert die
  Vorbereitung den beobachteten Quellstand, stoppen Tests/Veröffentlichung.
- Veröffentlichung von Aufgabenbranches und persönliche Codex-Nutzung bleiben
  eigene Freigaben; die Planprüfung aktiviert sie nicht. Ein fehlgeschlagener
  neuer Plan verändert bestehende Freigaben nicht.
- Alte Runner werden über die gemeldete `setupPlanVersion` erkannt. Der Server
  sendet ihnen keine neuen Planaufträge. Alte Einrichtungsaufrufe bleiben möglich;
  sie übernehmen keine früheren Vorbereitungsschritte aus einem neueren Profil.

## Konkrete Grenzen beim Klimafinder-Praxistest

Klimafinders Make-Ziele werden jetzt als Konfiguration vorgeschlagen. Ein echter
Klimafinder-Build auf dem VPS ist **noch nicht nachgewiesen**. Make, Python, venv,
Python-Pakete und benötigte Downloadquellen müssen in der tatsächlichen isolierten
Umgebung separat geprüft werden. Die bestehende Standard-Allowlist enthält keine
PyPI-Quellen; sie wird durch diese Änderung nicht erweitert. Auch bestehende
Vorschaugrößen- und Quellrevisionslimits bleiben wirksam. Fehlende Voraussetzungen
werden nicht durch globale Installationen oder Sandboxlockerung umgangen.

Nächster Betriebsauftrag erst nach Prüfung/Freigabe: Studio **und** Worker auf
diesen Stand bringen, Umgebungsvoraussetzungen prüfen, dann Owner-Praxistest
fortsetzen. Die laufenden Klimafinder-Dienste bleiben außerhalb des Auftrags.
