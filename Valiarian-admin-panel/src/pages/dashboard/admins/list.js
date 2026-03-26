import { Helmet } from 'react-helmet-async';
// sections
import AdminListView from 'src/sections/admin/view/admin-list-view';

// ----------------------------------------------------------------------

export default function AdminListPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Admin List</title>
      </Helmet>

      <AdminListView />
    </>
  );
}
