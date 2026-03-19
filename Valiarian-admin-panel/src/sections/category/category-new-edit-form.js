import { yupResolver } from '@hookform/resolvers/yup';
import PropTypes from 'prop-types';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Unstable_Grid2';
// routes
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
// utils
import axios, { endpoints } from 'src/utils/axios';
// components
import FormProvider, { RHFSelect, RHFSwitch, RHFTextField } from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
import { useSnackbar } from 'src/components/snackbar';
import { useRouter } from 'src/routes/hook';
// api
import {
  useGetParentCategories,
} from 'src/api/category';

// ----------------------------------------------------------------------

function normalizeUuidValue(value) {
  if (typeof value !== 'string') {
    return value ?? null;
  }

  let normalized = value.trim();

  if (!normalized) {
    return null;
  }

  while (
    normalized.length > 1 &&
    ((normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'")))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized || null;
}

export default function CategoryNewEditForm({ currentCategory, isParentCategory = false }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const { parentCategories } = useGetParentCategories(!isParentCategory);

  const NewCategorySchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    slug: Yup.string().required('Slug is required'),
    parentId: Yup.string().nullable(),
    description: Yup.string(),
    isActive: Yup.boolean(),
  });

  const defaultValues = useMemo(
    () => ({
      name: currentCategory?.name || '',
      slug: currentCategory?.slug || '',
      parentId: currentCategory?.parentId || '',
      description: currentCategory?.description || '',
      isActive: currentCategory?.isActive ?? true,
    }),
    [currentCategory]
  );

  const methods = useForm({
    resolver: yupResolver(NewCategorySchema),
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
    if (currentCategory) {
      reset(defaultValues);
    }
  }, [currentCategory, defaultValues, reset]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!currentCategory && values.name && !values.slug) {
      const generatedSlug = values.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', generatedSlug);
    }
  }, [values.name, values.slug, currentCategory, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        ...data,
        parentId: normalizeUuidValue(data.parentId),
      };

      if (isParentCategory) {
        delete payload.parentId;
      }

      if (currentCategory && isParentCategory) {
        await axios.patch(`${endpoints.parentCategory.list}/${currentCategory.id}`, payload);
        enqueueSnackbar('Parent category updated successfully!');
      } else if (currentCategory) {
        await axios.patch(`${endpoints.category.list}/${currentCategory.id}`, payload);
        enqueueSnackbar('Category updated successfully!');
      } else if (isParentCategory) {
        await axios.post(endpoints.parentCategory.list, payload);
        enqueueSnackbar('Parent category created successfully!');
      } else {
        await axios.post(endpoints.category.list, payload);
        enqueueSnackbar('Category created successfully!');
      }

      router.push(
        isParentCategory ? paths.dashboard.parentCategory.root : paths.dashboard.category.root
      );
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error.message || 'Something went wrong!', { variant: 'error' });
    }
  });

  let submitLabel = 'Save Changes';

  if (!currentCategory) {
    submitLabel = isParentCategory ? 'Create Parent Category' : 'Create Category';
  }

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={3}>
              <RHFTextField name="name" label="Category Name" />

              <RHFTextField name="slug" label="Slug" />

              {!isParentCategory && (
                <Stack spacing={1.5}>
                  <RHFSelect
                    native
                    name="parentId"
                    label="Parent Category"
                    InputLabelProps={{ shrink: true }}
                  >
                    <option value="" disabled>
                      Select Parent Category
                    </option>

                    {parentCategories
                      .filter((cat) => cat.id !== currentCategory?.id)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </RHFSelect>

                  <Button
                    component={RouterLink}
                    href={paths.dashboard.parentCategory.new}
                    variant="outlined"
                    color="inherit"
                    startIcon={<Iconify icon="mingcute:add-line" />}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Create Parent Category
                  </Button>
                </Stack>
              )}

              <RHFTextField name="description" label="Description" multiline rows={4} />

              <RHFSwitch name="isActive" label="Active" />
            </Stack>

            <Stack alignItems="flex-end" sx={{ mt: 3 }}>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                {submitLabel}
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </FormProvider>
  );
}

CategoryNewEditForm.propTypes = {
  currentCategory: PropTypes.object,
  isParentCategory: PropTypes.bool,
};
