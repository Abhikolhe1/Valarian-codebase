import PropTypes from 'prop-types';
import * as Yup from 'yup';
import { useCallback, useMemo, useEffect } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
import axiosInstance, { endpoints } from 'src/utils/axios';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Grid from '@mui/material/Unstable_Grid2';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
import { useResponsive } from 'src/hooks/use-responsive';
// routes
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hook';
// _mock
import { _tags } from 'src/_mock';
// components
import { useSnackbar } from 'src/components/snackbar';
import FormProvider, {
  RHFEditor,
  RHFUpload,
  RHFTextField,
  RHFAutocomplete,
} from 'src/components/hook-form';
//
import PostDetailsPreview from './post-details-preview';

// ----------------------------------------------------------------------

export default function PostNewEditForm({ currentPost }) {
  const router = useRouter();

  const mdUp = useResponsive('up', 'md');

  const { enqueueSnackbar } = useSnackbar();

  const preview = useBoolean();

  const NewBlogSchema = Yup.object().shape({
    title: Yup.string().required('Title is required'),
    description: Yup.string().required('Description is required'),
    content: Yup.string().required('Content is required'),
    coverUrl: Yup.mixed().nullable().required('Cover is required'),
    coverAlt: Yup.string().required('Image alt text is required'),
    tags: Yup.array().min(1, 'Add at least one relevant tag'),
    metaKeywords: Yup.array(),
    // not required
    metaTitle: Yup.string(),
    metaDescription: Yup.string(),
  });

  const defaultValues = useMemo(
    () => ({
      title: currentPost?.title || '',
      description: currentPost?.excerpt || currentPost?.description || '',
      content: currentPost?.content || '',
      coverUrl: currentPost?.coverUrl || null,
      coverAlt: currentPost?.coverAlt || '',
      slug: currentPost?.slug || '',
      category: currentPost?.category || 'Style Guide',
      authorName: currentPost?.authorName || 'Valiarian Editorial Team',
      canonicalUrl: currentPost?.canonicalUrl || '',
      status: currentPost?.status || 'draft',
      noIndex: currentPost?.noIndex || false,
      tags: currentPost?.tags || [],
      metaKeywords: currentPost?.metaKeywords || [],
      metaTitle: currentPost?.metaTitle || '',
      metaDescription: currentPost?.metaDescription || '',
    }),
    [currentPost]
  );

  const methods = useForm({
    resolver: yupResolver(NewBlogSchema),
    defaultValues,
  });

  const {
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = methods;

  const values = watch();

  useEffect(() => {
    if (currentPost) {
      reset(defaultValues);
    }
  }, [currentPost, defaultValues, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      let coverUrl = data.coverUrl;
      if (coverUrl instanceof File) {
        const formData = new FormData();
        formData.append('file', coverUrl);
        formData.append('folder', '/blog');
        formData.append('altText', data.coverAlt);
        const upload = await axiosInstance.post(endpoints.cms.media.upload, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        coverUrl = upload.data.media.url;
      }
      const payload = {
        ...data,
        excerpt: data.description,
        coverUrl,
        status: data.status,
      };
      if (currentPost?.id) {
        await axiosInstance.patch(endpoints.post.update(currentPost.id), payload);
      } else {
        await axiosInstance.post(endpoints.post.create, payload);
      }
      preview.onFalse();
      enqueueSnackbar(currentPost ? 'Update success!' : 'Create success!');
      router.push(paths.dashboard.post.root);
      console.info('DATA', data);
    } catch (error) {
      console.error(error);
    }
  });

  const handleDrop = useCallback(
    (acceptedFiles) => {
      const [file] = acceptedFiles;

      const newFile = Object.assign(file, {
        preview: URL.createObjectURL(file),
      });

      if (file) {
        setValue('coverUrl', newFile, { shouldValidate: true });
      }
    },
    [setValue]
  );

  const handleRemoveFile = useCallback(() => {
    setValue('coverUrl', null);
  }, [setValue]);

  const handleArticleImageUpload = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', '/blog/content');
    formData.append('altText', file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
    const upload = await axiosInstance.post(endpoints.cms.media.upload, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    enqueueSnackbar('Article image uploaded');
    return {
      url: upload.data.media.url,
      alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
    };
  }, [enqueueSnackbar]);

  const renderDetails = (
    <>
      {mdUp && (
        <Grid md={4}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Details
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Title, short description, image...
          </Typography>
        </Grid>
      )}

      <Grid xs={12} md={8}>
        <Card>
          {!mdUp && <CardHeader title="Details" />}

          <Stack spacing={3} sx={{ p: 3 }}>
            <Card sx={{ p: 2, bgcolor: 'background.neutral' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Evergreen article structure
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start with the reader&apos;s question, add clear H2/H3 sections, practical examples,
                original images with descriptive alt text, relevant product links, and finish with a
                concise FAQ. Update facts and the modified date whenever the guidance changes.
              </Typography>
            </Card>

            <RHFTextField name="title" label="Post Title" />

            <RHFTextField name="description" label="Description" multiline rows={3} />

            <RHFTextField name="slug" label="URL slug (leave blank to generate)" />

            <Stack spacing={1.5}>
              <Typography variant="subtitle2">Content</Typography>
              <RHFEditor name="content" uploadImage={handleArticleImageUpload} />
            </Stack>

            <RHFTextField name="coverAlt" label="Cover image alt text" />

            <Stack spacing={1.5}>
              <Typography variant="subtitle2">Cover</Typography>
              <RHFUpload
                name="coverUrl"
                maxSize={3145728}
                onDrop={handleDrop}
                onDelete={handleRemoveFile}
              />
            </Stack>
          </Stack>
        </Card>
      </Grid>
    </>
  );

  const renderProperties = (
    <>
      {mdUp && (
        <Grid md={4}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Properties
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Additional functions and attributes...
          </Typography>
        </Grid>
      )}

      <Grid xs={12} md={8}>
        <Card>
          {!mdUp && <CardHeader title="Properties" />}

          <Stack spacing={3} sx={{ p: 3 }}>
            <RHFAutocomplete
              name="tags"
              label="Tags"
              placeholder="+ Tags"
              multiple
              freeSolo
              options={_tags.map((option) => option)}
              getOptionLabel={(option) => option}
              renderOption={(props, option) => (
                <li {...props} key={option}>
                  {option}
                </li>
              )}
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

            <RHFTextField name="category" label="Article category" />

            <RHFTextField name="authorName" label="Author name" />

            <RHFTextField name="metaTitle" label="Meta title" />

            <RHFTextField
              name="metaDescription"
              label="Meta description"
              fullWidth
              multiline
              rows={3}
            />

            <RHFTextField name="canonicalUrl" label="Canonical URL (auto-generated if blank)" />

            <RHFAutocomplete
              name="metaKeywords"
              label="Meta keywords"
              placeholder="+ Keywords"
              multiple
              freeSolo
              disableCloseOnSelect
              options={_tags.map((option) => option)}
              getOptionLabel={(option) => option}
              renderOption={(props, option) => (
                <li {...props} key={option}>
                  {option}
                </li>
              )}
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

            <FormControlLabel
              control={
                <Switch
                  checked={values.noIndex}
                  onChange={(event) => setValue('noIndex', event.target.checked)}
                />
              }
              label="Hide this article from search engines"
            />
          </Stack>
        </Card>
      </Grid>
    </>
  );

  const renderActions = (
    <>
      {mdUp && <Grid md={4} />}
      <Grid xs={12} md={8} sx={{ display: 'flex', alignItems: 'center' }}>
        <FormControlLabel
          control={
            <Switch
              checked={values.status === 'published'}
              onChange={(event) => setValue('status', event.target.checked ? 'published' : 'draft')}
            />
          }
          label={values.status === 'published' ? 'Published' : 'Save as draft'}
          sx={{ flexGrow: 1, pl: 3 }}
        />

        <Button color="inherit" variant="outlined" size="large" onClick={preview.onTrue}>
          Preview
        </Button>

        <LoadingButton
          type="submit"
          variant="contained"
          size="large"
          loading={isSubmitting}
          sx={{ ml: 2 }}
        >
          {!currentPost ? 'Create Post' : 'Save Changes'}
        </LoadingButton>
      </Grid>
    </>
  );

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        {renderDetails}

        {renderProperties}

        {renderActions}
      </Grid>

      <PostDetailsPreview
        title={values.title}
        content={values.content}
        description={values.description}
        coverUrl={
          typeof values.coverUrl === 'string' ? values.coverUrl : `${values.coverUrl?.preview}`
        }
        //
        open={preview.value}
        isValid={isValid}
        isSubmitting={isSubmitting}
        onClose={preview.onFalse}
        onSubmit={onSubmit}
      />
    </FormProvider>
  );
}

PostNewEditForm.propTypes = {
  currentPost: PropTypes.object,
};
