import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
// @mui
import Container from '@mui/material/Container';
// routes
import { paths } from 'src/routes/paths';
// components
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { LoadingScreen } from 'src/components/loading-screen';
import { useSettingsContext } from 'src/components/settings';
//
import CMSPageNewEditForm from '../cms-page-new-edit-form';

// ----------------------------------------------------------------------

export default function CMSPageEditView({ id }) {
  const settings = useSettingsContext();

  const [currentPage, setCurrentPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3035/api/cms/pages/${id}`);

        if (!response.ok) {
          throw new Error('Failed to fetch page');
        }

        const data = await response.json();
        setCurrentPage(data);
      } catch (err) {
        console.error('Error fetching page:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPage();
    }
  }, [id]);

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
        <div>Error: {error}</div>
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
