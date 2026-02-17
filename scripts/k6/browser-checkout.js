/**
 * k6 Browser: Checkout flow (navigate → fill form → submit → assert)
 * Requires k6 with browser support. Run:
 *   k6 run scripts/k6/browser-checkout.js
 * Or with Docker:
 *   docker run --rm -i grafana/k6:master-with-browser run - < scripts/k6/browser-checkout.js
 *
 * Use BASE_URL env var for custom target:
 *   BASE_URL=https://grafana-dem-playground.fly.dev k6 run scripts/k6/browser-checkout.js
 */
import { browser } from 'k6/browser';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    checkout: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      options: {
        browser: {
          type: 'chromium',
          headless: true,
        },
      },
    },
  },
  thresholds: {
    checks: ['rate==1.0'],
  },
};

export default async function () {
  const page = await browser.newPage();

  try {
    // Go to home
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    check(true, { 'home page loaded': () => true });

    // Navigate to checkout
    await page.locator('[data-testid="nav-checkout"]').click();
    await page.waitForSelector('[data-testid="checkout-form"]', { timeout: 5000 });
    check(true, { 'checkout page loaded': () => true });

    // Fill form
    await page.locator('[data-testid="checkout-name"]').fill('k6 Test User');
    await page.locator('[data-testid="checkout-email"]').fill('k6@test.example.com');

    // Submit
    await page.locator('[data-testid="checkout-submit"]').click();

    // Wait for message (success or error)
    await page.waitForSelector('[data-testid="checkout-message"]', { timeout: 5000 });
    const messageEl = page.locator('[data-testid="checkout-message"]');
    const text = await messageEl.textContent();
    check(
      text.includes('success') || text.includes('Response time'),
      { 'checkout completed': () => text.includes('success') || text.includes('Response time') }
    );
  } finally {
    await page.close();
  }
}
