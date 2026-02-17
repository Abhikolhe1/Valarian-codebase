import { useCallback, useEffect, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// dnd
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
// components
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import { useSnackbar } from 'src/components/snackbar';
// routes
import { paths } from 'src/routes/paths';
//
import CMSMenuItemDialog from '../cms-menu-item-dialog';

// ----------------------------------------------------------------------

const MENU_LOCATIONS = [
  { value: 'header', label: 'Header Navigation', color: 'primary' },
  { value: 'footer', label: 'Footer Navigation', color: 'secondary' },
  { value: 'sidebar', label: 'Sidebar Navigation', color: 'info' },
  { value: 'mobile', label: 'Mobile Navigation', color: 'success' },
];

// ----------------------------------------------------------------------

export default function CMSNavigationEditorView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [selectedLocation, setSelectedLocation] = useState('header');
  const [navigationMenu, setNavigationMenu] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  // Fetch navigation menu for selected location
  const fetchNavigationMenu = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:3035/api/cms/navigation/${selectedLocation}`
      );

      if (response.ok) {
        const data = await response.json();
        setNavigationMenu(data);
        setMenuItems(data.items || []);
      } else if (response.status === 404) {
        // No menu exists for this location yet
        setNavigationMenu(null);
        setMenuItems([]);
      } else {
        throw new Error('Failed to fetch navigation menu');
      }
    } catch (error) {
      console.error('Error fetching navigation menu:', error);
      enqueueSnackbar('Failed to load navigation menu', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedLocation, enqueueSnackbar]);

  useEffect(() => {
    fetchNavigationMenu();
  }, [fetchNavigationMenu]);

  // Save navigation menu
  const handleSave = useCallback(async () => {
    try {
      setSaving(true);

      // Get auth token
      const token = localStorage.getItem('accessToken');
      if (!token) {
        enqueueSnackbar('You must be logged in to save navigation menus', {
          variant: 'error',
        });
        return;
      }

      const menuData = {
        name: `${selectedLocation.charAt(0).toUpperCase() + selectedLocation.slice(1)} Menu`,
        location: selectedLocation,
        items: menuItems,
        enabled: true,
      };

      const url = navigationMenu
        ? `http://localhost:3035/api/cms/navigation/${navigationMenu.id}`
        : 'http://localhost:3035/api/cms/navigation';

      const method = navigationMenu ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(menuData),
      });

      if (!response.ok) {
        throw new Error('Failed to save navigation menu');
      }

      const savedMenu = await response.json();
      setNavigationMenu(savedMenu);
      enqueueSnackbar('Navigation menu saved successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error saving navigation menu:', error);
      enqueueSnackbar('Failed to save navigation menu', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }, [selectedLocation, navigationMenu, menuItems, enqueueSnackbar]);

  // Add new menu item
  const handleAddItem = () => {
    setEditingItem(null);
    setEditingIndex(null);
    setItemDialogOpen(true);
  };

  // Edit menu item
  const handleEditItem = (item, index) => {
    setEditingItem(item);
    setEditingIndex(index);
    setItemDialogOpen(true);
  };

  // Delete menu item
  const handleDeleteItem = (index) => {
    const updatedItems = menuItems.filter((_, i) => i !== index);
    setMenuItems(updatedItems);
  };

  // Save menu item from dialog
  const handleSaveItem = (itemData) => {
    if (editingIndex !== null) {
      // Update existing item
      const updatedItems = [...menuItems];
      updatedItems[editingIndex] = {
        ...updatedItems[editingIndex],
        ...itemData,
      };
      setMenuItems(updatedItems);
    } else {
      // Add new item
      const newItem = {
        ...itemData,
        order: menuItems.length,
      };
      setMenuItems([...menuItems, newItem]);
    }
  };

  // Handle drag and drop
  const handleDragEnd = useCallback(
    (result) => {
      if (!result.destination) {
        return;
      }

      const sourceIndex = result.source.index;
      const destinationIndex = result.destination.index;

      if (sourceIndex === destinationIndex) {
        return;
      }

      const reorderedItems = Array.from(menuItems);
      const [removed] = reorderedItems.splice(sourceIndex, 1);
      reorderedItems.splice(destinationIndex, 0, removed);

      // Update order property
      const updatedItems = reorderedItems.map((item, index) => ({
        ...item,
        order: index,
      }));

      setMenuItems(updatedItems);
    },
    [menuItems]
  );

  // Add child item
  const handleAddChild = (parentIndex) => {
    const parentItem = menuItems[parentIndex];
    setEditingItem({
      parentId: parentItem.id || `temp-${parentIndex}`,
    });
    setEditingIndex(null);
    setItemDialogOpen(true);
  };

  const locationConfig = MENU_LOCATIONS.find((loc) => loc.value === selectedLocation);

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Navigation Menu Editor"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'CMS', href: paths.dashboard.cms.root },
          { name: 'Navigation' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <CardHeader
          title="Navigation Menu"
          subheader="Manage navigation menus for different locations"
          action={
            <Stack direction="row" spacing={2}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Menu Location</InputLabel>
                <Select
                  value={selectedLocation}
                  label="Menu Location"
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  {MENU_LOCATIONS.map((location) => (
                    <MenuItem key={location.value} value={location.value}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography>{location.label}</Typography>
                        <Chip label={location.value} size="small" color={location.color} />
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<Iconify icon="solar:diskette-bold" />}
                onClick={handleSave}
                disabled={saving || loading}
              >
                Save Menu
              </Button>
            </Stack>
          }
        />

        <CardContent>
          {loading ? (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Loading menu...
              </Typography>
            </Box>
          ) : (
            <>
              {/* Menu Location Info */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: 'background.neutral',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography variant="subtitle1">{locationConfig?.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {menuItems.length} menu item{menuItems.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Iconify icon="solar:add-circle-bold" />}
                  onClick={handleAddItem}
                >
                  Add Menu Item
                </Button>
              </Paper>

              {/* Menu Items List with Drag and Drop */}
              {menuItems.length === 0 ? (
                <Box sx={{ py: 5, textAlign: 'center' }}>
                  <Iconify
                    icon="solar:menu-dots-bold"
                    width={64}
                    sx={{ color: 'text.disabled', mb: 2 }}
                  />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No menu items yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Add your first menu item to get started
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Iconify icon="solar:add-circle-bold" />}
                    onClick={handleAddItem}
                  >
                    Add Menu Item
                  </Button>
                </Box>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="menu-items">
                    {(droppableProvided) => (
                      <Stack
                        spacing={1}
                        ref={droppableProvided.innerRef}
                        {...droppableProvided.droppableProps}
                      >
                        {menuItems.map((item, index) => (
                          <Draggable
                            key={`item-${index}`}
                            draggableId={`item-${index}`}
                            index={index}
                          >
                            {(draggableProvided, snapshot) => (
                              <Paper
                                ref={draggableProvided.innerRef}
                                {...draggableProvided.draggableProps}
                                variant="outlined"
                                sx={{
                                  p: 2,
                                  bgcolor: snapshot.isDragging
                                    ? 'action.hover'
                                    : 'background.paper',
                                  cursor: 'move',
                                }}
                              >
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={2}
                                >
                                  {/* Drag Handle */}
                                  <Box {...draggableProvided.dragHandleProps}>
                                    <Iconify
                                      icon="solar:hamburger-menu-bold"
                                      width={20}
                                      sx={{ color: 'text.disabled' }}
                                    />
                                  </Box>

                                  {/* Icon */}
                                  {item.icon && (
                                    <Iconify icon={item.icon} width={24} />
                                  )}

                                  {/* Label and URL */}
                                  <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="subtitle2">
                                      {item.label}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ fontFamily: 'monospace' }}
                                    >
                                      {item.url}
                                    </Typography>
                                  </Box>

                                  {/* Badges */}
                                  <Stack direction="row" spacing={1}>
                                    {item.openInNewTab && (
                                      <Chip
                                        label="New Tab"
                                        size="small"
                                        variant="outlined"
                                      />
                                    )}
                                  </Stack>

                                  {/* Actions */}
                                  <Stack direction="row" spacing={0.5}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEditItem(item, index)}
                                    >
                                      <Iconify icon="solar:pen-bold" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteItem(index)}
                                    >
                                      <Iconify icon="solar:trash-bin-trash-bold" />
                                    </IconButton>
                                  </Stack>
                                </Stack>
                              </Paper>
                            )}
                          </Draggable>
                        ))}
                        {droppableProvided.placeholder}
                      </Stack>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Menu Item Dialog */}
      <CMSMenuItemDialog
        open={itemDialogOpen}
        onClose={() => setItemDialogOpen(false)}
        item={editingItem}
        onSave={handleSaveItem}
      />
    </Container>
  );
}
