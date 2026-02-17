// @mui
import Container from '@mui/material/Container';
// routes
import { paths } from 'src/routes/paths';
// components
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { useSettingsContext } from 'src/components/settings';
//
import CMSPageNewEditForm from '../cms-page-new-edit-form';

// ----------------------------------------------------------------------

export default function CMSPageCreateView() {
  const settings = useSettingsContext();

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Create a new page"
        links={[
          {
            name: 'Dashboard',
            href: paths.dashboard.root,
          },
          {
            name: 'CMS',
            href: paths.dashboard.cms.root,
          },
          {
            name: 'Pages',
            href: paths.dashboard.cms.pages.list,
          },
          { name: 'New page' },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      <CMSPageNewEditForm />
    </Container>
  );
}
