# Vorarbeit: Studio-Einstieg für den nächsten Tag

## Umgesetzt

Die drei Befunde der gezielten Terra-Prüfung sind lokal bearbeitet:

- `ProjectStart` nennt den aktuellen Weg über die Projekteinstellungen und
  bietet im aktuellen Studio einen direkten Knopf zur Rechnerverbindung.
- Der Bereitschaftsknopf lädt die bestehenden Bereitschaftsdaten, zeigt die
  vorhandene `ProjectReadiness`-Übersicht und setzt Fokus/Scroll auf sie.
  Ohne Rechner benennt er den fehlenden Schritt und bietet den direkten Einstieg
  zur Registrierung. Es wird kein Git-Check oder Runnerjob gestartet und kein
  erfolgreicher Zugriff erfunden. Ladezustand und Fehler werden angezeigt.
- Die Repository-Adresse ist als „gespeichert · keine Zugriffsbestätigung“
  bezeichnet. Direkt daneben lässt sich der Einrichtungsstand öffnen. Bereits
  vorhandene Git-Prüfungen werden dadurch nicht als ungeschehen bezeichnet.

Keine Backend-, Auth-, GitHub- oder Providerrechte geändert. Der vorhandene
Freigabe-Fix und dessen Nachweise bleiben erhalten.

## Gezielt ausgeführte Prüfung

TypeScript (`tsc --noEmit --incremental false`), Vite-Build und Source Guard
bestanden. Der bereits bekannte Bundlegrößenhinweis bleibt nicht blockierend.

`scripts/onboarding-start-browser.py` prüfte auf einem frischen isolierten
Server nur drei betroffene Klickwege: Repository-Hinweis nach Speichern/Reload;
aktueller Hilfetext und tatsächlich fokussiertes Runnerformular; aktive
Bereitschaftsübersicht mit fehlendem Rechner/Git-Nachweis bei unvollständigem
Formular. **3/3 PASS**, keine JavaScript-Ausnahme. Keine Geräte oder Jobs erzeugt.
Originale: `.studio/terra-onboarding/20261028-onboarding-fix/focused-browser/`.

Die erste Aufnahme nach dem Wechsel von Desktop- auf Mobilgröße erfasste eine
laufende Navigationstransition. Deshalb wurde ausschließlich diese mobile
Bereitschaftsansicht noch einmal mit frisch gestartetem 390px-Kontext betrachtet:
PASS, kein Seitenüberlauf, Screenshot `05-readiness-mobile-fresh.png` zusätzlich
visuell angesehen. Die Aufnahme nach Resize wartet künftig auf die Transition;
keine Produktänderung oder komplette Testsuite daraus abgeleitet.

Die 187 früher bestandenen Quelltests, 21 Browsergruppen und sieben
Freigabe-Regressionsfälle wurden **nicht wiederholt**. Ihre Nachweise werden
für unveränderte Bereiche übernommen, nicht als heute neu ausgeführt ausgegeben.

## Terra-Nachprüfung und Grenzen

Der vorhandene Terra-6.1-Mittel-Agent konnte seine interaktive Nachprüfung nicht
ausführen: IAB war nicht verfügbar; Computer Use konnte die Adresse des eigens
isolierten sichtbaren Edge nicht zuverlässig bestimmen und beendete den
Alternativversuch vor Eingaben. Persönliche Profile wurden nicht verwendet.
Originaler Bericht: `.studio/terra-onboarding/20261028-onboarding-fix/Nachtpruefung_Terra.md`.
**Die drei deterministischen Browsernachweise sind kein Terra-PASS.**

Echte GitHub-Anmeldung, persönliche Repository-Rechte, erste Runnerinstallation
und echter GitHub-Push bleiben offen. Keine APIschlüssel/Modell-APIs, Installation,
externe Veröffentlichung, Merge oder Deployment. Testzugänge und Daten bleiben
privat außerhalb des Git-Index. Tests zeigen technische UI-Reaktionen, nicht die
Verständlichkeit für einen menschlichen Erstanwender.

## Morgen

[Kurzer Einstieg und Abnahmeschritte](../START_MORGEN.md). Der Nutzer kann mit
„Weiter mit der echten GitHub- und Runner-Einrichtung“ fortsetzen. Zuerst Studio-
Stand und freigegebenes Testrepository festlegen; vorhandene Zugänge/Runner
wiederverwenden und persönliche Zustimmung vom Nutzer durchführen lassen.
