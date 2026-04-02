import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import CMSMediaPickerField from '../cms-media-picker-field';

const DEFAULT_ITEMS = [
  {
    image: '/assets/premium/ic-make-brand.png',
    title: 'Exceptional Fabric',
    description: 'Use this card to explain what makes the premium product unique.',
  },
];

export default function PremiumFeatureGridSectionEditor({ section, onSave, onCancel }) {
  const methods = useForm({
    defaultValues: {
      name: section?.name || 'Premium Feature Grid',
      content: {
        heading: section?.content?.heading || 'What Makes It Premium',
        subheading:
          section?.content?.subheading ||
          "This isn't just another polo. It's a masterpiece of craftsmanship.",
        backgroundImage: section?.content?.backgroundImage || '/assets/premium/premium.png',
        overlayOpacity: section?.content?.overlayOpacity ?? 0.65,
        items: section?.content?.items?.length ? section.content.items : DEFAULT_ITEMS,
      },
      settings: section?.settings || {},
    },
  });

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = methods;

  const values = watch();
  const items = values.content?.items || [];

  const updateItem = (index, field, value) => {
    const nextItems = [...items];
    nextItems[index] = {
      ...nextItems[index],
      [field]: value,
    };
    setValue('content.items', nextItems);
  };

  const addItem = () => {
    setValue('content.items', [...items, { image: '', title: '', description: '' }]);
  };

  const removeItem = (index) => {
    setValue(
      'content.items',
      items.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const onSubmit = handleSubmit(async (data) => {
    await onSave({
      name: data.name,
      type: 'premium-feature-grid',
      content: {
        ...data.content,
        overlayOpacity: Number(data.content.overlayOpacity || 0),
        items: (data.content.items || []).filter((item) => item.title || item.description),
      },
      settings: data.settings || {},
    });
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3} pb={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Section Setup
            </Typography>
            <Stack spacing={2}>
              <RHFTextField name="name" label="Section Name" />
              <RHFTextField name="content.heading" label="Heading" />
              <RHFTextField name="content.subheading" label="Subheading" multiline rows={2} />
              <CMSMediaPickerField
                label="Background Image"
                value={values.content?.backgroundImage}
                onChange={(url) => setValue('content.backgroundImage', url)}
              />
              <RHFTextField
                name="content.overlayOpacity"
                label="Overlay Opacity"
                type="number"
                inputProps={{ min: 0, max: 1, step: 0.1 }}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Feature Cards</Typography>
              <Button variant="outlined" onClick={addItem}>
                Add Card
              </Button>
            </Stack>
            <Stack spacing={2}>
              {items.map((item, index) => (
                <Card key={`${item.title}-${index}`} variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <CMSMediaPickerField
                        label="Card Image"
                        value={item.image || ''}
                        onChange={(url) => updateItem(index, 'image', url)}
                      />
                      <TextField
                        label="Title"
                        value={item.title || ''}
                        onChange={(event) => updateItem(index, 'title', event.target.value)}
                      />
                      <TextField
                        label="Description"
                        multiline
                        rows={3}
                        value={item.description || ''}
                        onChange={(event) => updateItem(index, 'description', event.target.value)}
                      />
                      <Stack direction="row" justifyContent="flex-end">
                        <Button color="error" onClick={() => removeItem(index)}>
                          Remove
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>

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

PremiumFeatureGridSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
