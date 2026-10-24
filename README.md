# SCHMAQQ Studio Mobiler Erstzugang und Releasevorbereitung

Stand: 24.10.2026. Einstieg für Hermes zum aktuellen Nutzerauftrag: funktionierenden Studio-Kandidaten prüfen und kontrolliert auf `studio.schmaqq.com` bereitstellen; erster persönlicher Zugang für `marco@schmaqq.com`, insbesondere am Handy.

## Das exakte Paket

Dateien in diesem Verzeichnis:

- `SCHMAQQ_STUDIO_HERMES_20261024.zip`
- `SCHMAQQ_STUDIO_HERMES_20261024.sha256`
- `HERMES_AUFTRAG.md` zum direkten Lesen
- `MOBILTEST.md` für Marco
- `candidate.json` mit Herkunft und tatsächlichen Prüfergebnissen

ZIP SHA256:

`9fb69c803eef2d53d07b7f13dacacee55f9f2375b1bb27f2b8cd839e70c59345`

Runtime-Quellcommit im Paket:

`41d9f30245fa056b52042181eb7ddadedbc7ff8d`

Die Runtime und die vollständige versionierte Quelle liegen im ZIP. Dessen Git-Bundle ermöglicht den exakten Checkout. Dieser Übergabebranch enthält ausschließlich das Paket und seine Anweisungen. Für Build und Deployment die gepinnte Quelle beziehungsweise das Runtimearchiv aus dem ZIP verwenden. Nicht auf main oder einen anderen Kandidaten ausweichen.

## Vorgehen

1. Mit bereits berechtigtem GitHub-Zugang dieses private Repository lesen. Der Link allein vergibt keinen Zugriff; keine neue kostenpflichtige API und keinen Token in den Chat kopieren.
2. Diesen Übergabestand auf eine konkrete GitHub-Commit-ID pinnen und genau diesen Stand beziehen. Branch: `handoff/studio-mobile-pilot-20261024`.
3. In `docs/operator-handoff/2026-10-24` die ZIP-Prüfsumme prüfen. In ein neues separates Verzeichnis entpacken; vorhandene Daten nicht überschreiben.
4. `HERMES_AUFTRAG.md` aus dem verifizierten ZIP vollständig lesen und ausführen. Er enthält Linux-Prüfung, aktuelles Live-Preflight, Backup/Restore, Kontoerhalt, kontrollierten Dienstwechsel und Rückweg. Etwaige konkret fehlende Freigaben oder Schemaänderungen vor dem betreffenden Schritt benennen.
5. Privaten Zugang für `marco@schmaqq.com` prüfen beziehungsweise passend zum bestehenden Kontozustand vorbereiten. Anmeldung verwendet ein eigenes Studio-Passwort. Setup-/Einladungstokens nicht im Releasebericht ausgeben.
6. Tatsächlichen Live- und Kontostand sowie mobile Abnahme berichten. Ein öffentlicher Health-Status oder synthetischer Login beweist Marcos persönlichen Zugang nicht.

Optionaler Bezugsweg in einem neuen autorisierten Arbeitsverzeichnis:

```sh
git clone --single-branch --branch handoff/studio-mobile-pilot-20261024 \
  https://github.com/Spezzo-sudo/schmaqq-workspace.git studio-handoff
git -C studio-handoff rev-parse HEAD
```

Den zurückgegebenen Commit mit dem vom Owner übergebenen unveränderlichen GitHub-Link abgleichen und bei Abweichung den genauen dort genannten Commit auschecken. Danach im obigen Paketverzeichnis:

```sh
sha256sum -c SCHMAQQ_STUDIO_HERMES_20261024.sha256
```

## Verifizierter und noch offener Stand

Neu lokal ausgeführt: 151 Tests PASS, 0 FAIL, 21 explizite Linux-Skips; Source Guard, TypeScript und Build PASS. Runtimearchiv/Manifest/Quelle geprüft. Synthetischer Runtime-Smoke und mobiler Konto-/Aufgaben-/Wiederanmeldelauf bestanden. Öffentliche aktuelle Anmeldeseite unangemeldet auf 390/360 Pixel geprüft.

Noch offen sind exakte Linux-/Recoveryprüfung, Live-Datenkompatibilität, persönlicher Marco-Zugang und dessen echter Handytest. Hier wurde kein Deployment durchgeführt. Die 30 Designansichten im ZIP sind statische Entwürfe und nicht als neue Anwendung vollständig implementiert. Der Kandidat ist die bereits funktionierende Studio-Anwendung mit dem dokumentierten Umfang.

Die GitHub-Hinterlegung wurde aktuell vom Nutzer ausdrücklich beauftragt. Sie ist kein Merge nach main und noch kein Nachweis einer erfolgten Bereitstellung. Die operative Ausführung und ihre Grenzen stehen im Hermes-Auftrag.
