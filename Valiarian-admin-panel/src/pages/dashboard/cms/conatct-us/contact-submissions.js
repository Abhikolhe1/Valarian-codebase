import {Helmet} from 'react-helmet-async';
// sections
import {CMSContactSubmissionsView} from 'src/sections/cms/view';

// ----------------------------------------------------------------------

export default function CMSContactSubmissionsPage() {
  return (
    <>
      <Helmet>
        <title>Contact Requests | CMS</title>
      </Helmet>

      <CMSContactSubmissionsView />
    </>
  );
}
