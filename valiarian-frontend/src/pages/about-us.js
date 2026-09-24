import PageSEO from 'src/components/seo/PageSEO';
// sections
import AboutView from 'src/sections/about/view/about-view';

// ----------------------------------------------------------------------

export default function AboutPage() {
  return (
    <>
      <PageSEO
        title="About Valiarian | Premium Polo T-Shirts"
        description="Learn about Valiarian's approach to refined design, premium fabrics, comfort, and modern polo shirts."
        canonicalUrl="https://valiarian.com/about-us"
      />

      <AboutView />
    </>
  );
}
