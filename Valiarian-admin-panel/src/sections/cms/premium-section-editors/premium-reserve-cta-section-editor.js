import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormProvider, { RHFTextField } from 'src/components/hook-form';

export default function PremiumReserveCtaSectionEditor({ section, onSave, onCancel }) {
  const methods = useForm({
    defaultValues: {
      name: section?.name || 'Premium Reserve CTA',
      content: {
        heading: section?.content?.heading || "Reserve Yours Today",
        description:
          section?.content?.description ||
          "Only 150 pieces available worldwide. Once they're gone, they're gone forever.",
        availabilityText:
          section?.content?.availabilityText || 'Only available until 15th January 2026',
        buttonText: section?.content?.buttonText || 'Buy Now',
        buttonLink: section?.content?.buttonLink || '/products',
        preorderProductSlug: section?.content?.preorderProductSlug || '',
        preorderVariantId: section?.content?.preorderVariantId || '',
        background: section?.content?.background || '#f3e5d8',
        headingColor: section?.content?.headingColor || '#8C6549',
        textColor: section?.content?.textColor || '#637381',
      },
      settings: section?.settings || {},
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    await onSave({
      name: data.name,
      type: 'premium-reserve-cta',
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
              CTA Content
            </Typography>
            <Stack spacing={2}>
              <RHFTextField name="name" label="Section Name" />
              <RHFTextField name="content.heading" label="Heading" />
              <RHFTextField name="content.description" label="Description" multiline rows={2} />
              <RHFTextField name="content.availabilityText" label="Availability Text" />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <RHFTextField name="content.buttonText" label="Button Text" />
                <RHFTextField name="content.buttonLink" label="Button Link" />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <RHFTextField
                  name="content.preorderProductSlug"
                  label="Preorder Product Slug"
                  helperText="If filled, the button opens the premium preorder checkout for this product."
                />
                <RHFTextField
                  name="content.preorderVariantId"
                  label="Preorder Variant ID"
                  helperText="Optional: lock the preorder flow to one product variant."
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <RHFTextField name="content.background" label="Background" type="color" />
                <RHFTextField name="content.headingColor" label="Heading Color" type="color" />
                <RHFTextField name="content.textColor" label="Text Color" type="color" />
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

PremiumReserveCtaSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
