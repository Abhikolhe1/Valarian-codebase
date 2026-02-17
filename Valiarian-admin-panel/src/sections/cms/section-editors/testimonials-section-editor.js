import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
// components
import FormProvider, { RHFSelect, RHFTextField } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const LAYOUT_OPTIONS = [
  { value: 'grid', label: 'Grid' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'masonry', label: 'Masonry' },
];

// ----------------------------------------------------------------------

export default function TestimonialsSectionEditor({ section, onSave, onCancel }) {
  const defaultValues = {
    name: section?.name || 'Testimonials Section',
    heading: section?.content?.heading || '',
    layout: section?.content?.layout || 'grid',
    showRatings: section?.content?.showRatings !== false,
    testimonials: section?.content?.testimonials || [],
  };

  const methods = useForm({ defaultValues });
  const { handleSubmit, watch, setValue, formState: { isSubmitting } } = methods;
  const values = watch();

  const onSubmit = handleSubmit(async (data) => {
    await onSave({
      name: data.name,
      type: 'testimonials',
      content: {
        heading: data.heading,
        layout: data.layout,
        showRatings: data.showRatings,
        testimonials: data.testimonials,
      },
      settings: {},
    });
  });

  const handleAddTestimonial = () => {
    setValue('testimonials', [
      ...(values.testimonials || []),
      { name: '', role: '', company: '', avatar: '', content: '', rating: 5 },
    ]);
  };

  const handleRemoveTestimonial = (index) => {
    const updated = [...values.testimonials];
    updated.splice(index, 1);
    setValue('testimonials', updated);
  };

  const handleUpdateTestimonial = (index, field, value) => {
    const updated = [...values.testimonials];
    updated[index] = { ...updated[index], [field]: value };
    setValue('testimonials', updated);
  };

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Basic Information</Typography>
            <Stack spacing={2}>
              <RHFTextField name="name" label="Section Name" />
              <RHFTextField name="heading" label="Section Heading" />
              <RHFSelect name="layout" label="Layout Style">
                {LAYOUT_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </RHFSelect>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={values.showRatings}
                    onChange={(e) => setValue('showRatings', e.target.checked)}
                  />
                }
                label="Show Ratings"
              />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Testimonials</Typography>
              <Button size="small" variant="outlined" onClick={handleAddTestimonial} startIcon={<span>+</span>}>
                Add Testimonial
              </Button>
            </Stack>
            <Stack spacing={2}>
              {values.testimonials?.map((testimonial, index) => (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2}>
                        <TextField fullWidth label="Name" value={testimonial.name}
                          onChange={(e) => handleUpdateTestimonial(index, 'name', e.target.value)} />
                        <TextField fullWidth label="Role" value={testimonial.role}
                          onChange={(e) => handleUpdateTestimonial(index, 'role', e.target.value)} />
                      </Stack>
                      <Stack direction="row" spacing={2}>
                        <TextField fullWidth label="Company" value={testimonial.company}
                          onChange={(e) => handleUpdateTestimonial(index, 'company', e.target.value)} />
                        <TextField fullWidth label="Avatar URL" value={testimonial.avatar}
                          onChange={(e) => handleUpdateTestimonial(index, 'avatar', e.target.value)} />
                      </Stack>
                      <TextField fullWidth label="Testimonial Content" value={testimonial.content}
                        onChange={(e) => handleUpdateTestimonial(index, 'content', e.target.value)}
                        multiline rows={3} />
                      <Stack direction="row" spacing={2} alignItems="center">
                        <TextField select label="Rating" value={testimonial.rating}
                          onChange={(e) => handleUpdateTestimonial(index, 'rating', parseInt(e.target.value, 10))}
                          sx={{ minWidth: 100 }}>
                          {[1, 2, 3, 4, 5].map((r) => <MenuItem key={r} value={r}>{r} Stars</MenuItem>)}
                        </TextField>
                        <Button color="error" variant="outlined" onClick={() => handleRemoveTestimonial(index)}>
                          Remove
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              {(!values.testimonials || values.testimonials.length === 0) && (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" color="text.secondary">No testimonials added yet</Typography>
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

TestimonialsSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
