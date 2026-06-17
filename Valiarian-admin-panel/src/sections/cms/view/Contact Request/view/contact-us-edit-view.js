// @mui
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
// routes
import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hook';
// components
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
//
import { useGetContactSubmission } from 'src/api/contact-submissions';

import ContactUsDetails from '../contact-us-details';

// ----------------------------------------------------------------------

export default function ConatactUsEditView() {
  const settings = useSettingsContext();
  const params = useParams();
  const { id } = params;

  const { submission: currentUser, submissionLoading } = useGetContactSubmission(id);

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Edit"
        links={[
          {
            name: 'Dashboard',
            href: paths.dashboard.root,
          },
          {
            name: 'Contact List',
            href: paths.dashboard.cms.contactSubmissions.list,
          },
          { name: currentUser?.name },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      {submissionLoading ? (
        <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 320 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <ContactUsDetails currentUser={currentUser} />
      )}
    </Container>
  );
}
