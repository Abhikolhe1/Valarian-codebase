import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
// @mui
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
// components
import { RHFTextField } from 'src/components/hook-form';
import FormProvider from 'src/components/hook-form/form-provider';

// ----------------------------------------------------------------------

export default function CollectionHeroSectionEditor({ section, onSave, onCancel }) {
  const defaultValues = {
    name: section?.name || 'Collection Hero',
    type: 'collection-hero',
    content: {
      title: section?.content?.title || 'New Collection',
      subtitle: section?.content?.subtitle || 'Explore our latest designs',
      backgroundImage: section?.content?.backgroundImage || '/assets/images/home/new-arrival/new-arrival-hero.jpeg',
    },
    settings: section?.settings || {
      backgroundColor: '#000000',
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
        <RHFTextField name="name" label="Section Name" />
        <RHFTextField name="content.title" label="Title" placeholder="New Collection" />
        <RHFTextField name="content.subtitle" label="Subtitle" placeholder="Explore our latest designs" multiline rows={2} />
        <RHFTextField name="content.backgroundImage" label="Background Image URL" placeholder="/assets/images/hero.jpg" />
        <RHFTextField name="settings.backgroundColor" label="Background Color" placeholder="#000000" />

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>Save Section</Button>
        </Stack>
      </Stack>
    </FormProvider>
  );
}

CollectionHeroSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
