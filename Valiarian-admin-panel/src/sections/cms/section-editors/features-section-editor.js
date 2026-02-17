import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
// components
import FormProvider, { RHFSelect, RHFTextField } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const LAYOUT_OPTIONS = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
  { value: 'carousel', label: 'Carousel' },
];

// ----------------------------------------------------------------------

export default function FeaturesSectionEditor({ section, onSave, onCancel }) {
  const defaultValues = {
    name: section?.name || 'Features Section',
    heading: section?.content?.heading || '',
    description: section?.content?.description || '',
    layout: section?.content?.layout || 'grid',
    columns: section?.content?.columns || 3,
    features: section?.content?.features || [],
  };

  const methods = useForm({
    defaultValues,
  });

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  const onSubmit = handleSubmit(async (data) => {
    const sectionData = {
      name: data.name,
      type: 'features',
      content: {
        heading: data.heading,
        description: data.description,
        layout: data.layout,
        columns: parseInt(data.columns, 10),
        features: data.features,
      },
      settings: {},
    };

    await onSave(sectionData);
  });

  const handleAddFeature = () => {
    const currentFeatures = values.features || [];
    setValue('features', [
      ...currentFeatures,
      {
        icon: 'solar:widget-bold',
        title: 'Feature Title',
        description: 'Feature description',
        link: '',
      },
    ]);
  };

  const handleRemoveFeature = (index) => {
    const currentFeatures = [...values.features];
    currentFeatures.splice(index, 1);
    setValue('features', currentFeatures);
  };

  const handleUpdateFeature = (index, field, value) => {
    const currentFeatures = [...values.features];
    currentFeatures[index] = {
      ...currentFeatures[index],
      [field]: value,
    };
    setValue('features', currentFeatures);
  };

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3}>
        {/* Basic Info */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Stack spacing={2}>
              <RHFTextField name="name" label="Section Name" />
              <RHFTextField name="heading" label="Section Heading" />
              <RHFTextField name="description" label="Section Description" multiline rows={2} />
            </Stack>
          </CardContent>
        </Card>

        {/* Layout */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Layout
            </Typography>
            <Stack spacing={2}>
              <RHFSelect name="layout" label="Layout Style">
                {LAYOUT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </RHFSelect>
              {values.layout === 'grid' && (
                <RHFTextField
                  name="columns"
                  label="Number of Columns"
                  type="number"
                  inputProps={{ min: 1, max: 6 }}
                />
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Features</Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={handleAddFeature}
                startIcon={<span>+</span>}
              >
                Add Feature
              </Button>
            </Stack>

            <Stack spacing={2}>
              {values.features?.map((feature, index) => (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <TextField
                        fullWidth
                        label="Icon Name"
                        value={feature.icon}
                        onChange={(e) => handleUpdateFeature(index, 'icon', e.target.value)}
                        helperText="Iconify icon name (e.g., solar:widget-bold)"
                      />
                      <TextField
                        fullWidth
                        label="Title"
                        value={feature.title}
                        onChange={(e) => handleUpdateFeature(index, 'title', e.target.value)}
                      />
                      <TextField
                        fullWidth
                        label="Description"
                        value={feature.description}
                        onChange={(e) =>
                          handleUpdateFeature(index, 'description', e.target.value)
                        }
                        multiline
                        rows={2}
                      />
                      <Stack direction="row" spacing={2} alignItems="center">
                        <TextField
                          fullWidth
                          label="Link (Optional)"
                          value={feature.link}
                          onChange={(e) => handleUpdateFeature(index, 'link', e.target.value)}
                        />
                        <Button
                          color="error"
                          variant="outlined"
                          onClick={() => handleRemoveFeature(index)}
                        >
                          Remove
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}

              {(!values.features || values.features.length === 0) && (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    No features added yet
                  </Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Actions */}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {section ? 'Update Section' : 'Create Section'}
          </Button>
        </Stack>
      </Stack>
    </FormProvider>
  );
}

FeaturesSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
