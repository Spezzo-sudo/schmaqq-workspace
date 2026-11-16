# Hermes-Pilot: Korrektur von 203/EXEC nach sicherem STOP

Stand: 16.11.2026 · [Issue #86](https://github.com/Spezzo-sudo/schmaqq-workspace/issues/86)

**Befund:** Beide frisch angelegten systemd-Preflight-Units schlugen mit `status=203/EXEC` / `Permission denied` fehl. `/opt/hermes-agent/venv/bin/hermes` hat einen Shebang `#!/opt/hermes-agent/venv/bin/python3`, dessen Symlink letztlich auf `/root/.local/share/uv/python/cpython-3.11.15-linux-x86_64-gnu/bin/python3.11` führt. `ProtectHome=yes` und die Root-Verzeichnisrechte blockieren diesen Interpreter. **Nicht** `ProtectHome` deaktivieren, Root-Verzeichnisberechtigungen lockern oder den alten Betriebs-Hermes umbauen.

## Lösungsweg

- Einmalig **nur die öffentliche Python-3.11.15-Distribution** (117 MiB) nach `/opt/schmaqq-hermes-pilot/runtime/python-3.11.15` kopieren, root-owned, lesbar/ausführbar für die beiden bestehenden Pilotdienstbenutzer.
- Die **bestehende** Pilot-Unit ersetzt den direkten Aufruf des Hermes-Skripts durch `/opt/schmaqq-hermes-pilot/runtime/python-3.11.15/bin/python3.11 /opt/hermes-agent/venv/bin/hermes --version` und setzt explizit `PYTHONPATH=/opt/hermes-agent/venv/lib/python3.11/site-packages:/opt/hermes-agent`. Die Hermes-Pakete bleiben root-owned und nur lesbar. **Keine 6,2-GB-Venv-Kopie**.
- Alle bestehenden Sandbox-Regeln bleiben erhalten: `ProtectHome=yes`, `NoNewPrivileges=yes`, `MemoryMax=512M`, `IPAddressDeny=any` mit `IPAddressAllow=localhost`, separates `HERMES_HOME`/Dienstkonto.
- Die Korrektur startet weder Einheiten noch Modelle. Nach Installation erst `a` prüfen; nur wenn `a` erfolgreich ist, `b` starten.

## Belegte Vorprüfungen (unprivilegiert, kein Produktionszugriff)

1. Die genaue Interpreter-Symlink-Kette wurde auf VPS `srv1365337` mit `namei -l`, `readlink -f` und Shebang-Prüfung ermittelt.
2. Original-Unit-HASH `f024fd8b8ed8a6ee3ead70d6503f7900544e668a4ac5e3f9a55c866d735f09b8` auf dem Server bestätigt.
3. Eine isolierte 117-MiB-Kopie der reinen Python-Distribution konnte Hermes v0.20.5 mit dem bestehenden (nur lesbaren) Python-Paketpfad starten: `hermes --version` **PASS**.
4. **Beide** unabhängigen `HERMES_HOME`-Verzeichnisse lieferten `hermes auth status openai-codex` → `logged out`. Keine fremden Tokens importiert, keine Modelle aufgerufen.
5. `bash -n` und `--apply`-freier Dry-Run der Korrektur **PASS**. `systemd-analyze verify` der neuen Unit bemängelt erwartungsgemäss die **noch nicht installierte** Python-Laufzeit; eine zusätzliche Warnung betrifft die unveränderte bestehende Remote-Commander-Unit. Der neue systemd-Test ist daher **noch offen**.

## Geprüfte Prüfsummen

- `fix-203-exec.sh` SHA-256: `9465055cef97a0c292c0044b363f31c4a351ebd3b7a3df213e2349e137277fbf`
- `schmaqq-hermes-pilot-preflight-v2@.service` SHA-256: `4f6f20708cd15572de05f24650d47233c3e5c20cb818bf9b8754a6023b8608aa`

## Für den autorisierten Root-Operator (nicht für dc-remote)

Diese Befehle nur nach persönlicher Prüfung des Inhalts; **alle Pfade sind konkrete Werte, keine Platzhalter.** Keine Änderungen an anderen Units oder Diensten.

In einer berechtigten Root-Sitzung auf `srv1365337`:

```bash
install -o root -g root -m 0700 /home/dc-remote/studio-r4-pilot/hermes-operator-kit/fix-203-exec.sh /root/schmaqq-hermes-pilot-review/fix-203-exec.sh
install -o root -g root -m 0600 '/home/dc-remote/studio-r4-pilot/hermes-operator-kit/schmaqq-hermes-pilot-preflight-v2@.service' '/root/schmaqq-hermes-pilot-review/schmaqq-hermes-pilot-preflight-v2@.service'
sha256sum /root/schmaqq-hermes-pilot-review/fix-203-exec.sh '/root/schmaqq-hermes-pilot-review/schmaqq-hermes-pilot-preflight-v2@.service'
bash /root/schmaqq-hermes-pilot-review/fix-203-exec.sh
```

**STOPP** bei jeder Abweichung zwischen den ausgegebenen und oben genannten SHA-256-Werten. Anderenfalls darf der Root-Operator die überprüfte, begrenzte Korrektur durchführen:

```bash
bash /root/schmaqq-hermes-pilot-review/fix-203-exec.sh --apply
systemctl start schmaqq-hermes-pilot-preflight@a.service
systemctl show schmaqq-hermes-pilot-preflight@a.service -p Result -p ExecMainStatus -p MemoryMax -p User -p ProtectHome -p NoNewPrivileges
```

Nur falls `a` `Result=success` und `ExecMainStatus=0` meldet:

```bash
systemctl start schmaqq-hermes-pilot-preflight@b.service
systemctl show schmaqq-hermes-pilot-preflight@b.service -p Result -p ExecMainStatus -p MemoryMax -p User -p ProtectHome -p NoNewPrivileges
```

`Type=oneshot`: nach erfolgreichem Abschluss **inactive/dead ist normal**; `Result=success` und `ExecMainStatus=0` entscheiden. Bei weiterem Fehler **sofort stoppen**, die genau fehlgeschlagene Unit und Exit-Status melden. Keine weitere manuelle Reparatur, kein Re-Start auf Verdacht, keine Root-Berechtigungen für Hermes-Anfragen.

## Noch nicht erledigt

Dies repariert **nur den Sandbox-Preflight-Test**. Es ist **kein** Hermes-Modellprozess, keine Authentisierung, keine Agentenantwort im Messenger und keine Freigabe für `main` oder Produktion. Weitere Implementierung über [Issue #86](https://github.com/Spezzo-sudo/schmaqq-workspace/issues/86).
