import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormProvider, { RHFTextField } from 'src/components/hook-form';

const DEFAULT_ITEMS = [
  {
    title: 'Premium Egyptian Cotton',
    description:
      'Woven from long-staple cotton fibers for softness, breathability, and durability.',
    weight: '180 GSM',
    weave: 'Plain weave',
    feel: 'Ultra-soft',
  },
];

export default function PremiumFabricDetailsSectionEditor({ section, onSave, onCancel }) {
  const methods = useForm({
    defaultValues: {
      name: section?.name || 'Premium Fabric Details',
      content: {
        heading: section?.content?.heading || 'Crafted From Exceptional Materials',
        subheading: section?.content?.subheading || 'Fabric Story',
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
    setValue('content.items', [
      ...items,
      { title: '', description: '', weight: '', weave: '', feel: '' },
    ]);
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
      type: 'premium-fabric-details',
      content: {
        heading: data.content.heading,
        subheading: data.content.subheading,
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
              <RHFTextField name="content.subheading" label="Eyebrow" />
              <RHFTextField name="content.heading" label="Heading" />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Fabric Slides</Typography>
              <Button variant="outlined" onClick={addItem}>
                Add Slide
              </Button>
            </Stack>
            <Stack spacing={2}>
              {items.map((item, index) => (
                <Card key={`${item.title}-${index}`} variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
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
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          label="Weight"
                          value={item.weight || ''}
                          onChange={(event) => updateItem(index, 'weight', event.target.value)}
                        />
                        <TextField
                          label="Weave"
                          value={item.weave || ''}
                          onChange={(event) => updateItem(index, 'weave', event.target.value)}
                        />
                        <TextField
                          label="Feel"
                          value={item.feel || ''}
                          onChange={(event) => updateItem(index, 'feel', event.target.value)}
                        />
                      </Stack>
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

PremiumFabricDetailsSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
