import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
// dnd
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
// components
import { Button } from '@mui/material';
import Iconify from 'src/components/iconify';
import { useSnackbar } from 'src/components/snackbar';
import CMSSectionEditor from './cms-section-editor';
import CMSSectionTypeSelector from './cms-section-type-selector';
//

// ----------------------------------------------------------------------

const SECTION_TYPE_CONFIG = {
  hero: {
    label: 'Hero',
    color: 'primary',
    icon: 'solar:star-bold',
  },
  features: {
    label: 'Features',
    color: 'info',
    icon: 'solar:widget-bold',
  },
  testimonials: {
    label: 'Testimonials',
    color: 'success',
    icon: 'solar:chat-round-like-bold',
  },
  gallery: {
    label: 'Gallery',
    color: 'warning',
    icon: 'solar:gallery-bold',
  },
  cta: {
    label: 'CTA',
    color: 'error',
    icon: 'solar:hand-shake-bold',
  },
  text: {
    label: 'Text',
    color: 'default',
    icon: 'solar:text-bold',
  },
};

// ----------------------------------------------------------------------

export default function CMSSectionList({ pageId, sections, onSectionsChange }) {
  const { enqueueSnackbar } = useSnackbar();
  const [isReordering, setIsReordering] = useState(false);
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  const handleDragEnd = useCallback(
    async (result) => {
      if (!result.destination) {
        return;
      }

      const sourceIndex = result.source.index;
      const destinationIndex = result.destination.index;

      if (sourceIndex === destinationIndex) {
        return;
      }

      // Reorder sections locally
      const reorderedSections = Array.from(sections);
      const [removed] = reorderedSections.splice(sourceIndex, 1);
      reorderedSections.splice(destinationIndex, 0, removed);

      // Update order property
      const updatedSections = reorderedSections.map((section, index) => ({
        ...section,
        order: index,
      }));

      // Optimistically update UI
      onSectionsChange(updatedSections);

      // Send reorder request to backend using bulk reorder endpoint
      try {
        setIsReordering(true);
        const sectionIds = updatedSections.map((section) => section.id);

        const response = await fetch(
          'http://localhost:3035/api/cms/sections/reorder',
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              pageId,
              sectionIds
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to reorder sections');
        }

        enqueueSnackbar('Section reordered successfully');
      } catch (error) {
        console.error('Error reordering sections:', error);
        enqueueSnackbar('Failed to reorder section', { variant: 'error' });
        // Revert on error
        onSectionsChange(sections);
      } finally {
        setIsReordering(false);
      }
    },
    [sections, pageId, onSectionsChange, enqueueSnackbar]
  );

  const handleToggleEnabled = useCallback(
    async (sectionId, currentEnabled) => {
      try {
        const response = await fetch(`http://localhost:3035/api/cms/sections/${sectionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ enabled: !currentEnabled }),
        });

        if (!response.ok) {
          throw new Error('Failed to update section');
        }

        const updatedSection = await response.json();

        // Update local state
        const updatedSections = sections.map((section) =>
          section.id === sectionId ? { ...section, enabled: updatedSection.enabled } : section
        );
        onSectionsChange(updatedSections);

        enqueueSnackbar(
          `Section ${updatedSection.enabled ? 'enabled' : 'disabled'} successfully`
        );
      } catch (error) {
        console.error('Error toggling section:', error);
        enqueueSnackbar('Failed to update section', { variant: 'error' });
      }
    },
    [sections, onSectionsChange, enqueueSnackbar]
  );

  const handleEditSection = useCallback((sectionId) => {
    const section = sections.find((s) => s.id === sectionId);
    if (section) {
      setSelectedSection(section);
      setEditorOpen(true);
    }
  }, [sections]);

  const handleAddSection = useCallback(() => {
    setTypeSelectorOpen(true);
  }, []);

  const handleTypeSelect = useCallback((type) => {
    setSelectedType(type);
    setSelectedSection(null);
    setEditorOpen(true);
  }, []);

  const handleSectionSaved = useCallback(
    (savedSection) => {
      // Refresh sections list
      if (selectedSection) {
        // Update existing section
        const updatedSections = sections.map((s) =>
          s.id === savedSection.id ? savedSection : s
        );
        onSectionsChange(updatedSections);
      } else {
        // Add new section
        onSectionsChange([...sections, savedSection]);
      }
    },
    [sections, selectedSection, onSectionsChange]
  );

  const handleCloseEditor = useCallback(() => {
    setEditorOpen(false);
    setSelectedSection(null);
    setSelectedType(null);
  }, []);

  const handleDeleteSection = useCallback(
    async (sectionId) => {
      if (!window.confirm('Are you sure you want to delete this section?')) {
        return;
      }

      try {
        const response = await fetch(`http://localhost:3035/api/cms/sections/${sectionId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete section');
        }

        // Update local state
        const updatedSections = sections.filter((section) => section.id !== sectionId);
        onSectionsChange(updatedSections);

        enqueueSnackbar('Section deleted successfully');
      } catch (error) {
        console.error('Error deleting section:', error);
        enqueueSnackbar('Failed to delete section', { variant: 'error' });
      }
    },
    [sections, onSectionsChange, enqueueSnackbar]
  );

  const getSectionTypeConfig = (type) =>
    SECTION_TYPE_CONFIG[type] || {
      label: type,
      color: 'default',
      icon: 'solar:widget-bold',
    };

  if (!sections || sections.length === 0) {
    return (
      <>
        <Card>
          <CardHeader title="Page Sections" />
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No sections yet. Add your first section to get started.
            </Typography>
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={handleAddSection}
            >
              Add Section
            </Button>
          </Box>
        </Card>

        <CMSSectionTypeSelector
          open={typeSelectorOpen}
          onClose={() => setTypeSelectorOpen(false)}
          onSelect={handleTypeSelect}
        />

        <CMSSectionEditor
          open={editorOpen}
          onClose={handleCloseEditor}
          section={selectedSection}
          sectionType={selectedType}
          pageId={pageId}
          onSave={handleSectionSaved}
        />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Page Sections"
          subheader="Drag and drop to reorder sections"
          action={
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {sections.length} {sections.length === 1 ? 'section' : 'sections'}
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={handleAddSection}
              >
                Add Section
              </Button>
            </Stack>
          }
        />

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sections-list">
            {(droppableProvided, droppableSnapshot) => (
              <Box
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
                sx={{
                  p: 2,
                  bgcolor: droppableSnapshot.isDraggingOver ? 'action.hover' : 'transparent',
                  transition: 'background-color 0.2s',
                }}
              >
                {sections.map((section, index) => (
                  <Draggable key={section.id} draggableId={section.id} index={index}>
                    {(draggableProvided, draggableSnapshot) => (
                      <SectionItem
                        ref={draggableProvided.innerRef}
                        section={section}
                        isDragging={draggableSnapshot.isDragging}
                        dragHandleProps={draggableProvided.dragHandleProps}
                        draggableProps={draggableProvided.draggableProps}
                        onToggleEnabled={handleToggleEnabled}
                        onEdit={handleEditSection}
                        onDelete={handleDeleteSection}
                        getSectionTypeConfig={getSectionTypeConfig}
                      />
                    )}
                  </Draggable>
                ))}
                {droppableProvided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>

        {isReordering && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Saving order...
            </Typography>
          </Box>
        )}
      </Card>

      <CMSSectionTypeSelector
        open={typeSelectorOpen}
        onClose={() => setTypeSelectorOpen(false)}
        onSelect={handleTypeSelect}
      />

      <CMSSectionEditor
        open={editorOpen}
        onClose={handleCloseEditor}
        section={selectedSection}
        sectionType={selectedType}
        pageId={pageId}
        onSave={handleSectionSaved}
      />
    </>
  );
}

CMSSectionList.propTypes = {
  pageId: PropTypes.string,
  sections: PropTypes.array,
  onSectionsChange: PropTypes.func,
};

// ----------------------------------------------------------------------

const SectionItem = ({
  section,
  isDragging,
  dragHandleProps,
  draggableProps,
  onToggleEnabled,
  onEdit,
  onDelete,
  getSectionTypeConfig,
  innerRef,
}) => {
  const typeConfig = getSectionTypeConfig(section.type);

  return (
    <Card
      ref={innerRef}
      {...draggableProps}
      sx={{
        mb: 2,
        opacity: section.enabled ? 1 : 0.6,
        boxShadow: isDragging ? 20 : 1,
        transform: isDragging ? 'rotate(2deg)' : 'none',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 4,
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{
          p: 2,
        }}
      >
        {/* Drag Handle */}
        <Box
          {...dragHandleProps}
          sx={{
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            color: 'text.secondary',
            '&:active': {
              cursor: 'grabbing',
            },
          }}
        >
          <Iconify icon="solar:hamburger-menu-bold" width={24} />
        </Box>

        {/* Section Icon */}
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            bgcolor: `${typeConfig.color}.lighter`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Iconify icon={typeConfig.icon} width={24} sx={{ color: `${typeConfig.color}.main` }} />
        </Box>

        {/* Section Info */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle2" noWrap>
              {section.name || `${typeConfig.label} Section`}
            </Typography>
            <Chip label={typeConfig.label} size="small" color={typeConfig.color} />
          </Stack>
          <Typography variant="caption" color="text.secondary" noWrap>
            Order: {section.order + 1}
          </Typography>
        </Box>

        {/* Enable/Disable Toggle */}
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            {section.enabled ? 'Enabled' : 'Disabled'}
          </Typography>
          <Switch
            checked={section.enabled}
            onChange={() => onToggleEnabled(section.id, section.enabled)}
            size="small"
          />
        </Stack>

        {/* Action Buttons */}
        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            onClick={() => onEdit(section.id)}
            sx={{ color: 'text.secondary' }}
          >
            <Iconify icon="solar:pen-bold" width={20} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onDelete(section.id)}
            sx={{ color: 'error.main' }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" width={20} />
          </IconButton>
        </Stack>
      </Stack>
    </Card>
  );
};

SectionItem.propTypes = {
  section: PropTypes.object,
  isDragging: PropTypes.bool,
  dragHandleProps: PropTypes.object,
  draggableProps: PropTypes.object,
  onToggleEnabled: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  getSectionTypeConfig: PropTypes.func,
  innerRef: PropTypes.any,
};
