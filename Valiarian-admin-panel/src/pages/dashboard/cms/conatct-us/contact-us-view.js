import {Helmet} from 'react-helmet-async';
// sections
import ConatactUsEditView from 'src/sections/cms/view/Contact Request/view/contact-us-edit-view';

// ----------------------------------------------------------------------

export default function ConatactUsEditPage() {
  return (
    <>
      <Helmet>
        <title>Contact Requests | CMS</title>
      </Helmet>

      <ConatactUsEditView/>
    </>
  );
}
