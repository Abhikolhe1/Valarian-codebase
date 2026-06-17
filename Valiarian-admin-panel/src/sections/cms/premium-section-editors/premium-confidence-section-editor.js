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
    image: '/assets/premium/stack3.png',
    title: 'Secure Payments',
    description: 'Tell customers why they can trust this purchase experience.',
  },
];

export default function PremiumConfidenceSectionEditor({ section, onSave, onCancel }) {
  const methods = useForm({
    defaultValues: {
      name: section?.name || 'Premium Confidence',
      content: {
        heading: section?.content?.heading || 'Order With Confidence',
        background: section?.content?.background || '#F5F5F5',
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

  const items = watch('content.items') || [];

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
      type: 'premium-confidence',
      content: {
        ...data.content,
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
              Section Copy
            </Typography>
            <Stack spacing={2}>
              <RHFTextField name="name" label="Section Name" />
              <RHFTextField name="content.heading" label="Heading" />
              <RHFTextField name="content.background" label="Background" type="color" />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Confidence Cards</Typography>
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

PremiumConfidenceSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
