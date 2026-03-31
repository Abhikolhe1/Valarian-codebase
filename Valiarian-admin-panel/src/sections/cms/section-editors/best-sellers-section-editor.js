import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
// @mui
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
// components
import { RHFTextField } from 'src/components/hook-form';
import FormProvider from 'src/components/hook-form/form-provider';

// ----------------------------------------------------------------------

export default function BestSellersSectionEditor({ section, onSave, onCancel }) {
  const defaultValues = {
    name: section?.name || 'Best Sellers',
    type: 'best-sellers',
    content: {
      title: section?.content?.title || 'Best Sellers',
      subtitle: section?.content?.subtitle || 'Our most popular products that customers love',
    },
    settings: section?.settings || {
      backgroundColor: '#f9fafb',
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
      <Stack spacing={3} py={2}>
        <RHFTextField name="name" label="Section Name" />
        <RHFTextField name="content.title" label="Title" placeholder="Best Sellers" />
        <RHFTextField name="content.subtitle" label="Subtitle" placeholder="Our most popular products..." multiline rows={2} />
        <RHFTextField name="settings.backgroundColor" label="Background Color" placeholder="#f9fafb" />

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>Save Section</Button>
        </Stack>
      </Stack>
    </FormProvider>
  );
}

BestSellersSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
