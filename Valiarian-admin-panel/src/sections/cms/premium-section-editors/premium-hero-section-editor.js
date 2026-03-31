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
import FormProvider, { RHFEditor, RHFSelect, RHFTextField } from 'src/components/hook-form';
import CMSMediaPickerField from '../cms-media-picker-field';
//

// ----------------------------------------------------------------------

const ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

const HEIGHT_OPTIONS = [
  { value: 'full', label: 'Full Screen' },
  { value: 'auto', label: 'Auto' },
  { value: 'custom', label: 'Custom' },
];

// ----------------------------------------------------------------------

export default function PremiumHeroSectionEditor({ section, onSave, onCancel }) {
  const defaultValues = {
    name: section?.name || 'Hero Section',
    backgroundImage: section?.content?.backgroundImage || '',
    backgroundVideo: section?.content?.backgroundVideo || '',
    overlayOpacity: section?.content?.overlayOpacity || 0.5,
    heading: section?.content?.heading || '',
    subheading: section?.content?.subheading || '',
    description: section?.content?.description || '',
    alignment: section?.content?.alignment || 'center',
    height: section?.content?.height || 'full',
    ctaButtons: section?.content?.ctaButtons || [],
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
      type: 'hero',
      content: {
        backgroundImage: data.backgroundImage,
        backgroundVideo: data.backgroundVideo,
        overlayOpacity: parseFloat(data.overlayOpacity),
        heading: data.heading,
        subheading: data.subheading,
        description: data.description,
        alignment: data.alignment,
        height: data.height,
        ctaButtons: data.ctaButtons,
      },
      settings: {},
    };

    await onSave(sectionData);
  });

  const handleAddButton = () => {
    const currentButtons = values.ctaButtons || [];
    setValue('ctaButtons', [
      ...currentButtons,
      {
        text: 'Button',
        url: '#',
        style: 'primary',
        icon: '',
        openInNewTab: false,
      },
    ]);
  };

  const handleRemoveButton = (index) => {
    const currentButtons = [...values.ctaButtons];
    currentButtons.splice(index, 1);
    setValue('ctaButtons', currentButtons);
  };

  const handleUpdateButton = (index, field, value) => {
    const currentButtons = [...values.ctaButtons];
    currentButtons[index] = {
      ...currentButtons[index],
      [field]: value,
    };
    setValue('ctaButtons', currentButtons);
  };

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3} pb={3}>
        {/* Basic Info */}
        <Card>
          <CardContent>
            <Typography variant="h6" pb={3} gutterBottom>
              Basic Information
            </Typography>
            <Stack spacing={2}>
              <RHFTextField name="name" label="Section Name" />
              <RHFTextField name="heading" label="Heading" multiline rows={2} />
              <RHFTextField name="subheading" label="Subheading" />
              <RHFEditor
                name="description"
                id="hero-description"
                simple
                placeholder="Enter description..."
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Background */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Background
            </Typography>
            <Stack spacing={2}>
              <CMSMediaPickerField
                label="Background Image"
                value={values.backgroundImage}
                onChange={(url) => setValue('backgroundImage', url)}
                helperText="Select an image from media library"
                accept={{
                  'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
                }}
              />
              <CMSMediaPickerField
                label="Background Video (Optional)"
                value={values.backgroundVideo}
                onChange={(url) => setValue('backgroundVideo', url)}
                helperText="Select a video from media library"
                accept={{
                  'video/*': ['.mp4', '.webm'],
                }}
              />
              <RHFTextField
                name="overlayOpacity"
                label="Overlay Opacity"
                type="number"
                inputProps={{ min: 0, max: 1, step: 0.1 }}
                helperText="0 = transparent, 1 = solid"
              />
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
              <RHFSelect name="alignment" label="Content Alignment">
                {ALIGNMENT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </RHFSelect>
              <RHFSelect name="height" label="Section Height">
                {HEIGHT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </RHFSelect>
            </Stack>
          </CardContent>
        </Card>

        {/* CTA Buttons */}
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Call-to-Action Buttons</Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={handleAddButton}
                startIcon={<span>+</span>}
              >
                Add Button
              </Button>
            </Stack>

            <Stack spacing={2}>
              {values.ctaButtons?.map((button, index) => (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2}>
                        <TextField
                          fullWidth
                          label="Button Text"
                          value={button.text}
                          onChange={(e) => handleUpdateButton(index, 'text', e.target.value)}
                        />
                        <TextField
                          fullWidth
                          label="URL"
                          value={button.url}
                          onChange={(e) => handleUpdateButton(index, 'url', e.target.value)}
                        />
                      </Stack>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <TextField
                          select
                          label="Style"
                          value={button.style}
                          onChange={(e) => handleUpdateButton(index, 'style', e.target.value)}
                          sx={{ minWidth: 150 }}
                        >
                          <MenuItem value="primary">Primary</MenuItem>
                          <MenuItem value="secondary">Secondary</MenuItem>
                          <MenuItem value="outline">Outline</MenuItem>
                          <MenuItem value="text">Text</MenuItem>
                        </TextField>
                        <Button
                          color="error"
                          variant="outlined"
                          onClick={() => handleRemoveButton(index)}
                        >
                          Remove
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}

              {(!values.ctaButtons || values.ctaButtons.length === 0) && (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    No buttons added yet
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

PremiumHeroSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
