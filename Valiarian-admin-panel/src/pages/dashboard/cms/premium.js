import { Helmet } from 'react-helmet-async';
import { CMSPremiumView } from 'src/sections/cms/view';

export default function CMSPremiumPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Premium CMS</title>
      </Helmet>

      <CMSPremiumView />
    </>
  );
}
