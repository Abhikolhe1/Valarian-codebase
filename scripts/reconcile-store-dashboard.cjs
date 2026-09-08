// Read-only reconciliation against the configured backend database.
const assert = require('node:assert/strict');
const path = require('node:path');
process.chdir(path.resolve(__dirname, '../valiarian-backend'));
const {ValiarianDataSource} = require('../valiarian-backend/dist/datasources');
const {DashboardController} = require('../valiarian-backend/dist/controllers/dashboard.controller');

(async () => {
  const source = new ValiarianDataSource();
  try {
    for (const days of [7, 30, 90]) {
      const result = await new DashboardController(source).summary(days);
      const orders = await source.execute('SELECT total, paymentstatus, currency FROM public.orders WHERE isdeleted = false AND createdat >= $1 AND createdat <= $2', [result.period.start, result.period.end]);
      const paid = orders.filter(order => ['paid', 'success'].includes(order.paymentstatus) && order.currency === 'INR');
      assert.equal(result.orders.total, orders.length);
      assert.equal(result.orders.paidOrders, paid.length);
      assert.equal(Math.round(result.orders.paidValue * 100), paid.reduce((sum, order) => sum + Math.round(Number(order.total) * 100), 0));
      assert.equal(result.daily.reduce((sum, day) => sum + day.orders, 0), orders.length);
      const products = await source.execute('SELECT status, isactive, seotitle, seodescription, slug FROM public.products WHERE isdeleted = false');
      const live = products.filter(product => product.status === 'published' && product.isactive);
      assert.equal(result.catalog.total, products.length);
      assert.equal(result.seo.eligible, live.length);
      assert.equal(result.seo.complete, live.filter(product => [product.seotitle, product.seodescription, product.slug].every(value => typeof value === 'string' && value.trim())).length);
      console.log(`${days}-day summary: order count, paid count/value, daily series, catalogue and SEO reconcile with source rows.`);
    }
  } finally {await source.disconnect();}
})().catch(error => {console.error(error.message); process.exitCode = 1;});
