import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { useGetAboutPage } from 'src/api/about-page';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { useSettingsContext } from 'src/components/settings';
import { paths } from 'src/routes/paths';
import AboutPageEditForm from '../../about-page-edit-form';

export default function AboutPageEditView() {
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
        <AboutPageEditForm currentAboutPage={aboutPage} />
      )}
    </Container>
  );
}
