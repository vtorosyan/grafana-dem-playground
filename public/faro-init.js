/**
 * Grafana Faro RUM Initialization
 * This script initializes Faro for Real User Monitoring
 */

import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

// Get app version from state API or use default
async function getAppVersion() {
  try {
    const response = await fetch('/api/state');
    const state = await response.json();
    return state.version || '1.0.0';
  } catch (error) {
    console.warn('Failed to fetch app version, using default:', error);
    return '1.0.0';
  }
}

// Get Faro collector URL from API
async function getFaroCollectorUrl() {
  try {
    const response = await fetch('/api/faro-config');
    if (!response.ok) {
      throw new Error('Faro config not available');
    }
    const config = await response.json();
    return config.collectorUrl;
  } catch (error) {
    console.warn('Failed to fetch Faro collector URL:', error);
    return null;
  }
}

// Initialize Faro
async function initFaro() {
  try {
    const appVersion = await getAppVersion();
    const collectorUrl = await getFaroCollectorUrl();
    
    if (!collectorUrl) {
      console.warn('Faro collector URL not configured. RUM monitoring disabled.');
      console.warn('Set FARO_COLLECTOR_URL environment variable to enable RUM.');
      return;
    }
    
    initializeFaro({
      url: collectorUrl,
      app: {
        name: 'DEM Playground',
        version: appVersion,
        environment: 'production'
      },
      
      instrumentations: [
        // Mandatory, omits default instrumentations otherwise.
        ...getWebInstrumentations(),

        // Tracing package to get end-to-end visibility for HTTP requests.
        new TracingInstrumentation(),
      ],
    });
    
    console.log('Grafana Faro initialized with version:', appVersion);
  } catch (error) {
    console.error('Failed to initialize Grafana Faro:', error);
  }
}

// Initialize when script loads
initFaro();

