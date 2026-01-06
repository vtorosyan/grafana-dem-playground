# DEM Playground

A tiny demo app for **Week of Load Testing (WOLT)** demonstrating the **DEM (Digital Experience Monitoring) lifecycle**: detect → scope → select session → view → diagnose → fix → validate.

## Overview

This is an intentionally small application with no database, designed to be easy to deploy publicly. It includes both a frontend (static HTML/JS) and backend (Express.js) in a single repository.

## Tech Stack

- **Node.js** + **Express.js**
- Static frontend served from `/public`
- Plain HTML + vanilla JavaScript (no frameworks)
- **Grafana Faro** for RUM (Real User Monitoring)
- Environment variables for configuration
- In-memory state (no database)

## Quick Start

### Prerequisites

- Node.js 18+ installed

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set environment variables:**
   Create a `.env` file (or set environment variables):
   ```bash
   PORT=3000
   APP_VERSION=v1.0.0
   FARO_COLLECTOR_URL=https://faro-collector-prod-us-central-0.grafana.net/collect/YOUR_COLLECTOR_ID
   ```
   
   ⚠️ **Important**: The `FARO_COLLECTOR_URL` contains your Grafana collector ID and should not be committed to git. The `.env` file is already in `.gitignore`.

3. **Run the app:**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Access the app:**
   Open http://localhost:3000 in your browser
   
   **Note**: If `FARO_COLLECTOR_URL` is not set, the app will run but RUM monitoring will be disabled (you'll see a warning in the browser console).

### Environment Variables

- `PORT` - Server port (default: 3000)
- `APP_VERSION` - App version string (default: "v1")
- `FARO_COLLECTOR_URL` - **Required** for RUM monitoring. Your Grafana Faro collector URL
  - Example: `https://faro-collector-prod-us-central-0.grafana.net/collect/YOUR_COLLECTOR_ID`
  - Get this from your Grafana Cloud instance
  - ⚠️ **Do not commit this to git!** Use environment variables or `.env` file

Example:
```bash
PORT=8080 APP_VERSION=v2.0.0 FARO_COLLECTOR_URL=https://faro-collector-prod-us-central-0.grafana.net/collect/YOUR_ID npm start
```

Or create a `.env` file (already in `.gitignore`):
```bash
PORT=3000
APP_VERSION=v1.0.0
FARO_COLLECTOR_URL=https://faro-collector-prod-us-central-0.grafana.net/collect/YOUR_COLLECTOR_ID
```

Then use `dotenv` or your platform's environment variable handling.

## Project Structure

```
dem-playground/
├── server.js          # Express server with API endpoints
├── package.json       # Dependencies and scripts
├── README.md          # This file
└── public/            # Static frontend files
    ├── index.html     # Home page
    ├── checkout.html  # Checkout page
    ├── status.html    # Status monitoring page
    ├── app.js         # Frontend JavaScript (includes custom event tracking)
    ├── faro-init.js   # Grafana Faro RUM initialization
    └── styles.css     # Basic styling
```

## Routes

### Frontend Pages

- `GET /` - Home page with failure toggles and controls
- `GET /checkout` - Fake checkout page with form submission
- `GET /status` - Real-time status monitoring page

### API Endpoints

- `GET /api/health` - Health check endpoint
  - Returns: `{ ok: boolean, version: string, ts: number, latencyMs?: number }`
  - Can be slowed down or made to fail based on runtime flags

- `POST /api/toggle` - Toggle runtime flags
  - Body: `{ slowMode?: boolean, slowMs?: number, failMode?: boolean, jsErrorMode?: boolean }`
  - Returns: Updated state object

- `GET /api/state` - Get current runtime state
  - Returns: `{ slowMode, slowMs, failMode, jsErrorMode, version }`

## Failure Modes

The app supports several failure modes for demonstration:

### 1. **API Slow Mode**
- Toggles artificial delay on `/api/health` responses
- Configurable delay: 0-5000ms
- Use the "Toggle API Slow" button and slider on the home page

### 2. **API Fail Mode**
- Makes `/api/health` return HTTP 500
- Use the "Toggle API Fail (500)" button on the home page

### 3. **JavaScript Error Mode**
- When enabled, checkout submission throws a JavaScript error
- Use the "Toggle JS Error Mode" via API or enable it on the home page

### 4. **Manual JS Error**
- Click "Trigger JS Error" button to immediately throw an error
- Useful for generating error sessions in your observability tool

## Simulating a Release

To simulate a new release and version change:

```bash
APP_VERSION=v2.0.0 npm start
```

The version is displayed on all pages and included in all API responses, making it easy to track version changes in your observability platform.

## WOLT Flow Mapping

### 1. **DETECT** - Identify Issues
- **Scenario**: Monitor `/api/health` endpoint
- **How**: 
  - Enable "Fail Mode" or "Slow Mode" via UI
  - Run load tests against `/api/health`
  - Observe alerts/detections in your observability platform
- **Observability**: Track response times, error rates, and availability

### 2. **SCOPE** - Understand Impact
- **Scenario**: Determine which users/sessions are affected
- **How**:
  - Check the Status page (`/status`) which polls `/api/health`
  - Use "Generate Activity" button to create user sessions
  - Navigate between pages to create session traces
- **Observability**: Filter sessions by error type, page, or time range

### 3. **SELECT SESSION** - Find Affected User Session
- **Scenario**: Identify a specific problematic session
- **How**:
  - Trigger errors via buttons or checkout form
  - Check browser console for error logs
  - Look for sessions with errors or slow API calls
- **Observability**: Select a session from your RUM tool that shows errors or slow performance

### 4. **VIEW** - Session Replay & Timeline
- **Scenario**: Review what the user experienced
- **How**:
  - Navigate through pages while a session is recorded
  - Submit the checkout form
  - Observe console logs and network requests
- **Observability**: View session replay, JavaScript errors, and network waterfall

### 5. **DIAGNOSE** - Root Cause Analysis
- **Scenario**: Understand why the issue occurred
- **How**:
  - Check API response times on Status page
  - Review JavaScript errors in console
  - Examine backend logs (server.js logs all requests)
  - Correlate frontend and backend traces
- **Observability**: 
  - Analyze stack traces for JS errors
  - Review backend logs for slow/failed API calls
  - Check if slow/fail modes were enabled

### 6. **FIX** - Implement Solution
- **Scenario**: Apply the fix
- **How**:
  - Toggle off failure modes via `/api/toggle`
  - Or redeploy with fixes in code
  - Change `APP_VERSION` to track the fix release
- **Observability**: Monitor deployment and version changes

### 7. **VALIDATE** - Verify Fix Works
- **Scenario**: Confirm the issue is resolved
- **How**:
  - Check Status page shows healthy state
  - Submit checkout form successfully
  - Run load tests again
  - Monitor for recurring issues
- **Observability**: 
  - Verify error rates return to baseline
  - Confirm response times improved
  - Check no new errors appear

## Load Testing with k6

### Basic Health Check Script

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const res = http.get('http://localhost:3000/api/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'health check ok': (r) => JSON.parse(r.body).ok === true,
  });
  sleep(1);
}
```

### Navigation Flow Script

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '2m',
};

export default function () {
  // Home page
  let res = http.get('http://localhost:3000/');
  check(res, { 'home page loaded': (r) => r.status === 200 });
  sleep(1);

  // Checkout page
  res = http.get('http://localhost:3000/checkout');
  check(res, { 'checkout page loaded': (r) => r.status === 200 });
  sleep(1);

  // Status page
  res = http.get('http://localhost:3000/status');
  check(res, { 'status page loaded': (r) => r.status === 200 });
  sleep(1);

  // Health check
  res = http.get('http://localhost:3000/api/health');
  check(res, {
    'health check ok': (r) => r.status === 200,
    'response time acceptable': (r) => r.timings.duration < 1000,
  });
  
  sleep(2);
}
```

