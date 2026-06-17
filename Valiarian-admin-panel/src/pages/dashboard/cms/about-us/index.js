import { Helmet } from 'react-helmet-async';
import AboutPageEditView from 'src/sections/cms/view/about/about-page-edit-view';

export default function CMSAboutPage() {
  return (
    <>
      <Helmet>
        <title>About Us | CMS</title>
      </Helmet>

      <AboutPageEditView />
    </>
  );
}
