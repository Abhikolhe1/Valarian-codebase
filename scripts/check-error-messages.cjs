const fs = require('fs');
const vm = require('vm');
const path = require('path');

function interceptor(file) {
  let rejection;
  const source=fs.readFileSync(file,'utf8').replace(/^import .+;\r?\n/gm,'').split('export default axiosInstance;')[0];
  const instance={interceptors:{request:{use(){}},response:{use(_success,fail){rejection=fail;}}}};
  const sandbox={axios:{create:()=>instance},HOST_API:'http://localhost:3035',Promise,localStorage:{removeItem(){}},window:undefined};
  vm.runInNewContext(source,sandbox,{filename:file});
  return async data=>{try{await rejection({message:'Request failed with status code 400',config:{url:'/diagnostic'},response:{status:400,data}});}catch(e){return e;}};
}
function helper(file) {
  const source=fs.readFileSync(file,'utf8');
  const expression=source.match(/const getErrorMessage = ([\s\S]*?);/)[1];
  return vm.runInNewContext('('+expression+')');
}
async function main() {
  const response=await fetch('http://localhost:3035/files/file/'+encodeURIComponent('../outside-test-file.txt'));
  const data=await response.json();
  if(response.status!==400 || !data.error?.message) throw Error('Expected nested backend 400 error response');
  const expected=data.error.message;
  const front=await interceptor('valiarian-frontend/src/utils/axios.js')(data);
  const admin=await interceptor('Valiarian-admin-panel/src/utils/axios.js')(data);
  const checks=[
    ['Storefront shared error.message',front.message],
    ['Admin product save error.message fallback',admin.message || 'Something went wrong!'],
    ['Admin login nested message handler',admin?.error?.message || admin?.message || 'Login failed'],
    ['Storefront checkout payment helper',helper('valiarian-frontend/src/sections/product/checkout/checkout-payment.js')(front,'Payment failed')],
    ['Storefront review submission helper',helper('valiarian-frontend/src/sections/product/product-review-new-form.js')(front)],
    ['Storefront address API helper',helper('valiarian-frontend/src/api/addresses.js')(front,'Address failed')],
    ['Storefront shipping API helper',helper('valiarian-frontend/src/api/shipping.js')(front,'Shipping failed')],
    ['Admin CMS upload nested message handler',admin?.error?.message || 'Failed to upload files'],
    ['Admin CMS page save hardcoded message','Error saving page'],
  ].map(([name,displayed])=>({name,preservesBackendMessage:displayed===expected,displayed}));
  const report={backendStatus:response.status,backendMessage:expected,scope:'Real read-only backend error response fed through actual shared interceptor code and extracted helper functions. Admin consumer expressions are reproduced from the inspected screens. This is not an end-to-end test of each screen.',checks};
  const out=path.resolve('tmp/error-message-check');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
