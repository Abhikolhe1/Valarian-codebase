import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
// components
import EmptyContent from 'src/components/empty-content';
import Iconify from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { useSnackbar } from 'src/components/snackbar';
//
import CMSTemplatePreviewDialog from './cms-template-preview-dialog';

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

const SECTION_TYPE_ICONS = {
  hero: 'solar:star-bold',
  features: 'solar:widget-bold',
  testimonials: 'solar:chat-round-like-bold',
  gallery: 'solar:gallery-bold',
  cta: 'solar:hand-shake-bold',
  text: 'solar:text-bold',
  video: 'solar:videocamera-bold',
  faq: 'solar:question-circle-bold',
  team: 'solar:users-group-rounded-bold',
  pricing: 'solar:tag-price-bold',
  contact: 'solar:phone-bold',
  custom: 'solar:settings-bold',
};

// ----------------------------------------------------------------------

export default function CMSTemplateLibraryDialog({ open, onClose, onSelect }) {
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [groupedTemplates, setGroupedTemplates] = useState({});
  const [currentTab, setCurrentTab] = useState('all');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3035/api/cms/templates?grouped=true');

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setGroupedTemplates(data);

      // Flatten for 'all' tab
      const allTemplates = Object.values(data).flat();
      setTemplates(allTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      enqueueSnackbar('Failed to load templates', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open, fetchTemplates]);

  const handleTabChange = useCallback((event, newValue) => {
    setCurrentTab(newValue);
  }, []);

  const handleSelectTemplate = useCallback(
    (template) => {
      onSelect(template);
      onClose();
    },
    [onSelect, onClose]
  );

  const handlePreview = useCallback((template, event) => {
    event.stopPropagation();
    setPreviewTemplate(template);
    setPreviewOpen(true);
  }, []);

  const handlePreviewClose = useCallback(() => {
    setPreviewOpen(false);
    setPreviewTemplate(null);
  }, []);

  const handleUseTemplate = useCallback(
    (template) => {
      handlePreviewClose();
      handleSelectTemplate(template);
    },
    [handlePreviewClose, handleSelectTemplate]
  );

  const displayTemplates =
    currentTab === 'all' ? templates : groupedTemplates[currentTab] || [];

  const tabs = [
    { value: 'all', label: 'All Templates', count: templates.length },
    ...Object.keys(groupedTemplates).map((type) => ({
      value: type,
      label: SECTION_TYPE_LABELS[type] || type,
      count: groupedTemplates[type]?.length || 0,
    })),
  ];

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Template Library</Typography>
            <IconButton onClick={onClose}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose a pre-built template to quickly add a section to your page
          </Typography>

          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 3 }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{tab.label}</span>
                    <Chip label={tab.count} size="small" />
                  </Stack>
                }
              />
            ))}
          </Tabs>

          {loading && (
            <Box sx={{ py: 10 }}>
              <LoadingScreen />
            </Box>
          )}

          {!loading && displayTemplates.length === 0 && (
            <EmptyContent
              filled
              title="No Templates Found"
              description="There are no templates available in this category"
              sx={{ py: 10 }}
            />
          )}

          {!loading && displayTemplates.length > 0 && (
            <Grid container spacing={2}>
              {displayTemplates.map((template) => (
                <Grid item xs={12} sm={6} md={4} key={template.id}>
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
                    <CardActionArea onClick={() => handleSelectTemplate(template)}>
                      <Box
                        sx={{
                          height: 160,
                          bgcolor: `${SECTION_TYPE_COLORS[template.type]}.lighter`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                          backgroundImage: template.thumbnail
                            ? `url(${template.thumbnail})`
                            : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      >
                        {!template.thumbnail && (
                          <Iconify
                            icon={SECTION_TYPE_ICONS[template.type]}
                            width={64}
                            sx={{
                              color: `${SECTION_TYPE_COLORS[template.type]}.main`,
                              opacity: 0.8,
                            }}
                          />
                        )}
                        <IconButton
                          size="small"
                          onClick={(e) => handlePreview(template, e)}
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'background.paper',
                            '&:hover': {
                              bgcolor: 'background.paper',
                            },
                          }}
                        >
                          <Iconify icon="solar:eye-bold" width={20} />
                        </IconButton>
                      </Box>
                      <CardContent>
                        <Stack spacing={1}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                          >
                            <Typography variant="subtitle1" noWrap>
                              {template.name}
                            </Typography>
                            <Chip
                              label={SECTION_TYPE_LABELS[template.type]}
                              size="small"
                              color={SECTION_TYPE_COLORS[template.type]}
                              variant="soft"
                            />
                          </Stack>
                          {template.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {template.description}
                            </Typography>
                          )}
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          <Box sx={{ mt: 3, textAlign: 'right' }}>
            <Button onClick={onClose} color="inherit">
              Cancel
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <CMSTemplatePreviewDialog
        open={previewOpen}
        onClose={handlePreviewClose}
        template={previewTemplate}
        onUse={handleUseTemplate}
      />
    </>
  );
}

CMSTemplateLibraryDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSelect: PropTypes.func,
};
