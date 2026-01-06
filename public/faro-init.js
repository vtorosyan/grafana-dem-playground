/**
 * Grafana Faro RUM Initialization
 * This script initializes Faro for Real User Monitoring
 * Uses Grafana's recommended IIFE bundle approach
 */

(function() {
  'use strict';
  
  // Get app version and collector URL, then initialize
  async function init() {
    try {
      console.log('🚀 Starting Faro initialization...');
      
      // Get app version
      let appVersion = '1.0.0';
      try {
        const stateResponse = await fetch('/api/state');
        const state = await stateResponse.json();
        appVersion = state.version || '1.0.0';
      } catch (e) {
        console.warn('Failed to fetch app version:', e);
      }
      
      // Get collector URL
      let collectorUrl = null;
      try {
        const configResponse = await fetch('/api/faro-config');
        if (configResponse.ok) {
          const config = await configResponse.json();
          collectorUrl = config.collectorUrl;
        }
      } catch (e) {
        console.warn('Failed to fetch Faro config:', e);
      }
      
      if (!collectorUrl) {
        console.warn('⚠️ Faro collector URL not configured. RUM monitoring disabled.');
        console.warn('Set FARO_COLLECTOR_URL environment variable to enable RUM.');
        return;
      }
      
      console.log('📦 Loading Faro SDK...');
      console.log('Collector URL:', collectorUrl);
      
      // Load main SDK bundle (IIFE format)
      const sdkScript = document.createElement('script');
      sdkScript.src = 'https://cdn.jsdelivr.net/npm/@grafana/faro-web-sdk@latest/dist/bundle/faro-web-sdk.iife.js';
      sdkScript.async = true;
      
      sdkScript.onload = function() {
        console.log('✅ Faro SDK loaded');
        
        // Load tracing bundle
        const tracingScript = document.createElement('script');
        tracingScript.src = 'https://cdn.jsdelivr.net/npm/@grafana/faro-web-tracing@latest/dist/bundle/faro-web-tracing.iife.js';
        tracingScript.async = true;
        
        tracingScript.onload = function() {
          console.log('✅ Tracing package loaded');
          initializeFaro(appVersion, collectorUrl);
        };
        
        tracingScript.onerror = function() {
          console.warn('⚠️ Tracing package failed to load, continuing without it');
          initializeFaro(appVersion, collectorUrl);
        };
        
        document.head.appendChild(tracingScript);
      };
      
      sdkScript.onerror = function() {
        console.error('❌ Failed to load Faro SDK');
      };
      
      document.head.appendChild(sdkScript);
      
    } catch (error) {
      console.error('❌ Initialization error:', error);
    }
  }
  
  function initializeFaro(appVersion, collectorUrl) {
    try {
      // Wait a moment for globals to be available
      setTimeout(function() {
        const faro = window.GrafanaFaroWebSdk || window.faro;
        
        if (!faro || !faro.initializeFaro) {
          console.error('❌ Faro SDK not available after loading');
          return;
        }
        
        console.log('⚙️ Initializing Faro...');
        
        const instrumentations = [];
        
        // Add web instrumentations
        if (faro.getWebInstrumentations && typeof faro.getWebInstrumentations === 'function') {
          try {
            const webInstr = faro.getWebInstrumentations();
            instrumentations.push(...webInstr);
            console.log('✅ Web instrumentations added');
          } catch (e) {
            console.warn('Could not add web instrumentations:', e);
          }
        }
        
        // Add tracing instrumentation
        const TracingInstrumentation = 
          (window.GrafanaFaroWebTracing && window.GrafanaFaroWebTracing.TracingInstrumentation) ||
          (window.faro && window.faro.TracingInstrumentation);
        
        if (TracingInstrumentation) {
          try {
            instrumentations.push(new TracingInstrumentation());
            console.log('✅ Tracing instrumentation added');
          } catch (e) {
            console.warn('Could not add tracing:', e);
          }
        }
        
        // Initialize
        faro.initializeFaro({
          url: collectorUrl,
          app: {
            name: 'DEM Playground',
            version: appVersion,
            environment: 'production'
          },
          instrumentations: instrumentations.length > 0 ? instrumentations : undefined
        });
        
        console.log('✅ Grafana Faro initialized successfully!');
        console.log('   App:', 'DEM Playground', appVersion);
        console.log('   Collector:', collectorUrl);
        
        // Verify API
        const api = window.faro?.api || window.GrafanaFaroWebSdk?.api;
        if (api) {
          console.log('✅ Faro API available');
        }
      }, 200);
      
    } catch (error) {
      console.error('❌ Failed to initialize Faro:', error);
    }
  }
  
  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
