#!/usr/bin/env bash
set -euo pipefail

STORE_ORIGIN="${1:-https://valiarian.com}"
PRODUCT_SLUG="${2:-}"

check_status() {
  local path="$1" expected="$2"
  local actual
  actual="$(curl -sS -o /dev/null -w '%{http_code}' "${STORE_ORIGIN}${path}")"
  [ "$actual" = "$expected" ] || {
    echo "FAIL ${path}: expected ${expected}, received ${actual}" >&2
    return 1
  }
  echo "PASS ${path}: ${actual}"
}

check_status / 200

shell="$(curl -fsS "${STORE_ORIGIN}/")"
grep -Fq '<title>Valiarian | Premium Clothing</title>' <<<"$shell"
grep -Fq 'Discover Valiarian' <<<"$shell"
grep -Fq 'property="og:title" content="Valiarian | Premium Clothing"' <<<"$shell"
grep -Fq 'property="og:url" content="https://valiarian.com/"' <<<"$shell"
grep -Fq 'name="twitter:card" content="summary_large_image"' <<<"$shell"
! grep -Fq 'Valiarian UI Kit' <<<"$shell"
echo 'PASS fallback metadata'

robots_headers="$(curl -fsSI "${STORE_ORIGIN}/robots.txt")"
robots="$(curl -fsS "${STORE_ORIGIN}/robots.txt")"
grep -Eqi '^content-type: text/plain' <<<"$robots_headers"
if [[ "$STORE_ORIGIN" == 'https://valiarian.com' ]]; then
  grep -Fq 'Sitemap: https://valiarian.com/sitemap.xml' <<<"$robots"
else
  grep -Fq 'Disallow: /' <<<"$robots"
fi
echo 'PASS robots.txt'

sitemap_headers="$(curl -fsSI "${STORE_ORIGIN}/sitemap.xml")"
sitemap="$(curl -fsS "${STORE_ORIGIN}/sitemap.xml")"
grep -Eqi '^content-type: (application|text)/xml' <<<"$sitemap_headers"
grep -Fq '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' <<<"$sitemap"
grep -Fq '<loc>https://valiarian.com/</loc>' <<<"$sitemap"
! grep -Fq 'uat.valiarian.com' <<<"$sitemap"
! grep -Eq '/(dashboard|profile|orders|payment|auth|products/checkout)' <<<"$sitemap"
duplicate_count="$(grep -o '<loc>[^<]*</loc>' <<<"$sitemap" | sort | uniq -d | wc -l)"
[ "$duplicate_count" -eq 0 ]
echo 'PASS sitemap structure and exclusions'

if [ -n "$PRODUCT_SLUG" ]; then
  check_status "/products/${PRODUCT_SLUG}" 200
  grep -Fq "<loc>https://valiarian.com/products/${PRODUCT_SLUG}</loc>" <<<"$sitemap"
fi

echo 'INFO: fake-route and nonexistent-product checks must expect 404 after the shared serving-layer design is approved.'