### Error Injection Test

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',
};

export default function () {
  // Enable fail mode
  let res = http.post('http://localhost:3000/api/toggle', 
    JSON.stringify({ failMode: true }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  // Test health endpoint (should fail)
  res = http.get('http://localhost:3000/api/health');
  check(res, {
    'health check fails as expected': (r) => r.status === 500,
  });
  
  // Disable fail mode
  http.post('http://localhost:3000/api/toggle',
    JSON.stringify({ failMode: false }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
```

## Deployment

### Railway

1. Connect your GitHub repo to Railway
2. Railway will auto-detect Node.js
3. Set environment variables if needed:
   - `PORT` (Railway sets this automatically)
   - `APP_VERSION` (optional)
4. Deploy!

### Heroku

1. Install Heroku CLI
2. Create app: `heroku create dem-playground`
3. Set environment: `heroku config:set APP_VERSION=v1.0.0`
4. Deploy: `git push heroku main`

### Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t dem-playground .
docker run -p 3000:3000 -e APP_VERSION=v1.0.0 dem-playground
```

### Vercel / Netlify

For serverless deployments, you may need to adapt the Express server to their serverless functions format, or use a platform that supports persistent Node.js processes (like Railway, Render, or Fly.io).

## Grafana Faro RUM Integration

This app is integrated with **Grafana Faro** for Real User Monitoring (RUM). All pages automatically send telemetry data to your Grafana Cloud instance.

### Automatic Metrics & Events (from Faro SDK)

The following are automatically captured by Grafana Faro's built-in instrumentations:

#### **Errors**
- **JavaScript Errors**: All uncaught JavaScript exceptions
  - Includes stack traces, error messages, and source locations
  - Captured via `window.onerror` and `unhandledrejection`
- **Console Errors**: Error-level console messages
- **Resource Errors**: Failed resource loads (images, scripts, etc.)

#### **Performance Metrics**
- **Page Load Timing**: 
  - `domContentLoaded`, `load`, `firstPaint`, `firstContentfulPaint`
  - Navigation timing API metrics
- **Resource Timing**: 
  - Load times for CSS, JS, images, and other resources
  - DNS lookup, connection, and transfer times
- **Web Vitals**:
  - **LCP** (Largest Contentful Paint)
  - **FID** (First Input Delay)
  - **CLS** (Cumulative Layout Shift)
  - **FCP** (First Contentful Paint)
  - **TTFB** (Time to First Byte)

#### **Navigation & Views**
- **Page Views**: Automatic tracking on route changes
- **Session Tracking**: Unique session IDs for user journeys
- **User Actions**: Click, keyboard, and form interactions

#### **HTTP Request Tracing**
- **All Fetch/XHR Requests**: Automatically traced with:
  - Request/response headers
  - Response status codes
  - Response times
  - Request URLs and methods
- **Distributed Tracing**: OpenTelemetry-compatible trace context

#### **Session Replay**
- **DOM Snapshotting**: Periodic snapshots of page state
- **User Interactions**: Mouse movements, clicks, scrolls, keystrokes
- **Full Session Recording**: Replayable user sessions

### Custom Events

The app sends the following custom events for key user actions:

#### **`js_error_triggered`**
- **When**: User clicks "Trigger JS Error" button on home page
- **Attributes**:
  - `source`: Always `"home_page_button"`
- **Use Case**: Testing error tracking and session replay

#### **`checkout_submitted`**
- **When**: User submits the checkout form
- **Attributes**:
  - `hasName`: Boolean indicating if name field was filled
  - `hasEmail`: Boolean indicating if email field was filled
- **Use Case**: Track checkout funnel and form completion

#### **`checkout_success`**
- **When**: Checkout form submission succeeds (API returns 200 OK)
- **Attributes**:
  - `responseTime`: Response time in milliseconds (string)
- **Use Case**: Track successful checkouts and performance

#### **`checkout_failed`**
- **When**: Checkout form submission fails (API error or 500 response)
- **Attributes**:
  - `error`: Error message (string)
  - `responseTime`: Response time in milliseconds (string)
- **Use Case**: Track checkout failures and error correlation

#### **`activity_generation_started`**
- **When**: User clicks "Generate Activity" button
- **Attributes**: None
- **Use Case**: Mark the start of simulated user activity

#### **`activity_generation_completed`**
- **When**: "Generate Activity" sequence finishes
- **Attributes**: None
- **Use Case**: Mark completion of simulated user journey

### Session Metadata

All telemetry includes automatic metadata:
- **App Name**: `"DEM Playground"`
- **App Version**: Dynamically fetched from `/api/state` endpoint (defaults to env var `APP_VERSION`)
- **Environment**: `"production"`
- **Browser Info**: User agent, viewport size, language
- **Page URL**: Current page path
- **Session ID**: Unique session identifier

### Configuration

Faro is initialized in `public/faro-init.js` with:
- **Collector URL**: Your Grafana Faro collector endpoint
- **Web Instrumentations**: Standard browser instrumentations (errors, performance, navigation, etc.)
- **Tracing Instrumentation**: HTTP request tracing via OpenTelemetry

To update the collector URL or configuration, edit `public/faro-init.js`.

## Next Steps

### RUM Integration Status

✅ **Grafana Faro is already integrated!** 

The app uses ES modules with import maps to load Faro packages. All pages include:
- Faro initialization script in `<head>` (via `public/faro-init.js`)
- Automatic error, performance, and navigation tracking
- Custom event tracking for key user actions
- HTTP request tracing

See the [Grafana Faro RUM Integration](#grafana-faro-rum-integration) section above for details on all tracked metrics and events.

### Adding More Custom Events

To add additional custom events, use the `pushFaroEvent()` helper function in `app.js`:

```javascript
pushFaroEvent('event_name', {
  attribute1: 'value1',
  attribute2: 123,
  // ... more attributes
});
```

The helper automatically checks if Faro is available and handles errors gracefully.

### Adding APM / Backend Observability

1. **Add OpenTelemetry:**
   ```bash
   npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/instrumentation-http @opentelemetry/instrumentation-express
   ```

2. **Instrument server.js:**
   Add OpenTelemetry initialization at the top of `server.js` to automatically trace Express routes.

3. **Log aggregation:**
   Use a service like Grafana Loki, Datadog, or New Relic to aggregate server logs for correlation with RUM data.

## License

MIT

