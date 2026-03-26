import { Helmet } from 'react-helmet-async';
// sections
import AdminCreateView from 'src/sections/admin/view/admin-create-view';

// ----------------------------------------------------------------------

export default function AdminCreatePage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Create Admin</title>
      </Helmet>

      <AdminCreateView />
    </>
  );
}
