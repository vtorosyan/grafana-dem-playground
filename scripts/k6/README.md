# k6 Load Test Scripts

Scripts for testing the DEM Playground app with [k6](https://k6.io/).

## Prerequisites

- [k6 installed](https://k6.io/docs/getting-started/installation/)
- For **browser** scripts: k6 with browser support (k6 v0.48+)

## Base URL

All scripts use `BASE_URL` environment variable. Default: `http://localhost:3000`

```bash
# Local
k6 run scripts/k6/http-health.js

# Production/Fly.io
BASE_URL=https://grafana-dem-playground.fly.dev k6 run scripts/k6/http-health.js
```

## HTTP Scripts

| Script | Description |
|--------|-------------|
| `http-health.js` | Health + state API checks with assertions on status, body, and response time |
| `http-multi-step.js` | Chained flow: session init → validate → create order → get order |
| `http-navigation.js` | All pages + APIs + echo endpoint |
| `http-stress.js` | Ramping load (5→20→40 VUs) with thresholds |

### Run HTTP scripts

```bash
k6 run scripts/k6/http-health.js
k6 run scripts/k6/http-multi-step.js
BASE_URL=https://grafana-dem-playground.fly.dev k6 run scripts/k6/http-stress.js
```

## Browser Scripts

| Script | Description |
|--------|-------------|
| `browser-checkout.js` | Navigate Home → Checkout → Fill form → Submit → Assert success |
| `browser-products.js` | Navigate Home → Products → Assert product list renders |

### Run browser scripts

```bash
# Requires k6 with browser module
k6 run scripts/k6/browser-checkout.js

# Or with Docker (includes browser support)
docker run --rm -i -v $(pwd):/scripts grafana/k6:master-with-browser run /scripts/scripts/k6/browser-checkout.js
```

### Browser script notes

- Uses `data-testid` selectors for stable automation
- Headless by default; set `K6_BROWSER_HEADLESS=false` to show the browser
- Slower than HTTP scripts due to real browser execution
