import { Helmet } from 'react-helmet-async';
// sections
import { CMSPageCreateView } from 'src/sections/cms/view';

// ----------------------------------------------------------------------

export default function CMSPageCreatePage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Create a new page</title>
      </Helmet>

      <CMSPageCreateView />
    </>
  );
}
