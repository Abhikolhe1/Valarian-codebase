// Read-only storefront smoke test: no account creation, payment or order submission.
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/kolhe/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({headless: true, executablePath: 'C:/Users/kolhe/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const route of ['/', '/products', '/products/elight-zip-polo-royal-melange', '/products/checkout', '/auth/jwt/login']) {
      await page.goto(`http://localhost:3000${route}`, {waitUntil: 'domcontentloaded', timeout: 60000});
      if (route === '/products') await page.getByRole('button', {name: /Sort By/}).waitFor();
      if (route.includes('royal-melange')) await page.getByRole('button', {name: 'Add to Cart', exact: true}).waitFor();
      if (route.includes('login')) await page.getByRole('button', {name: 'Continue with Google'}).waitFor();
      await page.waitForTimeout(800);
      assert(await page.locator('body').innerText(), `Empty page: ${route}`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow: ${route}`);
      console.log(`Mobile render passed: ${route}`);
    }
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('No browser runtime errors. No external messages, purchases or database writes made.');
  } finally {await browser.close();}
})().catch(error => {console.error(error.message); process.exitCode = 1;});
