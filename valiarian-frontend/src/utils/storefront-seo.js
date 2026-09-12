const SITE_ORIGIN = 'https://valiarian.com';

export function absoluteStorefrontUrl(value = '') {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`;
}

export function plainText(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function limitText(value, maxLength = 160) {
  const text = plainText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

export function productSeo(product) {
  const name = plainText(product?.name || 'Product');
  const slug = product?.slug || product?.id || '';
  const canonicalUrl = `${SITE_ORIGIN}/products/${encodeURIComponent(slug)}`;
  const title = limitText(product?.seoTitle || `${name} | Valiarian`, 60);
  const description = limitText(
    product?.seoDescription ||
      product?.shortDescription ||
      product?.description ||
      `Shop ${name} by Valiarian and view its available colours, sizes and product details.`,
    160
  );
  const images = [product?.coverImage, ...(product?.images || [])]
    .filter(Boolean)
    .map(absoluteStorefrontUrl);
  const numericPrice = Number(product?.salePrice || product?.price || 0);
  const available = Boolean(product?.inStock && Number(product?.stockQuantity || 0) > 0);

  return {
    title,
    description,
    canonicalUrl,
    image: images[0],
    structuredData: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Product',
          '@id': `${canonicalUrl}#product`,
          name,
          description,
          image: images,
          sku: product?.sku || undefined,
          brand: {'@type': 'Brand', name: 'Valiarian'},
          category: product?.category?.name || undefined,
          offers: {
            '@type': 'Offer',
            url: canonicalUrl,
            priceCurrency: product?.currency || 'INR',
            price: numericPrice.toFixed(2),
            availability: available
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
        },
        breadcrumbSchema([
          {name: 'Home', url: SITE_ORIGIN},
          {name: 'Products', url: `${SITE_ORIGIN}/products`},
          ...(product?.category?.slug
            ? [
                {
                  name: product.category.name,
                  url: `${SITE_ORIGIN}/category/${encodeURIComponent(product.category.slug)}`,
                },
              ]
            : []),
          {name, url: canonicalUrl},
        ]),
      ],
    },
  };
}

export function categorySeo(category) {
  const name = plainText(category?.name || 'Products');
  const slug = category?.slug || '';
  const canonicalUrl = `${SITE_ORIGIN}/category/${encodeURIComponent(slug)}`;
  const description = limitText(
    category?.description ||
      `Browse ${name} from Valiarian and view available products, colours, sizes and details.`,
    160
  );

  return {
    title: limitText(`${name} | Premium Polo T-Shirts | Valiarian`, 60),
    description,
    canonicalUrl,
    image: absoluteStorefrontUrl(category?.image),
    structuredData: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          '@id': canonicalUrl,
          name,
          description,
          url: canonicalUrl,
        },
        breadcrumbSchema([
          {name: 'Home', url: SITE_ORIGIN},
          {name: 'Products', url: `${SITE_ORIGIN}/products`},
          {name, url: canonicalUrl},
        ]),
      ],
    },
  };
}

export function breadcrumbSchema(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function listingSeo({category, hasQueryParameters = false} = {}) {
  if (category) {
    return {...categorySeo(category), noIndex: hasQueryParameters};
  }

  return {
    title: 'Premium Polo T-Shirts for Men | Valiarian',
    description:
      'Shop premium Valiarian polo T-shirts crafted for exceptional comfort, refined style and everyday wear.',
    canonicalUrl: `${SITE_ORIGIN}/products`,
    noIndex: hasQueryParameters,
  };
}

export {SITE_ORIGIN};
