import { useEffect, useState } from 'react';
// @mui
import Alert from '@mui/material/Alert';
import Container from '@mui/material/Container';
// routes
import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hook';
// utils
import axios, { endpoints } from 'src/utils/axios';
// components
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
// local
import AdminNewEditForm from '../admin-new-edit-form';

// ----------------------------------------------------------------------

export default function AdminEditView() {
  const settings = useSettingsContext();
  const { id } = useParams();

  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        setErrorMessage('');
        const response = await axios.get(endpoints.auth.adminDetails(id));
        setCurrentAdmin(response.data);
      } catch (error) {
        console.error(error);
        setErrorMessage(error.message || 'Unable to load admin details.');
      }
    };

    if (id) {
      fetchAdmin();
    }
  }, [id]);

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Edit Admin"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Admins', href: paths.dashboard.admins.list },
          { name: currentAdmin?.fullName || 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <AdminNewEditForm currentAdmin={currentAdmin} />
    </Container>
  );
}
