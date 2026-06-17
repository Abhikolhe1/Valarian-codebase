import { Helmet } from 'react-helmet-async';
// sections
import { CMSMediaLibraryView } from 'src/sections/cms/view';

// ----------------------------------------------------------------------

export default function CMSMediaListPage() {
  return (
    <>
      <Helmet>
        <title>Media Library | CMS</title>
      </Helmet>

      <CMSMediaLibraryView />
    </>
  );
}
