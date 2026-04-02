import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useGetProducts } from 'src/api/product';
import FormProvider, { RHFAutocomplete, RHFTextField } from 'src/components/hook-form';

export default function PremiumProductShowcaseSectionEditor({ section, onSave, onCancel }) {
  const { products: premiumProducts, productsLoading } = useGetProducts({
    isPremium: true,
    status: 'published',
    limit: 100,
  });

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
        preorderButtonText: section?.content?.preorderButtonText || 'Preorder Now',
        preorderButtonLink: section?.content?.preorderButtonLink || '/premium/preorder',
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
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    await onSave({
      name: data.name,
      type: 'premium-product-showcase',
      content: {
        ...data.content,
        images: [],
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
              Product Showcase
            </Typography>
            <Stack spacing={2}>
              <RHFTextField name="name" label="Section Name" />
              <RHFTextField name="content.eyebrow" label="Eyebrow" />
              <RHFTextField name="content.heading" label="Heading" />
              <RHFTextField name="content.description" label="Description" multiline rows={3} />
              <RHFAutocomplete
                name="content.productSlug"
                label="Premium Product"
                loading={productsLoading}
                placeholder="Select a premium product"
                options={premiumProducts.map((product) => product.slug)}
                getOptionLabel={(option) => {
                  const matchedProduct = premiumProducts.find((product) => product.slug === option);
                  return matchedProduct?.name || option || '';
                }}
                isOptionEqualToValue={(option, value) => option === value}
                renderOption={(props, option) => {
                  const product = premiumProducts.find((item) => item.slug === option);

                  return (
                    <li {...props} key={option}>
                      {product?.name || option}
                    </li>
                  );
                }}
                helperText="Only products marked as Premium Product appear here. The showcase images and price are pulled directly from that product."
              />
              <Alert severity="info">
                The image upload field has been removed here. This section now always uses the selected premium product&apos;s cover, gallery, and variant images.
              </Alert>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <RHFTextField name="content.preorderButtonText" label="Button Text" />
                <RHFTextField
                  name="content.preorderButtonLink"
                  label="Fallback Button Link"
                  helperText="Recommended fallback: /premium/preorder"
                />
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
