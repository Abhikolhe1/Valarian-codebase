import { useMemo, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
// api
import { createContactSubmission } from 'src/api/contact';
// contexts
import { useSiteSettings } from 'src/contexts/SiteSettingsContext';
// components
import { useSnackbar } from 'src/components/snackbar';
//
import ContactMap from '../contact-map';
import ContactHero from '../contact-hero';
import ContactForm from '../contact-form';

// ----------------------------------------------------------------------

function getDefaultLocations(settings) {
  const general = settings?.general || {};

  return [
    {
      title: 'Head Office',
      address: '508 Bridle Avenue Newnan, GA 30263',
      phoneNumber: general.contactPhone || '',
      latitude: 33,
      longitude: 65,
    },
  ];
}

// ----------------------------------------------------------------------

export default function ContactView() {
  const { enqueueSnackbar } = useSnackbar();
  const { settings } = useSiteSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contactPage = settings?.contactPage || {};

  const locations = useMemo(
    () => (contactPage.locations?.length ? contactPage.locations : getDefaultLocations(settings)),
    [contactPage.locations, settings]
  );

  const handleSubmit = async (values, reset) => {
    const isOtherIssue = values.issueType === 'other';
    const payload = {
      name: values.name?.trim() || '',
      email: values.email?.trim() || '',
      phoneNumber: values.phoneNumber?.trim() || '',
      issueType: values.issueType || '',
      subject: values.subject?.trim() || '',
      message: values.message?.trim() || '',
      sourcePage: '/contact-us',
    };

    if (isOtherIssue) {
      payload.customIssueType = values.customIssueType?.trim() || '';
    }

    if (
      !payload.name ||
      !payload.email ||
      !payload.issueType ||
      !payload.subject ||
      !payload.message
    ) {
      enqueueSnackbar('Please fill all required contact fields.', { variant: 'warning' });
      return;
    }

    try {
      setIsSubmitting(true);

      await createContactSubmission(payload);

      enqueueSnackbar('Your contact request has been sent successfully.', {
        variant: 'success',
      });

      reset?.();
    } catch (error) {
      enqueueSnackbar(error?.message || 'Unable to send your request right now.', {
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ContactHero
        heroBadge={contactPage.heroBadge}
        heroTitleLine1={contactPage.heroTitleLine1}
        heroTitleLine2={contactPage.heroTitleLine2}
        heroTitleLine3={contactPage.heroTitleLine3}
        heroImage={contactPage.heroImage}
        contacts={locations}
      />

      <Container sx={{ py: 10 }}>
        <Box
          gap={10}
          display="grid"
          gridTemplateColumns={{
            xs: 'repeat(1, 1fr)',
            md: 'repeat(2, 1fr)',
          }}
        >
          <ContactForm
            formTitle={contactPage.formTitle}
            formDescription={contactPage.formDescription}
            submitLabel={contactPage.submitLabel}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />

          <ContactMap
            mapTitle={contactPage.mapTitle}
            mapDescription={contactPage.mapDescription}
            mapEmbedUrl={contactPage.mapEmbedUrl}
            contacts={locations}
          />
        </Box>
      </Container>
    </>
  );
}
