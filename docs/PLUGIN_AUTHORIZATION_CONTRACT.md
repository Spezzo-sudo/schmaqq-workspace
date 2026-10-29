# Persoenliche Plugin-Autorisierung: Integrationsvertrag fuer den naechsten Schritt

Status 29.10.2026: lokal implementiert in `selfhost/studio-plugin-auth.mjs` und
`selfhost/studio-plugin-http.mjs`, nur aktiv mit `STUDIO_PLUGIN_CLIENTS`. Lokaler
Browserdurchlauf Zustimmung -> Code -> Tokenaustausch bestanden (synthetisches
Konto, `.studio/oauth-visual-demo.mjs`). Kein Nachweis im echten ChatGPT-Chat.

Ergänzung M1 (29.10.2026, live): Über den „ersten Clientvertrag“ hinaus sind mit
`STUDIO_PLUGIN_DYNAMIC_CLIENTS=1` auch dynamische Registrierung (RFC 7591) und
Client-ID-Metadatendokumente erlaubt, damit Claude, Gemini und andere MCP-Clients
sich verbinden können. Diese Clients gelten als **nicht vertrauenswürdig**: Die
Zustimmungsseite warnt und nennt das Rücksprungziel. Registrierungen sind begrenzt
und verfallen unbenutzt. Metadaten werden nur von öffentlichen Adressen geladen,
ohne Weiterleitung, mit Zeit- und Größenlimit. `state`, `scope` und `resource` sind
nach OAuth 2.1 optional; Standard ist diese Ressource, und die Zustimmungsseite zeigt
die Scopes. Widerruf ist unter „Verbundene KI-Assistenten“ bedienbar. Details:
[AI_CLIENT_SETUP.md](AI_CLIENT_SETUP.md), Nachweis
[M1](evidence/M1_VPS_WORKER_PLACEMENT_20261029.md).

## Rollen

Studio authentifiziert Menschen bisher ueber eigene Cookies und Geraete ueber
Runner-Bearertokens. Pluginzugriff benoetigt eine dritte getrennte Freigabe:
Person -> registrierter Client -> konkrete Studio-Scopes. Weder ChatGPT-Login
noch ein Runner-Token ist dafuer automatisch geeignet. Der Entwickler darf
keine bestehende persoenliche Browser-/Codex-Sitzung kopieren.

## Erster unterstuetzter Clientvertrag

Zuerst explizit registrierter OAuth-Client mit genau erlaubten Redirect-URIs;
keine freie Ruecksprungadresse, keine Wildcards oder automatische externe
Clientregistrierung. Authorization Code mit S256-PKCE, kurzlebiger einmaliger
Code, Bindung an Client, Redirect-URI, Resource, Scope und Studio-Mitglied.
Scopes mindestens lesende Projekt-/Kontextabfragen und gesonderte Codeauftraege.
Private Own-device-/Projekt-/Arbeitskopierechte bleiben dahinter unveraendert.

Discovery: geschuetzte MCP-Resource-Metadaten und Authorization-Server-Metadaten
mit identischem kanonischem Issuer; `resource` im gesamten Flow validieren;
`iss` in Autorisierungsantworten; `S256` korrekt angeben. Nur implementierte
Client- und Tokenverfahren bewerben. Der bestehende OpenAI-OIDC-Clientflow ist
kein Authorization-Server und wird dafuer nicht zweckentfremdet.

Browserautorisierung braucht eine bestehende persoenliche Studio-Anmeldung und
eine ausdrueckliche Anzeige von Client, Berechtigungen und Freigabe. Freigabe und
Ablehnung duerfen keine ungesicherten GET-Seiteneffekte sein. Die bestehende
Cookie-/Origin-/CSRF-Grenze bleibt erhalten. Der MCP-Endpunkt erhaelt eine eigene
Token-/Resource-/Scopepruefung anstelle einer globalen CSRF-Ausnahme fuer APIs.

Tokens werden geschuetzt erzeugt und in der Datenbank nur gehasht gespeichert;
Expiry, Widerruf und passende Zielresource bei jedem Aufruf pruefen. Die stabile
Grant-ID bleibt bei Tokenwechsel dieselbe und bindet den Mutationsspeicher.
Neue explizite Grant-ID bedeutet neue Deduplikationsdomaene; vor Neuauftrag
ungeklaerte Jobs abgleichen. Keine unbegrenzte automatische Reautorisierung.

Der interne Requestadapter muss Mitglied und Grant aus serverseitig gepruefter
Identitaet erhalten. Kein vom Toolclient frei gesetzter Nutzerheader, Cookie,
Server-URL oder Requestcallback. Vorhandene Fachoperationen weiterverwenden;
keine direkten Dateischreibzugriffe aus dem OAuth-/MCP-Adapter.

## Abnahme vor echter Chatverbindung

- Keine/abgelaufene/widerrufene/falsche-Resource-Tokens abweisen.
- Fremdes Mitglied, Client, Redirect, Resource und Scope duerfen weder Code noch
  Projekte/Dateien freischalten. Ein Lesetoken startet keinen Codejob.
- Code-Replay, falscher Verifier, PKCE-Downgrade, offener Redirect und
  zustimmungslose Freigabe werden verweigert.
- Tokenrefresh erhaelt denselben Grant-/Mutationsscope; alte Tokenbehandlung
  ausdruecklich pruefen. Speicherausfall startet keinen Auftrag.
- Scope-/Originpruefung gilt auch fuer direkte HTTP-/JSON-RPC-Aufrufe unabhaengig
  von Toolhinweisen und Skillanweisungen.
- Lokaler Client durchlaeuft Discovery, Anmeldung/Zustimmung, Codeaustausch und
  autorisierten Werkzeugaufruf. Erst danach im normalen ChatGPT-Chat testen.
  Ein JSON-RPC-Test oder Cookieadapter ist kein solcher Interoperabilitaetsbeleg.

Offizielle Quelle, erneut gelesen am 28.10.2026:
https://developers.openai.com/plugins/build/auth

Keine Registrierung bei OpenAI, Provideraktion oder Serverbereitstellung erfolgt
durch dieses Dokument. Zugang zum echten ChatGPT-Client ist separat nachzuweisen.
