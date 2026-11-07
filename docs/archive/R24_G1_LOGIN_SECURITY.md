# R24-G1 – Passwortlogin hinter Traefik / Reverse-Proxy absichern

Status: **isolierter Draft-Kandidat auf R24-F**. Kein Merge, kein
Production-Deployment, keine Provider-/DNS-/Traefik-Anpassung.

## Ausgangslage

Die bisherige Passwortanmeldung beschränkte alle Benutzer auf gemeinsam
**12 Anmeldeversuche pro Minute und `req.socket.remoteAddress`**.
Bei einem Reverse-Proxy ist diese Socket-IP häufig die Adresse von
Traefik und nicht die des Besuchers. Ein Benutzer konnte dadurch
unbeabsichtigt andere Studio-Mitglieder aussperren. Würden stattdessen
beliebige `X-Forwarded-For`-Werte ungeprüft vertraut, könnte ein Angreifer
das Rate-Limit durch beliebige erfundene IPs umgehen.

## R24-G1-Schutzmodell (nur `POST /api/auth/login`)

- **Pro Konto:** höchstens 12 Anmeldeversuche in einem festen
  60-Sekunden-Fenster, unabhängig von der Quelladresse. Gross-/
  Kleinschreibung und Leerzeichen werden beim Zähler vereinheitlicht.
  Der interne Schlüssel ist SHA-256 des normalisierten Kontonamens;
  Login-Fehler nennen kein existierendes Konto.
- **Pro tatsächlicher Client-IP hinter ausdrücklich vertrautem Proxy:**
  höchstens 60 Anmeldeversuche pro Minute, auch mit wechselnden
  Kontonamen. Bei ungültiger/fehlender Weiterleitung gilt ein
  konservativer 60/min-Shared-Peer-Limit.
- **Ohne ausdrückliche Proxy-Vertrauenskonfiguration:**
  Weiterleitungsheader werden komplett ignoriert und
  `req.socket.remoteAddress` mit einem höheren Limits von 240/min
  gezählt, damit verschiedene legitime Konten hinter demselben Proxy
  weniger leicht blockiert werden. Das 12/min-Kontolimit gilt trotzdem.
- **Trust Boundary:** Nur die in `STUDIO_TRUSTED_PROXY_IPS`
  einzeln aufgeführten **direkten TCP-Proxy-Peer-IP-Adressen**
  dürfen `X-Forwarded-For` einliefern. Der Server liest dessen
  Kette **von rechts nach links** und wählt den ersten nicht
  vertrauenswürdigen Hop. Vom Client vorangestellte Fake-IP-Adressen
  beeinflussen die Quellberechnung nicht, sofern Traefik korrekt
  appendet oder den Header ersetzt.
- **Fail-Closed-Konfiguration:** Nicht valide Proxy-IP-Adressen,
  CIDRs, Hostnamen und eine zu grosse Liste lassen den Serverstart
  mit einer Fehlermeldung scheitern. Ohne Konfiguration bleibt das
  vorherige Abhängigkeitsmodell mit Socket-IP aktiv, aber mit
  zusätzlichem eigenständigem Konto-Limit.
- **IPv6:** verschiedene Schreibweisen derselben IPv6-Adresse sowie
  IPv4-mapped-IPv6-Peers werden vor dem Rate-Key kanonisiert; kein
  zusätzliches Versuchskontingent durch andere Textnotation.
- **Speicher begrenzt:** maximal 4096 Konto- und 2048
  Quell-IP-Zähler pro Prozess; abgelaufene Einträge werden
  ohne Hintergrund-Timer beim nächsten Bedarf freigegeben.
  Bei Kapazitätsüberschreitung werden neue Versuche verweigert
  statt unbegrenzt RAM zu belegen.
- Fehlerantworten bleiben bei falschem Passwort **401**, bei
  verbrauchtem Limit **429**, mit bisheriger Nutzerfehlermeldung.
  Der Ursprungsschutz gegen Cross-Site-POSTs bleibt zentral im
  HTTP-Server vor der eigentlichen Auth-Route.

## Konfiguration nur für späteren Operator-Rollout

`selfhost/deploy/studio.env.example` und `selfhost/compose.yaml`
beschreiben die optionale Umgebungsvariable:

    STUDIO_TRUSTED_PROXY_IPS=127.0.0.1

**Dieser Wert ist ausschliesslich ein Beispiel.** Vor einer späteren
Freigabe muss der Betreiber die tatsächliche, vom Studio-Prozess
gesehene direkte Traefik-Peer-IP ermitteln und auf korrekte
Headerbehandlung prüfen. Bei Docker-/Bridge-Netzwerken ist der
direkte Peer möglicherweise *nicht* 127.0.0.1.

Keinesfalls pauschal private RFC1918-Bereiche, Docker-Netze, alle IPs,
den öffentlichen DNS-Namen oder ungeprüfte Client-Header freigeben.
Traefik muss eine vertrauenswürdige Header-Kette selbst aufbauen,
durch Ersetzen oder Anhängen der tatsächlichen Client-IP. Falls
solche Voraussetzungen nicht geprüft sind, Trust-Setting **leer
lassen**. In R24-G1 wird die Variable auf Production **nicht gesetzt**.

## Verifizierbarkeit

- Neue reine Unit-Tests prüfen Konto-Unabhängigkeit, Case-Folding,
  Ablauf nach 60 Sekunden, Fake-Header ohne Trust, rechts-nach-links
  Proxy-Kettenprüfung, fehlerhafte Header, Fail-Closed-Konfiguration
  und begrenzte Maps.
- Neue echte HTTP-Tests mit synthetischen Einladungen und zwei
  Testkonten prüfen 12 falsche Anmeldungen für A + 429 danach,
  gültige Anmeldung für B über denselben Socket, bestehende
  Sessions und 60/min-Clientgrenze bei vertrautem Testproxy.
- Alle Tests verwenden nur temporäre Datenbanken, Loopback-HTTP
  und keine echten Secrets oder Production-Accounts.

## Restliche Grenzen / Sicherheitsrisiken

1. Diese Zähler sind **nur im Prozessspeicher**. Ein Neustart setzt
   sie zurück; bei mehreren Studio-Instanzen teilen sich die
   Zähler nicht. Für grösseres Deployment sind ein gemeinsamer
   Zähler beziehungsweise Edge-Ratenregeln sinnvoll.
2. Eine gezielte Attacke kann die legitime Anmeldung *eines*
   Kontos für jeweils höchstens ein Zeitfenster blockieren.
   Gegen anhaltende Kontensperr-Angriffe wären zusätzliche
   Massnahmen wie Backoff/MFA/abgestimmte Proxy-Regeln sinnvoll.
3. Vorhandene OAuth-, Einladung-, Bootstrap- und
   Runner-Endpunkte sind nicht Teil dieser Änderung; keine
   stillschweigende Behauptung universeller DDoS-Abwehr.
4. Kein echter Reverse-Proxy-/Traefik-Test mit Production-IP,
   keine schreibende Änderung der Betriebsumgebung und kein
   Rollout der neuen optionalen Trusted-Proxy-Konfiguration.
5. GitHub Actions bleiben derzeit **durch die GitHub-Billing-Sperre
   blockiert**. Ein grüner lokaler Test ist kein grüner
   GitHub-Workflow.

**DRAFT / NO_MERGE / NO_DEPLOY.**
