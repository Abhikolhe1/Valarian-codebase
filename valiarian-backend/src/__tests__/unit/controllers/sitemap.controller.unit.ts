import {expect} from '@loopback/testlab';
import {escapeXml, generateSitemapXml} from '../../../controllers/sitemap.controller';

describe('SitemapController helpers', () => {
  it('escapes XML special characters', () => {
    expect(escapeXml(`&<>"'`)).to.equal('&amp;&lt;&gt;&quot;&apos;');
  });

  it('emits public routes and slug product URLs without duplicates', () => {
    const xml = generateSitemapXml(
      [{slug: 'home', updatedAt: new Date('2026-08-27T20:43:23.987Z')}],
      [
        {slug: 'obsidian-polo', updatedAt: new Date('2026-09-01T12:00:00Z')},
        {slug: 'obsidian-polo', updatedAt: new Date('2026-09-01T12:00:00Z')},
      ],
    );

    expect(xml.includes('<loc>https://valiarian.com/</loc>')).to.equal(true);
    expect(xml.includes('<loc>https://valiarian.com/products</loc>')).to.equal(true);
    expect(xml.includes('<loc>https://valiarian.com/about-us</loc>')).to.equal(true);
    expect(xml.includes('<loc>https://valiarian.com/contact-us</loc>')).to.equal(true);
    expect(xml.includes('<loc>https://valiarian.com/products/obsidian-polo</loc>')).to.equal(true);
    expect(xml.includes('<lastmod>2026-08-27</lastmod>')).to.equal(true);
    expect(xml.includes('/home</loc>')).to.equal(false);
    expect(xml.includes('uat.valiarian.com')).to.equal(false);
    expect(xml.match(/products\/obsidian-polo/g)?.length).to.equal(1);
  });
});
