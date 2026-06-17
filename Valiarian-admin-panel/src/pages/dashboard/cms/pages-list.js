import { Helmet } from 'react-helmet-async';
// sections
import { CMSPagesListView } from 'src/sections/cms/view';

// ----------------------------------------------------------------------

export default function CMSPagesListPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: CMS Pages</title>
      </Helmet>

      <CMSPagesListView />
    </>
  );
}
