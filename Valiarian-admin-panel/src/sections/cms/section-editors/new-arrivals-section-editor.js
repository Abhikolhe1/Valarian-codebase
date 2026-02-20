import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
// @mui
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// components
import { RHFTextField } from 'src/components/hook-form';
import FormProvider from 'src/components/hook-form/form-provider';
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function NewArrivalsSectionEditor({ section, onSave, onCancel }) {
  const defaultValues = {
    name: section?.name || 'New Arrivals',
    type: 'new-arrivals',
    content: {
      title: section?.content?.title || 'New Arrivals',
      subtitle: section?.content?.subtitle || 'Discover our latest collection of premium cotton polos, crafted with the same attention to detail and commitment to quality.',
    },
    settings: section?.settings || {
      backgroundColor: '#ffffff',
    },
  };

  const methods = useForm({
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    await onSave(data);
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3}>
        {/* Info Alert */}
        <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" />}>
          <Typography variant="subtitle2" gutterBottom>
            About New Arrivals Section
          </Typography>
          <Typography variant="body2">
            This section displays the latest products from your product catalog. Products are automatically fetched and sorted by creation date. You only need to configure the title and description text.
          </Typography>
        </Alert>

        {/* Section Name */}
        <RHFTextField
          name="name"
          label="Section Name"
          helperText="Internal name for this section (not shown to visitors)"
        />

        {/* Content Card */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Section Content
            </Typography>

            <Stack spacing={2}>
              {/* Title */}
              <RHFTextField
                name="content.title"
                label="Section Title"
                placeholder="New Arrivals"
                helperText="Main heading displayed above the products"
              />

              {/* Subtitle */}
              <RHFTextField
                name="content.subtitle"
                label="Section Description"
                placeholder="Discover our latest collection..."
                multiline
                rows={3}
                helperText="Description text displayed below the title"
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Products Info Card */}
        <Card sx={{ bgcolor: 'background.neutral' }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Iconify icon="solar:bag-bold" width={20} />
              <Typography variant="subtitle2">
                Product Display
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Products are automatically loaded from your product catalog and displayed in a carousel. The section shows all products marked as &quotnew arrivals&quot sorted by creation date (newest first).
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                💡 Tip: To manage which products appear here, go to Products → Add/Edit Products and set their creation date or &quotnew&quot label.
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Display Settings
            </Typography>

            <RHFTextField
              name="settings.backgroundColor"
              label="Background Color"
              placeholder="#ffffff"
              helperText="Hex color code for section background"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            Save Section
          </Button>
        </Stack>
      </Stack>
    </FormProvider>
  );
}

NewArrivalsSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
