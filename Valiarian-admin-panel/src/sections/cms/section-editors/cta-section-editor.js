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
import CMSMediaPickerField from '../cms-media-picker-field';
//

// ----------------------------------------------------------------------

const ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

// ----------------------------------------------------------------------

export default function CTASectionEditor({ section, onSave, onCancel }) {
  const defaultValues = {
    name: section?.name || 'CTA Section',
    heading: section?.content?.heading || '',
    description: section?.content?.description || '',
    backgroundImage: section?.content?.backgroundImage || '',
    backgroundColor: section?.content?.backgroundColor || '#1976d2',
    alignment: section?.content?.alignment || 'center',
    buttons: section?.content?.buttons || [],
  };

  const methods = useForm({ defaultValues });
  const { handleSubmit, watch, setValue, formState: { isSubmitting } } = methods;
  const values = watch();

  const onSubmit = handleSubmit(async (data) => {
    await onSave({
      name: data.name,
      type: 'cta',
      content: {
        heading: data.heading,
        description: data.description,
        backgroundImage: data.backgroundImage,
        backgroundColor: data.backgroundColor,
        alignment: data.alignment,
        buttons: data.buttons,
      },
      settings: {},
    });
  });

  const handleAddButton = () => {
    setValue('buttons', [
      ...(values.buttons || []),
      { text: 'Button', url: '#', style: 'primary', icon: '', openInNewTab: false },
    ]);
  };

  const handleRemoveButton = (index) => {
    const updated = [...values.buttons];
    updated.splice(index, 1);
    setValue('buttons', updated);
  };

  const handleUpdateButton = (index, field, value) => {
    const updated = [...values.buttons];
    updated[index] = { ...updated[index], [field]: value };
    setValue('buttons', updated);
  };

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Basic Information</Typography>
            <Stack spacing={2}>
              <RHFTextField name="name" label="Section Name" />
              <RHFTextField name="heading" label="Heading" />
              <RHFTextField name="description" label="Description" multiline rows={2} />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Background</Typography>
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
              <RHFTextField name="backgroundColor" label="Background Color" type="color" />
              <RHFSelect name="alignment" label="Content Alignment">
                {ALIGNMENT_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </RHFSelect>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Buttons</Typography>
              <Button size="small" variant="outlined" onClick={handleAddButton} startIcon={<span>+</span>}>
                Add Button
              </Button>
            </Stack>
            <Stack spacing={2}>
              {values.buttons?.map((button, index) => (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2}>
                        <TextField fullWidth label="Button Text" value={button.text}
                          onChange={(e) => handleUpdateButton(index, 'text', e.target.value)} />
                        <TextField fullWidth label="URL" value={button.url}
                          onChange={(e) => handleUpdateButton(index, 'url', e.target.value)} />
                      </Stack>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <TextField select label="Style" value={button.style}
                          onChange={(e) => handleUpdateButton(index, 'style', e.target.value)}
                          sx={{ minWidth: 150 }}>
                          <MenuItem value="primary">Primary</MenuItem>
                          <MenuItem value="secondary">Secondary</MenuItem>
                          <MenuItem value="outline">Outline</MenuItem>
                          <MenuItem value="text">Text</MenuItem>
                        </TextField>
                        <Button color="error" variant="outlined" onClick={() => handleRemoveButton(index)}>
                          Remove
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              {(!values.buttons || values.buttons.length === 0) && (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" color="text.secondary">No buttons added yet</Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {section ? 'Update Section' : 'Create Section'}
          </Button>
        </Stack>
      </Stack>
    </FormProvider>
  );
}

CTASectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
