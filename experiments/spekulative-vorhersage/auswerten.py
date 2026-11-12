"""Wertet das Vorhersage-Experiment aus: Wie viel Wartezeit kann der PC verstecken,
wenn er die nächste Handy-Nachricht vorhersagt und den Auftrag vorab startet?"""
import json, pathlib
d = pathlib.Path(__file__).parent
log = [json.loads(l) for l in (d / "log.jsonl").read_text().splitlines() if l.strip()]
# Angenommene Rechenzeit am PC je Auftrag (Sekunden) und Netz-Hin-und-Rückweg
RECHENZEIT = {"fotos_indexieren": 300, "fotos_suchen": 3, "album_erstellen": 2,
              "nachrichten_zusammenfassen": 20, "antwort_entwerfen": 8, "status_abfragen": 0.1}
RTT = 0.08
for durchgang in "AB":
    echt = json.loads((d / f"nachrichten_{durchgang}.json").read_text())
    vorh = {e["schritt"]: e for e in log if e["durchgang"] == durchgang}
    print(f"\nDurchgang {durchgang}")
    print(f"{'Schritt':>7}  {'echte Aktion':<27} {'Aktion':<6} {'exakt':<6} {'Sicherh.':>8}")
    a_ok = ex_ok = 0; warte_ohne = warte_mit = 0.0; sicher_treffer = sicher_gesamt = 0
    for n in echt:
        v = vorh[n["schritt"]]; p = v["vorhersage"]
        akt = p["aktion"] == n["aktion"]; exakt = akt and p["parameter"] == n["parameter"]
        a_ok += akt; ex_ok += exakt
        t = RECHENZEIT[n["aktion"]] + RTT
        warte_ohne += t; warte_mit += RTT if exakt else t
        if v["sicherheit"] >= 35: sicher_gesamt += 1; sicher_treffer += exakt
        print(f"{n['schritt']:>7}  {n['aktion']:<27} {'ja' if akt else 'nein':<6} {'JA' if exakt else 'nein':<6} {v['sicherheit']:>8}")
    print(f"Aktion richtig: {a_ok}/8 · exakt richtig (Auftrag vorab startbar): {ex_ok}/8")
    print(f"Wartezeit gesamt ohne Vorhersage: {warte_ohne:.1f} s · mit Vorhersage: {warte_mit:.1f} s "
          f"· versteckt: {100*(1-warte_mit/warte_ohne):.0f} %")
    print(f"Vorhersagen mit Sicherheit >= 35: {sicher_gesamt}, davon exakt richtig: {sicher_treffer}")

# Variante "Vorrat": Der PC rechnet JEDE Vorhersage im Leerlauf vorab und behält das Ergebnis.
# Ein Auftrag ist sofort fertig, wenn er in irgendeinem früheren Schritt exakt vorhergesagt wurde.
print("\nVariante Vorrat (alle Vorhersagen vorab rechnen und aufheben)")
for durchgang in "AB":
    echt = json.loads((d / f"nachrichten_{durchgang}.json").read_text())
    vorrat = []; ohne = mit = 0.0; verschwendet = 0.0
    for n in echt:
        v = [e for e in log if e["durchgang"] == durchgang and e["schritt"] == n["schritt"]][0]["vorhersage"]
        vorrat.append((v["aktion"], v["parameter"]))
        t = RECHENZEIT[n["aktion"]] + RTT; ohne += t
        mit += RTT if (n["aktion"], n["parameter"]) in vorrat else t
    for a, p in vorrat:
        if not any(a == n["aktion"] and p == n["parameter"] for n in echt): verschwendet += RECHENZEIT[a]
    print(f"Durchgang {durchgang}: Wartezeit {ohne:.1f} s -> {mit:.1f} s · versteckt: {100*(1-mit/ohne):.0f} % "
          f"· umsonst gerechnet: {verschwendet:.0f} s")
