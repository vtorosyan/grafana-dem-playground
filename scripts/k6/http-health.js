/**
 * k6 HTTP: Basic health and API checks
 * Run: k6 run scripts/k6/http-health.js
 * With custom base URL: BASE_URL=https://grafana-dem-playground.fly.dev k6 run scripts/k6/http-health.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  // Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health status 200': (r) => r.status === 200,
    'health ok in body': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.ok === true && body.version !== undefined;
      } catch {
        return false;
      }
    },
    'health response time < 500ms': (r) => r.timings.duration < 500,
  });

  // State API
  const stateRes = http.get(`${BASE_URL}/api/state`);
  check(stateRes, {
    'state status 200': (r) => r.status === 200,
    'state has version': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.version !== undefined;
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
