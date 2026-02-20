import PropTypes from 'prop-types';
import { useCallback } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
// components
import { RHFTextField } from 'src/components/hook-form';
import FormProvider from 'src/components/hook-form/form-provider';
import Iconify from 'src/components/iconify';
import Image from 'src/components/image';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
//
import CMSMediaPicker from '../cms-media-picker';

// ----------------------------------------------------------------------

// Compact Media Picker Button Component
function CompactMediaPickerButton({ value, onChange, index }) {
  const pickerOpen = useBoolean();

  const handleSelect = useCallback(
    (selectedMedia) => {
      onChange(selectedMedia?.url || '');
      pickerOpen.onFalse();
    },
    [onChange, pickerOpen]
  );

  const handleRemove = useCallback(() => {
    onChange('');
  }, [onChange]);

  const isImage = value && value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);

  return (
    <>
      <Stack spacing={1}>
        <Typography variant="caption" color="text.secondary">
          Product Image
        </Typography>

        {value && isImage ? (
          <Card
            sx={{
              position: 'relative',
              width: 120,
              height: 120,
              '&:hover .actions': {
                opacity: 1,
              },
            }}
          >
            <Image
              src={value}
              alt={`Product ${index + 1}`}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 1,
              }}
            />

            <Stack
              className="actions"
              direction="row"
              spacing={0.5}
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                opacity: 0,
                transition: (theme) => theme.transitions.create(['opacity']),
              }}
            >
              <IconButton
                size="small"
                onClick={pickerOpen.onTrue}
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.grey[900], 0.72),
                  color: 'common.white',
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.grey[900], 0.88),
                  },
                }}
              >
                <Iconify icon="solar:pen-bold" width={16} />
              </IconButton>

              <IconButton
                size="small"
                onClick={handleRemove}
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.grey[900], 0.72),
                  color: 'common.white',
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.grey[900], 0.88),
                  },
                }}
              >
                <Iconify icon="solar:trash-bin-trash-bold" width={16} />
              </IconButton>
            </Stack>
          </Card>
        ) : (
          <Box
            onClick={pickerOpen.onTrue}
            sx={{
              width: 120,
              height: 120,
              borderRadius: 1,
              border: (theme) => `1px dashed ${alpha(theme.palette.grey[500], 0.32)}`,
              bgcolor: 'background.neutral',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              transition: (theme) => theme.transitions.create(['border-color']),
              '&:hover': {
                borderColor: 'primary.main',
              },
            }}
          >
            <Iconify icon="solar:gallery-add-bold-duotone" width={32} sx={{ color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">
              Upload
            </Typography>
          </Box>
        )}
      </Stack>

      <CMSMediaPicker
        open={pickerOpen.value}
        onClose={pickerOpen.onFalse}
        onSelect={handleSelect}
        multiple={false}
        selectedMedia={[]}
        accept={{
          'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
        }}
      />
    </>
  );
}

CompactMediaPickerButton.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
};

// ----------------------------------------------------------------------

export default function ScrollAnimatedSectionEditor({ section, onSave, onCancel }) {
  const defaultValues = {
    name: section?.name || 'Scroll Animated Section',
    type: 'scroll-animated',
    content: {
      products: section?.content?.products || [
        {
          title: 'Premium Classic T-Shirt',
          description: 'Crafted with premium cotton for ultimate comfort and style.',
          image: '/assets/images/home/scroll-animation/tshirt1-removebg-preview.png',
          buttonText: 'Shop Now',
          buttonLink: '/products',
        },
      ],
    },
    settings: section?.settings || {
      backgroundColor: '#ffffff',
    },
  };

  const methods = useForm({
    defaultValues,
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'content.products',
  });

  const onSubmit = handleSubmit(async (data) => {
    await onSave(data);
  });

  const handleAddProduct = useCallback(() => {
    append({
      title: 'New Product',
      description: 'Product description',
      image: '/assets/images/placeholder.svg',
      buttonText: 'Shop Now',
      buttonLink: '/products',
    });
  }, [append]);

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3}>
        {/* Section Name */}
        <RHFTextField name="name" label="Section Name" />

        {/* Products Array */}
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="subtitle1">Products</Typography>
            <Button
              size="small"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={handleAddProduct}
            >
              Add Product
            </Button>
          </Stack>

          <Stack spacing={2}>
            {fields.map((field, index) => (
              <Card key={field.id} sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle2">Product {index + 1}</Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Iconify icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </Stack>

                  {/* Image Upload and Text Fields Side by Side */}
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    {/* Compact Image Upload */}
                    <CompactMediaPickerButton
                      value={values.content?.products?.[index]?.image || ''}
                      onChange={(url) => setValue(`content.products.${index}.image`, url)}
                      index={index}
                    />

                    {/* Text Fields */}
                    <Stack spacing={2} sx={{ flex: 1 }}>
                      <RHFTextField
                        name={`content.products.${index}.title`}
                        label="Title"
                        placeholder="Premium Classic T-Shirt"
                      />

                      <RHFTextField
                        name={`content.products.${index}.description`}
                        label="Description"
                        placeholder="Product description"
                        multiline
                        rows={2}
                      />
                    </Stack>
                  </Stack>

                  {/* Image URL Field (Optional - for manual entry) */}
                  <RHFTextField
                    name={`content.products.${index}.image`}
                    label="Image URL (or use upload button above)"
                    placeholder="/assets/images/product.png"
                    size="small"
                  />

                  {/* Button Fields */}
                  <Stack direction="row" spacing={2}>
                    <RHFTextField
                      name={`content.products.${index}.buttonText`}
                      label="Button Text"
                      placeholder="Shop Now"
                    />

                    <RHFTextField
                      name={`content.products.${index}.buttonLink`}
                      label="Button Link"
                      placeholder="/products"
                    />
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Stack>
        </Box>

        {/* Settings */}
        <RHFTextField
          name="settings.backgroundColor"
          label="Background Color"
          placeholder="#ffffff"
        />

        {/* Actions */}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            Save Section
          </Button>
        </Stack>
      </Stack>
    </FormProvider>
  );
}

ScrollAnimatedSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
