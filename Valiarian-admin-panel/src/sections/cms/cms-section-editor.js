import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
// @mui
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// components
import Iconify from 'src/components/iconify';
import { useSnackbar } from 'src/components/snackbar';
//
import CTASectionEditor from './section-editors/cta-section-editor';
import FeaturesSectionEditor from './section-editors/features-section-editor';
import GallerySectionEditor from './section-editors/gallery-section-editor';
import HeroSectionEditor from './section-editors/hero-section-editor';
import TestimonialsSectionEditor from './section-editors/testimonials-section-editor';
import TextSectionEditor from './section-editors/text-section-editor';

// ----------------------------------------------------------------------

const SECTION_EDITORS = {
  hero: HeroSectionEditor,
  features: FeaturesSectionEditor,
  testimonials: TestimonialsSectionEditor,
  gallery: GallerySectionEditor,
  cta: CTASectionEditor,
  text: TextSectionEditor,
};

const SECTION_TITLES = {
  hero: 'Hero Section',
  features: 'Features Section',
  testimonials: 'Testimonials Section',
  gallery: 'Gallery Section',
  cta: 'Call to Action Section',
  text: 'Text Section',
};

// ----------------------------------------------------------------------

export default function CMSSectionEditor({ open, onClose, section, sectionType, pageId, onSave }) {
  const { enqueueSnackbar } = useSnackbar();
  const [isSaving, setIsSaving] = useState(false);

  const type = section?.type || sectionType;
  const EditorComponent = SECTION_EDITORS[type];
  const title = section
    ? `Edit ${SECTION_TITLES[type] || 'Section'}`
    : `Create ${SECTION_TITLES[type] || 'Section'}`;

  const handleSave = useCallback(
    async (sectionData) => {
      try {
        setIsSaving(true);

        const url = section
          ? `http://localhost:3035/api/cms/sections/${section.id}`
          : 'http://localhost:3035/api/cms/sections';

        const method = section ? 'PATCH' : 'POST';

        const payload = section
          ? sectionData
          : {
            ...sectionData,
            pageId,
            enabled: true,
          };

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Failed to save section');
        }

        const savedSection = await response.json();

        enqueueSnackbar(section ? 'Section updated successfully!' : 'Section created successfully!');

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
    [section, pageId, onSave, onClose, enqueueSnackbar]
  );

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!EditorComponent) {
    return null;
  }

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
        <EditorComponent section={section} onSave={handleSave} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
}

CMSSectionEditor.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  section: PropTypes.object,
  sectionType: PropTypes.string,
  pageId: PropTypes.string,
  onSave: PropTypes.func,
};
