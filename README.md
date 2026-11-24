# ⚡ WattWann – Der Strompreis-Wecker

Eine minimale Web-App fürs Jahr 2026+: Sie sagt dir in Ampelfarben, **wann Strom billig oder sogar gratis (Negativpreise!) ist – und was du dann laufen lassen solltest** (Waschmaschine, Trockner, Boiler, E-Auto …).

## Warum genau das?

- **Smart-Meter-Rollout & dynamische Tarife** (§41a EnWG): Stundenpreise werden 2026+ zur Norm für Normalverbraucher.
- **Immer mehr Negativpreise** an der Börse durch Solar-/Wind-Überschüsse – manche Tarife geben sie durch: Verbrauch in diesen Stunden kostet null oder bringt sogar Geld.
- Es gibt viele Preis-Graphen, aber **kaum ein einfaches Tool**, das dem Normalverbraucher nur eine Antwort gibt: *„Wann genau muss ich was einschalten?"*

## Features

- Live-Börsenpreise der nächsten 24 h (aWATTar-Schnittstelle), Fallback auf Demo-Daten
- Ampel-Bewertung der aktuellen Stunde: von „GELD-ZURÜCK-STROM!" bis „Teuer – Finger weg"
- Günstigstes 6-Stunden-Fenster + Zählung der Negativpreis-Stunden
- Automatischer Tagesplan: 5 typische Großverbraucher, jeweils im günstigsten Zeitfenster
- **Auto-Modus-Simulator:** über 7 simulierte Tage – wie eine intelligente Steckdose fünf typische Geräte automatisch in die günstigsten Stunden verschiebt, inkl. Wochen- und Jahresvergleich
- **Spar-Rechner:** Festpreis vs. dynamischer Tarif inkl. Lastverschiebung, Ausgabe in €/Jahr
- Einstellbarer Tarif-Aufschlag (dein persönlicher Endpreis in ct/kWh)

## Tech

Rein statisch: `index.html` + `style.css` + `app.js`. Kein Build, keine Dependencies, kein Backend, keine Cookies. Läuft direkt im Browser.

## Ausprobieren

```bash
python3 -m http.server 8080
# dann http://localhost:8080 öffnen
```

Alternativ `index.html` direkt öffnen – ohne Netz bzw. ohne CORS-Freigabe der API erscheinen automatisch realistische Demo-Daten.

## Deployment

Beliebig: GitHub Pages, Netlify, Cloudflare Pages – Ordner hochladen, fertig.

## Geschäfts-Ideen („leichtes Geld")

1. **Affiliate:** Empfehlung dynamischer Tarife mit Vermittlungsprovision – die App selbst bleibt gratis, sie ist der Köder.
2. **Weißlabel:** Einbettbares Widget (Servicetool) für lokale Portale/Vereine.
3. **Das eigentliche Produkt:** die im Simulator vorgemachte Automatisierung real umsetzen (Shelly/Tasmota-Steckdosen, Boiler, E-Auto). Wer nachweislich automatisch spart, zahlt bereitwillig 30–60 €/Jahr – die Gratis-App ist die Zulaufspitze dafür.

> Hinweis: Demo-/Anzeigezwecke, keine Beratung, Preise ohne Gewähr.
