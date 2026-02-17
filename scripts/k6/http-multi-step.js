/**
 * k6 HTTP: Multi-step flow (session init → validate → create order → get order)
 * Tests chained API calls where each step uses data from the previous.
 * Run: k6 run scripts/k6/http-multi-step.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 3,
  duration: '1m',
  thresholds: {
    checks: ['rate>0.95'],
  },
};

export default function () {
  // Step 1: Initialize session
  const initRes = http.get(`${BASE_URL}/api/session/init`);
  const initOk = check(initRes, {
    'session init status 200': (r) => r.status === 200,
  });

  if (!initOk) {
    console.error('Session init failed:', initRes.body);
    return;
  }

  const { sessionId, token } = JSON.parse(initRes.body);

  // Step 2: Validate session
  const validateRes = http.get(
    `${BASE_URL}/api/session/validate?sessionId=${sessionId}&token=${token}`
  );
  check(validateRes, {
    'session validate status 200': (r) => r.status === 200,
    'session valid in body': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.valid === true;
      } catch {
        return false;
      }
    },
  });

  // Step 3: Create order
  const createRes = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({ items: [{ productId: 'prod-1', qty: 2 }] }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const createOk = check(createRes, {
    'order create status 201': (r) => r.status === 201,
  });

  if (!createOk) {
    console.error('Order create failed:', createRes.body);
    return;
  }

  const { orderId } = JSON.parse(createRes.body);

  // Step 4: Get order
  const getRes = http.get(`${BASE_URL}/api/orders/${orderId}`);
  check(getRes, {
    'order get status 200': (r) => r.status === 200,
    'order has correct status': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'created' && body.orderId === orderId;
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
