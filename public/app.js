/**
 * DEM Playground - Frontend JavaScript
 * Handles all page interactions, API calls, and observability logging
 */

console.log('DEM Playground frontend loaded');

// Helper function to push custom events to Faro (if available)
function pushFaroEvent(name, attributes = {}) {
  try {
    // Faro API might be available through window.faro.api or globally
    // Check multiple possible locations
    let faroApi = null;
    if (window.faro && window.faro.api) {
      faroApi = window.faro.api;
    } else if (window.faro && window.faro.pushEvent) {
      faroApi = window.faro;
    }
    
    if (faroApi && typeof faroApi.pushEvent === 'function') {
      faroApi.pushEvent(name, attributes);
      console.log('Faro event pushed:', name, attributes);
    }
  } catch (error) {
    // Silently fail if Faro is not available
    console.debug('Faro event push failed:', error);
  }
}

// Global state tracking
let appState = {
  slowMode: false,
  slowMs: 2000,
  failMode: false,
  jsErrorMode: false,
  version: 'v1'
};

// Initialize page based on current route
document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded:', window.location.pathname);
  
  const path = window.location.pathname;
  
  // Load version and state on all pages
  loadVersion();
  loadState();
  
  // Page-specific initialization
  if (path === '/' || path === '/index.html') {
    initHomePage();
  } else if (path === '/checkout') {
    initCheckoutPage();
  } else if (path === '/status') {
    initStatusPage();
  }
});

/**
 * Load version from API and display it
 */
async function loadVersion() {
  try {
    const response = await fetch('/api/state');
    const state = await response.json();
    appState = state;
    
    const versionEl = document.getElementById('version');
    if (versionEl) {
      versionEl.textContent = `Version: ${state.version}`;
    }
    
    console.log('Version loaded:', state.version);
  } catch (error) {
    console.error('Failed to load version:', error);
  }
}

/**
 * Load current state from API
 */
async function loadState() {
  try {
    const response = await fetch('/api/state');
    const state = await response.json();
    appState = state;
    updateStateDisplay(state);
    console.log('State loaded:', state);
  } catch (error) {
    console.error('Failed to load state:', error);
  }
}

/**
 * Update state display on home page
 */
function updateStateDisplay(state) {
  const displayEl = document.getElementById('state-display');
  if (!displayEl) return;
  
  displayEl.innerHTML = `
    <div class="state-item"><strong>Slow Mode:</strong> <span class="${state.slowMode ? 'badge-on' : 'badge-off'}">${state.slowMode ? 'ON' : 'OFF'}</span></div>
    <div class="state-item"><strong>Slow Delay:</strong> ${state.slowMs}ms</div>
    <div class="state-item"><strong>Fail Mode:</strong> <span class="${state.failMode ? 'badge-on' : 'badge-off'}">${state.failMode ? 'ON' : 'OFF'}</span></div>
    <div class="state-item"><strong>JS Error Mode:</strong> <span class="${state.jsErrorMode ? 'badge-on' : 'badge-off'}">${state.jsErrorMode ? 'ON' : 'OFF'}</span></div>
  `;
}

/**
 * Initialize home page controls
 */
