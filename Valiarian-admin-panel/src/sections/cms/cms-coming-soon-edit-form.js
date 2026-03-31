import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { LoadingButton } from '@mui/lab';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Button,
  Stack,
  Typography,
  Card,
} from '@mui/material';

import FormProvider, { RHFTextField } from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
import CMSMediaField from './cms-media-field';
import { useSnackbar } from 'src/components/snackbar';
// import { updateComingSoon } from 'src/api/coming-soon'; // create this API

// ----------------------------

const defaultValues = {
  content: {
    subtitle: '',
    title: '',
    image: '',
  },
  background: {
    summer: '',
    monsoon: '',
    winter: '',
    overlayOpacity: 0.5,
  },
};

export default function ComingSoonEditForm({ currentData }) {
  const { enqueueSnackbar } = useSnackbar();

  const methods = useForm({
    defaultValues,
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = methods;

  // Load existing data
  useEffect(() => {
    if (currentData) {
      reset({
        ...defaultValues,
        ...currentData,
      });
    }
  }, [currentData, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      console.log('Coming Soon Data:', data);

      // await updateComingSoon(data);

      enqueueSnackbar('Coming Soon page updated successfully', {
        variant: 'success',
      });
    } catch (error) {
      enqueueSnackbar(error?.message || 'Update failed', {
        variant: 'error',
      });
    }
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3}>
        {/* CONTENT */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
            <Typography variant="h6">Content</Typography>
          </AccordionSummary>

          <AccordionDetails>
            <Stack spacing={3}>
              <RHFTextField name="content.subtitle" label="Subtitle (STAY TUNED)" />
              <RHFTextField name="content.title" label="Title (COMING SOON)" />

              <CMSMediaField
                name="content.image"
                label="Center Image"
                accept={{ 'image/*': ['.jpg', '.png', '.webp', '.svg'] }}
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* BACKGROUND */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
            <Typography variant="h6">Background Images</Typography>
          </AccordionSummary>

          <AccordionDetails>
            <Stack spacing={3}>
              <Card sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle1">Seasonal Backgrounds</Typography>

                  <CMSMediaField
                    name="background.summer"
                    label="Summer Background"
                  />

                  <CMSMediaField
                    name="background.monsoon"
                    label="Monsoon Background"
                  />

                  <CMSMediaField
                    name="background.winter"
                    label="Winter Background"
                  />
                </Stack>
              </Card>

              <RHFTextField
                name="background.overlayOpacity"
                label="Overlay Opacity (0 - 1)"
                type="number"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* SAVE */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
            Save Coming Soon
          </LoadingButton>
        </Box>
      </Stack>
    </FormProvider>
  );
}

ComingSoonEditForm.propTypes = {
  currentData: PropTypes.object,
};
