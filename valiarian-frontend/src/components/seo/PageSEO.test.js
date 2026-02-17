import { render } from '@testing-library/react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import PageSEO from './PageSEO';

// Helper to get helmet data
const getHelmetData = () => {
  const helmet = Helmet.peek();
  return helmet;
};

// Wrapper with HelmetProvider
const wrapper = ({ children }) => <HelmetProvider>{children}</HelmetProvider>;

describe('PageSEO', () => {
  beforeEach(() => {
    // Clear helmet between tests
    Helmet.canUseDOM = false;
  });

  it('renders basic meta tags', () => {
    render(
      <PageSEO
        title="Test Page"
        description="Test description"
        keywords={['test', 'page', 'seo']}
      />,
      { wrapper }
    );

    const helmet = getHelmetData();
    expect(helmet.title).toBe('Test Page');
  });

  it('renders Open Graph tags', () => {
    render(
      <PageSEO
        title="Test Page"
        description="Test description"
        ogImage="https://example.com/image.jpg"
        ogImageAlt="Test image"
      />,
      { wrapper }
    );

    const helmet = getHelmetData();
    const ogTags = helmet.metaTags.filter((tag) => tag.property?.startsWith('og:'));
    expect(ogTags.length).toBeGreaterThan(0);
  });

  it('renders Twitter Card tags', () => {
    render(
      <PageSEO
        title="Test Page"
        description="Test description"
        ogImage="https://example.com/image.jpg"
        twitterCard="summary_large_image"
      />,
      { wrapper }
    );

    const helmet = getHelmetData();
    const twitterTags = helmet.metaTags.filter((tag) => tag.name?.startsWith('twitter:'));
    expect(twitterTags.length).toBeGreaterThan(0);
  });

  it('renders structured data', () => {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Test Page',
    };

    render(<PageSEO title="Test Page" structuredData={structuredData} />, { wrapper });

    const helmet = getHelmetData();
    const scriptTags = helmet.scriptTags || [];
    const jsonLdScript = scriptTags.find((tag) => tag.type === 'application/ld+json');
    expect(jsonLdScript).toBeDefined();
  });

  it('renders canonical URL', () => {
    const canonicalUrl = 'https://example.com/test-page';

    render(<PageSEO title="Test Page" canonicalUrl={canonicalUrl} />, { wrapper });

    const helmet = getHelmetData();
    const canonicalLink = helmet.linkTags?.find((tag) => tag.rel === 'canonical');
    expect(canonicalLink?.href).toBe(canonicalUrl);
  });

  it('renders robots meta tag with noindex', () => {
    render(<PageSEO title="Test Page" noIndex />, { wrapper });

    const helmet = getHelmetData();
    const robotsTag = helmet.metaTags.find((tag) => tag.name === 'robots');
    expect(robotsTag?.content).toContain('noindex');
  });

  it('renders robots meta tag with nofollow', () => {
    render(<PageSEO title="Test Page" noFollow />, { wrapper });

    const helmet = getHelmetData();
    const robotsTag = helmet.metaTags.find((tag) => tag.name === 'robots');
    expect(robotsTag?.content).toContain('nofollow');
  });

  it('handles keywords as array', () => {
    render(<PageSEO title="Test Page" keywords={['keyword1', 'keyword2', 'keyword3']} />, {
      wrapper,
    });

    const helmet = getHelmetData();
    const keywordsTag = helmet.metaTags.find((tag) => tag.name === 'keywords');
    expect(keywordsTag?.content).toBe('keyword1, keyword2, keyword3');
  });

  it('handles keywords as string', () => {
    render(<PageSEO title="Test Page" keywords="keyword1, keyword2, keyword3" />, { wrapper });

    const helmet = getHelmetData();
    const keywordsTag = helmet.metaTags.find((tag) => tag.name === 'keywords');
    expect(keywordsTag?.content).toBe('keyword1, keyword2, keyword3');
  });

  it('renders without optional props', () => {
    render(<PageSEO title="Test Page" />, { wrapper });

    const helmet = getHelmetData();
    expect(helmet.title).toBe('Test Page');
  });

  it('sets default og:type to website', () => {
    render(<PageSEO title="Test Page" />, { wrapper });

    const helmet = getHelmetData();
    const ogTypeTag = helmet.metaTags.find((tag) => tag.property === 'og:type');
    expect(ogTypeTag?.content).toBe('website');
  });

  it('allows custom og:type', () => {
    render(<PageSEO title="Test Page" ogType="article" />, { wrapper });

    const helmet = getHelmetData();
    const ogTypeTag = helmet.metaTags.find((tag) => tag.property === 'og:type');
    expect(ogTypeTag?.content).toBe('article');
  });

  it('renders og:image dimensions', () => {
    render(<PageSEO title="Test Page" ogImage="https://example.com/image.jpg" />, { wrapper });

    const helmet = getHelmetData();
    const widthTag = helmet.metaTags.find((tag) => tag.property === 'og:image:width');
    const heightTag = helmet.metaTags.find((tag) => tag.property === 'og:image:height');

    expect(widthTag?.content).toBe('1200');
    expect(heightTag?.content).toBe('630');
  });
});
