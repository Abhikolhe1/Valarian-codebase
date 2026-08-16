import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import PropTypes from 'prop-types';
import { useCallback } from 'react';
// @mui
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// components
import Iconify from 'src/components/iconify';
import Image from 'src/components/image';
//
import CMSMediaPicker from './cms-media-picker';

// ----------------------------------------------------------------------

export default function CMSMediaPickerField({
  label,
  value,
  onChange,
  multiple = false,
  helperText,
  error,
  accept,
  compact = true,
  maxSize,
}) {
  const pickerOpen = useBoolean();

  const handleSelect = useCallback(
    (selectedMedia) => {
      if (multiple) {
        // Append newly picked media to whatever is already selected instead
        // of replacing it, so re-opening the picker to add more images
        // doesn't wipe out the ones already added.
        const existing = Array.isArray(value) ? value : [];
        const newUrls = selectedMedia.map((item) => item.url);
        const merged = [...existing, ...newUrls.filter((url) => !existing.includes(url))];
        onChange(merged);
      } else {
        // For single selection, return media URL
        onChange(selectedMedia?.url || '');
      }
    },
    [multiple, value, onChange]
  );

  const handleReorder = useCallback(
    (result) => {
      if (!result.destination || !Array.isArray(value)) return;

      const items = Array.from(value);
      const [reordered] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reordered);
      onChange(items);
    },
    [value, onChange]
  );

  const handleRemove = useCallback(
    (index) => {
      if (multiple && Array.isArray(value)) {
        const updated = [...value];
        updated.splice(index, 1);
        onChange(updated);
      } else {
        onChange('');
      }
    },
    [multiple, value, onChange]
  );

  const renderSingleValue = () => {
    const isImage = value?.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i);
    const isVideo = value?.match(/\.(mp4|webm)$/i);
    const fileName = value ? decodeURIComponent(value.split('/').pop()?.split('?')[0] || '') : '';

    if (compact) {
      return (
        <Box
          sx={{
            borderRadius: 1,
            border: (theme) => `1px solid ${error ? theme.palette.error.main : theme.palette.divider}`,
            bgcolor: 'background.paper',
            px: 2,
            py: 1.5,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                bgcolor: 'background.neutral',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {isImage && (
                <Box
                  component="img"
                  src={value}
                  alt={fileName}
                  sx={{ width: 1, height: 1, objectFit: 'cover' }}
                />
              )}

              {isVideo && (
                <Box
                  component="video"
                  src={value}
                  muted
                  preload="metadata"
                  sx={{ width: 1, height: 1, objectFit: 'cover' }}
                />
              )}

              {!isImage && !isVideo && (
                <Iconify icon={value ? 'solar:file-text-bold' : 'solar:gallery-add-bold-duotone'} width={22} />
              )}
            </Box>

            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {fileName || 'No file selected'}
              </Typography>
              {helperText && (
                <Typography variant="caption" color={error ? 'error.main' : 'text.secondary'}>
                  {helperText}
                </Typography>
              )}
            </Box>

            <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
              <IconButton size="small" onClick={pickerOpen.onTrue}>
                <Iconify icon={value ? 'solar:pen-bold' : 'solar:gallery-add-bold-duotone'} width={18} />
              </IconButton>

              {value && (
                <IconButton
                  size="small"
                  component="a"
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Iconify icon="solar:eye-bold" width={18} />
                </IconButton>
              )}

              {value && (
                <IconButton size="small" color="error" onClick={() => handleRemove()}>
                  <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                </IconButton>
              )}
            </Stack>
          </Stack>
        </Box>
      );
    }

    if (!value) {
      return (
        <Box
          onClick={pickerOpen.onTrue}
          sx={{
            position: 'relative',
            paddingTop: '56.25%', // 16:9 aspect ratio
            borderRadius: 1,
            border: (theme) => `1px dashed ${alpha(theme.palette.grey[500], 0.32)}`,
            bgcolor: 'background.neutral',
            cursor: 'pointer',
            transition: (theme) => theme.transitions.create(['border-color']),
            '&:hover': {
              borderColor: 'primary.main',
            },
            ...(error && {
              borderColor: 'error.main',
            }),
          }}
        >
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={1}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
          >
            <Iconify icon="solar:gallery-add-bold-duotone" width={48} sx={{ color: 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary">
              Click to select media
            </Typography>
          </Stack>
        </Box>
      );
    }

    return (
      <Card
        sx={{
          position: 'relative',
          '&:hover .actions': {
            opacity: 1,
          },
        }}
      >
        {isImage && (
          <Image
            src={value}
            alt="Selected media"
            ratio="16/9"
            sx={{ borderRadius: 1 }}
          />
        )}

        {isVideo && (
          <Box
            component="video"
            src={value}
            sx={{
              width: '100%',
              borderRadius: 1,
              bgcolor: 'background.neutral',
            }}
          />
        )}

        {!isImage && !isVideo && (
          <Box
            sx={{
              position: 'relative',
              paddingTop: '56.25%',
              borderRadius: 1,
              bgcolor: 'background.neutral',
            }}
          >
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            >
              <Iconify icon="solar:file-bold-duotone" width={48} sx={{ color: 'text.disabled' }} />
            </Stack>
          </Box>
        )}

        <Stack
          className="actions"
          direction="row"
          spacing={1}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
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
            <Iconify icon="solar:pen-bold" width={18} />
          </IconButton>

          <IconButton
            size="small"
            onClick={() => handleRemove()}
            sx={{
              bgcolor: (theme) => alpha(theme.palette.grey[900], 0.72),
              color: 'common.white',
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.grey[900], 0.88),
              },
            }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
          </IconButton>
        </Stack>
      </Card>
    );
  };

  const renderMultipleValues = () => {
    const values = Array.isArray(value) ? value : [];

    return (
      <Stack spacing={2}>
        <DragDropContext onDragEnd={handleReorder}>
          <Droppable droppableId="additional-images" direction="horizontal">
            {(droppableProvided) => (
              <Stack
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
                direction="row"
                spacing={2}
                flexWrap="wrap"
                useFlexGap
              >
                {values.map((item, index) => {
                  const isImage = item.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
                  const isVideo = item.match(/\.(mp4|webm)$/i);

                  return (
                    <Draggable key={item} draggableId={item} index={index}>
                      {(draggableProvided, draggableSnapshot) => (
                        <Card
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          {...draggableProvided.dragHandleProps}
                          sx={{
                            position: 'relative',
                            width: 120,
                            cursor: 'grab',
                            '&:active': {
                              cursor: 'grabbing',
                            },
                            '&:hover .actions': {
                              opacity: 1,
                            },
                            ...(draggableSnapshot.isDragging && {
                              boxShadow: (theme) => theme.customShadows.z20,
                              border: (theme) => `2px solid ${theme.palette.primary.main}`,
                            }),
                          }}
                        >
                          {isImage && (
                            <Image
                              src={item}
                              alt={`Media ${index + 1}`}
                              ratio="1/1"
                              sx={{ borderRadius: 1 }}
                            />
                          )}

                          {isVideo && (
                            <Box
                              component="video"
                              src={item}
                              sx={{
                                width: '100%',
                                aspectRatio: '1/1',
                                objectFit: 'cover',
                                borderRadius: 1,
                                bgcolor: 'background.neutral',
                              }}
                            />
                          )}

                          {!isImage && !isVideo && (
                            <Box
                              sx={{
                                position: 'relative',
                                paddingTop: '100%',
                                borderRadius: 1,
                                bgcolor: 'background.neutral',
                              }}
                            >
                              <Iconify
                                icon="solar:file-bold-duotone"
                                width={32}
                                sx={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  color: 'text.disabled',
                                }}
                              />
                            </Box>
                          )}

                          {/* Drag Handle Icon */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 4,
                              left: 4,
                              zIndex: 9,
                              color: 'common.white',
                              bgcolor: (theme) => alpha(theme.palette.grey[900], 0.48),
                              borderRadius: 0.5,
                              p: 0.25,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Iconify icon="nimbus:drag-dots" width={14} />
                          </Box>

                          {/* Order Badge */}
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 4,
                              left: 4,
                              zIndex: 9,
                              color: 'common.white',
                              bgcolor: (theme) => alpha(theme.palette.grey[900], 0.72),
                              borderRadius: 0.5,
                              px: 0.75,
                              py: 0.25,
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          >
                            {index + 1}
                          </Box>

                          <IconButton
                            className="actions"
                            size="small"
                            onClick={() => handleRemove(index)}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              opacity: 0,
                              transition: (theme) => theme.transitions.create(['opacity']),
                              bgcolor: (theme) => alpha(theme.palette.grey[900], 0.72),
                              color: 'common.white',
                              '&:hover': {
                                bgcolor: (theme) => alpha(theme.palette.grey[900], 0.88),
                              },
                            }}
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                          </IconButton>
                        </Card>
                      )}
                    </Draggable>
                  );
                })}

                {droppableProvided.placeholder}

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
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: (theme) => theme.transitions.create(['border-color']),
                    '&:hover': {
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <Iconify icon="eva:plus-fill" width={32} sx={{ color: 'text.disabled' }} />
                </Box>
              </Stack>
            )}
          </Droppable>
        </DragDropContext>
      </Stack>
    );
  };

  return (
    <Stack spacing={1}>
      {label && (
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {label}
        </Typography>
      )}

      {multiple ? renderMultipleValues() : renderSingleValue()}

      {helperText && (
        <Typography
          variant="caption"
          sx={{
            color: error ? 'error.main' : 'text.secondary',
          }}
        >
          {helperText}
        </Typography>
      )}

      <CMSMediaPicker
        open={pickerOpen.value}
        onClose={pickerOpen.onFalse}
        onSelect={handleSelect}
        multiple={multiple}
        selectedMedia={[]}
        accept={accept}
        maxSize={maxSize}
      />
    </Stack>
  );
}

CMSMediaPickerField.propTypes = {
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  onChange: PropTypes.func.isRequired,
  multiple: PropTypes.bool,
  helperText: PropTypes.string,
  error: PropTypes.bool,
  maxSize: PropTypes.number,
  accept: PropTypes.object,
  compact: PropTypes.bool,
};
