import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { useGetAboutPage } from 'src/api/about-page';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { useSettingsContext } from 'src/components/settings';
import { paths } from 'src/routes/paths';
import ComingSoonEditForm from '../../cms-coming-soon-edit-form';


export default function ComingSoonPageEditView() {
  const settings = useSettingsContext();
  const { comingSoon, comingSoonLoading } = useGetAboutPage();

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Coming Soon CMS"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'CMS', href: paths.dashboard.cms.root },
          { name: 'Coming Soon' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {comingSoonLoading ? (
        <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 320 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <ComingSoonEditForm currentData={comingSoon} />
      )}
    </Container>
  );
}
