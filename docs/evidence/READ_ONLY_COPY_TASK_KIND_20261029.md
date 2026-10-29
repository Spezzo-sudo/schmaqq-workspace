# Praxistest-Blocker: Lesearbeitskopie erzwingt Codeabschluss

29.10.2026. Quelle: Owner-Screenshot der allgemeinen Klimafinder-Analyseaufgabe
und Roots anschließende lokale Codeprüfung. Keine Runtime- oder Datenänderung.

Die Aufgabe wurde als allgemeine Analyse angelegt. Für ausschließlich lesenden
Quellzugriff entstand eine aufgabengebundene Arbeitskopie. Danach verlangt Studio
„Ein getesteter Prüfstand fehlt“ statt eines allgemeinen Analyseergebnisses.

Belegte Ursache: `selfhost/team-model.mjs`, `taskContract`, setzt `kind` auf
`code`, sobald irgendein workspaces-Datensatz zur Aufgabe existiert. Es wird
nicht unterschieden, ob nur Dateien gelesen oder Änderungen vorgenommen wurden.
`completion` verlangt deshalb einen Code-Prüfstand. Auch ein Wechsel zurück zu
`general` wird in `selfhost/team-http.mjs` bei vorhandener Arbeitskopie gesperrt.
`studio/team-task.tsx` zeigt im Ergebnisbereich abhängig vom Vertrag Code-Reviews
statt eines allgemeinen Ergebnisses an. Die sichtbare Kennzeichnung „Allgemeine
Aufgabe“ steht damit zudem im Widerspruch zur Abschlusslogik; ihre genaue
Aktualisierungs-/Mergeursache ist hier nicht vollständig untersucht.

Anforderung an einen begrenzten Folgefix: Lesen von Quelltext darf die explizite
Aufgabenart nicht ändern. Eine echte Codeänderung darf umgekehrt die bestehenden
Review-/Test-/Veröffentlichungsgates nicht durch eine allgemeine Aufgabenart
umgehen. Vor Umsetzung beide Übergänge samt Legacy-Zuständen untersuchen.
Keine Arbeitskopien löschen oder Task-Daten direkt in Production umschreiben.

Keine Tests ausgeführt; lesende Codeprüfung, keine Fix-/Live-Freigabe behauptet.
Nächster Schritt: gezielten lokalen Fix mit Regression für allgemeine Analyse
plus Lesekopie und Schutz echter Codebearbeitung vorbereiten. Owner-Aufgabe
bis dahin nicht als erledigt markieren.
