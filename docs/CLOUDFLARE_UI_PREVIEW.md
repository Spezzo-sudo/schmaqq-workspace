# SCHMAQQ Studio – Cloudflare UI-Vorschau

Cloudflare Pages-Projekt: `schmaqqstudio-ui-preview`
GitHub: `Spezzo-sudo/schmaqq-workspace`
Automatisch beobachteter Branch: `feat/studio-field-guild-r2-avatars-20261115`
Build: `npm run studio:build`
Ausgabeordner: `studio-dist`

**Die Cloudflare Pages-Version ist ausschliesslich eine Frontend-Vorschau.** Die produktive SCHMAQQ-Studio-Anwendung verwendet einen eigenen Node-/SQLite-Server, den Pages nicht automatisch mit ausfuehrt. Login, gespeicherte Projektgespraeche, Agentenprofile und Runnerfunktionen sind in dieser UI-Vorschau ohne eine separate, abgesicherte Staging-API nicht funktionsfaehig. **Nicht** gegen die produktive Studio-API verbinden.

Der echte, isoliert pruefbare Full-Stack-Release-Workflow liegt im offenen Infrastruktur-PR #77. Das Cloudflare-Projekt hat automatische Builds fuer diesen Entwicklungsbranch und weitere PR-Branches aktiviert. Deployments sind durch Cloudflare-Status und das tatsaechliche Ergebnis zu verifizieren; ein erfolgreicher GitHub-Push ist allein kein Deploy-Nachweis.

Diese Dokumentationsdatei wurde beim erstmaligen Einrichten hinzugefuegt, um den ersten automatischen Git-Deploy auszulösen und die Vorschau-Zustaendigkeit zu markieren.
