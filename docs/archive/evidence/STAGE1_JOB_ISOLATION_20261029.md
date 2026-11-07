# Stufe 1: Isolation pro Auftrag auf dem Server-Worker – Nachweis

Datum 29.10.2026, Owner-GO im Chat („Ja, live“) nach vorgelegtem Plan.

## Umgesetzt

- Projektcode (Tests `check`, Vorschau-Build) läuft nicht mehr als `schmaqq-worker`, sondern
  über den **Job-Starter** `schmaqq-worker-launcher.service` als eigener Nutzer `schmaqq-job`
  in **einer kurzlebigen systemd-Unit pro Auftrag** (`schmaqq-job-<zufall>`).
- Die Job-Unit sieht nur ihre Arbeitskopie: `/var/lib`, `/etc/schmaqq-worker`, `/run`, `/opt`
  usw. sind leere schreibgeschützte tmpfs, nur die eine Kopie ist zurückgebunden und schreibbar.
  Kein direktes Netz (nur Egress-Proxy), kein AF_UNIX, eigene Limits (2 GB, 1,5 CPU,
  256 Prozesse, Laufzeitgrenze), keine Capabilities.
- Der Job-Starter (root) lauscht nur auf `127.0.0.62:3129`, verlangt einen Schlüssel
  (`/etc/schmaqq-worker/launcher.key`, 0640 root:schmaqq-worker – für Jobs unlesbar), nimmt nur
  direkte Unterordner des Arbeitskopie-Bereichs an, löst Programme selbst auf, erlaubt keinen
  zweiten gleichzeitigen Auftrag und beendet die Unit, wenn der Aufrufer abbricht.
- Git bleibt im Runner (Hooks deaktiviert). Dauerhaft laufende Vorschau-Server sind auf dem
  Server-Worker gesperrt (sie liefen sonst am Job-Starter vorbei). PCs ohne Job-Starter: unverändert.
- Gemeinsame Gruppe `schmaqq-jobs` (Worker + Job) nur für Lese-/Schreibzugriff auf Kopien.

## Live und geprüft

- Worker-Programm: Quelle `bff29518d6fb3b952094a6eef37726da8b10f547`, Archiv-SHA256
  `9f3a8ded24311a4bff1376f47c085d26322ea23d2008e9051e56fc13d1fbe9b6`, verify-release PASS.
  Studio unverändert auf `9f1bf1f…`. Rückweg Worker: `7c379ef…` (automatischer Rollback war vorbereitet,
  wurde nicht gebraucht).
- **Pflichtprüfung Job-Sandbox 10/10 PASS** (als echter Job über den Job-Starter): läuft als
  `schmaqq-job`; Worker-Konfiguration und Token ENOENT; Launcher-Schlüssel ENOENT; andere Kopien
  unsichtbar; Runner-Zustand und Repositories ENOENT; Job-Starter, Internet und DNS direkt gesperrt;
  Studio über Proxy 200.
- Worker-Sandbox-Probe 29/29 PASS; Worker meldet sich bei Studio.
- Echter `check` in der Pilot-Arbeitskopie über den neuen Weg: completed, 1/1 bestanden;
  Job-Units im Journal sichtbar.
- Lokal: 249 Tests, 228 PASS, 0 FAIL, 21 Plattform-Skips. Systemd-Teil nur auf dem VPS prüfbar.

## Grenzen

- Tests, die selbst `git` brauchen, funktionieren im Job nicht (Repository unsichtbar).
- Der Runner selbst kennt weiterhin alle eigenen Kopien und den Token; er führt aber keinen
  Projektcode mehr aus. Eine Lücke im Runner-Code wäre der verbleibende Weg.
- Für Teamfreigabe (Markus nutzt den Server) fehlen noch: Freigaben pro Person/Projekt,
  Kontingente und getrennte Git-Zugänge (NETWORK_ROADMAP, Stufe 1 Rest).
- Kernel-Lücken bleiben Restrisiko jeder Prozess-Sandbox.
