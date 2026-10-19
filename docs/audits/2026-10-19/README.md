# Produktionsaudit vom 19.10.2026

Dieses Paket macht den lokal durchgeführten Browseraudit für andere Chats mit GitHub-Zugriff zugänglich. Es betrifft ausschließlich **SCHMAQQ Studio / Spezzo-sudo/schmaqq-workspace**. NetzKontor ist nicht Gegenstand dieses Audits.

## Berichte

1. [AUDIT_REPORT.md](AUDIT_REPORT.md) – Ergebnis, Grenzen, Runnerprüfung, Zusammenarbeit und nächste Schritte.
2. [BUGS.md](BUGS.md) – fünf reproduzierte Befunde B01–B05 mit Schweregrad, Reproduktion, Erwartung, tatsächlichem Verhalten und Lösungsvorschlag.
3. [FUNCTION_MATRIX.md](FUNCTION_MATRIX.md) – 49 PASS, 5 FAIL, 19 BLOCKED, 11 NOT TESTED.

Die drei Berichte sind unveränderte Archivkopien der lokalen Auditdateien. Aussagen wie „dieser Ordner außerhalb des Repositorys“ und relative Verweise auf screenshots/, browser-logs/ oder test-artifacts/ beziehen sich auf den ursprünglichen lokalen Auditordner. **Diese Belegordner sind in diesem Dokumentationspaket nicht hochgeladen.** Es wurden keine Runnerprofile, Datenbanken, Zugangsdaten, Cookies, Auth-Tokens oder privaten ENV-Dateien hinzugefügt.

## Aussagegrenzen

Bewertung des geprüften Produktionszustands: **6/10, technischer Pilot verwendbar, echte Zwei-Personen-Abnahme offen.** Der im ursprünglichen Auftrag genannte Produktions-SHA wurde nicht unabhängig attestiert. Die Berichte beziehen sich auf den am Auditdatum tatsächlich ausgelieferten Browserzustand und die dort beschriebenen Runnerstände. Sie sind kein Nachweis späterer Fehlerbehebungen.

Die vollständige Netzwerkaufzeichnung war mit den verfügbaren Browserwerkzeugen blockiert. Markus wurde nicht simuliert; Mac-/Zwei-Personen-Abnahme, GitHub-End-to-End-Freigabe und autorisierte KI-Aufträge bleiben offen.

## Einstieg für einen anderen Chat

> Lies im privaten Repository Spezzo-sudo/schmaqq-workspace ausdrücklich auf Branch codex/studio-production-audit-2026-10-19 die drei Dateien unter docs/audits/2026-10-19/. Suche nicht nur im Defaultbranch. Erstelle auf Grundlage der tatsächlichen Befunde einen begrenzten Umsetzungsplan mit Reihenfolge, Abhängigkeiten und PASS/FAIL-Abnahmekriterien. Unterscheide bestätigte Fehler, fehlende Einrichtung und nicht getestete Funktionen. Kein Deployment, Merge, Kontoanlage oder Rechteausweitung. Neue Codearbeit auf eigenem Branch; NetzKontor bleibt unberührt.

## Veröffentlichungsumfang

Dieser Branch fügt ausschließlich die drei Auditberichte und diese Lesehilfe hinzu. Er ändert keinen Anwendungscode und keine Runtimekonfiguration. Die Veröffentlichung der Dokumentation erteilt keine Freigabe für Fixes, Pushes von Anwendungscode, Merge, Deployment oder kostenpflichtige KI-Aufträge. Der Defaultbranch wird durch den Dokumentations-PR nicht verändert.
