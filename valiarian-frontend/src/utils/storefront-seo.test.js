import { categorySeo, listingSeo, productSeo } from './storefront-seo';

describe('storefront SEO', () => {
  it('builds a canonical product URL and valid Product/Breadcrumb schema', () => {
    const seo = productSeo({
      id: 'uuid',
      slug: 'obsidian-polo',
      name: 'Obsidian Polo',
      seoTitle: 'Obsidian Premium Polo | Valiarian',
      seoDescription: '<p>A premium cotton polo.</p>',
      price: 1499,
      currency: 'INR',
      coverImage: '/images/obsidian.jpg',
      inStock: true,
      stockQuantity: 5,
    });

    expect(seo.title).toBe('Obsidian Premium Polo | Valiarian');
    expect(seo.canonicalUrl).toBe('https://valiarian.com/products/obsidian-polo');
    expect(seo.description).toBe('A premium cotton polo.');
    expect(seo.structuredData['@graph'][0].offers.availability).toBe(
      'https://schema.org/InStock'
    );
    expect(seo.structuredData['@graph'][1].itemListElement).toHaveLength(3);
  });

  it('uses existing category content and a dedicated canonical URL', () => {
    const seo = categorySeo({slug: 'short-sleeves', name: 'Short Sleeves', description: 'Polos'});
    expect(seo.canonicalUrl).toBe('https://valiarian.com/category/short-sleeves');
    expect(seo.description).toBe('Polos');
    expect(seo.structuredData['@graph'][1]['@type']).toBe('BreadcrumbList');
  });

  it('keeps clean listings indexable and query variants noindex', () => {
    expect(listingSeo().noIndex).toBe(false);
    const filtered = listingSeo({hasQueryParameters: true});
    expect(filtered.noIndex).toBe(true);
    expect(filtered.canonicalUrl).toBe('https://valiarian.com/products');
  });
});
