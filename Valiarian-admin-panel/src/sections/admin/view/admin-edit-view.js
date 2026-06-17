import { useCallback, useEffect, useState } from 'react';
// @mui
import Alert from '@mui/material/Alert';
import Container from '@mui/material/Container';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
// routes
import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hook';
// utils
import axios, { endpoints } from 'src/utils/axios';
// components
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import Iconify from 'src/components/iconify';
// local
import AdminChangePasswordForm from '../admin-change-password-form';
import AdminNewEditForm from '../admin-new-edit-form';

// ----------------------------------------------------------------------

const TABS = [
  {
    value: 'general',
    label: 'General',
    icon: <Iconify icon="solar:user-id-bold" width={24} />,
  },
  {
    value: 'security',
    label: 'Security',
    icon: <Iconify icon="ic:round-vpn-key" width={24} />,
  },
];

export default function AdminEditView() {
  const settings = useSettingsContext();
  const { id } = useParams();

  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [currentTab, setCurrentTab] = useState('general');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChangeTab = useCallback((event, newValue) => {
    setCurrentTab(newValue);
  }, []);

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

      {!errorMessage && !!currentAdmin && (
        <>
          <Tabs
            value={currentTab}
            onChange={handleChangeTab}
            sx={{
              mb: { xs: 3, md: 5 },
            }}
          >
            {TABS.map((tab) => (
              <Tab key={tab.value} label={tab.label} icon={tab.icon} value={tab.value} />
            ))}
          </Tabs>

          {currentTab === 'general' && (
            <AdminNewEditForm currentAdmin={currentAdmin} includePasswordFields={false} />
          )}

          {currentTab === 'security' && <AdminChangePasswordForm currentAdmin={currentAdmin} />}
        </>
      )}
    </Container>
  );
}
