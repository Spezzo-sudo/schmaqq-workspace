# Browser-Fortsetzung: Umgebung und Session-Trennung

## Anlass

Owner meldet blockierte Browsersteuerung im separaten Work-Chat und bittet um
Fortsetzung in Codex. Screenshot zeigt `127.0.0.1:4320/?view=team`, Banner
„Lokaler Probelauf“ und die zwei Fixture-Konten Marco/Markus. Das ist die
lokale Demo, kein Nachweis für zwei persönliche Konten im Live-Studio.
Die Blockade des anderen Chats wurde nicht umgangen oder erneut provoziert.

## Tatsächlich geprüft

Mit eigener bereits autorisierter Playwright-Brave-Steuerung:

- Live-Teamseite `https://studio.schmaqq.com`: ein echtes Mitglied,
  korrekter Name und genau eine „Das bist du“-Markierung. Kein Demo-Banner.
- Frischer unabhängiger Kontext ohne Session: Live-Session-API HTTP 401.
  Keine Übernahme einer Anmeldung aus einem fremden Profil.
- Zwei neue voneinander getrennte Kontexte an der bestehenden lokalen Demo,
  Anmeldung über die sichtbaren Formulare ausschließlich mit deren vorhandenen
  Fixture-Zugängen. Keine echten Zugangsdaten protokolliert.
- Kontext A: Marco (Testkonto), korrekte eigene Mitgliedskarte.
- Kontext B: Markus (Testkonto), andere interne Benutzer-ID und korrekte eigene
  Mitgliedskarte. Keine Vermischung in dieser gezielten Prüfung beobachtet.
- Ein zweiter Tab in Kontext A bleibt als derselbe Benutzer angemeldet.
  Das Teilen einer Session zwischen Tabs desselben Browserprofils ist erwartetes
  Verhalten, keine Isolation unabhängiger Personen.
- Abmeldung von B: dessen Session-API 401; A bleibt 200. Anschließend auch A
  abgemeldet und beide neu erzeugten Fixture-Kontexte geschlossen.
- Danach vorhandenen Live-Pilot über die UI geöffnet: derselbe lokale
  Review-Commit `237dc034c204548bd18ea1f58743d0022a8f8338`, 2/2 bestandene
  Tests und ausstehende zweite Prüfung erhalten. Keine erneuten Jobs, Änderungen,
  Freigaben oder Veröffentlichungen erzeugt.

## Bedienhürden und technische Unterbrechung

Die Initialenfunktion bildet bei „Marco (Testkonto)“ und „Markus (Testkonto)“
jeweils „M(“. Namen und Session-IDs sind verschieden; die gleichen Avatare
sind eine konkrete Darstellungsunklarheit. Eine eindeutige Avatar-/Umgebungs-
Orientierung ist Nacharbeit für P5, kein hier nachgewiesener Authentifizierungsfehler.

Ein Aufruf mit Warten auf vollständigen Netzwerk-Leerlauf überschritt das
Steuerungslimit und setzte die Automationslaufzeit zurück. Danach ausschließlich
das zuvor selbst angelegte und autorisierte Browserprofil erneut gestartet;
bestehende Live-Anmeldung blieb erhalten. Kurze explizite Navigations-/Element-
Zeitlimits und DOM-Readiness verwendet. Keine neue persönliche Anmeldung verlangt,
keine Auth-Caches extrahiert oder zwischen Browserprofilen kopiert.

Ein Paketimport der Browserbibliothek scheiterte zunächst an Modulauflösung.
Vorhandene installierte Bibliothek danach per explizitem CommonJS-Pfad verwendet;
keine Neuinstallation oder Änderung globaler Einstellungen.

## Ergebnis und Grenze

Gezielte Konto-/Logout-Trennung PASS für die getesteten Fixture-Kontexte.
Live-Pilot und richtige Umgebung direkt im gesteuerten Browser geöffnet.
Screenshots und bereinigtes Ergebnis lokal ignoriert unter
`.studio/p3-pilot/identity-audit/`.

Kein allgemeiner Sicherheits-Audit, keine neue Live-Kontoerstellung und kein
Nachweis des tatsächlichen Zwei-Personen-Piloten mit Markus auf seinem Mac.
Server, Produktcode, Runner-Konfiguration und NetzKontor unverändert.
