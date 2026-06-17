import { Helmet } from 'react-helmet-async';
// sections
import { CategoryListView } from 'src/sections/category/view';

// ----------------------------------------------------------------------

export default function CategoryListPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Category List</title>
      </Helmet>

      <CategoryListView />
    </>
  );
}
