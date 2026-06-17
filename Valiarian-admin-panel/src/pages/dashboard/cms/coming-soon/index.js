import { Helmet } from 'react-helmet-async';
import ComingSoonPageEditView from 'src/sections/cms/view/coming Soon/coming-soon-edit-view';


export default function CMSComingSoonPage() {
  return (
    <>
      <Helmet>
        <title>Coming Soon | CMS</title>
      </Helmet>

      <ComingSoonPageEditView />
    </>
  );
}
