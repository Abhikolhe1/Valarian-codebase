// Read-only browser verification. Supply login credentials via environment only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/kolhe/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');

(async () => {
  const output = path.resolve('tmp/dashboard-check');
  fs.mkdirSync(output, {recursive: true});
  const browser = await chromium.launch({headless: true, executablePath: 'C:/Users/kolhe/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, recordVideo: {dir: output, size: {width: 1440, height: 1000}}});
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto('http://localhost:3001', {waitUntil: 'domcontentloaded'});
    await page.getByLabel('Email address', {exact: true}).fill(process.env.ADMIN_TEST_EMAIL);
    await page.getByLabel('Password', {exact: true}).fill(process.env.ADMIN_TEST_PASSWORD);
    const loginResponse = page.waitForResponse(r => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST');
    await page.getByRole('button', {name: 'Login', exact: true}).click();
    assert.equal((await loginResponse).status(), 200, 'Admin login HTTP status');
    await page.waitForURL('**/dashboard**', {timeout: 30000, waitUntil: 'domcontentloaded'});
    await page.goto('http://localhost:3001/dashboard/analytics');
    await page.getByRole('heading', {name: 'Store dashboard', exact: true}).waitFor();
    await page.getByText('Product SEO readiness', {exact: true}).waitFor({timeout: 30000});
    const summary = await page.evaluate(async () => {
      const response = await fetch('http://localhost:3035/api/dashboard/summary?days=30', {headers: {Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`}});
      if (!response.ok) throw new Error(`Summary HTTP ${response.status}`);
      return response.json();
    });
    assert.equal(summary.orders.total, summary.daily.reduce((sum, day) => sum + day.orders, 0));
    assert.equal(summary.orders.total, summary.statuses.reduce((sum, item) => sum + item.count, 0));
    assert.equal(summary.seo.eligible, summary.catalog.published);
    assert(summary.seo.complete <= summary.seo.eligible);
    assert(summary.recent.length <= 8);
    await page.locator('.apexcharts-svg').first().waitFor();
    await page.screenshot({path: path.join(output, 'desktop.png'), fullPage: true});
    for (const days of [7, 90, 30]) {
      const response = page.waitForResponse(r => r.url().includes(`/api/dashboard/summary?days=${days}`) && r.status() === 200);
      response.catch(() => {});
      await page.getByRole('combobox', {name: /^Order period/}).click();
      await page.getByRole('option', {name: `Last ${days} days`, exact: true}).click();
      await page.getByRole('listbox').waitFor({state: 'hidden'});
      assert.equal((await (await response).json()).period.days, days);
      await page.getByText('Product SEO readiness', {exact: true}).waitFor();
    }
    const refreshed = page.waitForResponse(r => r.url().includes('/api/dashboard/summary?days=30') && r.status() === 200);
    await page.getByRole('button', {name: 'Refresh', exact: true}).click();
    await refreshed;
    await page.getByText('Product SEO readiness', {exact: true}).waitFor();
    for (const width of [390, 360]) {
      await page.setViewportSize({width, height: 844});
      await page.waitForTimeout(600); // Let ApexCharts finish its debounced resize.
      await page.screenshot({path: path.join(output, `mobile-${width}.png`), fullPage: true});
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`);
      assert(await page.locator('.apexcharts-svg').first().evaluate(el => el.getBoundingClientRect().width <= innerWidth), `Chart overflow at ${width}px`);
      await page.getByText('Product SEO readiness', {exact: true}).scrollIntoViewIfNeeded();
      await page.getByText('Latest orders in selected period', {exact: true}).scrollIntoViewIfNeeded();
    }
    const access = await page.evaluate(async () => {
      const url = 'http://localhost:3035/api/dashboard/summary';
      const unauth = await fetch(url);
      const invalid = await fetch(`${url}?days=8`, {headers: {Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`}});
      return {unauth: unauth.status, invalid: invalid.status};
    });
    assert.equal(access.unauth, 401);
    assert.equal(access.invalid, 400);
    assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
    // Explicitly simulated failure: verify backend error text and recovery, not a live outage.
    await page.route('**/api/dashboard/summary*', route => route.fulfill({status: 503, contentType: 'application/json', body: JSON.stringify({error: {message: 'Dashboard test: backend temporarily unavailable'}})}));
    await page.getByRole('button', {name: 'Refresh', exact: true}).click();
    await page.getByText('Dashboard test: backend temporarily unavailable', {exact: true}).waitFor();
    await page.unroute('**/api/dashboard/summary*');
    await page.getByRole('button', {name: 'Retry', exact: true}).click();
    await page.getByText('Product SEO readiness', {exact: true}).waitFor();
    // Explicitly simulated empty state; never persisted or used as application fallback.
    const empty = {...summary, orders: {total: 0, paidOrders: 0, paidValue: 0, otherCurrencyOrders: 0}, daily: [], statuses: [], recent: [], seoIssues: [], lowStockItems: [],
      catalog: {total: 0, published: 0, draft: 0, archived: 0}, inventory: {trackedVariants: 0, outOfStock: 0, lowStock: 0},
      seo: {eligible: 0, complete: 0, missingTitle: 0, missingDescription: 0, missingSlug: 0}};
    await page.route('**/api/dashboard/summary*', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(empty)}));
    await page.getByRole('button', {name: 'Refresh', exact: true}).click();
    await page.getByText('N/A', {exact: true}).waitFor();
    assert.equal(await page.getByText('No orders in this period.', {exact: true}).count(), 2);
    await page.unroute('**/api/dashboard/summary*');
    await page.getByRole('button', {name: 'Refresh', exact: true}).click();
    await page.getByText('Product SEO readiness', {exact: true}).waitFor();
    console.log(JSON.stringify({passed: true, checks: ['real admin login', 'live summary', 'counts reconcile', '7/30/90 day filters', 'refresh', 'chart rendered', '390/360px no overflow', 'anonymous 401', 'invalid period 400', 'backend error shown and retry recovers'], orders: summary.orders, catalog: summary.catalog, seo: summary.seo, pageErrors}, null, 2));
  } catch (error) {
    console.error('Verification failure:', error.message);
    await page.screenshot({path: path.join(output, 'failure.png'), fullPage: true});
    console.log('Page URL:', page.url(), 'Page errors:', pageErrors);
    throw error;
  } finally {
    await context.close();
    console.log('Video:', await page.video().path());
    await browser.close();
  }
})().catch(error => {console.error(error.message); process.exitCode = 1;});
