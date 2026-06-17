import PropTypes from 'prop-types';
// @mui
import Container from '@mui/material/Container';
// routes
import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hook';
// api
import { useGetCategory, useGetParentCategory } from 'src/api/category';
// components
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
//
import CategoryNewEditForm from '../category-new-edit-form';

// ----------------------------------------------------------------------

export default function CategoryEditView({ isParentCategory = false }) {
  const settings = useSettingsContext();

  const params = useParams();

  const { id } = params;

  const { category: currentCategory } = useGetCategory(isParentCategory ? '' : `${id}`);
  const { parentCategory } = useGetParentCategory(isParentCategory ? `${id}` : '');
  const categoryData = isParentCategory ? parentCategory : currentCategory;
  const breadcrumbLabel = isParentCategory ? 'Parent Category' : 'Category';
  const rootPath = isParentCategory ? paths.dashboard.parentCategory.root : paths.dashboard.category.root;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading={isParentCategory ? 'Edit Parent Category' : 'Edit Category'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          {
            name: breadcrumbLabel,
            href: rootPath,
          },
          { name: categoryData?.name },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      <CategoryNewEditForm currentCategory={categoryData} isParentCategory={isParentCategory} />
    </Container>
  );
}

CategoryEditView.propTypes = {
  isParentCategory: PropTypes.bool,
};
