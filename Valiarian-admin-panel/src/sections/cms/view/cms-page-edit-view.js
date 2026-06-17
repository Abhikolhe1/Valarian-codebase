import PropTypes from 'prop-types';
// @mui
import Container from '@mui/material/Container';
// routes
import { paths } from 'src/routes/paths';
// api
import { useGetPage } from 'src/api/cms-pages';
// components
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { LoadingScreen } from 'src/components/loading-screen';
import { useSettingsContext } from 'src/components/settings';
//
import CMSPageNewEditForm from '../cms-page-new-edit-form';

// ----------------------------------------------------------------------

export default function CMSPageEditView({ id }) {
  const settings = useSettingsContext();

  // Use the hook to fetch page data
  const { page: currentPage, pageLoading: loading, pageError: error } = useGetPage(id);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <Container maxWidth={settings.themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Edit page"
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
            { name: 'Edit' },
          ]}
          sx={{
            mb: { xs: 3, md: 5 },
          }}
        />
        <div>Error: {error?.message || 'Failed to load page'}</div>
      </Container>
    );
  }

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Edit page"
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
          { name: currentPage?.title || 'Edit' },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      <CMSPageNewEditForm currentPage={currentPage} />
    </Container>
  );
}

CMSPageEditView.propTypes = {
  id: PropTypes.string,
};
