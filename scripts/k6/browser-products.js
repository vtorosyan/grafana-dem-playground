/**
 * k6 Browser: Products page flow (navigate → assert products load)
 * Run: k6 run scripts/k6/browser-products.js
 */
import { browser } from 'k6/browser';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    products: {
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

    // Navigate to products
    await page.locator('[data-testid="nav-products"]').click();
    await page.waitForSelector('[data-testid="products-list"]', { timeout: 5000 });

    // Assert products are visible
    const list = page.locator('[data-testid="products-list"]');
    const html = await list.innerHTML();
    check(
      html.includes('Widget') || html.includes('product'),
      { 'products list rendered': () => html.includes('Widget') || html.includes('product') }
    );

    // Assert at least one product item
    const productItems = page.locator('[data-testid^="product-prod-"]');
    const count = await productItems.count();
    check(count >= 1, { 'at least one product shown': () => count >= 1 });
  } finally {
    await page.close();
  }
}
