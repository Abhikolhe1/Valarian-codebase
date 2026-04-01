import { Helmet } from 'react-helmet-async';
import { usePageWithSections } from 'src/api/cms-query';
import { SectionList } from 'src/components/cms/section-renderer/SectionRenderer';
import ComingSoonView from 'src/sections/coming-soon/view';
import PremiumView from 'src/sections/premium/view';

// ----------------------------------------------------------------------

export default function PremiumPage() {
  const { page, pageLoading } = usePageWithSections('premium');
  const sections = page?.sections || [];
  const isPremiumActive = page?.status === 'published';
  const hasCmsSections = Array.isArray(sections) && sections.length > 0;
  let content = <ComingSoonView />;

  if (pageLoading) {
    content = <SectionList isLoading />;
  } else if (isPremiumActive && hasCmsSections) {
    content = <SectionList sections={sections} />;
  } else if (isPremiumActive) {
    content = <PremiumView />;
  }

  return (
    <>
      <Helmet>
        <title> Premium - Valiarian</title>
      </Helmet>

      {content}
    </>
  );
}
