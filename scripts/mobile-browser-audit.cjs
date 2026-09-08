const {chromium} = require('C:/Users/kolhe/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({headless: true, executablePath:'C:/Users/kolhe/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
  const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, recordVideo: {dir: path.resolve('tmp/mobile-audit'), size: {width:390,height:844}}});
  const page = await context.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR:',e.message));
  for (const route of ['/products','/products/elight-zip-polo-royal-melange','/products/checkout','/auth/jwt/login']) {
    const url='http://localhost:3000'+route;
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForTimeout(5000);
    console.log('PAGE',url, 'TITLE',await page.title());
    console.log((await page.locator('body').innerText()).slice(0,10000));
    console.log('LINKS',JSON.stringify(await page.locator('a').evaluateAll(a=>a.map(x=>({text:x.innerText,href:x.getAttribute('href')})))));
    console.log('OVERFLOW', await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth})));
    console.log('BUTTONS',await page.getByRole('button').allTextContents());
    if(route==='/products') {
      await page.getByRole('button',{name:/Category:/}).click();
      console.log('CATEGORY MENU',(await page.locator('body').innerText()).slice(-4500));
      const option=page.getByRole('menuitem').filter({hasText:'Fusion'});
      if(await option.count()) {await option.first().click(); await page.waitForTimeout(2000);console.log('FILTER RESULT',(await page.locator('body').innerText()).slice(-5000));}
      else await page.keyboard.press('Escape');
      await page.getByRole('button',{name:/Sort By/}).click();
      console.log('SORT MENU',await page.getByRole('menuitem').allTextContents());
      const sort=page.getByRole('menuitem').filter({hasText:/Price.*Low/i});
      if(await sort.count()){await sort.first().click();await page.waitForTimeout(2000);console.log('SORT RESULT',(await page.locator('body').innerText()).slice(-5000));}else await page.keyboard.press('Escape');
    }
    if(route.includes('royal-melange')){await page.getByRole('button',{name:'Add to Cart',exact:true}).click();await page.waitForTimeout(2000);console.log('ADD CART RESULT',(await page.locator('body').innerText()).slice(0,3000));}
    if(route==='/auth/jwt/login'){await page.getByRole('button',{name:'Continue with Google'}).click();await page.waitForTimeout(4000);console.log('GOOGLE PAGE',new URL(page.url()).origin,(await page.locator('body').innerText()).slice(0,2000));}
    await page.screenshot({path:path.resolve('tmp/mobile-audit',route.replaceAll('/','_')+'.png'),fullPage:true});
  }
  await context.close(); await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
