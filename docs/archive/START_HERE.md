# SCHMAQQ Studio: Einstieg für einen neuen Chat

Stand: 22.10.2026. Repository: `Spezzo-sudo/schmaqq-workspace` (privat).
Aktueller Produktkandidat: Branch `local/studio-use-candidate-20261022`.
Dieser Stand ist separat von `main` und vom laufenden VPS-Dienst.

## Im neuen Chat verwenden

```text
Wir arbeiten an SCHMAQQ Studio / Workspace.
Lies im privaten GitHub-Repository Spezzo-sudo/schmaqq-workspace ausdrücklich
Branch local/studio-use-candidate-20261022, nicht nur den Standardbranch main.
Beginne mit START_HERE.md, AGENTS.md, docs/HANDOFF.md und docs/STATUS.json.
Für das Ziel Alltagseinsatz lies docs/GETTING_TO_DAILY_USE.md und nur die
relevanten S1–S5-Abschnitte von docs/ROADMAP.md.
Antworte auf Deutsch. Nenne zuerst den tatsächlich gelesenen Branch/Commit,
den belegten Stand, offene Punkte und den nächsten konkreten Produktschritt.
Wenn du auf das private Repository oder diesen Branch nicht zugreifen kannst,
sage das ausdrücklich und fordere die genannten Dateien an.
Keine weiteren Agenten oder Hilfsinfrastruktur ohne ausdrücklichen Auftrag.
Keine zusätzlichen kostenpflichtigen APIs, Schlüssel oder Credits.
Kein Merge, Deployment, produktiver Dienstwechsel oder Migration ohne neuen
aktuellen Auftrag. NetzKontor gehört nicht zu diesem Projektauftrag.
```

GitHub-Zugriff muss im jeweiligen Chat verfügbar und für dieses private
Repository berechtigt sein. Der Link allein überträgt keine Berechtigung.
Dieser Chatverlauf und die privaten Dateien des Laptops werden dadurch nicht
zugänglich. Falls der Chat nur den Standardbranch lesen kann, die relevanten
Dateien über die GitHub-Ansicht dieses Branches herunterladen und anhängen.

## Was nachvollziehbar ist

- Produktcode und feste Tests des lokalen Nutzungskandidaten.
- Ziel, Architektur, Roadmap, aktueller Übergabebericht und konkrete Restarbeit.
- Datierte Testzusammenfassung in `docs/evidence/USE_CANDIDATE_20261022.json`.
- Zwei-Host-Test mit Windows-Laptop und Linux-VPS in
  `docs/TWO_HOST_PILOT_PLAN.md`; Grenzen und fortgesetzte Testversuche sind benannt.

Die Zusammenfassungen dokumentieren ausgeführte Tests. Sie sind keine im neuen
Chat erneut ausgeführten Tests. Rohlogs, Testdatenbanken, temporäre Profile,
Snapshots und Screenshots unter `.studio/` bleiben lokal. Die übrigen lokalen
Modell-/Browserhelfer sind nicht Teil dieses Produktkandidaten. Die Arbeitsbasis
unter `C:/KI/` bleibt ein eigener lokaler Wissensbestand; relevante Erkenntnisse
stehen hier in den Übergabedokumenten, der Vault ist nicht vollständig gespiegelt.

## Belegter Stand und nächste Arbeit

Lokale Prüfung: 100 Backendtests PASS, 0 FAIL, 21 Linux-spezifische Skips;
Source Guard, TypeScript und Build PASS. 14 Browser-Runtime-Regressionstests
PASS. Sichtbarer Edge-Lauf: 7 Schritte PASS, Desktop und Mobilbreite 390px,
eigene Testprozesse beendet. Laufzeitcode und gebautes Frontend waren bytegleich
zum erfolgreichen Zwei-Host-Pilot. Details und Einschränkungen im Testbericht.

Production blieb beim letzten dokumentierten Test auf R23. Das ist ein
historischer Vorher-/Nachher-Nachweis, kein im neuen Chat frisch geprüfter Status.
Der persönliche reale Arbeitsdurchlauf und ein Release mit aktueller Sicherung,
Wiederherstellung und Rückweg bleiben offen. Danach folgen bei Bedarf die
umfassendere GitHub-Anbindung und dauerhafte zentrale Prüfungen.

Die Veröffentlichung dieses Branches bedeutet keinen Merge, keine Deployment-
Freigabe und keinen Nachweis, dass der Kandidat bereits live verwendet wird.
