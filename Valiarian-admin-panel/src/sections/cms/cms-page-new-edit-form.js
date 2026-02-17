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
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
// routes
import { paths } from 'src/routes/paths';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
import { useResponsive } from 'src/hooks/use-responsive';
// components
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { ConfirmDialog } from 'src/components/custom-dialog';
import FormProvider, {
  RHFAutocomplete,
  RHFSelect,
  RHFTextField,
} from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
import { useSnackbar } from 'src/components/snackbar';
import { useRouter } from 'src/routes/hook';
import CMSSectionList from './cms-section-list';
//

// ----------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'archived', label: 'Archived' },
];

// ----------------------------------------------------------------------

export default function CMSPageNewEditForm({ currentPage }) {
  const router = useRouter();

  const mdUp = useResponsive('up', 'md');

  const { enqueueSnackbar } = useSnackbar();

  const publishConfirm = useBoolean();
  const deleteConfirm = useBoolean();
  const duplicateDialog = useBoolean();
  const previewDialog = useBoolean();

  const [duplicateName, setDuplicateName] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [sections, setSections] = useState([]);

  const NewPageSchema = Yup.object().shape({
    title: Yup.string().required('Title is required'),
    slug: Yup.string()
      .required('Slug is required')
      .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only'),
    description: Yup.string(),
    status: Yup.string().required('Status is required'),
    scheduledAt: Yup.date().nullable(),
    seoTitle: Yup.string(),
    seoDescription: Yup.string(),
    seoKeywords: Yup.array(),
    ogImage: Yup.string().url('Must be a valid URL'),
  });

  const defaultValues = useMemo(
    () => ({
      title: currentPage?.title || '',
      slug: currentPage?.slug || '',
      description: currentPage?.description || '',
      status: currentPage?.status || 'draft',
      scheduledAt: currentPage?.scheduledAt || null,
      seoTitle: currentPage?.seoTitle || '',
      seoDescription: currentPage?.seoDescription || '',
      seoKeywords: currentPage?.seoKeywords || [],
      ogImage: currentPage?.ogImage || '',
    }),
    [currentPage]
  );

  const methods = useForm({
    resolver: yupResolver(NewPageSchema),
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

  const fetchSections = useCallback(async () => {
    if (!currentPage?.id) return;

    try {
      const response = await fetch(
        `http://localhost:3035/api/cms/sections?filter=${encodeURIComponent(
          JSON.stringify({ where: { pageId: currentPage.id }, order: ['order ASC'] })
        )}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch sections');
      }

      const data = await response.json();
      setSections(data);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  }, [currentPage?.id]);

  useEffect(() => {
    if (currentPage) {
      reset(defaultValues);
      // Fetch sections for this page
      fetchSections();
    }
  }, [currentPage, defaultValues, reset, fetchSections]);

  const handleSectionsChange = useCallback((updatedSections) => {
    setSections(updatedSections);
  }, []);

  // Auto-generate slug from title
  useEffect(() => {
    if (!currentPage && values.title) {
      const slug = values.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', slug);
    }
  }, [values.title, currentPage, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const url = currentPage
        ? `http://localhost:3035/api/cms/pages/${currentPage.id}`
        : 'http://localhost:3035/api/cms/pages';

      const method = currentPage ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save page');
      }

      reset();
      enqueueSnackbar(currentPage ? 'Update success!' : 'Create success!');
      router.push(paths.dashboard.cms.pages.list);
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Error saving page', { variant: 'error' });
    }
  });

  const handleSaveDraft = useCallback(async () => {
    try {
      const data = { ...values, status: 'draft' };

      const url = currentPage
        ? `http://localhost:3035/api/cms/pages/${currentPage.id}`
        : 'http://localhost:3035/api/cms/pages';

      const method = currentPage ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save draft');
      }

      enqueueSnackbar('Draft saved!');
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Error saving draft', { variant: 'error' });
    }
  }, [values, currentPage, enqueueSnackbar]);

  const handlePublish = useCallback(async () => {
    if (!currentPage) {
      enqueueSnackbar('Please save the page first', { variant: 'warning' });
      return;
    }

    try {
      setIsPublishing(true);
      const response = await fetch(
        `http://localhost:3035/api/cms/pages/${currentPage.id}/publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ comment: 'Published from admin panel' }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to publish page');
      }

      enqueueSnackbar('Page published successfully!');
      publishConfirm.onFalse();
      router.push(paths.dashboard.cms.pages.list);
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Error publishing page', { variant: 'error' });
    } finally {
      setIsPublishing(false);
    }
  }, [currentPage, enqueueSnackbar, publishConfirm, router]);

  const handleDuplicate = useCallback(async () => {
    if (!currentPage) {
      enqueueSnackbar('Please save the page first', { variant: 'warning' });
      return;
    }

    if (!duplicateName.trim()) {
      enqueueSnackbar('Please enter a name for the duplicate', { variant: 'warning' });
      return;
    }

    try {
      setIsDuplicating(true);
      const response = await fetch(
        `http://localhost:3035/api/cms/pages/${currentPage.id}/duplicate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: duplicateName }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to duplicate page');
      }

      const duplicatedPage = await response.json();
      enqueueSnackbar('Page duplicated successfully!');
      duplicateDialog.onFalse();
      setDuplicateName('');
      router.push(paths.dashboard.cms.pages.edit(duplicatedPage.id));
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Error duplicating page', { variant: 'error' });
    } finally {
      setIsDuplicating(false);
    }
  }, [currentPage, duplicateName, enqueueSnackbar, duplicateDialog, router]);

  const handleDelete = useCallback(async () => {
    if (!currentPage) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`http://localhost:3035/api/cms/pages/${currentPage.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete page');
      }

      enqueueSnackbar('Page deleted successfully!');
      deleteConfirm.onFalse();
      router.push(paths.dashboard.cms.pages.list);
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Error deleting page', { variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  }, [currentPage, enqueueSnackbar, deleteConfirm, router]);

  const renderBasicInfo = (
    <>
      {mdUp && (
        <Grid md={4}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Basic Info
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Title, slug, description...
          </Typography>
        </Grid>
      )}

      <Grid xs={12} md={8}>
        <Card>
          {!mdUp && <CardHeader title="Basic Info" />}

          <Stack spacing={3} sx={{ p: 3 }}>
            <RHFTextField name="title" label="Page Title" />

            <RHFTextField
              name="slug"
              label="Slug"
              helperText="URL-friendly version of the title (lowercase, hyphens only)"
            />

            <RHFTextField
              name="description"
              label="Description"
              multiline
              rows={4}
            />

            <RHFSelect name="status" label="Status">
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </RHFSelect>

            {values.status === 'scheduled' && (
              <DateTimePicker
                label="Scheduled Date"
                value={values.scheduledAt}
                onChange={(newValue) => setValue('scheduledAt', newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText: 'Select when this page should be published',
                  },
                }}
              />
            )}
          </Stack>
        </Card>
      </Grid>
    </>
  );

  const renderSEO = (
    <>
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
            <RHFTextField
              name="seoTitle"
              label="SEO Title"
              helperText="Recommended: 50-60 characters"
            />

            <RHFTextField
              name="seoDescription"
              label="SEO Description"
              multiline
              rows={3}
              helperText="Recommended: 150-160 characters"
            />

            <RHFAutocomplete
              name="seoKeywords"
              label="SEO Keywords"
              multiple
              freeSolo
              options={[]}
              getOptionLabel={(option) => option}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    size="small"
                    label={option}
                  />
                ))
              }
              helperText="Press Enter to add keywords"
            />

            <RHFTextField
              name="ogImage"
              label="Open Graph Image URL"
              helperText="Image for social media sharing (recommended: 1200x630px)"
            />
          </Stack>
        </Card>
      </Grid>
    </>
  );

  const renderSections = currentPage && (
    <>
      {mdUp && (
        <Grid md={4}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Page Sections
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Manage and reorder page sections
          </Typography>
        </Grid>
      )}

      <Grid xs={12} md={8}>
        <CMSSectionList
          pageId={currentPage.id}
          sections={sections}
          onSectionsChange={handleSectionsChange}
        />
      </Grid>
    </>
  );

  const renderActions = (
    <>
      {mdUp && <Grid md={4} />}
      <Grid xs={12} md={8}>
        <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
          {/* Left side actions (only in edit mode) */}
          {currentPage && (
            <Stack direction="row" spacing={1}>
              <Button
                color="error"
                variant="outlined"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                onClick={deleteConfirm.onTrue}
              >
                Delete
              </Button>

              <Button
                color="inherit"
                variant="outlined"
                startIcon={<Iconify icon="solar:copy-bold" />}
                onClick={() => {
                  setDuplicateName(`${currentPage.title} (Copy)`);
                  duplicateDialog.onTrue();
                }}
              >
                Duplicate
              </Button>

              <Button
                color="inherit"
                variant="outlined"
                startIcon={<Iconify icon="solar:eye-bold" />}
                onClick={previewDialog.onTrue}
              >
                Preview
              </Button>
            </Stack>
          )}

          {/* Right side actions */}
          <Stack direction="row" spacing={2} sx={{ ml: 'auto' }}>
            <Button
              color="inherit"
              variant="outlined"
              size="large"
              onClick={() => router.push(paths.dashboard.cms.pages.list)}
            >
              Cancel
            </Button>

            <Button
              color="inherit"
              variant="outlined"
              size="large"
              onClick={handleSaveDraft}
            >
              Save Draft
            </Button>

            {currentPage && currentPage.status !== 'published' && (
              <Button
                color="success"
                variant="contained"
                size="large"
                startIcon={<Iconify icon="solar:check-circle-bold" />}
                onClick={publishConfirm.onTrue}
              >
                Publish
              </Button>
            )}

            <LoadingButton
              type="submit"
              variant="contained"
              size="large"
              loading={isSubmitting}
            >
              {!currentPage ? 'Create Page' : 'Save Changes'}
            </LoadingButton>
          </Stack>
        </Stack>
      </Grid>
    </>
  );

  return (
    <>
      <FormProvider methods={methods} onSubmit={onSubmit}>
        <Grid container spacing={3}>
          {renderBasicInfo}

          {renderSEO}

          {renderSections}

          {renderActions}
        </Grid>
      </FormProvider>

      {/* Publish Confirmation Dialog */}
      <ConfirmDialog
        open={publishConfirm.value}
        onClose={publishConfirm.onFalse}
        title="Publish Page"
        content="Are you sure you want to publish this page? It will be visible to all users."
        action={
          <LoadingButton
            variant="contained"
            color="success"
            onClick={handlePublish}
            loading={isPublishing}
          >
            Publish
          </LoadingButton>
        }
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.value}
        onClose={deleteConfirm.onFalse}
        title="Delete Page"
        content={
          <>
            Are you sure you want to delete <strong>{currentPage?.title}</strong>? This action
            cannot be undone.
          </>
        }
        action={
          <LoadingButton
            variant="contained"
            color="error"
            onClick={handleDelete}
            loading={isDeleting}
          >
            Delete
          </LoadingButton>
        }
      />

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialog.value} onClose={duplicateDialog.onFalse} maxWidth="sm" fullWidth>
        <DialogTitle>Duplicate Page</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Enter a name for the duplicated page:
          </Typography>
          <TextField
            fullWidth
            label="Page Title"
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={duplicateDialog.onFalse} color="inherit">
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            onClick={handleDuplicate}
            loading={isDuplicating}
          >
            Duplicate
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog.value}
        onClose={previewDialog.onFalse}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' },
        }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Preview: {currentPage?.title}</Typography>
            <IconButton onClick={previewDialog.onFalse}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ height: '100%', bgcolor: 'background.neutral' }}>
            {currentPage && (
              <iframe
                title="Page Preview"
                src={`http://localhost:3000/${currentPage.slug}`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
              />
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}

CMSPageNewEditForm.propTypes = {
  currentPage: PropTypes.object,
};
