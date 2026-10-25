# SCHMAQQ Studio – Passwort-Wiederherstellung (R24-Nachfolger)

Status: implementierter und isoliert getesteter Kandidat, **kein Production-GO**.
Basis ist der unveränderte produktive R24-Quellstand; verbindliche Identität
über Git und Release-Metadaten prüfen.

## Ablauf und Schutz

- „Passwort vergessen?“ nutzt die im bestehenden Studio-Konto gespeicherte E-Mail.
  Unbekannte E-Mails und bekannte Konten erhalten dieselbe öffentliche Antwort.
- Reset-Link: 32 kryptografisch zufällige Bytes (256 Bit), Base64URL-kodiert,
  ausschliesslich der SHA-256-Hash wird in der vorhandenen Tabelle
  `workspace_meta` persistiert. **Keine Schemaerweiterung**.
- Genau ein aktiver Link pro Konto, 15 Minuten gültig, danach ungültig.
  Ein erneuter Request erzeugt währenddessen keinen weiteren Link.
- Höchstens drei ausgestellte Links pro Konto und Stunde (persistenter Begrenzer);
  zusätzlich speicher- und quellbegrenzte IP-/E-Mail-Drosselung im Prozess.
  Unvertraute `X-Forwarded-For`-Header werden nicht als Identität akzeptiert.
- Token steht ausschliesslich hinter `#reset=` (URL-Fragment). Das Fragment wird
  vor dem Laden der eigentlichen React-Oberfläche aus der sichtbaren URL entfernt.
  Die API nimmt das Token nur als JSON in einem same-origin-geschützten POST entgegen.
- Reset ist atomar: Passwort mit demselben gesalzenen scrypt-Format wie bei
  Registrierung aktualisieren, Token einmalig verbrauchen, **sämtliche Sitzungen
  löschen**, **Runner-/Geräte-Tokens widerrufen**, anstehende Jobs abbrechen.
  Eine unveränderte Kopie der Geräteberechtigungen gilt nicht weiter.
- Nach erfolgreicher Änderung folgt eine Benachrichtigung an die Konto-E-Mail.
  SMTP-Fehler werden ohne E-Mail-Adressen oder Geheimnisse geloggt.
- Kein Recovery-Token, SMTP-Passwort oder echter E-Mail-Inhalt in Git, Tickets,
  Chat, Screenshots oder dauerhaftem Testprotokoll.
- Bestehende Nutzer, Projekte, Aufgaben und Workspace-Kopien bleiben erhalten.

## SMTP: geschützter Betreiber-Schritt

Der derzeitige R24-Dienst besitzt **keinen konfigurierten Recovery-Mailversand**.
Daher bleibt die Funktion ohne Betreiberkonfiguration absichtlich nicht aktiv.
Es wird niemals die alte, anders gebrandete Sendedomain als stiller Ersatz genutzt.

Der Betreiber richtet per geschütztem Kanal unter
`/etc/schmaqq-studio.env` (root:root, ausschliesslich privat) diese Werte ein:

- `STUDIO_RESET_SMTP_HOST`: verifizierter SMTP-Host des eigenen Postfachs
- `STUDIO_RESET_SMTP_PORT=465` (SMTPS, fest vorgegeben)
- `STUDIO_RESET_SMTP_USER`: verifizierte SCHMAQQ-Absenderadresse
- `STUDIO_RESET_SMTP_PASSWORD`: ausschliesslich geschütztes Mail-App-Passwort
- `STUDIO_ORIGIN=https://studio.schmaqq.com` bleibt die feste öffentliche Origin

TLS wird vor dem SMTP-Login erzwungen, Zertifikate werden geprüft.
Unvollständige SMTP-Konfiguration verweigert den Start vor SQLite-Zugriff.
Ohne Konfiguration wird die öffentliche Wiederherstellung als nicht verfügbar
angezeigt. Keine Admin-/Sitzungs- oder Passwortdaten über den Chat übertragen.

Die bestehenden Hostinger-Mail-Verbindungen des Operators sind **kein**
automatischer SMTP-Zugang des Dienstes. Ein Mail-Test muss durch den Betreiber
aus einer isolierten Umgebung erfolgen. SMTP-Passwort nie in Befehlsargumenten
oder Logs zeigen.

## Release-Gates

1. Eigenes sauberes Git-Checkout, Source/Lockfile, vollständige Tests.
2. Test von Besitzer/Unbekanntem, Enumeration, 15-Minuten-Ablauf,
   Mehrfachverwendung, CSRF, Rate-Limits, Sitzungs-/Gerätewiderruf.
3. Chromium Desktop und Mobile auf isolierter synthetischer SQLite.
4. Release-Archiv und abhängiges `node_modules/nodemailer` unabhängig verifizieren;
   sauberen neuen Commit in `release-source.json` nachweisen.
5. Betreiber prüft geschützte Mail-Konfiguration, SPF/DKIM/DMARC und reale
   Zustellbarkeit, ohne Token an Dritte weiterzugeben.
6. Frischer geschützter Production-Snapshot, isolierter Restore, H3-Scope und
   R24-Rollback; separate ausdrückliche Freigabe für konkretes Archiv.
7. Nach Deployment einen **echten** Owner-Reset nur mit dessen Einverständnis
   ausführen; keine automatische Passwortänderung.

**Zusätzlicher Auditbefund vom 25.10.2026:** Der npm-Produktionsdependency-Audit
meldet insgesamt sechs bereits vorhandene Advisories (1 kritisch, 3 hoch,
2 moderat), vor allem im separaten Next-Starterpfad. Auch das im Studio-Runtime
enthaltene Zod 3.x wird als hoch gemeldet. **Nodemailer 10.2.1 hat in dieser
Prüfung keinen gemeldeten eigenen Advisory.** Das ist kein Freispruch für den
Gesamtstack; vor dem späteren Release ist die tatsächliche Exposition von Zod
und die getrennte Next-Anwendung ausdrücklich zu bewerten. Keine ungeprüfte
Major-Version-Migration innerhalb dieses Passwort-Recovery-Fixes.

**Nicht gelöst:** Absicherung beim Verlust des gesamten VPS (Offsite/Host-Recovery),
fehlende SMTP-Konfiguration und mögliche abweichende Konto-E-Mail des Eigentümers.
Eine E-Mail-Adresse darf nie allein auf Zuruf im Produktionskonto umgeschrieben werden.
