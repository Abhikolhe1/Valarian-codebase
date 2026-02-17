import { yupResolver } from '@hookform/resolvers/yup';
import PropTypes from 'prop-types';
import { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// components
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
import { useSnackbar } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export default function CMSSaveTemplateDialog({ open, onClose, section, onSave }) {
  const { enqueueSnackbar } = useSnackbar();

  const SaveTemplateSchema = Yup.object().shape({
    name: Yup.string().required('Template name is required'),
    description: Yup.string(),
  });

  const defaultValues = useMemo(
    () => ({
      name: section?.name ? `${section.name} Template` : '',
      description: '',
    }),
    [section]
  );

  const methods = useForm({
    resolver: yupResolver(SaveTemplateSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = useCallback(
    async (data) => {
      try {
        // Get auth token from localStorage
        const token = localStorage.getItem('accessToken');

        if (!token) {
          enqueueSnackbar('You must be logged in to save templates', { variant: 'error' });
          return;
        }

        const templateData = {
          name: data.name,
          description: data.description,
          type: section.type,
          defaultContent: section.content || {},
          thumbnail: null, // Could be enhanced to capture a screenshot
        };

        const response = await fetch('http://localhost:3035/api/cms/templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(templateData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'Failed to save template');
        }

        const savedTemplate = await response.json();

        enqueueSnackbar('Template saved successfully!');

        if (onSave) {
          onSave(savedTemplate);
        }

        reset();
        onClose();
      } catch (error) {
        console.error('Error saving template:', error);
        enqueueSnackbar(error.message || 'Failed to save template', { variant: 'error' });
      }
    },
    [section, onSave, onClose, reset, enqueueSnackbar]
  );

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  if (!section) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Save as Template</Typography>
          <IconButton onClick={handleClose} disabled={isSubmitting}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              Save this section as a reusable template that can be used on other pages.
            </Typography>

            <RHFTextField
              name="name"
              label="Template Name"
              placeholder="Enter a descriptive name for this template"
              required
            />

            <RHFTextField
              name="description"
              label="Description"
              placeholder="Describe what this template is for (optional)"
              multiline
              rows={3}
            />

            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Section Type: <strong>{section.type}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                This template will be available in the template library for all users.
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="inherit" disabled={isSubmitting}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={isSubmitting}
            startIcon={<Iconify icon="solar:diskette-bold" />}
          >
            Save Template
          </LoadingButton>
        </DialogActions>
      </FormProvider>
    </Dialog>
  );
}

CMSSaveTemplateDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  section: PropTypes.object,
  onSave: PropTypes.func,
};
