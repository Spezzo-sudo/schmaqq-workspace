# ADR-0001 — Modularer Workspace-Kern statt sofortiger Microservices
- **Status:** Vorgeschlagen (R1-Review, 17.10.2026)
- **Kontext:** Der aktuelle Studio-Prototyp verbindet Node/SQLite, React und persönliche Runner. Die Produktvision reicht über Softwareentwicklung hinaus.
- **Entscheidungsvorschlag:** Zunächst ein modularer Monolith für Identity, Collaboration, Orchestration und Artefakte. Getrennte persönliche Runner bleiben ausserhalb des Servers; klare fachliche Grenzen und typisierte Job-Verträge statt unabhängiger Services ab Tag 1.
- **Alternativen:** (A) bestehendes Einzel-Studio unverändert als Endarchitektur; (B) sofortige Microservices/Message-Bus; (C) komplett neues Greenfield-Produkt.
- **Begründung:** Wenig Betriebsaufwand für zwei Personen, vorhandenen Code weiterverwenden, geringere Komplexität und trotzdem definierte spätere Trennstellen.
- **Konsequenzen:** Grenzen dokumentieren und Tests pflegen; gemeinsame Datenbank zunächst akzeptabel, für unabhängige Kunden ist echte Tenant-Trennung vor Produktöffnung zwingend.
- **Nicht beschlossen:** Konkrete Paketpfade oder Datenbankmigrationen. Kein sofortiger Refactor.
- **Review-Auslöser:** tatsächliche Skalierungs-/Isolationserfordernisse, Teamzahl, neue Vertragsanforderungen.
