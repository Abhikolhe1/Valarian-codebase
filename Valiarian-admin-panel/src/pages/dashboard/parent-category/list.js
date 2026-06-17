import { Helmet } from 'react-helmet-async';
// sections
import { CategoryListView } from 'src/sections/category/view';

// ----------------------------------------------------------------------

export default function ParentCategoryListPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Parent Category List</title>
      </Helmet>

      <CategoryListView isParentCategory />
    </>
  );
}
