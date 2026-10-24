# Linux Attestierungstest korrigiert

Stand: 24.10.2026. Testfix auf privatem Fixbranch veröffentlicht; Linux-Lauf als Nicht-Root bestanden. Root-spezifischer Chown-Zweig bleibt offen.

## Befund

Der vom Nutzer übergebene Operatorbericht nennt 172 Tests, 168 PASS, 1 FAIL und 3 SKIP. Der fehlgeschlagene Test erwartet einen Root-Eigentumsfehler, erhält aber `REVIEW_UNKNOWN_OR_MISSING_FIELDS`. Das ist ein gelesener Bericht, kein in diesem Auftrag wiederholter Linux-Lauf.

Die bisherige Fixture schreibt ausschließlich `{"format":1}`. Bei einem Root-Lauf sind das neue Verzeichnis und die neue Datei tatsächlich Root-eigen. Die unveränderte Prüflogik kann dadurch bis zur Inhaltsprüfung gelangen und weist den unvollständigen Inhalt korrekt zurück. Der Test bildet die behauptete Nicht-Root-Selbstbestätigung dann nicht ab.

## Begrenzte Korrektur

Nur `selfhost/r24-h3-scoped-recovery.test.mjs` wird fachlich geändert:

- Eine vollständige Attestation wird an die tatsächlich erzeugte synthetische H2-Evidence gebunden. Ihre inhaltliche Gültigkeit wird vor dem Dateitest bestätigt.
- Bei UID 0 werden ausschließlich die neu erzeugte Testdatei und ihr neues temporäres Verzeichnis an UID/GID 65534 übertragen. Außerhalb eines Root-Laufs sind sie bereits Nicht-Root-eigen.
- Der Test bestätigt Nicht-Root-Eigentum ausdrücklich und verlangt danach genau `ROOT_ATTESTATION_PARENT_REQUIRED`.
- Der unvollständige Inhalt `{"format":1}` wird separat im plattformunabhängigen Vergleich als Schemafehler geprüft.

Das Produktionsmodul, dessen Eigentums-/Rechteprüfungen und die Release-Sicherheitsgrenzen bleiben unverändert. Keine breitere Fehler-RegEx und kein zusätzlicher Skip für den fehlerhaften Fall. Der Root-Zweig benötigt echte Chown-Berechtigung; fehlende Berechtigung darf weiterhin als Testfehler sichtbar werden.

## Ausgeführt und offen

Selbst ausgeführt unter Windows: 12 fokussierte Tests, 2 PASS, 0 FAIL, 10 ausdrücklich Linux-spezifische Skips; Source Guard und `git diff --check` PASS. Auf `srv1365337` als `dc-remote` (UID 1001, Node 24.22.0) bestand der fokussierte Linux-Lauf mit 12 PASS, 0 FAIL, 0 SKIP. Der vollständige Linux-Gate-Lauf bestand mit Source Guard (341 Dateien), 172 Tests: 169 PASS, 0 FAIL, 3 ausdrücklich nicht zutreffende Plattform-Skips; TypeScript und Frontend-Build PASS. Der Lauf endete mit Exitcode 0. Der Root-Zweig, der die neu erzeugten synthetischen Pfade an UID/GID 65534 übergibt, wurde nicht ausgeführt, da das verbundene Konto kein Sudo hat. Ein echter Root-Lauf bleibt deshalb offen. Die Protokolle liegen im isolierten temporären Linux-Verzeichnis und enthalten keine Produktionsdaten.

Der Fix wurde auf dem privaten Branch `fix/linux-attestation-fixture-20261024` veröffentlicht. Fixcommit: `2f030633fdc63f408053efe04e744b3718a349cc`. Das isoliert übertragene Git-Bundle hatte lokal und remote denselben SHA-256: `1405dea0096b29d14448bcfa4dccabbaba30d5c1cb1aaff0de2c4d928da021aa`. Root-/Chown-Lauf, neues Release-Archiv, Backup-/Restore-Lauf, Live-Schema-Kompatibilität, Marco-Kontoprüfung und Deployment bleiben offen.

Die automatische Freigabeprüfung lehnte die breite Veröffentlichung von `docs/STATUS.json` wegen interner Betriebsmetadaten ab; die Datei wurde nicht übertragen. Keine alternative Veröffentlichung dieser Datei wurde versucht. Keine Produktions-, Konto-, Datenbank- oder Dienständerung.

## Nächster konkreter Schritt

Den Root-spezifischen Regressionstest zusätzlich durch einen berechtigten Linux-Operator wiederholen lassen. Danach den vollständigen sauberen Release- und Recovery-Gate-Lauf mit neuem Quellcommit/Archivhash vorbereiten. Das alte gepinnte Paket bleibt unverändert; dessen ursprüngliches Linux-Gate schlug laut Operatorbericht fehl und es darf nicht als freigegeben behandelt werden.

Quellen: exakter lokaler Testdiff gegen die bisherige Quellbasis, `selfhost/deploy/r24-h3-scoped-recovery.mjs` Eigentümerprüfung und `compareAttestation`, Nutzerbericht vom 24.10.2026, eigene fokussierte Testausgabe und Freigabeprüfungsantworten. Frühere Windows-/Runtime-/Mobile-Erfolge ersetzen den offenen Linux-Nachweis nicht.
