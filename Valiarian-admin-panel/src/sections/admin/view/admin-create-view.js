import Container from '@mui/material/Container';
// routes
import { paths } from 'src/routes/paths';
// components
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
// local
import AdminNewEditForm from '../admin-new-edit-form';

// ----------------------------------------------------------------------

export default function AdminCreateView() {
  const settings = useSettingsContext();

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Create Admin"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Admins', href: paths.dashboard.admins.list },
          { name: 'New Admin' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <AdminNewEditForm />
    </Container>
  );
}
