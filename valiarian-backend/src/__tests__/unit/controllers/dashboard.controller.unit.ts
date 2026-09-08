import {strict as assert} from 'assert';
import {dashboardWindow, DashboardController, DASHBOARD_SQL} from '../../../controllers/dashboard.controller';
import {ValiarianDataSource} from '../../../datasources';

describe('Dashboard summary', () => {
  it('uses UTC calendar days including the current partial day', () => {
    const period = dashboardWindow(7, new Date('2026-09-08T08:30:00Z'));
    assert.equal(period.start, '2026-09-02T00:00:00.000Z');
    assert.equal(period.end, '2026-09-08T08:30:00.000Z');
  });
  it('handles month and year boundaries', () => {
    assert.equal(dashboardWindow(30, new Date('2026-01-01T01:00:00Z')).start, '2025-12-03T00:00:00.000Z');
  });
  it('rejects invalid and unbounded periods', () => {
    for (const value of [0, -1, 8, 365, 7.1, NaN, Infinity]) assert.throws(() => dashboardWindow(value));
    for (const value of [7, 30, 90]) assert.doesNotThrow(() => dashboardWindow(value));
  });
  it('uses a single read-only, parameterized snapshot and returns metadata', async () => {
    let calls = 0;
    const source = {execute: async (sql: string, parameters: string[]) => {
      calls++;
      assert.equal(sql, DASHBOARD_SQL);
      assert.equal(parameters.length, 2);
      assert(!/\b(insert|update|delete)\b/i.test(sql));
      return [{summary: {orders: {total: 0}}}];
    }} as unknown as ValiarianDataSource;
    const result = await new DashboardController(source).summary(90);
    assert.equal(calls, 1);
    assert.equal(result.period.days, 90);
    assert.equal(result.orders.total, 0);
  });
  it('propagates source failures instead of returning fabricated zeros', async () => {
    const source = {execute: async () => {throw new Error('Source unavailable');}} as unknown as ValiarianDataSource;
    await assert.rejects(() => new DashboardController(source).summary(), /Source unavailable/);
  });
});
