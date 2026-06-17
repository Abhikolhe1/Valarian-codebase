import { Helmet } from 'react-helmet-async';
// sections
import { CategoryEditView } from 'src/sections/category/view';

// ----------------------------------------------------------------------

export default function ParentCategoryEditPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Parent Category Edit</title>
      </Helmet>

      <CategoryEditView isParentCategory />
    </>
  );
}
