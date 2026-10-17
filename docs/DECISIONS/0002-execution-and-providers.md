# ADR-0002 — Agenten und Compute-Runner unabhängig halten
- **Status:** Vorgeschlagen (R1-Review, 17.10.2026)
- **Kontext:** Aktuell existieren persönliche Codex-/Git-Runner und ein lokal eingeschränkter Ollama-Zugriff. Langfristig sollen verschiedene KI-Provider und freiwillige externe Ressourcen verfügbar werden.
- **Entscheidungsvorschlag:** Steuerung, KI-/Tool-Adapter und Ausführung als separate **Verantwortlichkeiten** behandeln. Agent-Identität ist nicht Geräte-Identität; Aufträge enthalten Actor, Scope, Budget, Datenklasse und erlaubte Capabilities. Externe Ausführer erhalten nicht automatisch Host- oder Projektzugriff.
- **Alternativen:** alle KI-Aufrufe an einen Anbieter koppeln; direkt fremde Aufgaben in lokale Runner schicken; sofort dezentrale P2P-Verteilung.
- **Begründung:** Anbieterfreiheit, überprüfbare Freigabe, zukünftige Capability-Suche, Kostenkontrolle und Schutz vor Missbrauch.
- **Konsequenzen:** Zuerst nur persönliche/erlaubte Team-Ressourcen, später isolierte und überprüfte Worker. Keine geteilten persönlichen Codex-Sitzungen oder Weitervermarktung von Modellkontingenten.
- **Nicht beschlossen:** Compute-Protokoll, Abrechnungsanbieter, P2P-Technologie, Sandboxprodukt oder Preise.
- **Review-Auslöser:** zweiter echter Provider, externer Worker-Pilot oder erste zahlungspflichtige Jobs.
