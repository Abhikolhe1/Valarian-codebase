import { Helmet } from 'react-helmet-async';
// sections
import AdminEditView from 'src/sections/admin/view/admin-edit-view';

// ----------------------------------------------------------------------

export default function AdminEditPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Edit Admin</title>
      </Helmet>

      <AdminEditView />
    </>
  );
}
