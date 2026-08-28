import PropTypes from 'prop-types';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
// @mui
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useBoolean } from 'src/hooks/use-boolean';
// components
import { RHFTextField } from 'src/components/hook-form';
import FormProvider from 'src/components/hook-form/form-provider';
import Iconify from 'src/components/iconify';
import CMSMediaPicker from '../cms-media-picker';

// ----------------------------------------------------------------------

const MAX_GALLERY_IMAGES = 5;
const DEFAULT_GALLERY_IMAGES = [
  '/assets/images/home/social-media/social-1.jpeg',
  '/assets/images/home/social-media/social-2.jpeg',
  '/assets/images/home/social-media/social-3.jpeg',
  '/assets/images/home/social-media/social-4.jpeg',
  '/assets/images/home/social-media/social-5.jpeg',
];

const EMPTY_ITEM = { image: '', logo: '', link: '' };

// Older saved sections stored plain URL strings; newer ones store {image, logo, link}.
const normalizeGalleryItem = (item) => {
  if (typeof item === 'string') {
    return { image: item, logo: '', link: '' };
  }

  return {
    image: item?.image || '',
    logo: item?.logo || '',
    link: item?.link || '',
  };
};

const buildInitialItems = (section) => {
  const saved = section?.content?.galleryImages;

  const source = saved?.length ? saved : DEFAULT_GALLERY_IMAGES;

  return source.slice(0, MAX_GALLERY_IMAGES).map(normalizeGalleryItem);
};

