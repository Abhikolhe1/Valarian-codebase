import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
// @mui
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
// components
import { RHFTextField } from 'src/components/hook-form';
import FormProvider from 'src/components/hook-form/form-provider';
import CMSMediaPickerField from '../cms-media-picker-field';

// ----------------------------------------------------------------------

const DEFAULT_FABRICS = [
  {
    name: 'Premium Egyptian Cotton',
    description:
      'Sourced from the finest Egyptian cotton fields, this luxurious fabric offers unmatched softness and breathability.',
    image: '/assets/images/home/fabric/fabric1.webp',
    video: '/assets/images/home/fabric/fabric1.mp4',
    tags: ['100% Cotton', 'Breathable', 'Durable'],
  },
];

export default function FabricInfoSectionEditor({ section, onSave, onCancel }) {
  const methods = useForm({
    defaultValues: {
      name: section?.name || 'Fabric Information',
      type: 'fabric-info',
      content: {
        title: section?.content?.title || 'Premium Fabric',
        subtitle: section?.content?.subtitle || 'Quality you can feel',
        description:
          section?.content?.description ||
          'Made with the finest cotton for ultimate comfort and durability',
        fabrics: section?.content?.fabrics?.length ? section.content.fabrics : DEFAULT_FABRICS,
      },
      settings: section?.settings || {
        backgroundColor: '#ffffff',
      },
    },
  });

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = methods;

  const values = watch();
  const fabrics = values.content?.fabrics || [];

  const updateFabric = (index, field, value) => {
    const nextFabrics = [...fabrics];
    nextFabrics[index] = {
      ...nextFabrics[index],
      [field]: value,
    };
    setValue('content.fabrics', nextFabrics);
  };

  const addFabric = () => {
    setValue('content.fabrics', [
      ...fabrics,
      {
        name: '',
        description: '',
        image: '',
        video: '',
        tags: [],
      },
    ]);
  };

  const removeFabric = (index) => {
    setValue(
      'content.fabrics',
      fabrics.filter((_, fabricIndex) => fabricIndex !== index)
    );
  };

  const onSubmit = handleSubmit(async (data) => {
    const normalizedFabrics = (data.content?.fabrics || [])
      .map((fabric) => ({
        ...fabric,
        tags: Array.isArray(fabric.tags)
          ? fabric.tags.filter(Boolean)
          : String(fabric.tags || '')
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean),
      }))
      .filter((fabric) => fabric.name || fabric.description || fabric.image || fabric.video);

    await onSave({
      ...data,
      content: {
        ...data.content,
        fabrics: normalizedFabrics,
      },
    });
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3} py={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Section Copy
            </Typography>

            <Stack spacing={2}>
              <RHFTextField name="name" label="Section Name" />
              <RHFTextField name="content.title" label="Title" placeholder="Premium Fabric" />
              <RHFTextField
                name="content.subtitle"
                label="Subtitle"
                placeholder="Quality you can feel"
              />
              <RHFTextField
                name="content.description"
                label="Description"
                placeholder="Made with the finest cotton..."
                multiline
                rows={3}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">Fabric Slides</Typography>
              <Button variant="outlined" onClick={addFabric}>
                Add Fabric
              </Button>
            </Stack>

            <Stack spacing={2}>
              {fabrics.map((fabric, index) => (
                <Card key={`${fabric.name || 'fabric'}-${index}`} variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2">Fabric {index + 1}</Typography>
                        <Button
                          color="error"
                          onClick={() => removeFabric(index)}
                          disabled={fabrics.length === 1}
                        >
                          Remove
                        </Button>
                      </Stack>

                      <TextField
                        fullWidth
                        label="Fabric Name"
                        value={fabric.name || ''}
                        onChange={(event) => updateFabric(index, 'name', event.target.value)}
                      />

                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Description"
                        value={fabric.description || ''}
                        onChange={(event) => updateFabric(index, 'description', event.target.value)}
                      />

                      <TextField
                        fullWidth
                        label="Tags"
                        placeholder="100% Cotton, Breathable, Durable"
                        value={Array.isArray(fabric.tags) ? fabric.tags.join(', ') : fabric.tags || ''}
                        onChange={(event) =>
                          updateFabric(
                            index,
                            'tags',
                            event.target.value
                              .split(',')
                              .map((tag) => tag.trim())
                              .filter(Boolean)
                          )
                        }
                      />

                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <CMSMediaPickerField
                          label="Fabric Image"
                          value={fabric.image || ''}
                          onChange={(url) => updateFabric(index, 'image', url)}
                          helperText="Select an image from the media library"
                          accept={{
                            'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
                          }}
                        />
                        <CMSMediaPickerField
                          label="Fabric Video"
                          value={fabric.video || ''}
                          onChange={(url) => updateFabric(index, 'video', url)}
                          helperText="Optional video shown in place of the image"
                          accept={{
                            'video/*': ['.mp4', '.webm'],
                          }}
                        />
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <RHFTextField
          name="settings.backgroundColor"
          label="Background Color"
          placeholder="#ffffff"
        />

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Save Section
          </Button>
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
