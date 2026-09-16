// sections
import PageSEO from 'src/components/seo/PageSEO';
import { HomeView } from 'src/sections/home/view';

// ----------------------------------------------------------------------

export default function HomePage() {
  return (
    <>
      <PageSEO
        title="Valiarian | Premium Cotton Polo T-Shirts"
        description="Discover Valiarian premium cotton polo T-shirts, crafted for refined style, exceptional comfort and timeless everyday wear."
        canonicalUrl="https://valiarian.com/"
        ogImage="https://valiarian.com/assets/images/social/valiarian-share-preview.jpeg"
        ogImageAlt="Valiarian premium clothing collection"
      />

      <HomeView />
    </>
  );
}
