import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
// @mui
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
// components
import { RHFTextField } from 'src/components/hook-form';
import FormProvider from 'src/components/hook-form/form-provider';

// ----------------------------------------------------------------------

export default function FabricInfoSectionEditor({ section, onSave, onCancel }) {
  const defaultValues = {
    name: section?.name || 'Fabric Information',
    type: 'fabric-info',
    content: {
      title: section?.content?.title || 'Premium Fabric',
      subtitle: section?.content?.subtitle || 'Quality you can feel',
      description: section?.content?.description || 'Made with the finest cotton for ultimate comfort and durability',
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
      <Stack spacing={3} py={2}>
        <RHFTextField name="name" label="Section Name" />
        <RHFTextField name="content.title" label="Title" placeholder="Premium Fabric" />
        <RHFTextField name="content.subtitle" label="Subtitle" placeholder="Quality you can feel" />
        <RHFTextField name="content.description" label="Description" placeholder="Made with the finest cotton..." multiline rows={3} />
        <RHFTextField name="settings.backgroundColor" label="Background Color" placeholder="#ffffff" />

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>Save Section</Button>
        </Stack>
      </Stack>
    </FormProvider>
  );
}

FabricInfoSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
