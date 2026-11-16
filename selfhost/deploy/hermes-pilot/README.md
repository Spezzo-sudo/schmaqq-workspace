# SCHMAQQ Studio – Hermes-Pilot: kontrollierte VPS-Vorbereitung

**Stand:** 16.11.2026 · **Geltungsbereich:** srv1365337, ausschließlich Hermes-Testinfrastruktur · **Status:** nur vorbereitet, NICHT privilegiert installiert.

Ziel: zwei voneinander getrennte Betriebskonten für Studio-Agenten. Kein Agentenmodell, kein Login, keine Produktionsänderung. Der bestehende `hermes.service` mit Root-Rechten ist *nur Betriebs-Hermes*. Niemals für Endnutzer-Chat verwenden.

## Bereits überprüft

- Betriebssystem: Linux/systemd 255; Hermes Agent v0.20.5 ist unter `/opt/hermes-agent/venv/bin/hermes` lesbar.
- Verbundener Desktop Commander läuft als `dc-remote` ohne `sudo`, Docker oder systemd-User-Bus.
- Private Studio-R4-Vorschau funktioniert getrennt; `main`, Produktion und Worker bleiben unverändert.
- Zwei frische HERMES_HOME-Verzeichnisse mit separatem, leeren `HERMES_MANAGED_DIR` durchlaufen `hermes --version`.
- Die besondere Hermes-Eigenschaft **`-z` setzt HERMES_YOLO_MODE=1**. Deshalb sind nur enge Tool-Whitelists und serverseitige Freigaben akzeptabel.
- Shell-Syntax und `systemd-analyze verify` für das Paket geprüft. Eine unrelated Warnung betrifft eine BESTEHENDE Remote-Commander-Unit; diese nicht verändern.

## Kontrollsumme des geprüften Pakets

- `provision.sh`: SHA-256 `b8773c50bf8f9693dd53dd4839a5a9933716bd24aecda8203510aba380e64610`
- `schmaqq-hermes-pilot-preflight@.service`: SHA-256 `f024fd8b8ed8a6ee3ead70d6503f7900544e668a4ac5e3f9a55c866d735f09b8`

**Niemals** Shell-Code direkt aus dem vom normalen Benutzer beschreibbaren `/home/dc-remote` als root ausführen.

## Einmalige Aufgabe für den autorisierten Root-Operator

Nur nach Prüfung des Codes und Abgleich beider Kontrolldigests. Der Operator kann der bisherige Betriebs-Hermes sein, sofern Marco ihn *konkret* mit diesen begrenzten Schritten beauftragt. Keine Eigenänderungen oder Erweiterungen. Folgende Befehle gelten ausschließlich in einer autorisierten root-Sitzung auf `srv1365337`:

```bash
install -d -o root -g root -m 0700 /root/schmaqq-hermes-pilot-review
install -o root -g root -m 0700 /home/dc-remote/studio-r4-pilot/hermes-operator-kit/provision.sh /root/schmaqq-hermes-pilot-review/provision.sh
install -o root -g root -m 0600 /home/dc-remote/studio-r4-pilot/hermes-operator-kit/schmaqq-hermes-pilot-preflight@.service /root/schmaqq-hermes-pilot-review/schmaqq-hermes-pilot-preflight@.service
sha256sum /root/schmaqq-hermes-pilot-review/provision.sh /root/schmaqq-hermes-pilot-review/schmaqq-hermes-pilot-preflight@.service
bash /root/schmaqq-hermes-pilot-review/provision.sh
```

**STOPP**, wenn einer der beiden Hashes oben nicht exakt stimmt. Danach, und nur nach autorisierter Ausführungsfreigabe, kann der Root-Operator den begrenzten Infrastruktur-Schritt ausführen:

```bash
bash /root/schmaqq-hermes-pilot-review/provision.sh --apply
systemctl start schmaqq-hermes-pilot-preflight@a.service
systemctl start schmaqq-hermes-pilot-preflight@b.service
systemctl show schmaqq-hermes-pilot-preflight@a.service schmaqq-hermes-pilot-preflight@b.service -p Result -p ExecMainStatus -p MemoryMax -p User -p NoNewPrivileges -p ProtectSystem
```

Erwartet: zwei dedizierte Konten, zwei getrennte 0700-Verzeichnisse, bestandenes `hermes --version` unter je einer isolierten systemd-Unit. Die Units sind `Type=oneshot` und starten **keinen** Gateway, kein Sprachmodell, keinen Netzwerkdienst und keine automatische Folgearbeit. Keine vorhandenen Services neu starten. Keine Änderung an `main`.

## Rollback ohne Datenverlust

Bei einem Fehlschlag: nicht improvisieren, Status und Journal-Auszüge der **beiden neuen** Units liefern. Es wurde kein bestehender Dienst verändert. Über ein Entfernen von Nutzern/Verzeichnissen erst nach gesonderter Datenprüfung und Freigabe entscheiden. Bestehenden Betriebs-Hermes niemals neu starten, seine `/root/.hermes`- oder `/etc/hermes`-Secrets niemals kopieren.

## Nächste Entwicklungsstufe NACH bestandenem Preflight

1. Studio-Backend: legitimer Auftrag mit Benutzer- und Agentenbindung, idempotente SQLite-Queue, Status `queued/running/finished/failed/cancelled`, echte `verified-run`-Nachricht ausschließlich vom vertrauenswürdigen Backend.
2. Arbeiter pro Betriebskonto: liest nur eigene Aufträge über authentifizierten lokalen Zugang, verarbeitet seriell, harter Timeout, Speichergrenze, kein Shell-/Datei-/Web-Tool. Alle Tools zunächst `read-only`, genaue MCP-Whitelist statt `all`.
3. Benutzer meldet **selbst** OpenAI-Codex per Gerätecode an; Zugangstokens in eigenem 0700-Bereich. Keine geteilten Business-Sessions. Modell-/Abo-Voraussetzungen mit tatsächlicher Anmeldung verifizieren.
4. Egress über separat freigegebenen lokalen HTTPS-Proxy, niemals ungeprüft über die Produktions-Worker-Berechtigungen.
5. Echter Test: Agent Mara antwortet auf eine explizite User-Anfrage; zwei Konten strikt getrennt; keine Fake-Antworten; Abbrechen und Freigabeschranken werden im Backend getestet.

**Abnahme:** die Root-Vorbereitung ist nur „bereit“, nicht „Hermes in Studio funktionsfähig“. Erst nach diesen Entwicklungsschritten einen separaten End-to-End-Test freigeben.
