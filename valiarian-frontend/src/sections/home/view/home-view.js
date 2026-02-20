import { useScroll } from 'framer-motion';
// @mui
import { styled } from '@mui/material/styles';
// components
import ScrollProgress from 'src/components/scroll-progress';
// CMS
import { usePageSectionsBySlug } from 'src/api/cms-query';
//
import HomeBestSellers from '../home-best-sellers';
import HomeCollectionHero from '../home-collection-hero';
import HomeFabricSection from '../home-fabric-section';
import HomeHero from '../home-hero';
import HomeNewArrivals from '../home-new-arrivals';
import HomeScrollAnimated from '../home-scroll-animated';
import HomeSocialMedia from '../home-social-media';

// ----------------------------------------------------------------------

const StyledPolygon = styled('div')(({ anchor = 'top', theme }) => ({
  left: 0,
  zIndex: 9,
  height: 80,
  width: '100%',
  position: 'absolute',
  clipPath: 'polygon(0% 0%, 100% 100%, 0% 100%)',
  backgroundColor: theme.palette.background.default,
  display: 'block',
  lineHeight: 0,
  ...(anchor === 'top' && {
    top: -1,
    transform: 'scale(-1, -1)',
  }),
  ...(anchor === 'bottom' && {
    bottom: -1,
    backgroundColor: theme.palette.grey[900],
  }),
}));

// ----------------------------------------------------------------------

export default function HomeView() {
  const { scrollYProgress } = useScroll();

  // Fetch all CMS sections for homepage
  const { sections, sectionsLoading } = usePageSectionsBySlug('home');

  // Filter sections by type
  const heroSection = sections?.find((s) => s.type === 'hero');
  const scrollAnimatedSection = sections?.find((s) => s.type === 'scroll-animated');
  const newArrivalsSection = sections?.find((s) => s.type === 'new-arrivals');
  const collectionHeroSection = sections?.find((s) => s.type === 'collection-hero');
  const bestSellersSection = sections?.find((s) => s.type === 'best-sellers');
  const fabricSection = sections?.find((s) => s.type === 'fabric-info');
  const socialMediaSection = sections?.find((s) => s.type === 'social-media');

  return (
    <>
      <ScrollProgress scrollYProgress={scrollYProgress} />

      {/* Hero Section - Pass CMS data */}
      <HomeHero
        imageSrc={heroSection?.content?.backgroundImage || "/assets/images/home/hero/valiarian-hero.png"}
        cmsData={heroSection}
      />

      {/* Scroll Animated Section - Pass CMS data */}
      <HomeScrollAnimated cmsData={scrollAnimatedSection} />

      {/* New Arrivals - Pass CMS data */}
      <HomeNewArrivals cmsData={newArrivalsSection} />

      {/* Collection Hero - Pass CMS data */}
      <HomeCollectionHero
        imageSrc={collectionHeroSection?.content?.backgroundImage || "/assets/images/home/new-arrival/new-arrival-hero.jpeg"}
        cmsData={collectionHeroSection}
      />

      {/* Best Sellers - Pass CMS data */}
      <HomeBestSellers cmsData={bestSellersSection} />

      {/* Fabric Section - Pass CMS data */}
      <HomeFabricSection cmsData={fabricSection} />

      {/* Social Media - Pass CMS data */}
      <HomeSocialMedia cmsData={socialMediaSection} />

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