function initHomePage() {
  console.log('Initializing home page');
  
  // JS Error button
  const btnJsError = document.getElementById('btn-js-error');
  if (btnJsError) {
    btnJsError.addEventListener('click', () => {
      console.log('User clicked: Trigger JS Error');
      pushFaroEvent('js_error_triggered', { source: 'home_page_button' });
      throw new Error('Intentional JavaScript error triggered from home page button');
    });
  }
  
  // Toggle JS error mode button
  const btnToggleJsErrorMode = document.getElementById('btn-toggle-js-error-mode');
  if (btnToggleJsErrorMode) {
    btnToggleJsErrorMode.addEventListener('click', async () => {
      console.log('User clicked: Toggle JS Error Mode');
      const newJsErrorMode = !appState.jsErrorMode;
      await toggleFlag('jsErrorMode', newJsErrorMode);
    });
  }
  
  // Toggle fail mode button
  const btnToggleFail = document.getElementById('btn-toggle-fail');
  if (btnToggleFail) {
    btnToggleFail.addEventListener('click', async () => {
      console.log('User clicked: Toggle API Fail');
      const newFailMode = !appState.failMode;
      await toggleFlag('failMode', newFailMode);
    });
  }
  
  // Toggle slow mode button
  const btnToggleSlow = document.getElementById('btn-toggle-slow');
  if (btnToggleSlow) {
    btnToggleSlow.addEventListener('click', async () => {
      console.log('User clicked: Toggle API Slow');
      const newSlowMode = !appState.slowMode;
      await toggleFlag('slowMode', newSlowMode);
    });
  }
  
  // Slow delay slider
  const slowMsSlider = document.getElementById('slow-ms');
  const slowMsValue = document.getElementById('slow-ms-value');
  if (slowMsSlider && slowMsValue) {
    slowMsSlider.value = appState.slowMs || 2000;
    slowMsValue.textContent = slowMsSlider.value;
    
    slowMsSlider.addEventListener('input', (e) => {
      slowMsValue.textContent = e.target.value;
    });
    
    const btnUpdateSlow = document.getElementById('btn-update-slow');
    if (btnUpdateSlow) {
      btnUpdateSlow.addEventListener('click', async () => {
        const newSlowMs = parseInt(slowMsSlider.value, 10);
        console.log('User updating slow delay to:', newSlowMs);
        await toggleFlag('slowMs', newSlowMs);
      });
    }
  }
  
  // Generate activity button
  const btnGenerateActivity = document.getElementById('btn-generate-activity');
  if (btnGenerateActivity) {
    btnGenerateActivity.addEventListener('click', async () => {
      console.log('User clicked: Generate Activity');
      pushFaroEvent('activity_generation_started');
      await generateActivity();
      pushFaroEvent('activity_generation_completed');
    });
  }

  // Error spike button - generates 100+ errors for testing
  const btnErrorSpike = document.getElementById('btn-error-spike');
  if (btnErrorSpike) {
    btnErrorSpike.addEventListener('click', () => {
      console.log('User clicked: Trigger Error Spike');
      pushFaroEvent('error_spike_triggered', { count: 250 });
      triggerErrorSpike();
    });
  }
}

/**
 * Trigger a spike of errors for testing error storm detection
 * - 150 JavaScript errors (thrown asynchronously)
 * - 100 failed API calls to /api/error
 */
function triggerErrorSpike() {
  const JS_ERROR_COUNT = 150;
  const API_ERROR_COUNT = 100;

  console.log(`Triggering error spike: ${JS_ERROR_COUNT} JS errors + ${API_ERROR_COUNT} API failures`);

  // 1. Fire 150 JavaScript errors, staggered so each gets captured
  for (let i = 0; i < JS_ERROR_COUNT; i++) {
    setTimeout(() => {
      throw new Error(`Error spike #${i + 1}/${JS_ERROR_COUNT} - Intentional error for DEM testing`);
    }, i * 25); // 25ms apart = ~3.75 seconds total
  }

  // 2. Fire 100 failed API requests
  for (let i = 0; i < API_ERROR_COUNT; i++) {
    fetch('/api/error').catch(() => {});
  }

  console.log('Error spike initiated - check your RUM/observability platform');
}

/**
 * Toggle a flag via API
 */
