import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, Response, RestBindings} from '@loopback/rest';
import {PageRepository} from '../repositories';

/**
 * Sitemap Controller
 * Generates XML sitemap for published pages
 */
export class SitemapController {
  constructor(
    @repository(PageRepository)
    public pageRepository: PageRepository,
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
      // Fetch all published pages
      const pages = await this.pageRepository.find({
        where: {
          status: 'published',
        },
        fields: {
          slug: true,
          updatedAt: true,
        },
        order: ['updatedAt DESC'],
      });

      // Get base URL from environment or use default
      const baseUrl = process.env.FRONTEND_URL || 'https://valiarian.com';

      // Generate XML sitemap
      const xml = this.generateSitemapXML(pages, baseUrl);

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

  /**
   * Generate XML sitemap from pages
   */
  private generateSitemapXML(
    pages: Array<{slug: string; updatedAt?: Date}>,
    baseUrl: string,
  ): string {
    const urls = pages.map(page => {
      const lastmod = page.updatedAt
        ? new Date(page.updatedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      return `  <url>
    <loc>${baseUrl}/${page.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  }
}
