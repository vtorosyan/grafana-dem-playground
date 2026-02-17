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

// In-memory stores for multi-HTTP / synthetic monitoring (reset on restart)
const sessions = new Map();   // sessionId -> { token, createdAt }
const orders = new Map();     // orderId -> { items, status, createdAt }

// Static product list for /api/products
const products = [
  { id: 'prod-1', name: 'Widget A', price: 9.99 },
  { id: 'prod-2', name: 'Widget B', price: 19.99 },
  { id: 'prod-3', name: 'Widget C', price: 29.99 }
];

// Generate short IDs
function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

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

app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'products.html'));
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

// API: Always returns 500 - used for error spike simulation
app.get('/api/error', (req, res) => {
  res.status(500).json({
    ok: false,
    error: 'Error spike - intentional 500 response',
    ts: Date.now()
  });
});

// --- Synthetic Monitoring APIs ---

// Step 1 for multi-HTTP: Initialize session, returns sessionId and token for next step
app.get('/api/session/init', (req, res) => {
  const sessionId = genId('sess');
  const token = genId('tok').slice(0, 16);
  sessions.set(sessionId, { token, createdAt: Date.now() });
  res.json({
    sessionId,
    token,
    expiresIn: 60
  });
});

// Step 2 for multi-HTTP: Validate session (use sessionId and token from /api/session/init)
app.get('/api/session/validate', (req, res) => {
  const { sessionId, token } = req.query;
  if (!sessionId || !token) {
    return res.status(400).json({ error: 'sessionId and token required' });
  }
  const sess = sessions.get(sessionId);
  if (!sess || sess.token !== token) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  res.json({ valid: true, sessionId });
});

// List products
app.get('/api/products', (req, res) => {
  res.json({ products });
});

// Get product by ID
app.get('/api/products/:id', (req, res) => {
  const p = products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
});

// Step 3 for multi-HTTP: Create order, returns orderId for next step
app.post('/api/orders', (req, res) => {
  const items = req.body?.items || [{ productId: 'prod-1', qty: 1 }];
  const orderId = genId('ord');
  orders.set(orderId, {
    orderId,
    items,
    status: 'created',
    createdAt: Date.now()
  });
  res.status(201).json({
    orderId,
    status: 'created'
  });
});

// Step 4 for multi-HTTP: Get order by ID (use orderId from POST /api/orders)
app.get('/api/orders/:orderId', (req, res) => {
  const order = orders.get(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// Echo endpoint for scripted checks (returns query params / body for assertions)
app.get('/api/script/echo', (req, res) => {
  res.json({
    method: 'GET',
    query: req.query,
    ts: Date.now()
  });
});

app.post('/api/script/echo', (req, res) => {
  res.json({
    method: 'POST',
    body: req.body,
    ts: Date.now()
  });
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

