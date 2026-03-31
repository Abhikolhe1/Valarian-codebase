import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
// @mui
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// components
import FormProvider, { RHFEditor, RHFTextField } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export default function TextSectionEditor({ section, onSave, onCancel }) {
  const defaultValues = {
    name: section?.name || 'Text Section',
    heading: section?.content?.heading || '',
    content: section?.content?.content || '',
  };

  const methods = useForm({ defaultValues });
  const { handleSubmit, formState: { isSubmitting } } = methods;

  const onSubmit = handleSubmit(async (data) => {
    await onSave({
      name: data.name,
      type: 'text',
      content: {
        heading: data.heading,
        content: data.content,
      },
      settings: {},
    });
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3} pb={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" pb={2} gutterBottom>Basic Information</Typography>
            <Stack spacing={2}>
              <RHFTextField name="name" label="Section Name" />
              <RHFTextField name="heading" label="Heading (Optional)" />
              <RHFEditor
                name="content"
                id="text-section-content"
                placeholder="Write your content here..."
              />
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

TextSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
