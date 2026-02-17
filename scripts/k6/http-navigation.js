/**
 * k6 HTTP: Page navigation flow (all pages + products API)
 * Run: k6 run scripts/k6/http-navigation.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 3,
  duration: '2m',
  thresholds: {
    checks: ['rate>0.99'],
  },
};

const pages = ['/', '/products', '/checkout', '/status'];
const apis = ['/api/health', '/api/state', '/api/products'];

export default function () {
  // Load all pages
  for (const path of pages) {
    const res = http.get(`${BASE_URL}${path}`);
    check(res, {
      [`page ${path} loaded`]: (r) => r.status === 200,
    });
    sleep(0.5);
  }

  // Call APIs
  for (const path of apis) {
    const res = http.get(`${BASE_URL}${path}`);
    check(res, {
      [`api ${path} ok`]: (r) => r.status === 200,
    });
  }

  // Echo API (assert response)
  const echoRes = http.get(`${BASE_URL}/api/script/echo?test=hello`);
  check(echoRes, {
    'echo returns query params': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.query && body.query.test === 'hello';
      } catch {
        return false;
      }
    },
  });

  sleep(2);
}
