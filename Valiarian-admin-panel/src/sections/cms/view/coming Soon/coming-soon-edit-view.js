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
  const { aboutPage, aboutPageLoading } = useGetAboutPage();

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="About Us CMS"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'CMS', href: paths.dashboard.cms.root },
          { name: 'About Us' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {aboutPageLoading ? (
        <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 320 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <ComingSoonEditForm currentAboutPage={aboutPage} />
      )}
    </Container>
  );
}