const MediaSlot = ({ label, value, onPick, onClear, aspect }) => (
  <Stack spacing={1} sx={{ flex: 1 }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>

    <Box
      sx={{
        position: 'relative',
        height: aspect,
        borderRadius: 1,
        border: (theme) => `1px dashed ${theme.palette.divider}`,
        bgcolor: 'background.neutral',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {value ? (
        <Box
          component="img"
          src={value}
          alt={label}
          sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : (
        <Typography variant="caption" color="text.disabled">
          None
        </Typography>
      )}
    </Box>

    <Stack direction="row" spacing={1}>
      <Button size="small" variant="outlined" onClick={onPick} sx={{ flex: 1 }}>
        {value ? 'Change' : 'Choose'}
      </Button>
      {value && (
        <Button size="small" color="error" onClick={onClear}>
          Clear
        </Button>
      )}
    </Stack>
  </Stack>
);

MediaSlot.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  onPick: PropTypes.func,
  onClear: PropTypes.func,
  aspect: PropTypes.number,
};

export default function SocialMediaSectionEditor({ section, onSave, onCancel }) {
  const pickerOpen = useBoolean();
  // Which slot the media picker is filling: { index, field: 'image' | 'logo' }
  const [pickerTarget, setPickerTarget] = useState(null);

  const methods = useForm({
    defaultValues: {
      name: section?.name || 'Social Media',
      type: 'social-media',
      content: {
        title: section?.content?.title || '@valiarianpremiumpolos',
        subtitle: section?.content?.subtitle || 'Stay connected with Valiarian',
        instagram: section?.content?.instagram || 'valiarian.wear',
        youtube: section?.content?.youtube || 'valiarianwear',
        galleryImages: buildInitialItems(section),
      },
      settings: {
        backgroundColor: section?.settings?.backgroundColor || '#f9fafb',
        logoOpacity:
          typeof section?.settings?.logoOpacity === 'number' ? section.settings.logoOpacity : 0.45,
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
  const galleryImages = values.content?.galleryImages || [];

  const updateItems = (nextItems) => {
    setValue('content.galleryImages', nextItems.slice(0, MAX_GALLERY_IMAGES), {
      shouldDirty: true,
    });
  };

  const addItem = () => {
    if (galleryImages.length >= MAX_GALLERY_IMAGES) {
      return;
    }

    updateItems([...galleryImages, { ...EMPTY_ITEM }]);
  };

  const removeItem = (index) => {
    updateItems(galleryImages.filter((_, i) => i !== index));
  };

  const moveItem = (index, offset) => {
    const target = index + offset;

    if (target < 0 || target >= galleryImages.length) {
      return;
    }

    const nextItems = [...galleryImages];
    [nextItems[index], nextItems[target]] = [nextItems[target], nextItems[index]];
    updateItems(nextItems);
  };

  const openPicker = (index, field) => {
    setPickerTarget({ index, field });
    pickerOpen.onTrue();
  };

  const clearField = (index, field) => {
    const nextItems = galleryImages.map((item, i) =>
      i === index ? { ...item, [field]: '' } : item
    );
    updateItems(nextItems);
  };

  const handleSelectMedia = (selectedMedia) => {
    const nextUrl = selectedMedia?.url || '';

    if (!nextUrl || !pickerTarget) {
      pickerOpen.onFalse();
      setPickerTarget(null);
      return;
    }

    const nextItems = galleryImages.map((item, i) =>
      i === pickerTarget.index ? { ...item, [pickerTarget.field]: nextUrl } : item
    );

    updateItems(nextItems);
    pickerOpen.onFalse();
    setPickerTarget(null);
  };

  const onSubmit = handleSubmit(async (data) => {
    const opacity = Number(data.settings?.logoOpacity);

    await onSave({
      ...data,
      content: {
        ...data.content,
        galleryImages: (data.content?.galleryImages || [])
          .map(normalizeGalleryItem)
          .filter((item) => item.image)
          .slice(0, MAX_GALLERY_IMAGES),
      },
      settings: {
        ...data.settings,
        logoOpacity: Number.isFinite(opacity) ? Math.min(Math.max(opacity, 0), 1) : 0.45,
      },
    });
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3} py={2}>
        <RHFTextField name="name" label="Section Name" />
        <RHFTextField name="content.title" label="Title" placeholder="@valiarianpremiumpolos" />
        <RHFTextField
          name="content.subtitle"
          label="Subtitle"
          placeholder="Stay connected with Valiarian"
          multiline
          rows={2}
        />

        <Typography variant="subtitle2" sx={{ mt: 2 }}>
          Social Media Handles
        </Typography>
        <RHFTextField
          name="content.instagram"
          label="Instagram Username"
          placeholder="valiarian.wear"
        />
        <RHFTextField
          name="content.youtube"
          label="YouTube Username"
          placeholder="valiarianwear"
        />

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">Social Gallery</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Iconify icon="solar:add-circle-bold" />}
                  onClick={addItem}
                  disabled={galleryImages.length >= MAX_GALLERY_IMAGES}
                >
                  Add Slot
                </Button>
              </Stack>

              <Alert severity="info">
                Slot 1 is the large tile on the left; slots 2&ndash;5 fill the grid on the right.
                The logo is shown faded in the centre of its image. Leave a link empty to fall back
                to the Instagram or YouTube handle above. Maximum {MAX_GALLERY_IMAGES} slots.
              </Alert>

              {galleryImages.map((item, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="subtitle2">
                          Slot {index + 1}
                          {index === 0 ? ' (large tile)' : ''}
                        </Typography>

                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Move up">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => moveItem(index, -1)}
                                disabled={index === 0}
                              >
                                <Iconify icon="eva:arrow-upward-fill" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Move down">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => moveItem(index, 1)}
                                disabled={index === galleryImages.length - 1}
                              >
                                <Iconify icon="eva:arrow-downward-fill" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Remove slot">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeItem(index)}
                            >
                              <Iconify icon="solar:trash-bin-trash-bold" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>

                      <Divider />

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <MediaSlot
                          label="Image"
                          value={item.image}
                          aspect={140}
                          onPick={() => openPicker(index, 'image')}
                          onClear={() => clearField(index, 'image')}
                        />
                        <MediaSlot
                          label="Logo (centred, faded)"
                          value={item.logo}
                          aspect={140}
                          onPick={() => openPicker(index, 'logo')}
                          onClear={() => clearField(index, 'logo')}
                        />
                      </Stack>

                      <RHFTextField
                        name={`content.galleryImages.${index}.link`}
                        label="Link"
                        placeholder="https://www.instagram.com/p/..."
                      />
                    </Stack>
                  </CardContent>
                </Card>
              ))}

              {galleryImages.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No gallery slots added yet.
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        <RHFTextField
          name="settings.logoOpacity"
          label="Logo Opacity"
          type="number"
          inputProps={{ min: 0, max: 1, step: 0.05 }}
          helperText="0 = invisible, 1 = solid. Default 0.45."
        />

        <RHFTextField
          name="settings.backgroundColor"
          label="Background Color"
          placeholder="#f9fafb"
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

      <CMSMediaPicker
        open={pickerOpen.value}
        onClose={() => {
          pickerOpen.onFalse();
          setPickerTarget(null);
        }}
        onSelect={handleSelectMedia}
        multiple={false}
        selectedMedia={[]}
        accept={{
          'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
        }}
      />
    </FormProvider>
  );
}

SocialMediaSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
