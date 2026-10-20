# R24-E2 — React-Workspace und Runner-Einrichtung modularisiert

Status: **isolierter Draft-Kandidat auf R24-D**. Keine Änderung an
Production, Runnerregistrierungen oder authentifizierten Live-Sessions.

## Weshalb modularisieren?

Die ursprünglichen Dateien `app/workspace.tsx` und
`app/development.tsx` enthielten sehr grosse Inline-JSX-Abschnitte
samt Zustandslogik. Die Ansicht war im Code schwer zu finden, und
die oft sehr langen Quellzeilen liessen sich kaum reviewen.

**R24-E2 trennt nur die Darstellung und stabile Datenmodelle; es ist
kein neues Design, kein neuer Auth-Flow und keine neue API.**

| Datei | Eigenständige Aufgabe |
| --- | --- |
| `app/workspace.tsx` | Zentraler Zustand, Polling, Navigation, Änderungen, Modals, API-Requests |
| `app/workspace-model.ts` | Projekt-, Task-, Member- und Dokumenttypen, Statusnamen, Darstellungshelfer |
| `app/workspace-sidebar.tsx` | Sidebar, Projektnavigation, Profil/Abmeldung und per Props gesteuerte Aktionen |
| `app/workspace-parts.tsx` | Aufgabenkarte, Projektkarte und Überschriften; keine direkten Netzwerkzugriffe |
| `app/development.tsx` | Auswahl, Runner-/Auftragserstellung, Git-Review-/Jobzustand und Netzwerksteuerung |
| `app/development-model.ts` | Gemeinsame Typen, Auftrags- und Statusbezeichnungen |
| `app/development-runner-setup.tsx` | Nur die Darstellung des lokalen Runner-Setup-Formulars und Konfigurationshinweise |

### Kritische unveränderte Verhaltensgrenzen

- Sidebar hat dieselben IDs, Navigationslabels, mobilen Schaltflächen,
  Aria-Attribute und `ref`-Hooks. Der Eltern-Workspace besitzt weiter
  Fokusfalle, Mobile-Menü-Zustand und Deep-Link-/History-Routing.
- Vor Sign-out werden bestehende Editor- und Kommentarentwürfe weiterhin
  geprüft; beim fehlgeschlagenen Logout bleiben Entwürfe und Sitzung erhalten.
- Aufgabenkarte aktualisiert nur über den vom Eltern-Workspace gereichten
  Mutationshandler. Status- und Zuständigkeitsfelder behalten ihre
  Labels und Disabled-Flags.
- Projektkarten behalten dieselbe Progress-/Task-Zählung.
- Die Runner-Einrichtung erstellt **keinen** neuen Runner automatisch.
  Das Formular registriert nur nach explizitem Absenden; Netzwerk-/
  Tokenzustand bleibt in `Development`. Der geheime Gerätezugang wird
  unverändert nur im bewussten Einrichtungsablauf angezeigt.
- Die Priorisierung der Passwortanmeldung aus R24-B bleibt erhalten.
  Der deaktivierte ChatGPT-Anmeldeweg wird nicht künstlich aktiviert.

## Prüfung

- TypeScript, ursprüngliche Backend-/Auth-/Runner-Verträge und Vite-Build
  aus dem unveränderten Runtime-Projekt bleiben Pflicht.
- Browserregressionen auf einem **lokalen isolierten Demo-Server** mit
  zwei synthetischen Accounts prüfen Navigation, mobile Sidebar,
  Aufgaben, Reviews, Dateientwürfe und Runner-Setup. Screenshots/JSON
  bleiben ausserhalb des Git-Source of Truth im privaten Testordner.
- Echte Zusammenarbeit in Production und die vollständige
  Konto-/Runner-/Git-Konfiguration des Owners werden **nicht**
  durch Demo-Tests ersetzt.

## Was weiterhin aufgeteilt werden sollte

Die Hauptansichten enthalten weiterhin umfangreiche Fachzustände und
verzweigte JSX-Ansichten. Ein nächster, getrennter Refactor sollte die
ansichtsspezifischen Panels von Entwicklung und den Workspace-Router
schrittweise extrahieren. Ein Komplettrewrite würde gleichzeitig viele
Regressionen riskieren. Zusätzliche Kommentare sollen **Invarianten
und Gründe** erklären, nicht triviale JSX-Zeilen wiederholen.

**Kein Merge, kein Preview-/Production-Deployment ohne gesonderten Owner-GO.**
