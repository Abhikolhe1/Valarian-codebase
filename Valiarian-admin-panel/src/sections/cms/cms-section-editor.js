import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
// @mui
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// utils
import axiosInstance, { endpoints } from 'src/utils/axios';
// components
import Iconify from 'src/components/iconify';
import { useSnackbar } from 'src/components/snackbar';
import { useSWRConfig } from 'swr';
//
import CTASectionEditor from './section-editors/cta-section-editor';
import FeaturesSectionEditor from './section-editors/features-section-editor';
import GallerySectionEditor from './section-editors/gallery-section-editor';
import HeroSectionEditor from './section-editors/hero-section-editor';
import TestimonialsSectionEditor from './section-editors/testimonials-section-editor';
import TextSectionEditor from './section-editors/text-section-editor';
// New section editors
import BestSellersSectionEditor from './section-editors/best-sellers-section-editor';
import CollectionHeroSectionEditor from './section-editors/collection-hero-section-editor';
import FabricInfoSectionEditor from './section-editors/fabric-info-section-editor';
import NewArrivalsSectionEditor from './section-editors/new-arrivals-section-editor';
import ScrollAnimatedSectionEditor from './section-editors/scroll-animated-section-editor';
import SocialMediaSectionEditor from './section-editors/social-media-section-editor';
import PremiumConfidenceSectionEditor from './premium-section-editors/premium-confidence-section-editor';
import PremiumCountdownSectionEditor from './premium-section-editors/premium-countdown-section-editor';
import PremiumFabricDetailsSectionEditor from './premium-section-editors/premium-fabric-details-section-editor';
import PremiumFeatureGridSectionEditor from './premium-section-editors/premium-feature-grid-section-editor';
import PremiumHeroSectionEditor from './premium-section-editors/premium-hero-section-editor';
import PremiumProductShowcaseSectionEditor from './premium-section-editors/premium-product-showcase-section-editor';
import PremiumReserveCtaSectionEditor from './premium-section-editors/premium-reserve-cta-section-editor';
import PremiumStatementSectionEditor from './premium-section-editors/premium-statement-section-editor';

// ----------------------------------------------------------------------

const SECTION_EDITORS = {
  'premium-hero': PremiumHeroSectionEditor,
  'premium-product-showcase': PremiumProductShowcaseSectionEditor,
  'premium-fabric-details': PremiumFabricDetailsSectionEditor,
  'premium-statement': PremiumStatementSectionEditor,
  'premium-feature-grid': PremiumFeatureGridSectionEditor,
  'premium-confidence': PremiumConfidenceSectionEditor,
  'premium-reserve-cta': PremiumReserveCtaSectionEditor,
  'premium-countdown': PremiumCountdownSectionEditor,
  hero: HeroSectionEditor,
  'scroll-animated': ScrollAnimatedSectionEditor,
  'new-arrivals': NewArrivalsSectionEditor,
  'collection-hero': CollectionHeroSectionEditor,
  'best-sellers': BestSellersSectionEditor,
  'fabric-info': FabricInfoSectionEditor,
  'social-media': SocialMediaSectionEditor,
  features: FeaturesSectionEditor,
  testimonials: TestimonialsSectionEditor,
  gallery: GallerySectionEditor,
  cta: CTASectionEditor,
  text: TextSectionEditor,
  custom: TextSectionEditor, // Use text editor for custom sections
};

const SECTION_TITLES = {
  'premium-hero': 'Premium Hero Section',
  'premium-product-showcase': 'Premium Product Showcase Section',
  'premium-fabric-details': 'Premium Fabric Details Section',
  'premium-statement': 'Premium Statement Section',
  'premium-feature-grid': 'Premium Feature Grid Section',
  'premium-confidence': 'Premium Confidence Section',
  'premium-reserve-cta': 'Premium Reserve CTA Section',
  'premium-countdown': 'Premium Countdown Section',
  hero: 'Hero Section',
  'scroll-animated': 'Scroll Animated Section',
  'new-arrivals': 'New Arrivals Section',
  'collection-hero': 'Collection Hero Section',
  'best-sellers': 'Best Sellers Section',
  'fabric-info': 'Fabric Information Section',
  'social-media': 'Social Media Section',
  features: 'Features Section',
  testimonials: 'Testimonials Section',
  gallery: 'Gallery Section',
  cta: 'Call to Action Section',
  text: 'Text Section',
  custom: 'Custom Section',
};

// ----------------------------------------------------------------------

export default function CMSSectionEditor({ open, onClose, section, sectionType, template, pageId, onSave }) {
  const { enqueueSnackbar } = useSnackbar();
  const { mutate } = useSWRConfig();
  const [isSaving, setIsSaving] = useState(false);

  const type = section?.type || sectionType;
  const EditorComponent = SECTION_EDITORS[type];

  // Determine title based on context
  let title = `Create ${SECTION_TITLES[type] || 'Section'}`;
  if (section) {
    title = `Edit ${SECTION_TITLES[type] || 'Section'}`;
  } else if (template) {
    title = `Create from Template: ${template.name}`;
  }

  const handleSave = useCallback(
    async (sectionData) => {
      try {
        setIsSaving(true);

        const payload = section
          ? sectionData
          : {
            ...sectionData,
            pageId,
            enabled: true,
          };

        let savedSection;
        if (section) {
          const response = await axiosInstance.patch(endpoints.cms.sections.details(section.id), payload);
          savedSection = response.data;
        } else {
          const response = await axiosInstance.post(endpoints.cms.sections.list, payload);
          savedSection = response.data;
        }

        // Revalidate sections cache to refresh the list
        await mutate(
          (key) => Array.isArray(key) && key[0] === endpoints.cms.sections.list,
          undefined,
          { revalidate: true }
        );

        enqueueSnackbar(
          section ? 'Section updated successfully!' : 'Section created successfully!',
          { variant: 'success' }
        );

        if (onSave) {
          onSave(savedSection);
        }

        onClose();
      } catch (error) {
        console.error('Error saving section:', error);
        enqueueSnackbar('Failed to save section', { variant: 'error' });
      } finally {
        setIsSaving(false);
      }
    },
    [section, pageId, onSave, onClose, enqueueSnackbar, mutate]
  );

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!EditorComponent) {
    return null;
  }

  // Merge template default content with section data if template is provided
  const initialSection = template
    ? {
      ...section,
      type: template.type,
      content: template.defaultContent,
    }
    : section;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={onClose} disabled={isSaving}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <EditorComponent section={initialSection} onSave={handleSave} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
}

CMSSectionEditor.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  section: PropTypes.object,
  sectionType: PropTypes.string,
  template: PropTypes.shape({
    name: PropTypes.string,
    type: PropTypes.string,
    defaultContent: PropTypes.object,
  }),
  pageId: PropTypes.string,
  onSave: PropTypes.func,
};
