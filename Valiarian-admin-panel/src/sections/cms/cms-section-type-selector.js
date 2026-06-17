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
    type: 'premium-hero',
    label: 'Premium Hero',
    description: 'Signature hero for the premium page with background media and primary CTA',
    icon: 'solar:crown-bold',
    color: 'secondary',
    preview: '/assets/illustrations/section-hero.svg',
  },
  {
    type: 'premium-product-showcase',
    label: 'Premium Product Showcase',
    description: 'Displays the linked premium product gallery and images below the hero',
    icon: 'solar:gallery-wide-bold',
    color: 'primary',
    preview: '/assets/illustrations/section-gallery.svg',
  },
  {
    type: 'premium-fabric-details',
    label: 'Premium Fabric Details',
    description: 'Scrollable fabric story cards with specs like weight, weave, and feel',
    icon: 'solar:t-shirt-bold',
    color: 'primary',
    preview: '/assets/illustrations/section-fabric.svg',
  },
  {
    type: 'premium-statement',
    label: 'Premium Statement',
    description: 'Two-line luxury statement block between premium sections',
    icon: 'solar:quote-up-bold',
    color: 'warning',
    preview: '/assets/illustrations/section-text.svg',
  },
  {
    type: 'premium-feature-grid',
    label: 'Premium Feature Grid',
    description: 'Background image section with premium feature cards',
    icon: 'solar:widget-bold',
    color: 'info',
    preview: '/assets/illustrations/section-features.svg',
  },
  {
    type: 'premium-confidence',
    label: 'Premium Confidence',
    description: 'Trust-building cards for payments, quality, packaging, and service',
    icon: 'solar:shield-check-bold',
    color: 'success',
    preview: '/assets/illustrations/section-features.svg',
  },
  {
    type: 'premium-reserve-cta',
    label: 'Premium Reserve CTA',
    description: 'Final reserve section with urgency copy and buy-now button',
    icon: 'solar:cart-large-2-bold',
    color: 'error',
    preview: '/assets/illustrations/section-cta.svg',
  },
  {
    type: 'premium-countdown',
    label: 'Premium Countdown',
    description: 'Luxury ecommerce hero with inventory, sizes, and live countdown',
    icon: 'solar:clock-circle-bold',
    color: 'warning',
    preview: '/assets/illustrations/section-hero.svg',
  },
  {
    type: 'hero',
    label: 'Hero Section',
    description: 'Large banner with background image/video, heading, and CTA buttons',
    icon: 'solar:star-bold',
    color: 'primary',
    preview: '/assets/illustrations/section-hero.svg',
  },
  {
    type: 'scroll-animated',
    label: 'Scroll Animated',
    description: 'Animated product showcase that changes on scroll',
    icon: 'solar:mouse-minimalistic-bold',
    color: 'info',
    preview: '/assets/illustrations/section-scroll.svg',
  },
  {
    type: 'new-arrivals',
    label: 'New Arrivals',
    description: 'Showcase latest products in a carousel',
    icon: 'solar:bag-bold',
    color: 'success',
    preview: '/assets/illustrations/section-products.svg',
  },
  {
    type: 'collection-hero',
    label: 'Collection Hero',
    description: 'Featured collection banner with image',
    icon: 'solar:gallery-bold',
    color: 'warning',
    preview: '/assets/illustrations/section-collection.svg',
  },
  {
    type: 'best-sellers',
    label: 'Best Sellers',
    description: 'Display most popular products',
    icon: 'solar:fire-bold',
    color: 'error',
    preview: '/assets/illustrations/section-bestsellers.svg',
  },
  {
    type: 'fabric-info',
    label: 'Fabric Information',
    description: 'Showcase fabric quality and features',
    icon: 'solar:t-shirt-bold',
    color: 'primary',
    preview: '/assets/illustrations/section-fabric.svg',
  },
  {
    type: 'social-media',
    label: 'Social Media',
    description: 'Social media links and feed',
    icon: 'solar:share-bold',
    color: 'info',
    preview: '/assets/illustrations/section-social.svg',
  },
  {
    type: 'features',
    label: 'Features Section',
    description: 'Showcase product features with icons, titles, and descriptions',
    icon: 'solar:widget-bold',
    color: 'success',
    preview: '/assets/illustrations/section-features.svg',
  },
  {
    type: 'testimonials',
    label: 'Testimonials Section',
    description: 'Display customer reviews and ratings',
    icon: 'solar:chat-round-like-bold',
    color: 'warning',
    preview: '/assets/illustrations/section-testimonials.svg',
  },
  {
    type: 'gallery',
    label: 'Gallery Section',
    description: 'Image gallery with multiple layout options',
    icon: 'solar:gallery-bold',
    color: 'error',
    preview: '/assets/illustrations/section-gallery.svg',
  },
  {
    type: 'cta',
    label: 'Call to Action',
    description: 'Prominent call-to-action with buttons and background',
    icon: 'solar:hand-shake-bold',
    color: 'primary',
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
  {
    type: 'custom',
    label: 'Custom Section',
    description: 'Create a custom section with your own content',
    icon: 'solar:code-bold',
    color: 'default',
    preview: '/assets/illustrations/section-custom.svg',
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