async function toggleFlag(flag, value) {
  try {
    const payload = { [flag]: value };
    console.log('Toggling flag:', payload);
    
    const response = await fetch('/api/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const updatedState = await response.json();
    appState = updatedState;
    updateStateDisplay(updatedState);
    
    console.log('Flag toggled successfully:', updatedState);
  } catch (error) {
    console.error('Failed to toggle flag:', error);
    alert('Failed to update flag: ' + error.message);
  }
}

/**
 * Generate simulated user activity
 */
async function generateActivity() {
  console.log('Starting activity generation...');
  
  // Navigate to checkout
  console.log('Activity: Navigating to checkout');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Make a few API calls
  for (let i = 0; i < 3; i++) {
    console.log(`Activity: API call ${i + 1}/3`);
    const start = performance.now();
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      const duration = performance.now() - start;
      console.log(`Activity: API call ${i + 1} completed in ${duration.toFixed(0)}ms`, data);
    } catch (error) {
      console.error(`Activity: API call ${i + 1} failed:`, error);
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Navigate to status
  console.log('Activity: Navigating to status');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Navigate back to home
  console.log('Activity: Navigating to home');
  window.location.href = '/';
}

/**
 * Initialize checkout page
 */
function initCheckoutPage() {
  console.log('Initializing checkout page');
  
  const form = document.getElementById('checkout-form');
  const messageEl = document.getElementById('checkout-message');
  
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('Checkout form submitted');
      
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      
      console.log('Form data:', { name, email });
      pushFaroEvent('checkout_submitted', { 
        hasName: !!name, 
        hasEmail: !!email 
      });
      
      // Call health API
      const start = performance.now();
      try {
        const response = await fetch('/api/health');
        const duration = performance.now() - start;
        const data = await response.json();
        
        console.log(`Health check completed in ${duration.toFixed(0)}ms:`, data);
        
        if (response.ok && data.ok) {
          if (messageEl) {
            messageEl.className = 'message success';
            messageEl.textContent = `Order submitted successfully! (Response time: ${duration.toFixed(0)}ms)`;
          }
          console.log('Checkout successful');
          pushFaroEvent('checkout_success', { 
            responseTime: duration.toFixed(0) 
          });
        } else {
          throw new Error(data.error || 'Health check failed');
        }
      } catch (error) {
        console.error('Checkout failed:', error);
        if (messageEl) {
          messageEl.className = 'message error';
          messageEl.textContent = `Error: ${error.message}`;
        }
        pushFaroEvent('checkout_failed', { 
          error: error.message,
          responseTime: duration.toFixed(0)
        });
      }
      
      // Throw JS error if jsErrorMode is enabled
      await loadState(); // Refresh state first
      if (appState.jsErrorMode) {
        console.error('JS Error Mode enabled - throwing error after checkout');
        throw new Error('JavaScript error after checkout submission (jsErrorMode enabled)');
      }
    });
  }
}

/**
 * Initialize status page with polling
 */
function initStatusPage() {
  console.log('Initializing status page');
  
  let lastError = null;
  
  // Poll immediately and then every 5 seconds
  checkStatus();
  setInterval(checkStatus, 5000);
  
  async function checkStatus() {
    const start = performance.now();
    try {
      console.log('Polling /api/health...');
      const response = await fetch('/api/health');
      const duration = performance.now() - start;
      const data = await response.json();
      
      // Update UI
      const okEl = document.getElementById('status-ok');
      const latencyEl = document.getElementById('status-latency');
      const versionEl = document.getElementById('status-version');
      const timestampEl = document.getElementById('status-timestamp');
      const errorEl = document.getElementById('status-error');
      
      if (okEl) {
        okEl.className = 'status-badge ' + (response.ok && data.ok ? 'status-ok' : 'status-error');
        okEl.textContent = response.ok && data.ok ? 'OK' : 'ERROR';
      }
      
      if (latencyEl) {
        latencyEl.textContent = `${duration.toFixed(0)}ms`;
      }
      
      if (versionEl) {
        versionEl.textContent = data.version || 'unknown';
      }
      
      if (timestampEl) {
        timestampEl.textContent = new Date(data.ts || Date.now()).toLocaleTimeString();
      }
      
      if (errorEl) {
        if (!response.ok || !data.ok) {
          lastError = data.error || 'Unknown error';
          errorEl.textContent = lastError;
          errorEl.className = 'error-text';
        } else {
          errorEl.textContent = 'None';
          errorEl.className = '';
        }
      }
      
      console.log(`Status check completed in ${duration.toFixed(0)}ms:`, data);
      
    } catch (error) {
      console.error('Status check failed:', error);
      lastError = error.message;
      
      const okEl = document.getElementById('status-ok');
      const errorEl = document.getElementById('status-error');
      
      if (okEl) {
        okEl.className = 'status-badge status-error';
        okEl.textContent = 'ERROR';
      }
      
      if (errorEl) {
        errorEl.textContent = error.message;
        errorEl.className = 'error-text';
      }
    }
  }
}

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
  console.error('Global error handler caught:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

