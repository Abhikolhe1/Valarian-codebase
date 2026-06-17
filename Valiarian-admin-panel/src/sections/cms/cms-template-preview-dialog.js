import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// components
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const SECTION_TYPE_LABELS = {
  hero: 'Hero',
  features: 'Features',
  testimonials: 'Testimonials',
  gallery: 'Gallery',
  cta: 'Call to Action',
  text: 'Text',
  video: 'Video',
  faq: 'FAQ',
  team: 'Team',
  pricing: 'Pricing',
  contact: 'Contact',
  custom: 'Custom',
};

const SECTION_TYPE_COLORS = {
  hero: 'primary',
  features: 'info',
  testimonials: 'success',
  gallery: 'warning',
  cta: 'error',
  text: 'default',
  video: 'secondary',
  faq: 'info',
  team: 'success',
  pricing: 'warning',
  contact: 'primary',
  custom: 'default',
};

// ----------------------------------------------------------------------

export default function CMSTemplatePreviewDialog({ open, onClose, template, onUse }) {
  if (!template) return null;

  const renderContentPreview = () => {
    if (!template.defaultContent) {
      return (
        <Typography variant="body2" color="text.secondary">
          No preview available
        </Typography>
      );
    }

    return (
      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.neutral' }}>
        <pre
          style={{
            margin: 0,
            fontSize: '0.75rem',
            overflow: 'auto',
            maxHeight: '300px',
          }}
        >
          {JSON.stringify(template.defaultContent, null, 2)}
        </pre>
      </Paper>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h6">Template Preview</Typography>
            <Chip
              label={SECTION_TYPE_LABELS[template.type]}
              size="small"
              color={SECTION_TYPE_COLORS[template.type]}
            />
          </Stack>
          <IconButton onClick={onClose}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent>
        <Scrollbar>
          <Stack spacing={3}>
            {/* Template Info */}
            <Box>
              <Typography variant="h6" gutterBottom>
                {template.name}
              </Typography>
              {template.description && (
                <Typography variant="body2" color="text.secondary">
                  {template.description}
                </Typography>
              )}
            </Box>

            {/* Thumbnail Preview */}
            {template.thumbnail && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Preview Image
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    component="img"
                    src={template.thumbnail}
                    alt={template.name}
                    sx={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: 300,
                      objectFit: 'cover',
                      borderRadius: 1,
                    }}
                  />
                </Paper>
              </Box>
            )}

            {/* Default Content */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Default Content Structure
              </Typography>
              {renderContentPreview()}
            </Box>

            {/* Template Metadata */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Template Information
              </Typography>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Type:
                  </Typography>
                  <Typography variant="body2">{SECTION_TYPE_LABELS[template.type]}</Typography>
                </Stack>
                {template.createdAt && (
                  <Stack direction="row" spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      Created:
                    </Typography>
                    <Typography variant="body2">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Box>
          </Stack>
        </Scrollbar>
      </DialogContent>

      <Divider />

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => onUse(template)}
          startIcon={<Iconify icon="solar:add-circle-bold" />}
        >
          Use This Template
        </Button>
      </DialogActions>
    </Dialog>
  );
}

CMSTemplatePreviewDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  template: PropTypes.object,
  onUse: PropTypes.func,
};
