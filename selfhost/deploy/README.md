# Kleines Serverpaket

Dieses Paket enthält die fertig gebaute Oberfläche und den Node/SQLite-Server. Kein npm install, Docker-Build oder Projekt-Repository auf dem VPS nötig. Node >=24.15 muss bereits verfügbar sein. Die Runner bleiben auf den persönlichen PCs.

Noch keine Installation durchführen, bevor bestehende Dienste, freie Ports, Node-Pfad, HTTPS-Proxy und Zieladressen geprüft wurden. Die beigefügte systemd-Datei ist eine Vorlage; sie ersetzt keinen bestehenden Webserver.

1. Vorhandenen VPS per SSH prüfen. `node selfhost/deploy/preflight.mjs /geplantes/ziel` meldet Node, SQLite, Speicher und Portverfügbarkeit; es verändert keine Dateien oder Dienste. Für das Ziel einen bereits vorhandenen Ordner wählen.
2. Paket in ein neues Release-Verzeichnis unter `/opt/schmaqq-studio/releases/` entpacken. Den Dienstbenutzer `schmaqq-studio` ohne Login vorsehen. `/opt/schmaqq-studio/current` muss auf dieses Release zeigen.
3. Env-Vorlage nach `/etc/schmaqq-studio.env` übernehmen und zwei tatsächliche HTTPS-Adressen setzen. Vorhandenen Reverse-Proxy gezielt um Studio → 127.0.0.1:4310 und Vorschau → 127.0.0.1:4311 ergänzen. Zertifikate müssen für beide Adressen gültig sein; der Studio-Proxy muss JSON-Anfragen bis 9 MB zulassen. Vorhandene schmaqq.com-Routen erhalten.
4. Node-Pfad in der systemd-Vorlage mit dem vorhandenen Runtime-Pfad abgleichen. Der Dienst verwendet `/var/lib/schmaqq-studio` für SQLite, Setup-Link und Backups; dieser Pfad bleibt unabhängig vom Release bestehen. systemd legt ihn für den Dienst an.
5. Nach bewusstem Einrichten und Start des Dienstes zuerst `/healthz`, beide HTTPS-Adressen und anschließend den ersten persönlichen Login prüfen. Der private Setup-Link liegt im Datenverzeichnis. Niemals in öffentliche Protokolle oder Git kopieren.
6. Beide PCs mit dem HTTPS-Studio verbinden. Ein vollständiger Abnahmetest umfasst zwei persönliche Konten, getrennte Arbeitskopien, Tests, Teamprüfung, Runner-Neustart und Backup-Wiederherstellung in einer separaten Testinstanz.

Backup: als Dienstbenutzer mit `STUDIO_DATA_DIR=/var/lib/schmaqq-studio node selfhost/backup.mjs /var/lib/schmaqq-studio/backups/EINDEUTIG.sqlite` einen konsistenten SQLite-Snapshot erstellen und geschützt außerhalb dieses Servers sichern. Vor einem Update ein Backup erstellen. Ein älteres Programmrelease nur mit kompatiblem Datenbankschema verwenden; ein Rollback darf keine neueren Teamdaten überschreiben.

MemoryMax=256M und CPUQuota=50% sind zunächst Ressourcengrenzen für das kleine Dashboard, keine zugesicherte Kapazität. Unter echtem Zwei-Personen-Betrieb beobachten und bei Bedarf anpassen. Git, Codex, Tests und Projekt-Builds laufen auf den PCs.
