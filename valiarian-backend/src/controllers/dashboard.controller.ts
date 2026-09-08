import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {get, HttpErrors, param} from '@loopback/rest';
import {authorize} from '../authorization';
import {ValiarianDataSource} from '../datasources';

// One read-only statement gives every tile the same PostgreSQL snapshot.
// Values are bound parameters; neither identifiers nor SQL come from the client.
export const DASHBOARD_SQL = `
WITH scoped AS (
  SELECT * FROM public.orders WHERE isdeleted = false
    AND createdat >= $1::timestamptz AND createdat <= $2::timestamptz
), catalog AS (
  SELECT * FROM public.products WHERE isdeleted = false
), published AS (
  SELECT *, nullif(trim(seotitle), '') IS NOT NULL AS has_title,
    nullif(trim(seodescription), '') IS NOT NULL AS has_description,
    nullif(trim(slug), '') IS NOT NULL AS has_slug
  FROM catalog WHERE status = 'published' AND isactive = true
), inventory AS (
  SELECT v.id, p.id AS "productId", p.name, v.sku, v.size,
    greatest(0, coalesce(v.stockquantity,0) - coalesce(v.reservedquantity,0)) AS available,
    coalesce(p.lowstockthreshold,10) AS threshold
  FROM public.product_variants v JOIN published p ON p.id::text = v.productid::text
  WHERE v.isactive = true AND v.isdeleted = false AND p.trackinventory = true
), daily AS (
  SELECT to_char(createdat AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, count(*)::int AS orders
  FROM scoped GROUP BY 1
), statuses AS (
  SELECT status, count(*)::int AS count FROM scoped GROUP BY status
), recent AS (
  SELECT id, ordernumber AS "orderNumber", status, paymentstatus AS "paymentStatus",
    total, currency, createdat AS "createdAt"
  FROM scoped ORDER BY createdat DESC, id LIMIT 8
), seo_issues AS (
  SELECT id, name, has_title AS "hasTitle", has_description AS "hasDescription", has_slug AS "hasSlug"
  FROM published WHERE NOT (has_title AND has_description AND has_slug)
  ORDER BY name, id LIMIT 8
)
SELECT json_build_object(
  'orders', (SELECT json_build_object('total', count(*),
    'paidOrders', count(*) FILTER (WHERE paymentstatus IN ('paid','success') AND currency = 'INR'),
    'paidValue', coalesce(sum(total) FILTER (WHERE paymentstatus IN ('paid','success') AND currency = 'INR'),0),
    'otherCurrencyOrders', count(*) FILTER (WHERE currency IS DISTINCT FROM 'INR')) FROM scoped),
  'daily', coalesce((SELECT json_agg(daily ORDER BY day) FROM daily),'[]'::json),
  'statuses', coalesce((SELECT json_agg(statuses ORDER BY count DESC, status) FROM statuses),'[]'::json),
  'recent', coalesce((SELECT json_agg(recent ORDER BY "createdAt" DESC, id) FROM recent),'[]'::json),
  'operations', (SELECT json_build_object(
    'awaitingPayment', count(*) FILTER (WHERE paymentstatus IN ('pending','created') AND status NOT IN ('cancelled','failed','refunded','returned')),
    'toFulfil', count(*) FILTER (WHERE status IN ('paid','confirmed','processing','packed')),
    'inTransit', count(*) FILTER (WHERE status IN ('shipped','out_for_delivery')),
    'returns', count(*) FILTER (WHERE status = 'return_requested'),
    'manualShipping', count(*) FILTER (WHERE needsmanualshipping = true AND status IN ('paid','confirmed','processing','packed')),
    'refundFailures', count(*) FILTER (WHERE refundfailedat IS NOT NULL AND refundcompletedat IS NULL)
  ) FROM public.orders WHERE isdeleted = false),
  'catalog', (SELECT json_build_object('total',count(*),
    'published',count(*) FILTER (WHERE status = 'published' AND isactive = true),
    'draft',count(*) FILTER (WHERE status = 'draft'),
    'archived',count(*) FILTER (WHERE status = 'archived')) FROM catalog),
  'inventory', (SELECT json_build_object('trackedVariants',count(*),
    'outOfStock',count(*) FILTER (WHERE available = 0),
    'lowStock',count(*) FILTER (WHERE available > 0 AND available <= threshold)) FROM inventory),
  'lowStockItems', coalesce((SELECT json_agg(i) FROM (
    SELECT * FROM inventory WHERE available <= threshold ORDER BY available, name, id LIMIT 8
  ) i),'[]'::json),
  'seo', (SELECT json_build_object('eligible',count(*),
    'complete',count(*) FILTER (WHERE has_title AND has_description AND has_slug),
    'missingTitle',count(*) FILTER (WHERE NOT has_title),
    'missingDescription',count(*) FILTER (WHERE NOT has_description),
    'missingSlug',count(*) FILTER (WHERE NOT has_slug)) FROM published),
  'seoIssues', coalesce((SELECT json_agg(seo_issues ORDER BY name, id) FROM seo_issues),'[]'::json)
) AS summary`;

export function dashboardWindow(days: number, now = new Date()) {
  if (![7, 30, 90].includes(days)) {
    throw new HttpErrors.BadRequest('Dashboard period must be 7, 30 or 90 days.');
  }
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return {days, start: start.toISOString(), end: now.toISOString(), timezone: 'UTC'};
}

export class DashboardController {
  constructor(@inject('datasources.valiarian') private readonly dataSource: ValiarianDataSource) {}

  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
  @get('/api/dashboard/summary')
  async summary(@param.query.number('days') days = 30) {
    const period = dashboardWindow(days);
    const rows = await this.dataSource.execute(DASHBOARD_SQL, [period.start, period.end]);
    return {...rows[0].summary, period, generatedAt: period.end,
      environment: process.env.NODE_ENV === 'production' ? 'Production' : 'Development'};
  }
}
