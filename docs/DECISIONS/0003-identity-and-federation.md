# ADR-0003 — Identität, Mandanten und SCHMAQQ-Integration
- **Status:** Vorgeschlagen (R1-Review, 17.10.2026)
- **Kontext:** Die bestehende SCHMAQQ-Website und Studio besitzen eigene Repositories und Betriebsgrenzen. Das heutige Studio ist auf einen kleinen gemeinsamen Teamkontext ausgelegt.
- **Entscheidungsvorschlag:** Browser-Navigation und künftiges SSO erlauben eine einheitliche Marke, während Deployment, Datenhaltung und Autorisierung getrennt bleiben. Stabile interne Benutzer-/Workspace-/Service-IDs statt E-Mail oder Domain als Identität. Admin-Funktionen auffindbar und **serverseitig** geschützt.
- **Alternativen:** beide Systeme in ein Repo/DB zwingen; gegenseitige Session-Cookies lesen; zwei isolierte Passwörter dauerhaft ohne spätere Föderation; aktuell offene Selbstregistrierung.
- **Begründung:** sichere Grenzen, Unabhängigkeit von Domainwechseln und spätere Skalierung zu getrennten Kundenteams.
- **Konsequenzen:** OIDC/SSO braucht gesonderten geprüften Vertrag; erst Tenant-RBAC- und Negativtests vor öffentlicher Kundenöffnung. NetzKontor bleibt bis zum eigenen, freigegebenen PR unverändert.
- **Nicht beschlossen:** Domainnamen, Identity-Provider, Preispläne oder Migration von Benutzerdaten.
- **Review-Auslöser:** erstes echtes Cross-App-Login, erstes fremdes Kundenteam oder Repository-/Domain-Umbenennung.
