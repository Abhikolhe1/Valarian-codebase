import { useEffect, useMemo } from 'react';
import { useScroll } from 'framer-motion';
// components
import ScrollProgress from 'src/components/scroll-progress';
// CMS
import { usePageSectionsBySlug } from 'src/api/cms-query';
import {
  getBestSellersKey,
  getNewArrivalsKey,
  prefetchHomeProductCollections,
} from 'src/api/products';
import { hasInitialSWRKeys, readInitialData } from 'src/ssr/initial-data';
//
import HomeBestSellers from '../home-best-sellers';
import HomeCollectionHero from '../home-collection-hero';
import HomeFabricSection from '../home-fabric-section';
import HomeHero from '../home-hero';
import HomeNewArrivals from '../home-new-arrivals';
import HomeScrollAnimated from '../home-scroll-animated';
import HomeSocialMedia from '../home-social-media';
import { HomeHeroSkeleton, HomeProductSectionSkeleton, HomeSectionSkeleton } from '../home-skeletons';

// ----------------------------------------------------------------------

const HOME_PRODUCT_KEYS = [getNewArrivalsKey(), getBestSellersKey()];

export default function HomeView() {
  const { scrollYProgress } = useScroll();

  const { sections, sectionsLoading, sectionsError } = usePageSectionsBySlug('home');

  useEffect(() => {
    if (sectionsError) {
      // Keep the customer-facing fallback stable, while making a CMS outage observable.
      console.error('[HomeView] Homepage CMS sections could not be loaded', sectionsError);
    }
  }, [sectionsError]);

  useEffect(() => {
    if (hasInitialSWRKeys(readInitialData(), HOME_PRODUCT_KEYS)) return;

    prefetchHomeProductCollections().catch(() => {
      // Product sections already own their own error UI.
    });
  }, []);

  const sectionMap = useMemo(
    () =>
      sections.reduce((accumulator, section) => {
        accumulator[section.type] = section;
        return accumulator;
      }, {}),
    [sections]
  );

  const heroSection = sectionMap.hero;
  const scrollAnimatedSection = sectionMap['scroll-animated'];
  const newArrivalsSection = sectionMap['new-arrivals'];
  const collectionHeroSection = sectionMap['collection-hero'];
  const bestSellersSection = sectionMap['best-sellers'];
  const fabricSection = sectionMap['fabric-info'];
  const socialMediaSection = sectionMap['social-media'];

  const renderCmsSection = (section, Component, fallback) => {
    if (section) {
      return <Component cmsData={section} />;
    }

    if (sectionsError) return <Component cmsData={undefined} />;

    if (!sectionsLoading) return null;

    return fallback;
  };

  const renderProductSection = (section, Component) => {
    if (section || sectionsError) return <Component cmsData={section} />;
    if (sectionsLoading) return <HomeProductSectionSkeleton />;
    return null;
  };

  return (
    <>
      <ScrollProgress scrollYProgress={scrollYProgress} />

      {heroSection || sectionsError ? (
        <HomeHero
          imageSrc={heroSection?.content?.backgroundImage || '/assets/images/home/hero/valiarian-hero.png'}
          cmsData={heroSection}
        />
      ) : (
        <HomeHeroSkeleton />
      )}

      {renderCmsSection(scrollAnimatedSection, HomeScrollAnimated, <HomeSectionSkeleton />)}

      {renderProductSection(newArrivalsSection, HomeNewArrivals)}

      {collectionHeroSection || sectionsError ? (
        <HomeCollectionHero
          imageSrc={
            collectionHeroSection?.content?.backgroundImage ||
            '/assets/images/home/new-arrival/new-arrival-hero.jpeg'
          }
          cmsData={collectionHeroSection}
        />
      ) : (
        <HomeSectionSkeleton compact />
      )}

      {renderProductSection(bestSellersSection, HomeBestSellers)}

      {renderCmsSection(fabricSection, HomeFabricSection, <HomeSectionSkeleton />)}

      {renderCmsSection(socialMediaSection, HomeSocialMedia, <HomeSectionSkeleton compact />)}
    </>
  );
}
