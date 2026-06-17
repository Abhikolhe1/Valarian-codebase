import { Helmet } from 'react-helmet-async';
// sections
import { CMSSettingsView } from 'src/sections/cms/view';

// ----------------------------------------------------------------------

export default function CMSSettingsPage() {
  return (
    <>
      <Helmet>
        <title>Site Settings | CMS</title>
      </Helmet>

      <CMSSettingsView />
    </>
  );
}
