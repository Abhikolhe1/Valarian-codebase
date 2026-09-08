// Credentials are supplied only through environment variables, never saved here.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/kolhe/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Users/kolhe/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
  try {
    const page=await browser.newPage();
    await page.goto('http://localhost:3001',{waitUntil:'domcontentloaded'});
    await page.getByLabel('Email address',{exact:true}).fill(process.env.ADMIN_TEST_EMAIL);
    await page.getByLabel('Password',{exact:true}).fill(process.env.ADMIN_TEST_PASSWORD);
    const result=page.waitForResponse(r=>r.url().endsWith('/api/auth/login')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Login',exact:true}).click();
    const response=await result;
    console.log('Login HTTP status:',response.status());
    if(!response.ok()){
      const data=await response.json();
      console.log('Login error:',data.error?.message || data.message || 'Unspecified rejection');
      process.exitCode=1;return;
    }
    await page.waitForURL('**/dashboard**',{timeout:20000});
    console.log('Admin redirect:',new URL(page.url()).pathname);
    console.log('Login succeeded in browser; credentials and tokens omitted.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
