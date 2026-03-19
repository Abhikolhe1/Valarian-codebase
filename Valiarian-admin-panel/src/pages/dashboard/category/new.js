import { Helmet } from 'react-helmet-async';
import Container from '@mui/material/Container';
// routes
import { paths } from 'src/routes/paths';
// components
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
// sections
import { CategoryNewEditForm } from 'src/sections/category/view';

// ----------------------------------------------------------------------

export default function CategoryCreatePage() {
  const settings = useSettingsContext();

  return (
    <>
      <Helmet>
        <title> Dashboard: Create a new category</title>
      </Helmet>

      <Container maxWidth={settings.themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Create a new category"
          links={[
            {
              name: 'Dashboard',
              href: paths.dashboard.root,
            },
            {
              name: 'Category',
              href: paths.dashboard.category.root,
            },
            { name: 'New category' },
          ]}
          sx={{
            mb: { xs: 3, md: 5 },
          }}
        />

        <CategoryNewEditForm />
      </Container>
    </>
  );
}
