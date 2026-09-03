import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, Response, RestBindings} from '@loopback/rest';
import {PageRepository, ProductRepository} from '../repositories';

const PRODUCTION_ORIGIN = 'https://valiarian.com';
const STATIC_PUBLIC_ROUTES = [
  '/',
  '/products',
  '/about-us',
  '/contact-us',
  '/faqs',
  '/premium',
];

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateSitemapXml(
  pages: Array<{slug: string; updatedAt?: Date}>,
  products: Array<{slug: string; updatedAt?: Date}>,
): string {
  const homePage = pages.find(page => page.slug === 'home');
  const entries = STATIC_PUBLIC_ROUTES.map(route => ({
    loc: `${PRODUCTION_ORIGIN}${route}`,
    updatedAt: route === '/' ? homePage?.updatedAt : undefined,
  }));

  for (const product of products) {
    if (product.slug) {
      entries.push({
        loc: `${PRODUCTION_ORIGIN}/products/${encodeURIComponent(product.slug)}`,
        updatedAt: product.updatedAt,
      });
    }
  }

  const uniqueEntries = [...new Map(entries.map(entry => [entry.loc, entry])).values()];
  const urls = uniqueEntries.map(entry => {
    const lastmod = entry.updatedAt
      ? `\n    <lastmod>${new Date(entry.updatedAt).toISOString().split('T')[0]}</lastmod>`
      : '';
    return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}\n  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

/**
 * Sitemap Controller
 * Generates XML sitemap for published pages
 */
export class SitemapController {
  constructor(
    @repository(PageRepository)
    public pageRepository: PageRepository,
    @repository(ProductRepository)
    public productRepository: ProductRepository,
  ) { }

  @get('/sitemap.xml', {
    responses: {
      '200': {
        description: 'XML Sitemap',
        content: {
          'application/xml': {
            schema: {type: 'string'},
          },
        },
      },
    },
  })
  async getSitemap(
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<void> {
    try {
      const [pages, products] = await Promise.all([
        this.pageRepository.find({
          where: {status: 'published', isActive: true, isDeleted: false},
          fields: {slug: true, updatedAt: true},
          order: ['updatedAt DESC'],
        }),
        this.productRepository.find({
          where: {status: 'published', isActive: true, isDeleted: false},
          fields: {slug: true, updatedAt: true},
          order: ['updatedAt DESC'],
        }),
      ]);

      // Generate XML sitemap
      const xml = generateSitemapXml(pages, products);

      // Set response headers
      response.status(200);
      response.contentType('application/xml');
      response.send(xml);
    } catch (error) {
      response.status(500);
      response.contentType('application/xml');
      response.send(
        '<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>',
      );
    }
  }

}
