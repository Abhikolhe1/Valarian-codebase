import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import CMSMediaPickerField from '../cms-media-picker-field';

export default function PremiumProductShowcaseSectionEditor({ section, onSave, onCancel }) {
  const methods = useForm({
    defaultValues: {
      name: section?.name || 'Premium Product Showcase',
      content: {
        eyebrow: section?.content?.eyebrow || 'The Product',
        heading: section?.content?.heading || 'See Every Detail',
        description:
          section?.content?.description ||
          'Explore the premium piece up close before you preorder. Multiple campaign and product images are pulled from the selected product.',
        productSlug: section?.content?.productSlug || '',
        images: Array.isArray(section?.content?.images) ? section.content.images : [],
        preorderButtonText: section?.content?.preorderButtonText || 'Preorder Now',
        preorderButtonLink: section?.content?.preorderButtonLink || '/premium',
        backgroundColor: section?.content?.backgroundColor || '#f7f1ea',
        accentColor: section?.content?.accentColor || '#8C6549',
        textColor: section?.content?.textColor || '#1f1f1f',
        secondaryTextColor: section?.content?.secondaryTextColor || '#6b6b6b',
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

  const images = watch('content.images');

  const onSubmit = handleSubmit(async (data) => {
    await onSave({
      name: data.name,
      type: 'premium-product-showcase',
      content: data.content,
      settings: data.settings || {},
    });
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3} pb={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Product Showcase
            </Typography>
            <Stack spacing={2}>
              <RHFTextField name="name" label="Section Name" />
              <RHFTextField name="content.eyebrow" label="Eyebrow" />
              <RHFTextField name="content.heading" label="Heading" />
              <RHFTextField name="content.description" label="Description" multiline rows={3} />
              <RHFTextField
                name="content.productSlug"
                label="Product Slug"
                helperText="The section pulls images and product data from this product."
              />
              <CMSMediaPickerField
                label="Product / Shirt Images"
                value={images}
                onChange={(value) => setValue('content.images', value)}
                multiple
                helperText="You can view old images here, select existing media, or upload new images. If empty, product images from the selected slug will be used."
                accept={{
                  'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
                }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <RHFTextField name="content.preorderButtonText" label="Button Text" />
                <RHFTextField name="content.preorderButtonLink" label="Fallback Button Link" />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <RHFTextField name="content.backgroundColor" label="Background Color" type="color" />
                <RHFTextField name="content.accentColor" label="Accent Color" type="color" />
                <RHFTextField name="content.textColor" label="Text Color" type="color" />
                <RHFTextField name="content.secondaryTextColor" label="Secondary Text Color" type="color" />
              </Stack>
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

PremiumProductShowcaseSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
