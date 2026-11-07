# ADR-0004 — Gleichberechtigte Zusammenarbeit und portable GitHub-Eigentümerschaft

- **Stand:** 18.10.2026; abgestimmte Produkt- und Architekturvorgabe, Umsetzung noch nicht freigegeben.
- **Geltung:** SCHMAQQ Studio/Workspace und die angebundene SCHMAQQ-Plattform (historisches Repository `Spezzo-sudo/NetzKontor`).
- **Abgrenzung:** Dokumentationsentscheidung; keine Rechteänderung, kein Merge, keine Migration und kein Runtime-Go.

## Beschlossenes Ziel

1. **Vorläufige Eigentümerschaft:** `Spezzo-sudo/NetzKontor` und `Spezzo-sudo/schmaqq-workspace` bleiben zunächst am aktuellen GitHub-Standort. Keine neue Organisation, kein Fork-/Doppel-Repository und keine Umstellung von Runnern oder Deployments in dieser Phase.
2. **Spätere Zielorganisation:** Die Repositories sollen bei Bedarf in eine eigene, getrennt verwaltete SCHMAQQ-GitHub-Organisation übertragen werden können. Zwei reale Personen besitzen dabei eigene GitHub-Identitäten; niemals gemeinsame Login-Daten eines Sammelkontos.
3. **Gleiche fachliche Rechte:** Marco und Markus sind im gemeinsamen Studio-Zielmodell gleichberechtigte Partner. Kein dauerhaftes Sonder-Veto einer Person in der Entwicklungsoberfläche. Die gegenwärtige technische Studio-Owner-/Einladungsrolle und der persönliche GitHub-Repository-Owner sind **noch kein Beleg**, dass dies heute vollständig umgesetzt ist.
4. **Freies Entwickeln:** Jeder darf innerhalb freigegebener Projekte seine Aufgaben, eigenen Branches und Worktrees selbstständig bearbeiten, KI-Werkzeuge mit eigenen Berechtigungen einsetzen und Tests/Vorschauen starten.
5. **Gegenseitiger Review:** Normale Integration benötigt den zur Prüfung eingereichten exakten Stand, bestandene relevante Prüfungen, die aktuelle verständliche Vorschau/Funktionsabnahme sowie eine **andere** prüfende Person. Der Autor kann nicht seine eigene unabhängige Freigabe erteilen. Änderungen nach dem Review entwerten die betreffenden Freigaben.
6. **Separates Betriebs-Go:** Git-PR, Merge, Studio-Abnahme, Release-Freigabe und Deployment sind unterschiedliche Zustände. Die gegenwärtigen schärferen Runtime-/Provider-Gates von SCHMAQQ bleiben wirksam, bis ein eigener geprüfter Betreiberentscheid sie ersetzt. Kein automatisches Live-Deployment allein aus einem Studio-Review.

## Technische Sicherheitsgrenze: GitHub Free

Derzeit sind die privaten `main`-Branches in beiden persönlichen Repositories nicht durch GitHubs Branch Protection geschützt. Ein Prozesshinweis 'nicht direkt auf main' ist **keine** GitHub-seitig erzwungene Sperre.

Ziel für den kostenfreien Studio-Pfad:
- Persönliche Runner und reguläre Studio-Benutzer benötigen keine unbeschränkten Schreibrechte im zentralen Repository; bei Bedarf nur explizit begrenzten Lesezugriff.
- Ein **isolierter Veröffentlichungsdienst** übernimmt freigegebene Commit-/Branch-Artefakte, erstellt bzw. aktualisiert nur erlaubte Entwicklungsbranches und eröffnet PRs. Die Publikationsidentität und ihre Schreib-Tokens bleiben getrennt von Runnern, Nutzerprozessen und untrusted Code.
- Eine spätere Übernahme in `main` benötigt einen nochmals autorisierten, eng begrenzten Schritt mit Audit, genauem Commit-/Basisabgleich und dem gültigen Review-Gate; keine automatische Push-Eskalation.
- Vor einer behaupteten Sicherheitsgarantie alle alternativen Schreibwege inventarisieren: menschliche GitHub-Konten, GitHub-Apps, Deploy-Keys, CI, VPS-/Hermes-Zugänge und Agententokens. Ein GitHub-Owner oder kompromittierter Schreib-Token kann Studio ausserhalb des Standardprozesses umgehen.
- **Keine Behauptung**, ein Studio-Workflow ersetze technisch unveränderlich GitHub-Branch-Protection. Bei strengeren Anforderungen später native Branch-Regeln oder andere serverseitige Git-Gates prüfen.

Der konkrete Veröffentlichungsadapter ist eine **separate S3-Engineering-Änderung** mit Negativtests; diese ADR implementiert ihn nicht.

## Portabilitätsvertrag für beide Repositories

- Repository-Einträge über einen stabilen internen Projekt-/Servicebezug führen; extern GitHub-Repository-ID, aktuellen `owner/repo`-Namen, Git-Remote, Standardbranch, Installation/Permission-Scope und Anzeigenamen **getrennt** ablegen. Keine `Spezzo-sudo`- oder `main`-Annahmen in der Geschäftslogik erzwingen.
- Code/CI/Vorschau/Deployment bleiben an überprüfbaren Commit-SHA und Artefakt-Hashes gebunden; Repository-URLs dienen als auffindbare Referenz, nicht als alleinige Identität.
- Persönliche ChatGPT-/Codex-/GitHub-Identitäten, Studio-Mitgliedschaften und technische Runtime-Rollen bleiben getrennt. Ein GitHub-Owner-Wechsel darf keine Studio-Berechtigung stillschweigend verändern.
- Änderungen am Remote-Owner benötigen eine vorbereitete, rücknehmbare Migration mit Inventar zu: Remotes, Zugriffsrechten, GitHub-App-Installationen, Webhooks, Deploy-Keys, CI, Runner-Konfiguration, Hermes/VPS-Deploy-Pfaden, Statuslinks, Preview-Adressen, Redirects und Backups.
- Migration zuerst an einem isolierten Testprojekt nachweisen; dann explizite Umzugsfreigabe für **jedes** Repository. Bestehende Produktionspfade bis dahin unangetastet.
- `NetzKontor` bleibt historischer technischer Repositoryname, SCHMAQQ die öffentliche Marke. Website und Studio besitzen unterschiedliche Repositories, Daten und Release-Gates.

## Noch zu entscheiden, ohne den Pilot zu blockieren

- Konkrete Anzahl und Trennung der **Produktionsfreigaben**, inklusive Notfall-Rollback und Abwesenheit einer Person; bis dahin **bestehende** SCHMAQQ-Operator-/Owner-Gates nicht verändern.
- Wahl und Berechtigungsgrenzen des zentralen GitHub-Veröffentlichungsdienstes; insbesondere Umgang mit unvermeidbaren GitHub-Owner-Bypässen.
- Zeitpunkt/Name/Organisationsrollen des späteren GitHub-Transfers und getrennte Migrationsfenster beider Repositories.

## Anschluss

- Datensparsamkeit, externe Aufträge und visuelle Abnahme: [ADR-0005](0005-private-project-binding-and-preview-acceptance.md).
- Konkrete technische Arbeit: `docs/ROADMAP.md`, insbesondere S3 (GitHub-Anbindung) und S5 (echter Zwei-Personen-Pilot).
- Aktueller Funktionsnachweis: `docs/STATUS.json`; Pläne/ADRs sind kein Betriebsbeweis.
