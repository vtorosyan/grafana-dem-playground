/**
 * DEM Playground - Express Server
 * A tiny demo app for Week of Load Testing (WOLT) demonstrating the DEM lifecycle
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_VERSION = process.env.APP_VERSION || 'v1';
const FARO_COLLECTOR_URL = process.env.FARO_COLLECTOR_URL || '';

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve node_modules for Faro ES modules (only for Faro packages)
app.use('/node_modules/@grafana', express.static('node_modules/@grafana'));

// In-memory state for runtime flags
let state = {
  slowMode: false,
  slowMs: 2000,
  failMode: false,
  jsErrorMode: false,
  version: APP_VERSION
};

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Static file routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

app.get('/status', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'status.html'));
});

// API: Get health status
app.get('/api/health', async (req, res) => {
  const startTime = Date.now();
  
  // Simulate slow mode if enabled
  if (state.slowMode) {
    await new Promise(resolve => setTimeout(resolve, state.slowMs));
  }
  
  // Simulate fail mode if enabled
  if (state.failMode) {
    const duration = Date.now() - startTime;
    return res.status(500).json({
      ok: false,
      error: 'Server error (fail mode enabled)',
      version: state.version,
      ts: Date.now(),
      latencyMs: duration
    });
  }
  
  // Normal response
  const duration = Date.now() - startTime;
  res.json({
    ok: true,
    version: state.version,
    ts: Date.now(),
    latencyMs: duration
  });
});

// API: Toggle runtime flags
app.post('/api/toggle', (req, res) => {
  const { slowMode, slowMs, failMode, jsErrorMode } = req.body;
  
  if (typeof slowMode === 'boolean') {
    state.slowMode = slowMode;
    console.log(`Slow mode ${slowMode ? 'enabled' : 'disabled'}`);
  }
  
  if (typeof slowMs === 'number' && slowMs >= 0 && slowMs <= 10000) {
    state.slowMs = slowMs;
    console.log(`Slow delay set to ${slowMs}ms`);
  }
  
  if (typeof failMode === 'boolean') {
    state.failMode = failMode;
    console.log(`Fail mode ${failMode ? 'enabled' : 'disabled'}`);
  }
  
  if (typeof jsErrorMode === 'boolean') {
    state.jsErrorMode = jsErrorMode;
    console.log(`JS error mode ${jsErrorMode ? 'enabled' : 'disabled'}`);
  }
  
  res.json(state);
});

// API: Get current state
app.get('/api/state', (req, res) => {
  res.json(state);
});

// API: Get Faro configuration (expose collector URL to frontend)
app.get('/api/faro-config', (req, res) => {
  if (!FARO_COLLECTOR_URL) {
    return res.status(503).json({ error: 'Faro collector URL not configured' });
  }
  res.json({
    collectorUrl: FARO_COLLECTOR_URL
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`DEM Playground ${APP_VERSION} running on http://localhost:${PORT}`);
  console.log(`State:`, state);
});

