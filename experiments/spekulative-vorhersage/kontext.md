# Gemeinsamer Kontext (kennen Handy und PC)

Die Handy-App „Private KI“ schickt Aufträge verschlüsselt an den eigenen PC der Person.
Es ist Sonntag, 21:30 Uhr. Das Handy hängt am Ladekabel. Die Person hat die App gerade geöffnet.
Fotobibliothek: 9.800 Fotos von 2023-01 bis 2026-10, noch nicht indexiert.
Nachrichten-Apps: whatsapp, signal, sms.

Jede Nachricht vom Handy an den PC ist genau ein JSON-Objekt:
{"schritt": <Nummer>, "aktion": "<aktion>", "parameter": {...}}

Erlaubte Aktionen und Parameter:
- fotos_indexieren: {"zeitraum": "<JJJJ>" oder "alle"}
- fotos_suchen: {"suchbegriff": "<ein Wort>", "zeitraum": "<JJJJ-MM>" oder "<JJJJ>"}
- album_erstellen: {"name": "<Text>", "aus_schritt": <Schrittnummer einer früheren Suche>}
- nachrichten_zusammenfassen: {"app": "whatsapp"|"signal"|"sms", "zeitraum": "heute"|"woche"}
- antwort_entwerfen: {"app": "whatsapp"|"signal"|"sms", "kontakt": "<Name>", "ton": "kurz"|"freundlich"|"förmlich"}
- status_abfragen: {"auftrag": <Schrittnummer>}

Eine Sitzung hat genau 8 Nachrichten (schritt 1 bis 8).
