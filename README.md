# FIFA World Cup 2026 Simulator

Simulate the FIFA World Cup 2026 tournament — set group standings, pick qualifying third-place teams, and play through the knockout bracket to crown a champion.

## Features

- **Live Standings** — Real-time group standings and today's match scores fetched from ESPN's free API, with smart localStorage caching
- **Group Stage Predictor** — Drag or use arrows to set predicted final positions for all 12 groups
- **Third-Place Selection** — Pick the 8 best third-placed teams with FIFA's official tie-breaking criteria displayed and live stats (points, GD, GF) for each team
- **Knockout Bracket** — Mirror bracket layout (16 vs 16) meeting at the Final in the center. Click teams to advance or hit "Simulate Random" for a random draw
- **Full FIFA Mapping** — All 495 third-place-to-bracket combinations encoded per official FIFA regulations
- **IST Timezone** — Match times displayed in Indian Standard Time

## Run Locally

```bash
# Python
python3 -m http.server 8766

# Docker
docker build -t wc-simulator .
docker run -p 8080:80 wc-simulator
```

Open `http://localhost:8766` (Python) or `http://localhost:8080` (Docker).

## Deploy

Push to Railway, Render, or any platform that supports Dockerfiles — it auto-detects and deploys with nginx.

## Project Structure

```
├── Dockerfile          # nginx:alpine
├── nginx.conf          # gzip, caching, SPA fallback
├── index.html          # HTML shell
├── css/
│   └── style.css       # All styles
└── js/
    ├── data.js         # Teams, flags, bracket structures, third-place mapping
    ├── api.js          # ESPN API fetch + localStorage caching
    ├── ui.js           # Render functions (live, groups, bracket)
    └── app.js          # State management, bracket logic, init
```

## Data Source

Live standings and fixtures are fetched from ESPN's free public API — no API key required. Data is cached in localStorage and only refetched when matches are live or a new day begins.
