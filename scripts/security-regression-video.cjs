/* Run from the repository root after `npm run build` in valiarian-backend.
 * Real HTTP/controller/middleware tests with synthetic repositories and no DB.
 * Artifacts are generated under tmp/security-regression/<timestamp>.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const {createRequire} = require('module');
const {randomBytes, randomUUID} = require('crypto');
const req = createRequire(path.resolve('valiarian-backend/package.json'));
const dist = p => req('./dist/' + p);
const {RestApplication} = req('@loopback/rest');
const {AuthenticationComponent, registerAuthenticationStrategy} = req('@loopback/authentication');
const {asGlobalInterceptor} = req('@loopback/core');
const {ValiarianBackendApplication} = dist('application');
const {JWTStrategy} = dist('authentication-strategy/jwt-strategy');
const {JWTService} = dist('services/jwt-service');
const {BcryptHasher} = dist('services/hash.password.bcrypt');
const {RateLimiterService} = dist('services/rate-limiter.service');
const {TokenBlacklistService} = dist('services/token-blacklist.service');
const {AuthorizeInterceptor} = dist('interceptors/authorize.interceptor');
const {FILE_UPLOAD_SERVICE} = dist('keys');
const {FileUploadProvider} = dist('services/file-upload.service');
const {FileUploadController} = dist('controllers/file-upload.controller');
const {CMSMediaController} = dist('controllers/cms-media.controller');
const {AuthController} = dist('controllers/auth.controller');
const {PublicProductController} = dist('controllers/public-product.controller');
const {MySequence} = dist('sequence');
const playwrightPath = process.env.PLAYWRIGHT_MODULE || 'C:/Users/kolhe/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright';
const {chromium} = require(playwrightPath);
const out = path.resolve('tmp/security-regression', new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(out,{recursive:true});
const storage = fs.mkdtempSync(path.join(os.tmpdir(),'valiarian-security-'));
const tests = [], results = [];
const test = (name, fn) => tests.push({name, fn});
let app, browser, context, base;
const calls = {otp:0,media:0,users:0,query:null};
const tokens = {};
async function http(route, options={}) {
  const {role, json, body, ...rest} = options;
  const headers = {...rest.headers};
  if(role) headers.authorization='Bearer '+tokens[role];
  if(json) headers['content-type']='application/json';
  const response = await fetch(base+route,{...rest, headers, body:json?JSON.stringify(json):body,signal:AbortSignal.timeout(30000)});
  const text = await response.text();
  let data; try {data=JSON.parse(text);} catch {data=text;}
  return {status:response.status,data,bytes:Buffer.byteLength(text)};
}
function multipart(size, name='sample.bin', count=1, fields=0) {
  const form = new FormData();
  const blob = new Blob([Buffer.alloc(size,65)],{type:'application/octet-stream'});
  for(let i=0;i<count;i++) form.append('file',blob,name);
  for(let i=0;i<fields;i++) form.append('field'+i,'value');
  return form;
}
async function status(route, options, expected, message) {
  const r=await http(route,options); assert.equal(r.status,expected,JSON.stringify(r.data).slice(0,300));
  if(message) assert.match(JSON.stringify(r.data),message);
  return `HTTP ${r.status}${message?' — expected rejection message confirmed':''}`;
}
async function main() {
  process.env.NODE_ENV='test'; process.env.MOBILE_AUTH_ENABLED='true';
  process.env.BACKGROUND_JOBS_ENABLED='false';
  process.env.SUPER_ADMIN_BOOTSTRAP_TOKEN=randomBytes(32).toString('hex');
  const users = new Map();
  for(const role of ['user','admin','editor','super_admin']) users.set(role,{id:role,isActive:true,isDeleted:false});
  const userRepo={findById:async id=>users.get(id),findOne:async()=>null,create:async v=>{calls.users++;const u={...v,id:randomUUID()};users.set(u.id,u);return u;}};
  let session={id:'fixture',roleValue:'user',phoneVerified:true,isActive:true,phoneNumber:'+919000000001',expiresAt:new Date(Date.now()+3600000)};
  const hasher=new BcryptHasher();
  const jwt=new JWTService(randomBytes(48).toString('hex'),'1h',userRepo);
  for(const role of users.keys()) tokens[role]=await jwt.generateToken({id:role,roles:[role],permissions:[]});
  app=new RestApplication({rest:{host:'127.0.0.1',port:0,expressSettings:{'trust proxy':false},requestBodyParser:{json:{limit:'1mb'}}}});
  app.sequence(MySequence); app.component(AuthenticationComponent);
  app.bind('service.jwt.service').to(jwt);
  app.bind('services.token-blacklist').to(new TokenBlacklistService());
  registerAuthenticationStrategy(app,JWTStrategy);
  app.bind('interceptors.security-test-authorize').toProvider(AuthorizeInterceptor).apply(asGlobalInterceptor('authorization'));
  ValiarianBackendApplication.prototype.configureFileUpload.call(app,storage);
  const config=await app.getConfig(FILE_UPLOAD_SERVICE.key);
  const shared=new FileUploadProvider(config).value();
  app.bind(FILE_UPLOAD_SERVICE).to(shared);
  // Test adapter invokes the shared production upload handler; it is not a shipped route.
  app.expressMiddleware('test-shared-upload',(request,response,next)=>{
    if(request.path!=='/test-shared-upload') return next();
    return shared(request,response,error=>{
    if(error) return response.status(400).json({code:error.code});
    response.json({files:request.files.map(f=>({name:f.filename,size:f.size}))});
    });
  });
  app.bind('repositories.UsersRepository').to(userRepo);
  app.bind('repositories.RolesRepository').to({findOne:async f=>({id:'role-user',value:f.where.value,label:'User'})});
  app.bind('repositories.UserRolesRepository').to({findOne:async()=>null,create:async v=>v});
  app.bind('repositories.RegistrationSessionsRepository').to({findById:async()=>session,findOne:async()=>null,create:async v=>({...v,id:'new-session'}),updateById:async(_id,v)=>Object.assign(session,v)});
  for(const name of ['OtpRepository','RefreshTokenRepository']) app.bind('repositories.'+name).to({});
  app.bind('repositories.MediaRepository').to({create:async v=>({...v,id:randomUUID()})});
  app.bind('service.hasher').to(hasher);
  app.bind('service.rate.limiter').to(new RateLimiterService());
  app.bind('services.rbac').to({getUserRolesAndPermissions:async()=>({roles:['user'],permissions:[]})});
  app.bind('services.otp').to({issue:async()=>{calls.otp++;return {record:{id:'otp'},code:'123456'};},recordProviderMessage:async()=>{}});
  app.bind('services.otp.notification').to({sendOtp:async()=>undefined});
  for(const name of ['service.user.service','service.media.service','service.google.oauth','service.user.profile','services.cache']) app.bind(name).to({});
  app.bind('services.MediaUploadService').to({uploadMedia:async file=>{calls.media++;return {id:randomUUID(),size:file.size};}});
  const products=Array.from({length:150},(_,i)=>({id:String(i),name:'Fixture '+i}));
  const select=f=>{calls.query=f;return products.slice(f.skip,f.skip+f.limit);};
  app.bind('repositories.ProductRepository').to({find:async f=>select(f),count:async()=>({count:150}),findFeatured:async(limit,skip)=>select({limit,skip}),searchProducts:async f=>({data:select(f),total:150})});
  app.bind('repositories.CategoryRepository').to({findOne:async()=>null});
  for(const controller of [FileUploadController,CMSMediaController,AuthController,PublicProductController]) app.controller(controller);
  await app.start();base=app.restServer.url;
  for(const route of ['/files','/files/folder']) test('Anonymous directory listing blocked: '+route,()=>status(route,{},401));
  for(const route of ['/files','/files/folder','/api/cms/media/upload']) {
    test('Anonymous upload blocked: '+route,()=>status(route,{method:'POST',body:multipart(10)},401));
    test('Customer upload blocked: '+route,()=>status(route,{method:'POST',role:'user',body:multipart(10)},403));
  }
  test('Invalid JWT rejected',()=>status('/files',{headers:{authorization:'Bearer invalid'}},401));
  test('Customer cannot list directory',()=>status('/files',{role:'user'},403));
  for(const role of ['admin','editor','super_admin']) {
    test(role+' can list directory',()=>status('/files',{role},200));
    test(role+' can upload a small file',()=>status('/files',{method:'POST',role,body:multipart(64)},200));
  }
  test('Files: exactly 20 MB accepted',()=>status('/files',{method:'POST',role:'admin',body:multipart(20*1024*1024)},200));
  test('Files: 20 MB minus one byte accepted',()=>status('/files',{method:'POST',role:'admin',body:multipart(20*1024*1024-1)},200));
  test('Oversized upload returns a useful HTTP 413 error',()=>status('/files',{method:'POST',role:'admin',body:multipart(20*1024*1024+1)},413));
  test('Files: 20 MB + 1 byte rejected without residue',async()=>{const before=fs.readdirSync(storage).length;const r=await http('/files',{method:'POST',role:'admin',body:multipart(20*1024*1024+1)});assert.equal(r.status,500);assert.equal(fs.readdirSync(storage).length,before);return 'Rejected with HTTP 500; no partial file retained. Error should ideally be 413.';});
  test('Files: 11 files rejected',()=>status('/files',{method:'POST',role:'admin',body:multipart(10,'sample.bin',11)},500));
  test('Files: 51 text fields rejected',()=>status('/files',{method:'POST',role:'admin',body:multipart(10,'sample.bin',1,51)},500));
  test('Filename normalization and storage containment',async()=>{const r=await http('/files',{method:'POST',role:'admin',body:multipart(10,'..\\unsafe name?.bin')});assert.equal(r.status,200);const file=decodeURIComponent(r.data.files[0].fileUrl.split('/').pop());assert.match(file,/^[a-zA-Z0-9._-]+$/);assert.ok(fs.existsSync(path.join(storage,file)));return 'Stored filename sanitized; original display name preserved; file exists inside temporary storage.';});
  test('Parent path traversal rejected',()=>status('/files/file/'+encodeURIComponent('../outside.txt'),{},400,/Invalid file path/));
  test('Sibling prefix traversal rejected',()=>status('/files/file/'+encodeURIComponent('../'+path.basename(storage)+'-other/outside.txt'),{},400,/Invalid file path/));
  test('Folder listing traversal rejected',()=>status('/files/'+encodeURIComponent('../'),{role:'admin'},400,/Invalid folder path/));
  test('Existing 35 MB file remains downloadable',async()=>{const form=Buffer.alloc(35*1024*1024,65);fs.writeFileSync(path.join(storage,'existing-video.mp4'),form);const r=await http('/files/file/existing-video.mp4');assert.equal(r.status,200);assert.equal(r.bytes,form.length);return 'HTTP 200; all 36,700,160 bytes retrieved. Retrieval test, not video decoding.';});
  test('Shared handler accepts small file',()=>status('/test-shared-upload',{method:'POST',body:multipart(32)},200));
  test('Shared handler rejects >20 MB',()=>status('/test-shared-upload',{method:'POST',body:multipart(20*1024*1024+1)},400,/LIMIT_FILE_SIZE/));
  test('Shared handler rejects >10 files',()=>status('/test-shared-upload',{method:'POST',body:multipart(10,'file.bin',11)},400,/LIMIT_FILE_COUNT/));
  test('Shared handler rejects oversized text field',async()=>{const form= multipart(10);form.append('large','x'.repeat(64*1024+1));return status('/test-shared-upload',{method:'POST',body:form},400,/LIMIT_FIELD_VALUE/);});
  test('CMS accepts small multipart upload',()=>status('/api/cms/media/upload',{method:'POST',role:'editor',body:multipart(32)},200));
  test('CMS rejects >20 MB before media processing',async()=>{const before=calls.media;const r=await status('/api/cms/media/upload',{method:'POST',role:'editor',body:multipart(20*1024*1024+1)},500);assert.equal(calls.media,before);return r+'; media processor was not called.';});
  test('CMS rejects a second file',()=>status('/api/cms/media/upload',{method:'POST',role:'editor',body:multipart(32,'sample.bin',2)},500));
  test('CMS preserves previous 35 MB video-upload compatibility',async()=>{const form=new FormData();form.append('file',new Blob([Buffer.alloc(35*1024*1024)],{type:'video/mp4'}),'fixture.mp4');return status('/api/cms/media/upload',{method:'POST',role:'editor',body:form},200);});
  for(const role of ['admin','super_admin','editor']) test('Public signup rejects role '+role,async()=>{const before=calls.otp;const r=await status('/api/auth/send-phone-otp',{method:'POST',json:{phone:'9000000001',role}},400,/Invalid registration role/);assert.equal(calls.otp,before);return r+'; no OTP sent.';});
  test('Public user signup passes role gate',()=>status('/api/auth/send-phone-otp',{method:'POST',json:{phone:'9000000001',role:'user'}},200));
  const registration={sessionId:'fixture',fullName:'Synthetic Test',password:'StrongPass123'};
  test('Weak registration password rejected',async()=>{const before=calls.users;const r=await status('/api/auth/user/register',{method:'POST',json:{...registration,password:'weak'}},400,/Password does not meet requirements/);assert.equal(calls.users,before);return r;});
  test('Preexisting privileged signup session rejected',async()=>{session.roleValue='admin';try{return await status('/api/auth/user/register',{method:'POST',json:registration},400,/Invalid registration role/);}finally{session.roleValue='user';}});
  test('Valid user registration succeeds with strong password',async()=>{const r=await http('/api/auth/user/register',{method:'POST',json:registration});assert.equal(r.status,200);assert.deepEqual(r.data.user.roles,['user']);const user=users.get(r.data.user.id);assert.ok(await hasher.comparePassword(registration.password,user.password));assert.notEqual(user.password,registration.password);return 'HTTP 200; user role only; password hash verified.';});
  test('Bootstrap guessing blocked after five attempts; forged IP ignored',async()=>{for(let i=0;i<5;i++)await status('/api/auth/super-admin',{method:'POST',headers:{'x-bootstrap-token':'wrong','x-forwarded-for':'192.0.2.'+i},json:{email:'fixture@example.invalid',phone:'9000000001',password:'StrongPass123',fullName:'Fixture'}},404);return status('/api/auth/super-admin',{method:'POST',headers:{'x-forwarded-for':'192.0.2.99'},json:{email:'fixture@example.invalid',phone:'9000000001',password:'StrongPass123',fullName:'Fixture'}},429);});
  test('Rate limiter permits a different source IP',()=>{const limiter=new RateLimiterService();for(let i=0;i<5;i++)limiter.checkBootstrapAttempt('A');assert.throws(()=>limiter.checkBootstrapAttempt('A'),e=>e.statusCode===429);limiter.checkBootstrapAttempt('B');return 'Unit check: A blocked; independent B allowed.';});
  test('Rate-limit maps remain bounded under 10,050 unique keys',()=>{const limiter=new RateLimiterService();for(let i=0;i<10050;i++){limiter.checkLoginAttempt('ip'+i);limiter.checkOtpRequest('phone'+i);limiter.checkPasswordResetRequest('email'+i);limiter.checkBootstrapAttempt('ip'+i);}for(const key of ['loginAttempts','otpRequests','passwordResetRequests','bootstrapAttempts'])assert.ok(limiter[key].size<=10000);return 'Unit check: all four maps <=10,000 entries.';});
  test('Active OTP limit survives map-capacity pressure',()=>{const limiter=new RateLimiterService();limiter.checkOtpRequest('target');limiter.checkOtpRequest('target');assert.throws(()=>limiter.checkOtpRequest('target'),e=>e.statusCode===429);for(let i=0;i<10000;i++)limiter.checkOtpRequest('unique'+i);assert.throws(()=>limiter.checkOtpRequest('target'),e=>e.statusCode===429);return 'Blocked identifier still blocked after unique-key traffic.';});
  for(const route of ['/api/public/products','/api/public/products/new-arrivals','/api/public/products/best-sellers','/api/public/products/featured']) {
    test('Pagination cap: '+route,async()=>{const r=await http(route+'?limit=9999&offset=0');assert.equal(r.status,200);assert.equal(r.data.products.length,100);assert.equal(calls.query.limit,100);return 'HTTP 200; 150 fixture products available; exactly 100 returned.';});
    test('Negative/fractional pagination: '+route,async()=>{const r=await http(route+'?limit=-2&offset=-3');assert.equal(r.status,200);assert.equal(calls.query.limit,1);assert.equal(calls.query.skip,0);await http(route+'?limit=2.9&offset=1.9');assert.equal(calls.query.limit,2);assert.equal(calls.query.skip,1);return 'Negative values clamp to 1/0; fractional values floor to 2/1.';});
    test('Offset cap: '+route,async()=>{await http(route+'?offset=999999');assert.equal(calls.query.skip,100000);return 'Repository receives capped offset 100,000.';});
  }
  test('Local JWT configuration satisfies startup requirement',()=>{const env=req('dotenv').parse(fs.readFileSync(path.resolve('valiarian-backend/.env')));assert.ok(env.JWT_SECRET?.length>=32);return 'Secret present and length requirement satisfied; value not displayed.';});
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'C:/Users/kolhe/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
  context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out,size:{width:1280,height:900}}});
  const page=await context.newPage();
  await page.setContent(`<html><head><title>Valiarian security regression tests</title><style>body{background:#101827;color:#edf4ff;font:20px system-ui;padding:35px}h1{font-size:34px}p{color:#b8c8dc}article{padding:20px;border:1px solid #405472;border-radius:12px;margin:14px 0}.pass{color:#66edb3}.fail{color:#ff9191}#detail{font-size:23px;white-space:pre-wrap}#recent{font-size:17px}button{padding:15px;background:#307ac1;color:white;border:0;border-radius:8px}</style></head><body><h1>Valiarian — Security change verification</h1><p>Actual tests executing now • Isolated localhost server • Synthetic users and repositories</p><p>Real controllers, JWT verification, authorization and multipart parsers. No Google or payment completion claimed.</p><article><div id="count">Ready</div><h2 id="name">Starting</h2><div id="detail"></div></article><button id="run">Run next test</button><h3>Recent results</h3><div id="recent"></div></body></html>`);
  await page.exposeFunction('executeNext',async()=>{
    const i=results.length,t=tests[i];const start=Date.now();let result;
    try {result={name:t.name,status:'PASS',detail:await t.fn(),durationMs:Date.now()-start};}catch(e){result={name:t.name,status:'FAIL',detail:e.message,durationMs:Date.now()-start};}
    results.push(result);console.log(JSON.stringify(result));return {result,index:i+1,total:tests.length};
  });
  await page.evaluate(()=>document.getElementById('run').onclick=async()=>{
    const btn=document.getElementById('run');btn.disabled=true;
    document.getElementById('detail').textContent='Executing real test request…';
    const {result,index,total}=await window.executeNext();
    document.getElementById('count').textContent=`Test ${index} / ${total}`;
    document.getElementById('name').textContent=result.name;
    document.getElementById('detail').textContent=result.status+' — '+result.detail;
    document.getElementById('detail').className=result.status.toLowerCase();
    const row=document.createElement('p');row.textContent=index+'. '+result.status+' — '+result.name;
    document.getElementById('recent').prepend(row);
    while(document.getElementById('recent').children.length>5)document.getElementById('recent').lastChild.remove();
    btn.disabled=false;
  });
  for(let i=0;i<tests.length;i++){
    await page.locator('#name').evaluate((el,name)=>el.textContent=name,tests[i].name);
    await page.getByRole('button',{name:'Run next test'}).click();
    await page.waitForFunction(()=>!document.getElementById('run').disabled,null,{timeout:45000});
    await page.waitForTimeout(2200);
  }
  const summary={passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,total:results.length,scope:'Isolated HTTP integration and unit tests. Synthetic repositories. CMS processor stubbed. No production DB, Google login, actual payment, or admin order verification.',results};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(summary,null,2));
  fs.writeFileSync(path.join(out,'report.md'),[
    '# Security regression test results',
    '',`${summary.passed} passed; ${summary.failed} failed; ${summary.total} total.`,
    '',summary.scope,
    '', 'Build passed before this run. No production code changed during this testing task. Dependency compatibility is covered only by this build and these limited controller tests; outstanding dependency advisories remain.',
    '', 'The 35 MB download fixture contains synthetic bytes, not a playable video. This verifies download size compatibility only. The CMS fixture processor is stubbed to isolate multipart acceptance and rejection.',
    '', '## Failures', '', ...results.filter(r=>r.status==='FAIL').map(r=>`- ${r.name}: ${r.detail.replace(/\n/g,' ')}`),
    '', '## All checks', '', ...results.map(r=>`- ${r.status}: ${r.name} — ${r.detail.replace(/\n/g,' ')}`),
  ].join('\n'));
  await page.locator('#name').evaluate((el,s)=>el.textContent=s,`${summary.passed} passed / ${summary.failed} failed`);
  await page.locator('#detail').evaluate((el,failures)=>{el.textContent=failures.map(r=>'FAIL: '+r.name).join('\n');},results.filter(r=>r.status==='FAIL'));
  await page.locator('#recent').evaluate(el=>el.textContent='Completed scope: security regression tests with fixture services. Still untested: real Google authentication, payment, admin order visibility, and full mobile UI coverage.');
  await page.screenshot({path:path.join(out,'summary.png')});
  await page.waitForTimeout(7000);
  const video=page.video();await context.close();context=null;
  fs.renameSync(await video.path(),path.join(out,'security-tests.webm'));
  console.log('ARTIFACTS '+out);process.exitCode=summary.failed?1:0;
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  if(context)await context.close();if(browser)await browser.close();if(app)await app.stop();
  // Only fixtures in the unique OS temporary test folder are created; retained for inspection.
  console.log('Temporary fixture folder: '+storage);
});
