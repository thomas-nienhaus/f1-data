# WordLearn

Een progressieve web-app (PWA) voor het leren van woordenschat met spaced repetition.

## Functies

- **Meerdere woordlijsten** — maak lijsten per onderwerp of les
- **Spaced repetition (SM-2)** — woorden worden op het juiste moment herhaald; nieuwe woorden komen de volgende dag terug, bekende woorden steeds minder vaak
- **Sessierichting** — oefen woord→vertaling, vertaling→woord of willekeurig gemengd
- **Vrij oefenen** — oefen alle woorden zonder SR-scores te beïnvloeden
- **Automatische hint** — voor nieuwe woorden staat het antwoord als placeholder in het invoerveld
- **Bulk-import** — plak een lijst met `woord = vertaling` regels of importeer een CSV-bestand
- **Cloud-sync** — gegevens worden opgeslagen in Supabase en gesynchroniseerd via e-mail/wachtwoord login
- **Offline gebruik** — service worker zorgt dat de app ook zonder verbinding werkt (PWA)
- **Installeerbaar** — voeg toe aan het beginscherm van iPhone/Android

## Technische stack

- Vanilla JavaScript (ES modules)
- Supabase (PostgreSQL + Row Level Security + auth)
- Service Worker (cache-first, offline support)
- GitHub Pages (hosting)
- GitHub Actions (automatische deploy)

## Lokaal draaien

De app is puur statisch. Open `index.html` via een lokale webserver, bijvoorbeeld:

```bash
npx serve .
```

Of gebruik de Live Server extensie in VS Code.

## Deploy

Elke push naar `main` triggert een automatische deploy naar GitHub Pages via `.github/workflows/deploy.yml`.
