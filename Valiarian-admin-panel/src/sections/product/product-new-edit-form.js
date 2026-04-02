import { yupResolver } from '@hookform/resolvers/yup';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
// routes
import { paths } from 'src/routes/paths';
// hooks
import { useResponsive } from 'src/hooks/use-responsive';
// api
import { useGetCategories } from 'src/api/category';
// utils
// components
import { Alert, Tab, Tabs } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FormProvider, {
  RHFAutocomplete,
  RHFEditor,
  RHFSwitch,
  RHFTextField,
  RHFUpload,
} from 'src/components/hook-form';
import { useSnackbar } from 'src/components/snackbar';
import { useRouter } from 'src/routes/hook';
import axiosInstance, { endpoints } from 'src/utils/axios';
import { mutate } from 'swr';
import ProductVariantManager from './product-variant-manager';

// ----------------------------------------------------------------------

function normalizeUuidValue(value) {
  if (typeof value !== 'string') {
    return value;
  }

  let normalized = value.trim();

  while (
    normalized.length > 1 &&
    ((normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'")))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized;
}

export default function ProductNewEditForm({ currentProduct }) {
  const router = useRouter();
  const mdUp = useResponsive('up', 'md');
  const { enqueueSnackbar } = useSnackbar();
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentTab, setCurrentTab] = useState('basic');
  const [variants, setVariants] = useState(currentProduct?.variants || []);

  const { categories: categoryList } = useGetCategories();

  const NewProductSchema = Yup.object().shape({
    name: Yup.string()
      .required('Name is required')
      .min(1, 'Name must be at least 1 character')
      .max(255, 'Name must not exceed 255 characters'),
    slug: Yup.string()
      .matches(/^[a-z0-9-]*$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
      .max(255, 'Slug must not exceed 255 characters'),
    description: Yup.string().required('Description is required'),
    shortDescription: Yup.string().max(500, 'Short description must not exceed 500 characters'),
    price: Yup.number()
      .min(0, 'Price must be at least 0')
      .required('Price is required')
      .typeError('Price must be a number'),
    salePrice: Yup.number()
      .min(0, 'Sale price must be at least 0')
      .nullable()
      .transform((value, originalValue) => originalValue === '' ? null : value)
      .typeError('Sale price must be a number')
      .test('sale-price-less-than-price', 'Sale price must be less than regular price', (value, context) => {
        const { price } = context.parent;
        if (value && price) {
          return value < price;
        }
        return true;
      }),
    // Sale dates are optional - only validated if salePrice is set
    saleStartDate: Yup.date()
      .nullable()
      .transform((value, originalValue) => originalValue === '' ? null : value)
      .typeError('Invalid sale start date'),
    saleEndDate: Yup.date()
      .nullable()
      .transform((value, originalValue) => originalValue === '' ? null : value)
      .typeError('Invalid sale end date')
      .test('end-after-start', 'Sale end date must be after start date', (value, context) => {
        const { saleStartDate } = context.parent;
        if (value && saleStartDate) {
          return new Date(value) > new Date(saleStartDate);
        }
        return true;
      }),
    coverImage: Yup.mixed().required('Cover image is required'),
    images: Yup.array().min(1, 'At least one additional image is required'),
    categoryId: Yup.string().required('Category is required'),
    tags: Yup.array(),
    colors: Yup.array(),
    sizes: Yup.array(),
    stockQuantity: Yup.number()
      .min(0, 'Stock must be at least 0')
      .integer('Stock must be a whole number')
      .typeError('Stock must be a number'),
    lowStockThreshold: Yup.number()
      .min(0, 'Low stock threshold must be at least 0')
      .integer('Low stock threshold must be a whole number')
      .typeError('Low stock threshold must be a number'),
    sku: Yup.string().max(100, 'SKU must not exceed 100 characters'),
    // New arrival dates are optional - only required if isNewArrival is true
    isNewArrival: Yup.boolean(),
    isPremium: Yup.boolean(),
    newArrivalStartDate: Yup.date()
      .nullable()
      .transform((value, originalValue) => originalValue === '' ? null : value)
      .typeError('Invalid new arrival start date')
      .when('isNewArrival', {
        is: true,
        then: (schema) => schema.test(
          'required-if-new-arrival',
          'Start date is required when product is marked as new arrival',
          (value) => value != null
        ),
      }),
    newArrivalEndDate: Yup.date()
      .nullable()
      .transform((value, originalValue) => originalValue === '' ? null : value)
      .typeError('Invalid new arrival end date')
      .test('end-after-start', 'End date must be after start date', (value, context) => {
        const { newArrivalStartDate } = context.parent;
        if (value && newArrivalStartDate) {
          return new Date(value) > new Date(newArrivalStartDate);
        }
        return true;
      }),
    seoTitle: Yup.string().max(60, 'SEO title should not exceed 60 characters for best results'),
    seoDescription: Yup.string().max(160, 'SEO description should not exceed 160 characters for best results'),
    seoKeywords: Yup.array().max(10, 'Maximum 10 keywords recommended'),
  });

  const defaultValues = useMemo(
    () => ({
      name: currentProduct?.name || '',
      slug: currentProduct?.slug || '',
      description: currentProduct?.description || '',
      shortDescription: currentProduct?.shortDescription || '',
      price: currentProduct?.price || 0,
      salePrice: currentProduct?.salePrice || null,
      saleStartDate: currentProduct?.saleStartDate ? new Date(currentProduct.saleStartDate) : null,
      saleEndDate: currentProduct?.saleEndDate ? new Date(currentProduct.saleEndDate) : null,
      currency: currentProduct?.currency || 'INR',
      coverImage: currentProduct?.coverImage || null,
      images: currentProduct?.images || [],
      colors: currentProduct?.colors || [],
      sizes: currentProduct?.sizes || [],
      stockQuantity: currentProduct?.stockQuantity || 0,
      trackInventory: currentProduct?.trackInventory ?? true,
      lowStockThreshold: currentProduct?.lowStockThreshold || 10,
      inStock: currentProduct?.inStock ?? true,
      sku: currentProduct?.sku || '',
      isNewArrival: currentProduct?.isNewArrival || false,
      isBestSeller: currentProduct?.isBestSeller || false,
      isFeatured: currentProduct?.isFeatured || false,
      isPremium: currentProduct?.isPremium || false,
      newArrivalStartDate: currentProduct?.newArrivalStartDate ? new Date(currentProduct.newArrivalStartDate) : null,
      newArrivalEndDate: currentProduct?.newArrivalEndDate ? new Date(currentProduct.newArrivalEndDate) : null,
      categoryId: currentProduct?.categoryId || '',
      tags: currentProduct?.tags || [],
      seoTitle: currentProduct?.seoTitle || '',
      seoDescription: currentProduct?.seoDescription || '',
      seoKeywords: currentProduct?.seoKeywords || [],
      status: currentProduct?.status || 'draft',
    }),
    [currentProduct]
  );

  const methods = useForm({
    resolver: yupResolver(NewProductSchema),
    defaultValues,
  });

  const {
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  useEffect(() => {
    if (currentProduct) {
      reset(defaultValues);
      setVariants(currentProduct.variants || []);
    }
  }, [currentProduct, defaultValues, reset]);

  useEffect(() => {
    if (!Array.isArray(variants) || variants.length === 0) {
      return;
    }

    const totalStock = variants.reduce(
      (sum, variant) => sum + Math.max(0, Number(variant.stockQuantity || 0)),
      0
    );

    setValue('stockQuantity', totalStock, { shouldValidate: false, shouldDirty: true });
    setValue('inStock', totalStock > 0, { shouldValidate: false, shouldDirty: true });
  }, [setValue, variants]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!currentProduct && values.name && !values.slug) {
      const generatedSlug = values.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', generatedSlug);
    }
  }, [values.name, values.slug, currentProduct, setValue]);

  const onSubmit = handleSubmit(
    async (data) => {
      try {
        // Helper to upload a single file
        const uploadFile = async (file) => {
          if (typeof file === 'string') {
            console.log('✓ Image is already a URL:', file);
            return file; // Already a URL
          }
          if (!file) {
            console.log('⚠ No file to upload');
            return '';
          }

          try {
            console.log('📤 Uploading file:', file.name || file);
            const formData = new FormData();
            formData.append('file', file);
            const response = await axiosInstance.post(endpoints.cms.media.upload, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            console.log('📥 Upload response:', response.data);

            // Try different possible response formats
            const url = response.data?.media?.url ||           // CMS format
              response.data?.url ||
              response.data?.path ||
              response.data?.file?.url ||
              response.data?.file?.path ||
              (typeof response.data === 'string' ? response.data : '');

            console.log('✓ Extracted URL:', url);

            if (!url) {
              console.error('❌ No URL in upload response:', response.data);
              enqueueSnackbar('Image upload failed - no URL returned', { variant: 'error' });
            }

            return url;
          } catch (error) {
            console.error('❌ Upload failed:', error);
            enqueueSnackbar(`Upload failed: ${error.message}`, { variant: 'error' });
            return '';
          }
        };

        // Upload cover image if it's a File object
        let coverImageUrl = data.coverImage;
        console.log('Cover image input:', data.coverImage);
        if (data.coverImage && typeof data.coverImage !== 'string') {
          enqueueSnackbar('Uploading cover image...', { variant: 'info' });
          coverImageUrl = await uploadFile(data.coverImage);
          console.log('✓ Cover image URL:', coverImageUrl);
        }

        // Upload additional images if they're File objects
        console.log('Additional images input:', data.images);
        const imageUploadPromises = (data.images || []).map(async (img) => {
          if (typeof img === 'string') {
            return img; // Already a URL
          }
          if (img) {
            const url = await uploadFile(img);
            return url || null;
          }
          return null;
        });

        const uploadedImages = await Promise.all(imageUploadPromises);
        const imageUrls = uploadedImages.filter(url => url); // Remove nulls

        console.log('✓ Final image URLs:', imageUrls);
        console.log('✓ Final cover URL:', coverImageUrl);

        // Transform data for API
        const productData = {
          ...data,
          coverImage: coverImageUrl || '',
          images: imageUrls,
          variants,
          categoryId: normalizeUuidValue(data.categoryId),
        };

        // Remove legacy fields if they exist
        delete productData.categories;
        delete productData.categoryIds;

        console.log('📦 Product data being sent:', {
          coverImage: productData.coverImage,
          images: productData.images,
          variantCount: productData.variants.length
        });

        // Convert dates to ISO strings (only if they exist), otherwise remove them
        if (data.saleStartDate) {
          productData.saleStartDate = new Date(data.saleStartDate).toISOString();
        } else {
          delete productData.saleStartDate;
        }

        if (data.saleEndDate) {
          productData.saleEndDate = new Date(data.saleEndDate).toISOString();
        } else {
          delete productData.saleEndDate;
        }

        if (data.newArrivalStartDate) {
          productData.newArrivalStartDate = new Date(data.newArrivalStartDate).toISOString();
        } else {
          delete productData.newArrivalStartDate;
        }

        if (data.newArrivalEndDate) {
          productData.newArrivalEndDate = new Date(data.newArrivalEndDate).toISOString();
        } else {
          delete productData.newArrivalEndDate;
        }

        if (currentProduct) {
          await axiosInstance.patch(endpoints.products.update(currentProduct.id), productData);
          enqueueSnackbar('Product updated successfully!');
          // Revalidate SWR
          mutate(endpoints.products.details(currentProduct.id));
        } else {
          await axiosInstance.post(endpoints.products.create, productData);
          enqueueSnackbar('Product created successfully!');
        }
        // Revalidate list
        mutate((key) => typeof key === 'string' && key.startsWith(endpoints.products.list));
        router.push(paths.dashboard.product.root);
      } catch (error) {
        console.error(error);
        enqueueSnackbar(error.message || 'Something went wrong!', { variant: 'error' });
      }
    },
    (errors) => {
      // Handle validation errors
      console.error('Validation errors:', errors);

      // Show first error message
      const firstError = Object.values(errors)[0];
      if (firstError?.message) {
        enqueueSnackbar(firstError.message, { variant: 'error' });
      } else {
        enqueueSnackbar('Please fix the form errors before submitting', { variant: 'error' });
      }

      // Find which tab has the error and switch to it
      const errorFields = Object.keys(errors);
      if (errorFields.some(field => ['name', 'slug', 'description', 'shortDescription', 'sku'].includes(field))) {
        setCurrentTab('basic');
      } else if (errorFields.some(field => ['price', 'salePrice', 'saleStartDate', 'saleEndDate', 'currency'].includes(field))) {
        setCurrentTab('pricing');
      } else if (errorFields.some(field => ['coverImage', 'images'].includes(field))) {
        setCurrentTab('images');
      } else if (errorFields.some(field => ['colors', 'sizes'].includes(field))) {
        setCurrentTab('variants');
      } else if (errorFields.some(field => ['stockQuantity', 'trackInventory', 'lowStockThreshold', 'inStock'].includes(field))) {
        setCurrentTab('inventory');
      } else if (errorFields.some(field => ['isNewArrival', 'isBestSeller', 'isFeatured', 'isPremium', 'newArrivalStartDate', 'newArrivalEndDate'].includes(field))) {
        setCurrentTab('labels');
      } else if (errorFields.some(field => ['categories', 'tags'].includes(field))) {
        setCurrentTab('organization');
      } else if (errorFields.some(field => ['seoTitle', 'seoDescription', 'seoKeywords'].includes(field))) {
        setCurrentTab('seo');
      }
    }
  );

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      if (currentProduct) {
        await axiosInstance.patch(endpoints.products.publish(currentProduct.id));
        enqueueSnackbar('Product published successfully!');
        // Revalidate SWR
        mutate(endpoints.products.details(currentProduct.id));
        mutate((key) => typeof key === 'string' && key.startsWith(endpoints.products.list));
        router.push(paths.dashboard.product.root);
      }
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error.message || 'Failed to publish product', { variant: 'error' });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDropCoverImage = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setValue('coverImage', Object.assign(file, { preview: URL.createObjectURL(file) }), {
          shouldValidate: true,
        });
      }
    },
    [setValue]
  );

  const handleDropImages = useCallback(
    (acceptedFiles) => {
      const files = values.images || [];
      const newFiles = acceptedFiles.map((file) =>
        Object.assign(file, { preview: URL.createObjectURL(file) })
      );
      setValue('images', [...files, ...newFiles], { shouldValidate: true });
    },
    [setValue, values.images]
  );

  const handleRemoveFile = useCallback(
    (inputFile) => {
      const filtered = values.images?.filter((file) => file !== inputFile);
      setValue('images', filtered);
    },
    [setValue, values.images]
  );

  const handleRemoveAllFiles = useCallback(() => {
    setValue('images', []);
  }, [setValue]);

  const handleReorderImages = useCallback(
    (reorderedFiles) => {
      setValue('images', reorderedFiles, { shouldValidate: true });
    },
    [setValue]
  );

  useEffect(() => {
    if (values?.isPremium) {
      setValue('isFeatured', false);
      setValue('isBestSeller', false);
      setValue('isNewArrival', false);

    }
  }, [values?.isPremium, setValue]);

  useEffect(() => {
    if (values?.isFeatured || values?.isBestSeller || values?.isNewArrival) {
      setValue('isPremium', false);
    }
  }, [values?.isFeatured, values?.isBestSeller, values?.isNewArrival, setValue]);



  const renderDetails = (
    <Grid container spacing={3}>
      {mdUp && (
        <Grid md={4}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Basic Info
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Product name, description, and images
          </Typography>
        </Grid>
      )}

      <Grid xs={12} md={8}>
        <Card>
          {!mdUp && <CardHeader title="Basic Info" />}

          <Stack spacing={3} sx={{ p: 3 }}>
            <RHFTextField name="name" label="Product Name" />

            <RHFTextField
              name="slug"
              label="Slug"
              helperText="Auto-generated from product name. You can edit it."
            />

            <RHFTextField name="shortDescription" label="Short Description" multiline rows={2} />

            <Stack spacing={1.5}>
              <Typography variant="subtitle2">Description</Typography>
              <RHFEditor simple name="description" />
            </Stack>

            <RHFTextField name="sku" label="SKU" />
          </Stack>
        </Card>
      </Grid>
    </Grid>
  );

  const renderImages = (
    <Grid container spacing={3}>
      {mdUp && (
        <Grid md={4}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Images
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Cover image and additional product images
          </Typography>
        </Grid>
      )}

      <Grid xs={12} md={8}>
        <Card>
          {!mdUp && <CardHeader title="Images" />}

          <Stack spacing={3} sx={{ p: 3 }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">Cover Image</Typography>
              <RHFUpload
                name="coverImage"
                maxSize={3145728}
                onDrop={handleDropCoverImage}
                onDelete={() => setValue('coverImage', null)}
              />
            </Stack>

            <Stack spacing={1.5}>
              <Typography variant="subtitle2">Additional Images</Typography>
              <RHFUpload
                multiple
                thumbnail
                name="images"
                maxSize={3145728}
                onDrop={handleDropImages}
                onRemove={handleRemoveFile}
                onRemoveAll={handleRemoveAllFiles}
                onReorder={handleReorderImages}
              />
            </Stack>
          </Stack>
        </Card>
      </Grid>
    </Grid>
  );

  const renderPricing = (
    <Grid container spacing={3}>
      {mdUp && (
        <Grid md={4}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Pricing
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Price, sale price, and currency
          </Typography>
        </Grid>
      )}

      <Grid xs={12} md={8}>
        <Card>
          {!mdUp && <CardHeader title="Pricing" />}

          <Stack spacing={3} sx={{ p: 3 }}>
            <Box
              columnGap={2}
              rowGap={3}
              display="grid"
              gridTemplateColumns={{ xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' }}
            >
              <RHFTextField
                name="price"
                label="Regular Price"
                placeholder="0"
                type="number"
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box component="span" sx={{ color: 'text.disabled' }}>
                        ₹
                      </Box>
                    </InputAdornment>
                  ),
                }}
              />

              <RHFTextField
                name="salePrice"
                label="Sale Price"
                placeholder="0"
                type="number"
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box component="span" sx={{ color: 'text.disabled' }}>
                        ₹
                      </Box>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <RHFAutocomplete
              name="currency"
              label="Currency"
              options={['INR', 'USD', 'EUR', 'GBP']}
              getOptionLabel={(option) => option}
              renderOption={(props, option) => (
                <li {...props} key={option}>
                  {option}
                </li>
              )}
            />

            <Box
              columnGap={2}
              rowGap={3}
              display="grid"
              gridTemplateColumns={{ xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' }}
            >
              <DatePicker
                label="Sale Start Date"
                value={values.saleStartDate}
                onChange={(newValue) => setValue('saleStartDate', newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />

              <DatePicker
                label="Sale End Date"
                value={values.saleEndDate}
                onChange={(newValue) => setValue('saleEndDate', newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Box>
          </Stack>
        </Card>
      </Grid>
    </Grid>
  );

  const renderVariants = (
    <ProductVariantManager
      variants={variants}
      onChange={setVariants}
      productName={values.name}
    />
  );

  const renderInventory = (
    <Grid container spacing={3}>
      {mdUp && (
        <Grid md={4}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Inventory
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Stock management and tracking
          </Typography>
        </Grid>
      )}

      <Grid xs={12} md={8}>
        <Card>
          {!mdUp && <CardHeader title="Inventory" />}

          <Stack spacing={3} sx={{ p: 3 }}>
            <Stack spacing={1.5}>
              <RHFSwitch name="trackInventory" label="Track Inventory" />
              <Typography variant="caption" color="text.secondary">
                Enable to track stock levels and receive low stock alerts
              </Typography>
            </Stack>

            <Box
              columnGap={2}
              rowGap={3}
              display="grid"
              gridTemplateColumns={{ xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' }}
            >
              <Stack spacing={1}>
                <RHFTextField
                  name="stockQuantity"
                  label="Stock Quantity"
                  placeholder="0"
                  type="number"
                  InputLabelProps={{ shrink: true }}
                  disabled={!values.trackInventory}
                />
                <Typography variant="caption" color="text.secondary">
                  Current available stock
                </Typography>
              </Stack>

              <Stack spacing={1}>
                <RHFTextField
                  name="lowStockThreshold"
                  label="Low Stock Threshold"
                  placeholder="10"
                  type="number"
                  InputLabelProps={{ shrink: true }}
                  disabled={!values.trackInventory}
                />
                <Typography variant="caption" color="text.secondary">
                  Alert when stock falls below this number
                </Typography>
              </Stack>
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Stack spacing={1.5}>
              <RHFSwitch name="inStock" label="In Stock" />
              <Typography variant="caption" color="text.secondary">
                Manually control product availability on the website
              </Typography>
            </Stack>
          </Stack>
        </Card>
      </Grid>
    </Grid>
  );

  const renderLabels = (
    <Grid container spacing={3}>
      {mdUp && (
        <Grid md={4}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Labels
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Product labels and badges
          </Typography>
        </Grid>
      )}

      <Grid xs={12} md={8}>
        <Card>
          {!mdUp && <CardHeader title="Labels" />}

          <Stack spacing={3} sx={{ p: 3 }}>
            <RHFSwitch name="isNewArrival" label="New Arrival" />

            {values.isNewArrival && (
              <Box
                columnGap={2}
                rowGap={3}
                display="grid"
                gridTemplateColumns={{ xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' }}
              >
                <DatePicker
                  label="New Arrival Start Date"
                  value={values.newArrivalStartDate}
                  onChange={(newValue) => setValue('newArrivalStartDate', newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />

                <DatePicker
                  label="New Arrival End Date"
                  value={values.newArrivalEndDate}
                  onChange={(newValue) => setValue('newArrivalEndDate', newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Box>
            )}

            <Divider sx={{ borderStyle: 'dashed' }} />

            <RHFSwitch name="isBestSeller" label="Best Seller" />

            <RHFSwitch name="isFeatured" label="Featured" />

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Stack spacing={1.5}>
              <RHFSwitch name="isPremium" label="Premium Product" />
              <Typography variant="caption" color="text.secondary">
                Premium products stay available for the premium preorder flow, but will be hidden from the normal storefront product listings.
              </Typography>
            </Stack>
          </Stack>
        </Card>
      </Grid>
    </Grid>
  );

  const renderCategories = (
    <Grid container spacing={3}>
      {mdUp && (
        <Grid md={4}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Organization
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Categories and tags
          </Typography>
        </Grid>
      )}

      <Grid xs={12} md={8}>
        <Card>
          {!mdUp && <CardHeader title="Organization" />}

          <Stack spacing={3} sx={{ p: 3 }}>
            <RHFAutocomplete
              name="categoryId"
              label="Category"
              placeholder="Select category"
              options={categoryList.map((cat) => cat.id)}
              getOptionLabel={(option) => categoryList.find((cat) => cat.id === option)?.name || ''}
              isOptionEqualToValue={(option, value) => option === value}
              renderOption={(props, option) => {
                const category = categoryList.find((cat) => cat.id === option);
                return (
                  <li {...props} key={option}>
                    {category?.name}
                  </li>
                );
              }}
            />

            <RHFAutocomplete
              name="tags"
              label="Tags"
              placeholder="+ Add tag"
              multiple
              freeSolo
              options={['cotton', 'premium', 'casual', 'summer', 'winter']}
              renderTags={(selected, getTagProps) =>
                selected.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    label={option}
                    size="small"
                    color="info"
                    variant="soft"
                  />
                ))
              }
            />
          </Stack>
        </Card>
      </Grid>
    </Grid>
  );

  const renderSEO = (
    <Grid container spacing={3}>
      {mdUp && (
        <Grid md={4}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            SEO
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Search engine optimization settings
          </Typography>
        </Grid>
      )}

      <Grid xs={12} md={8}>
        <Card>
          {!mdUp && <CardHeader title="SEO" />}

          <Stack spacing={3} sx={{ p: 3 }}>
            <Stack spacing={1}>
              <RHFTextField
                name="seoTitle"
                label="SEO Title"
                placeholder="Enter a descriptive title for search engines"
                helperText={
                  values.seoTitle
                    ? `${values.seoTitle.length}/60 characters (optimal: 50-60)`
                    : 'Recommended: 50-60 characters'
                }
              />
              <Typography variant="caption" color="text.secondary">
                This title appears in search engine results. If empty, product name will be used.
              </Typography>
            </Stack>

            <Stack spacing={1}>
              <RHFTextField
                name="seoDescription"
                label="SEO Description"
                placeholder="Write a compelling description for search results"
                multiline
                rows={3}
                helperText={
                  values.seoDescription
                    ? `${values.seoDescription.length}/160 characters (optimal: 150-160)`
                    : 'Recommended: 150-160 characters'
                }
              />
              <Typography variant="caption" color="text.secondary">
                This description appears below the title in search results. Make it engaging!
              </Typography>
            </Stack>

            <Stack spacing={1}>
              <RHFAutocomplete
                name="seoKeywords"
                label="SEO Keywords"
                placeholder="+ Add keyword"
                multiple
                freeSolo
                options={[]}
                renderTags={(selected, getTagProps) =>
                  selected.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option}
                      label={option}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))
                }
              />
              <Typography variant="caption" color="text.secondary">
                Add relevant keywords that customers might use to search for this product (5-10
                keywords recommended)
              </Typography>
            </Stack>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Box
              sx={{
                p: 2,
                bgcolor: 'background.neutral',
                borderRadius: 1,
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                SEO Preview
              </Typography>
              <Typography
                variant="body2"
                color="primary"
                sx={{ fontWeight: 600, mb: 0.5 }}
                noWrap
              >
                {values.seoTitle || values.name || 'Product Title'}
              </Typography>
              <Typography variant="caption" color="success.main" sx={{ display: 'block', mb: 0.5 }}>
                {window.location.origin}/products/{values.slug || 'product-slug'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                {values.seoDescription ||
                  values.shortDescription ||
                  'Product description will appear here...'}
              </Typography>
            </Box>
          </Stack>
        </Card>
      </Grid>
    </Grid>
  );

  const renderActions = (
    <>
      {mdUp && <Grid md={4} />}
      <Grid xs={12} md={8} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="outlined"
          size="large"
          onClick={() => router.push(paths.dashboard.product.root)}
          disabled={isSubmitting || isPublishing}
        >
          Cancel
        </Button>

        <LoadingButton
          type="submit"
          variant="contained"
          size="large"
          loading={isSubmitting}
          disabled={isPublishing}
          sx={{ flexGrow: 1 }}
        >
          {currentProduct ? 'Save Changes' : 'Create Product'}
        </LoadingButton>

        {currentProduct && currentProduct.status !== 'published' && (
          <LoadingButton
            variant="contained"
            size="large"
            color="success"
            onClick={handlePublish}
            loading={isPublishing}
            disabled={isSubmitting}
          >
            Publish
          </LoadingButton>
        )}
      </Grid>
    </>
  );

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12}>
          <Card>
            <Tabs
              value={currentTab}
              onChange={(e, newValue) => setCurrentTab(newValue)}
              sx={{
                px: 3,
                boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.palette.divider}`,
              }}
            >
              <Tab label="Basic Info" value="basic" />
              <Tab label="Images" value="images" />
              <Tab label="Pricing" value="pricing" />
              <Tab
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>Variants</span>
                    {variants.length > 0 && (
                      <Chip label={variants.length} size="small" color="primary" />
                    )}
                  </Stack>
                }
                value="variants"
              />
              <Tab label="Inventory" value="inventory" />
              <Tab label="Labels" value="labels" />
              <Tab label="Organization" value="organization" />
              <Tab label="SEO" value="seo" />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {currentTab === 'basic' && renderDetails}
              {currentTab === 'images' && renderImages}
              {currentTab === 'pricing' && renderPricing}
              {currentTab === 'variants' && (
                <Stack spacing={3}>
                  {variants.length === 0 && (
                    <Alert severity="info">
                      No variants added yet. Add variants to manage different colors, sizes, and stock levels for this product.
                    </Alert>
                  )}
                  {renderVariants}
                </Stack>
              )}
              {currentTab === 'inventory' && renderInventory}
              {currentTab === 'labels' && renderLabels}
              {currentTab === 'organization' && renderCategories}
              {currentTab === 'seo' && renderSEO}
            </Box>
          </Card>
        </Grid>

        {renderActions}
      </Grid>
    </FormProvider>
  );
}

ProductNewEditForm.propTypes = {
  currentProduct: PropTypes.object,
};
