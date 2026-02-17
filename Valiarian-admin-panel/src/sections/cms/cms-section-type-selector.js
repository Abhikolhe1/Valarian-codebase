import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// components
import { Divider } from '@mui/material';
import { useState } from 'react';
import Iconify from 'src/components/iconify';
import CMSTemplateLibraryDialog from './cms-template-library-dialog';
//

// ----------------------------------------------------------------------

const SECTION_TYPES = [
  {
    type: 'hero',
    label: 'Hero Section',
    description: 'Large banner with background image/video, heading, and CTA buttons',
    icon: 'solar:star-bold',
    color: 'primary',
    preview: '/assets/illustrations/section-hero.svg',
  },
  {
    type: 'features',
    label: 'Features Section',
    description: 'Showcase product features with icons, titles, and descriptions',
    icon: 'solar:widget-bold',
    color: 'info',
    preview: '/assets/illustrations/section-features.svg',
  },
  {
    type: 'testimonials',
    label: 'Testimonials Section',
    description: 'Display customer reviews and ratings',
    icon: 'solar:chat-round-like-bold',
    color: 'success',
    preview: '/assets/illustrations/section-testimonials.svg',
  },
  {
    type: 'gallery',
    label: 'Gallery Section',
    description: 'Image gallery with multiple layout options',
    icon: 'solar:gallery-bold',
    color: 'warning',
    preview: '/assets/illustrations/section-gallery.svg',
  },
  {
    type: 'cta',
    label: 'Call to Action',
    description: 'Prominent call-to-action with buttons and background',
    icon: 'solar:hand-shake-bold',
    color: 'error',
    preview: '/assets/illustrations/section-cta.svg',
  },
  {
    type: 'text',
    label: 'Text Section',
    description: 'Rich text content with formatting options',
    icon: 'solar:text-bold',
    color: 'default',
    preview: '/assets/illustrations/section-text.svg',
  },
];

// ----------------------------------------------------------------------

export default function CMSSectionTypeSelector({ open, onClose, onSelect }) {
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false);

  const handleSelectType = (type) => {
    onSelect(type);
    onClose();
  };

  const handleOpenTemplateLibrary = () => {
    setTemplateLibraryOpen(true);
  };

  const handleCloseTemplateLibrary = () => {
    setTemplateLibraryOpen(false);
  };

  const handleSelectTemplate = (template) => {
    // Pass template data to parent
    onSelect(template.type, template);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Choose Section Type</Typography>
            <IconButton onClick={onClose}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select a section type to add to your page
          </Typography>

          {/* Template Library Button */}
          <Card
            sx={{
              mb: 3,
              bgcolor: 'primary.lighter',
              border: (theme) => `2px dashed ${theme.palette.primary.main}`,
            }}
          >
            <CardActionArea onClick={handleOpenTemplateLibrary}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 1,
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Iconify icon="solar:library-bold" width={32} sx={{ color: 'white' }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Browse Template Library
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Choose from pre-built templates to quickly add sections
                    </Typography>
                  </Box>
                  <Iconify icon="solar:alt-arrow-right-bold" width={24} />
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>

          <Divider sx={{ mb: 3 }}>
            <Typography variant="caption" color="text.secondary">
              OR START FROM SCRATCH
            </Typography>
          </Divider>

          <Grid container spacing={2}>
            {SECTION_TYPES.map((section) => (
              <Grid item xs={12} sm={6} md={4} key={section.type}>
                <Card
                  sx={{
                    height: '100%',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 8,
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardActionArea onClick={() => handleSelectType(section.type)}>
                    <Box
                      sx={{
                        height: 120,
                        bgcolor: `${section.color}.lighter`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <Iconify
                        icon={section.icon}
                        width={64}
                        sx={{
                          color: `${section.color}.main`,
                          opacity: 0.8,
                        }}
                      />
                    </Box>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        {section.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {section.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 3, textAlign: 'right' }}>
            <Button onClick={onClose} color="inherit">
              Cancel
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <CMSTemplateLibraryDialog
        open={templateLibraryOpen}
        onClose={handleCloseTemplateLibrary}
        onSelect={handleSelectTemplate}
      />
    </>
  );
}

CMSSectionTypeSelector.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSelect: PropTypes.func,
};
