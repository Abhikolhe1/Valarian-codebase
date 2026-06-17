import { Helmet } from 'react-helmet-async';
// sections
import { CMSNavigationEditorView } from 'src/sections/cms/view';

// ----------------------------------------------------------------------

export default function CMSNavigationPage() {
  return (
    <>
      <Helmet>
        <title>Navigation Menu | CMS</title>
      </Helmet>

      <CMSNavigationEditorView />
    </>
  );
}
