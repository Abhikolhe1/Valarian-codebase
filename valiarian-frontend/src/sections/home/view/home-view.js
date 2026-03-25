import { useEffect, useMemo } from 'react';
import { useScroll } from 'framer-motion';
// components
import ScrollProgress from 'src/components/scroll-progress';
// CMS
import { usePageSectionsBySlug } from 'src/api/cms-query';
import { prefetchHomeProductCollections } from 'src/api/products';
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

export default function HomeView() {
  const { scrollYProgress } = useScroll();

  const { sections, sectionsLoading } = usePageSectionsBySlug('home');

  useEffect(() => {
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
    if (section || !sectionsLoading) {
      return <Component cmsData={section} />;
    }

    return fallback;
  };

  return (
    <>
      <ScrollProgress scrollYProgress={scrollYProgress} />

      {heroSection || !sectionsLoading ? (
        <HomeHero
          imageSrc={heroSection?.content?.backgroundImage || '/assets/images/home/hero/valiarian-hero.png'}
          cmsData={heroSection}
        />
      ) : (
        <HomeHeroSkeleton />
      )}

      {renderCmsSection(scrollAnimatedSection, HomeScrollAnimated, <HomeSectionSkeleton />)}

      {sectionsLoading && !newArrivalsSection ? (
        <HomeProductSectionSkeleton />
      ) : (
        <HomeNewArrivals cmsData={newArrivalsSection} />
      )}

      {collectionHeroSection || !sectionsLoading ? (
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

      <HomeBestSellers cmsData={bestSellersSection} />

      {renderCmsSection(fabricSection, HomeFabricSection, <HomeSectionSkeleton />)}

      {renderCmsSection(socialMediaSection, HomeSocialMedia, <HomeSectionSkeleton compact />)}

      {/* <Box
        sx={{
          overflow: 'hidden',
          position: 'relative',
          bgcolor: 'background.default',
        }}
      >

        <HomeHugePackElements />

        <Box sx={{ position: 'relative' }}>
          <StyledPolygon />
          <HomeForDesigner />
          <StyledPolygon anchor="bottom" />
        </Box>

        <HomeDarkMode />

        <HomeColorPresets />

        <HomeCleanInterfaces />

        <HomePricing />

        <HomeLookingFor />

        <HomeAdvertisement />
      </Box> */}
    </>
  );
}
