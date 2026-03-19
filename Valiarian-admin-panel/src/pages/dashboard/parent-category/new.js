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

export default function ParentCategoryCreatePage() {
  const settings = useSettingsContext();

  return (
    <>
      <Helmet>
        <title> Dashboard: Create a new parent category</title>
      </Helmet>

      <Container maxWidth={settings.themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Create a new parent category"
          links={[
            {
              name: 'Dashboard',
              href: paths.dashboard.root,
            },
            {
              name: 'Parent Category',
              href: paths.dashboard.parentCategory.root,
            },
            { name: 'New parent category' },
          ]}
          sx={{
            mb: { xs: 3, md: 5 },
          }}
        />

        <CategoryNewEditForm isParentCategory />
      </Container>
    </>
  );
}
