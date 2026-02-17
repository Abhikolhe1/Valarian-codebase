import PropTypes from 'prop-types';
import { useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
// components
import Iconify from 'src/components/iconify';
import Image from 'src/components/image';

// ----------------------------------------------------------------------

export default function CMSMediaCard({ media, selected, onSelect, onDelete, onEdit, onPreview }) {
  const [showActions, setShowActions] = useState(false);

  const isImage = media.mimeType.startsWith('image/');
  const isVideo = media.mimeType.startsWith('video/');

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
  };

  const renderPreview = () => {
    if (isImage) {
      return (
        <Image
          src={media.thumbnailUrl || media.url}
          alt={media.altText || media.originalName}
          ratio="1/1"
          sx={{
            borderRadius: 1,
            objectFit: 'cover',
          }}
        />
      );
    }

    if (isVideo) {
      return (
        <Box
          sx={{
            position: 'relative',
            paddingTop: '100%',
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: 'background.neutral',
          }}
        >
          <Box
            component="video"
            src={media.url}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'common.white',
              bgcolor: (theme) => alpha(theme.palette.grey[900], 0.72),
              borderRadius: '50%',
              p: 1,
            }}
          >
            <Iconify icon="solar:play-bold" width={32} />
          </Box>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          position: 'relative',
          paddingTop: '100%',
          borderRadius: 1,
          bgcolor: 'background.neutral',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Iconify
          icon="solar:file-bold-duotone"
          width={64}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'text.disabled',
          }}
        />
      </Box>
    );
  };

  return (
    <Card
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      sx={{
        position: 'relative',
        cursor: 'pointer',
        transition: (theme) => theme.transitions.create(['box-shadow']),
        '&:hover': {
          boxShadow: (theme) => theme.customShadows.z20,
        },
        ...(selected && {
          boxShadow: (theme) => theme.customShadows.z20,
          outline: (theme) => `2px solid ${theme.palette.primary.main}`,
        }),
      }}
    >
      {/* Checkbox */}
      <Checkbox
        checked={selected}
        onChange={onSelect}
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 9,
          opacity: selected || showActions ? 1 : 0,
          transition: (theme) => theme.transitions.create(['opacity']),
        }}
      />

      {/* Actions */}
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 9,
          opacity: showActions ? 1 : 0,
          transition: (theme) => theme.transitions.create(['opacity']),
        }}
      >
        <Tooltip title="Edit">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
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
        </Tooltip>

        <Tooltip title="Delete">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
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
        </Tooltip>
      </Stack>

      {/* Preview */}
      <Box onClick={onPreview} sx={{ cursor: 'pointer' }}>{renderPreview()}</Box>

      {/* Info */}
      <Stack spacing={0.5} sx={{ p: 2 }}>
        <Tooltip title={media.originalName}>
          <Typography variant="subtitle2" noWrap>
            {media.originalName}
          </Typography>
        </Tooltip>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="caption" color="text.secondary">
            {formatFileSize(media.size)}
          </Typography>

          {isImage && media.width && media.height && (
            <>
              <Box
                sx={{
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  bgcolor: 'text.disabled',
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {media.width} × {media.height}
              </Typography>
            </>
          )}
        </Stack>

        {media.mimeType && (
          <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase' }}>
            {media.mimeType.split('/')[1]}
          </Typography>
        )}
      </Stack>
    </Card>
  );
}

CMSMediaCard.propTypes = {
  media: PropTypes.object.isRequired,
  selected: PropTypes.bool,
  onSelect: PropTypes.func,
  onDelete: PropTypes.func,
  onEdit: PropTypes.func,
  onPreview: PropTypes.func,
};
