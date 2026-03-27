import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { DataGrid } from '@mui/x-data-grid';
import axiosInstance, { endpoints } from 'src/utils/axios';
import {v4 as uuidv4} from 'uuid';

// components
import { ColorPicker } from 'src/components/color-utils';
import { ConfirmDialog } from 'src/components/custom-dialog';
import Iconify from 'src/components/iconify';
import Image from 'src/components/image';
import { useSnackbar } from 'src/components/snackbar';
import { Upload } from 'src/components/upload';
import { useBoolean } from 'src/hooks/use-boolean';
import CMSMediaPicker from 'src/sections/cms/cms-media-picker';
// utils
import { fCurrency } from 'src/utils/format-number';

// ----------------------------------------------------------------------

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const COLOR_PRESETS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy Blue', hex: '#000080' },
  { name: 'Royal Blue', hex: '#4169E1' },
  { name: 'Red', hex: '#FF0000' },
  { name: 'Green', hex: '#008000' },
  { name: 'Yellow', hex: '#FFFF00' },
  { name: 'Gray', hex: '#808080' },
  { name: 'Pink', hex: '#FFC0CB' },
  { name: 'Purple', hex: '#800080' },
  { name: 'Orange', hex: '#FFA500' },
  { name: 'Brown', hex: '#A52A2A' },
];

// ----------------------------------------------------------------------

export default function ProductVariantManager({ variants = [], onChange, productName = '' }) {
  const { enqueueSnackbar } = useSnackbar();
  const mediaPicker = useBoolean();

  const [openDialog, setOpenDialog] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, variantId: null });
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkStockDialog, setBulkStockDialog] = useState(false);
  const [bulkStockValue, setBulkStockValue] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    color: '#000000',
    colorName: 'Black',
    size: 'M',
    sku: '',
    stockQuantity: 0,
    images: [],
    isDefault: false,
    price: null,
  });

  // Auto-generate SKU
  const generateSKU = useCallback((colorName, size) => {
    const productPrefix = productName
      .split(' ')
      .slice(0, 2)
      .map(word => word.substring(0, 3).toUpperCase())
      .join('');
    const colorPrefix = colorName.substring(0, 3).toUpperCase();
    return `${productPrefix}-${colorPrefix}-${size}`;
  }, [productName]);

  // Handle dialog open
  const handleOpenDialog = useCallback((variant = null) => {
    if (variant) {
      setEditingVariant(variant);
      setFormData({
        color: variant.color,
        colorName: variant.colorName,
        size: variant.size,
        sku: variant.sku,
        stockQuantity: variant.stockQuantity,
        images: variant.images || [],
        isDefault: variant.isDefault,
        price: variant.price || null,
      });
    } else {
      setEditingVariant(null);
      const defaultSKU = generateSKU('Black', 'M');
      setFormData({
        color: '#000000',
        colorName: 'Black',
        size: 'M',
        sku: defaultSKU,
        stockQuantity: 0,
        images: [],
        isDefault: variants.length === 0,
        price: null,
      });
    }
    setOpenDialog(true);
  }, [variants.length, generateSKU]);

  // Handle dialog close
  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingVariant(null);
  }, []);

  // Handle form field change
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-update SKU when color or size changes
      if (field === 'colorName' || field === 'size') {
        updated.sku = generateSKU(
          field === 'colorName' ? value : prev.colorName,
          field === 'size' ? value : prev.size
        );
      }

      return updated;
    });
  }, [generateSKU]);

  // Handle color selection
  const handleColorSelect = useCallback((selectedColor) => {
    const preset = COLOR_PRESETS.find(p => p.hex === selectedColor);
    if (preset) {
      setFormData(prev => ({
        ...prev,
        color: preset.hex,
        colorName: preset.name,
        sku: generateSKU(preset.name, prev.size),
      }));
    }
  }, [generateSKU]);

  // Handle image upload
  const handleImageDrop = useCallback((acceptedFiles) => {
    const newImages = acceptedFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file)
    }));

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages],
    }));
  }, []);

  // Handle image remove
  const handleImageRemove = useCallback((file) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img !== file),
    }));
  }, []);

  // Handle image reorder
  const handleImageReorder = useCallback((reorderedImages) => {
    setFormData(prev => ({
      ...prev,
      images: reorderedImages,
    }));
  }, []);

  const handleSelectExistingImages = useCallback((selectedMedia) => {
    const selectedUrls = (Array.isArray(selectedMedia) ? selectedMedia : [])
      .map((item) => item?.url)
      .filter(Boolean);

    if (selectedUrls.length === 0) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...selectedUrls.filter((url) => !prev.images.includes(url))],
    }));

    enqueueSnackbar(`${selectedUrls.length} image${selectedUrls.length > 1 ? 's' : ''} added from media library`, {
      variant: 'success',
    });
    mediaPicker.onFalse();
  }, [enqueueSnackbar, mediaPicker]);

  // Handle remove all images
  const handleRemoveAllImages = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      images: [],
    }));
  }, []);

  // Helper function to upload image
  const uploadImage = async (file) => {
    if (typeof file === 'string') {
      console.log('✓ Variant image is already a URL:', file);
      return file; // Already uploaded
    }

    try {
      console.log('📤 Uploading variant image:', file.name || file);
      const imageFormData = new FormData();
      imageFormData.append('file', file);

      const response = await axiosInstance.post(endpoints.cms.media.upload, imageFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('📥 Variant upload response:', response.data);

      const url = response.data?.media?.url ||           // CMS format
        response.data?.url ||
        response.data?.path ||
        response.data?.file?.url ||
        response.data?.file?.path ||
        (typeof response.data === 'string' ? response.data : '');

      console.log('✓ Variant image URL:', url);

      if (!url) {
        console.error('❌ No URL in variant upload response:', response.data);
      }

      return url;
    } catch (error) {
      console.error('❌ Variant image upload failed:', error);
      throw new Error(`Failed to upload image: ${file.name || 'unknown'}`);
    }
  };

  // Validate form
  const validateForm = useCallback(() => {
    if (!formData.colorName.trim()) {
      enqueueSnackbar('Color name is required', { variant: 'error' });
      return false;
    }
    if (!formData.size) {
      enqueueSnackbar('Size is required', { variant: 'error' });
      return false;
    }
    if (!formData.sku.trim()) {
      enqueueSnackbar('SKU is required', { variant: 'error' });
      return false;
    }
    if (formData.stockQuantity < 0) {
      enqueueSnackbar('Stock quantity cannot be negative', { variant: 'error' });
      return false;
    }

    // Check for duplicate color+size combination
    const isDuplicate = variants.some(v =>
      v.color === formData.color &&
      v.size === formData.size &&
      (!editingVariant || v.id !== editingVariant.id)
    );

    if (isDuplicate) {
      enqueueSnackbar('A variant with this color and size combination already exists', { variant: 'error' });
      return false;
    }

    return true;
  }, [formData, variants, editingVariant, enqueueSnackbar]);

  // Handle save variant
  const handleSaveVariant = useCallback(async () => {
    if (!validateForm()) return;

    try {
      console.log('💾 Saving variant with images:', formData.images);

      // Upload images if they're files
      enqueueSnackbar('Uploading variant images...', { variant: 'info' });

      // Upload all images in parallel using Promise.all, filter out nulls
      const uploadedImages = await Promise.all(
        formData.images
          .filter(img => img != null) // Remove null/undefined
          .map(async (img) => {
            if (typeof img === 'string') {
              return img; // Already uploaded
            }
            return uploadImage(img);
          })
      );

      // Filter out any null values that might have been returned
      const validImages = uploadedImages.filter(img => img && typeof img === 'string');

      console.log('✓ Valid variant images:', validImages);

      const variantData = {
        id: editingVariant?.id || uuidv4(),
        sku: formData.sku,
        color: formData.color,
        colorName: formData.colorName,
        size: formData.size,
        images: validImages,
        stockQuantity: Number(formData.stockQuantity),
        inStock: Number(formData.stockQuantity) > 0,
        isDefault: formData.isDefault,
        ...(formData.price && { price: Number(formData.price) }),
      };

      console.log('✓ Variant data:', variantData);

      let updatedVariants;
      if (editingVariant) {
        updatedVariants = variants.map(v => v.id === editingVariant.id ? variantData : v);
        enqueueSnackbar('Variant updated successfully', { variant: 'success' });
      } else {
        updatedVariants = [...variants, variantData];
        enqueueSnackbar('Variant added successfully', { variant: 'success' });
      }

      // If this variant is set as default, unset others
      if (formData.isDefault) {
        updatedVariants = updatedVariants.map(v => ({
          ...v,
          isDefault: v.id === variantData.id,
        }));
      }

      onChange(updatedVariants);
      handleCloseDialog();
    } catch (error) {
      console.error('❌ Failed to save variant:', error);
      enqueueSnackbar(error.message || 'Failed to save variant', { variant: 'error' });
    }
  }, [formData, editingVariant, variants, onChange, validateForm, handleCloseDialog, enqueueSnackbar]);

  // Handle delete variant
  const handleDeleteVariant = useCallback((variantId) => {
    const updatedVariants = variants.filter(v => v.id !== variantId);
    onChange(updatedVariants);
    setConfirmDialog({ open: false, variantId: null });
    enqueueSnackbar('Variant deleted successfully', { variant: 'success' });
  }, [variants, onChange, enqueueSnackbar]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(() => {
    const updatedVariants = variants.filter(v => !selectedRows.includes(v.id));
    onChange(updatedVariants);
    setSelectedRows([]);
    setBulkDeleteDialog(false);
    enqueueSnackbar(`${selectedRows.length} variants deleted successfully`, { variant: 'success' });
  }, [variants, selectedRows, onChange, enqueueSnackbar]);

  // Handle bulk stock update
  const handleBulkStockUpdate = useCallback(() => {
    const stockValue = Number(bulkStockValue);
    if (Number.isNaN(stockValue) || stockValue < 0) {
      enqueueSnackbar('Please enter a valid stock quantity', { variant: 'error' });
      return;
    }

    const updatedVariants = variants.map(v =>
      selectedRows.includes(v.id)
        ? { ...v, stockQuantity: stockValue, inStock: stockValue > 0 }
        : v
    );

    onChange(updatedVariants);
    setSelectedRows([]);
    setBulkStockDialog(false);
    setBulkStockValue('');
    enqueueSnackbar(`Stock updated for ${selectedRows.length} variants`, { variant: 'success' });
  }, [variants, selectedRows, bulkStockValue, onChange, enqueueSnackbar]);

  // DataGrid columns
  const columns = useMemo(() => [
    {
      field: 'color',
      headerName: 'Color',
      width: 150,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              bgcolor: params.value,
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
          <Typography variant="body2">{params.row.colorName}</Typography>
        </Stack>
      ),
    },
    {
      field: 'size',
      headerName: 'Size',
      width: 80,
    },
    {
      field: 'sku',
      headerName: 'SKU',
      width: 150,
    },
    {
      field: 'stockQuantity',
      headerName: 'Stock',
      width: 100,
      renderCell: (params) => {
        let color = 'success.main';
        if (params.value === 0) {
          color = 'error.main';
        } else if (params.value < 10) {
          color = 'warning.main';
        }

        return (
          <Typography variant="body2" sx={{ color }}>
            {params.value}
          </Typography>
        );
      },
    },
    {
      field: 'images',
      headerName: 'Images',
      width: 120,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          {params.value?.slice(0, 3).map((img, index) => (
            <Image
              key={index}
              src={img}
              sx={{ width: 32, height: 32, borderRadius: 1 }}
            />
          ))}
          {params.value?.length > 3 && (
            <Typography variant="caption" sx={{ alignSelf: 'center' }}>
              +{params.value.length - 3}
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 100,
      renderCell: (params) => (params.value ? fCurrency(params.value) : '-'),
    },
    {
      field: 'isDefault',
      headerName: 'Default',
      width: 80,
      renderCell: (params) => (
        params.value ? <Iconify icon="eva:checkmark-circle-2-fill" sx={{ color: 'success.main' }} /> : '-'
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => handleOpenDialog(params.row)}>
              <Iconify icon="eva:edit-fill" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => setConfirmDialog({ open: true, variantId: params.row.id })}
            >
              <Iconify icon="eva:trash-2-outline" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ], [handleOpenDialog]);

  return (
    <>
      <Card>
        <CardHeader
          title="Product Variants"
          subheader={`${variants.length} variant${variants.length !== 1 ? 's' : ''}`}
          action={
            <Stack direction="row" spacing={1}>
              {selectedRows.length > 0 && (
                <>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Iconify icon="eva:trash-2-outline" />}
                    onClick={() => setBulkDeleteDialog(true)}
                  >
                    Delete ({selectedRows.length})
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Iconify icon="eva:cube-outline" />}
                    onClick={() => setBulkStockDialog(true)}
                  >
                    Update Stock ({selectedRows.length})
                  </Button>
                </>
              )}
              <Button
                variant="contained"
                startIcon={<Iconify icon="eva:plus-fill" />}
                onClick={() => handleOpenDialog()}
              >
                Add Variant
              </Button>
            </Stack>
          }
        />

        <Box sx={{ height: 500, px: 2, pb: 2 }}>
          <DataGrid
            rows={variants}
            columns={columns}
            checkboxSelection
            disableRowSelectionOnClick
            onRowSelectionModelChange={(newSelection) => setSelectedRows(newSelection)}
            rowSelectionModel={selectedRows}
            pageSizeOptions={[5, 10, 25]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
          />
        </Box>
      </Card>

      {/* Add/Edit Variant Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingVariant ? 'Edit Variant' : 'Add Variant'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            {/* Color Selection */}
            <Stack spacing={1}>
              <Typography variant="subtitle2">Color</Typography>
              <ColorPicker
                colors={COLOR_PRESETS.map(p => p.hex)}
                selected={formData.color}
                onSelectColor={handleColorSelect}
                limit={12}
              />

              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  label="Color Name"
                  value={formData.colorName}
                  onChange={(e) => handleFieldChange('colorName', e.target.value)}
                  required
                />
                <TextField
                  fullWidth
                  label="Color Hex"
                  value={formData.color}
                  onChange={(e) => handleFieldChange('color', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            bgcolor: formData.color,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        />
                      </InputAdornment>
                    ),
                  }}
                />
              </Stack>
            </Stack>

            {/* Size Selection */}
            <TextField
              select
              fullWidth
              label="Size"
              value={formData.size}
              onChange={(e) => handleFieldChange('size', e.target.value)}
              required
            >
              {SIZES.map((size) => (
                <MenuItem key={size} value={size}>
                  {size}
                </MenuItem>
              ))}
            </TextField>

            {/* SKU */}
            <TextField
              fullWidth
              label="SKU"
              value={formData.sku}
              onChange={(e) => handleFieldChange('sku', e.target.value)}
              required
              helperText="Unique identifier for this variant"
            />

            {/* Stock Quantity */}
            <TextField
              fullWidth
              type="number"
              label="Stock Quantity"
              value={formData.stockQuantity}
              onChange={(e) => handleFieldChange('stockQuantity', e.target.value)}
              required
              InputProps={{
                inputProps: { min: 0 },
              }}
            />

            {/* Price Override */}
            <TextField
              fullWidth
              type="number"
              label="Price Override (Optional)"
              value={formData.price || ''}
              onChange={(e) => handleFieldChange('price', e.target.value)}
              helperText="Leave empty to use product's base price"
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                inputProps: { min: 0, step: 0.01 },
              }}
            />

            {/* Images Upload */}
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Typography variant="subtitle2">Variant Images</Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Iconify icon="solar:gallery-add-bold-duotone" />}
                  onClick={mediaPicker.onTrue}
                >
                  Choose Existing
                </Button>
              </Stack>
              <Upload
                multiple
                thumbnail
                files={formData.images}
                onDrop={handleImageDrop}
                onRemove={handleImageRemove}
                onRemoveAll={handleRemoveAllImages}
                onReorder={handleImageReorder}
                helperText={
                  <Typography variant="caption" sx={{ px: 0.5, color: 'text.secondary' }}>
                    Choose from Media Library, upload new ones, and drag to set the display order.
                  </Typography>
                }
              />
            </Stack>

            {/* Is Default */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isDefault}
                  onChange={(e) => handleFieldChange('isDefault', e.target.checked)}
                />
              }
              label="Set as default variant"
            />
          </Stack>
        </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog}>Cancel</Button>
        <Button variant="contained" onClick={handleSaveVariant}>
          {editingVariant ? 'Update' : 'Add'} Variant
        </Button>
      </DialogActions>
      </Dialog>

      <CMSMediaPicker
        open={mediaPicker.value}
        onClose={mediaPicker.onFalse}
        onSelect={handleSelectExistingImages}
        multiple
        selectedMedia={[]}
        accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.svg'] }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, variantId: null })}
        title="Delete Variant"
        content="Are you sure you want to delete this variant? This action cannot be undone."
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => handleDeleteVariant(confirmDialog.variantId)}
          >
            Delete
          </Button>
        }
      />

      {/* Bulk Delete Dialog */}
      <ConfirmDialog
        open={bulkDeleteDialog}
        onClose={() => setBulkDeleteDialog(false)}
        title="Delete Multiple Variants"
        content={`Are you sure you want to delete ${selectedRows.length} variants? This action cannot be undone.`}
        action={
          <Button variant="contained" color="error" onClick={handleBulkDelete}>
            Delete All
          </Button>
        }
      />

      {/* Bulk Stock Update Dialog */}
      <Dialog open={bulkStockDialog} onClose={() => setBulkStockDialog(false)}>
        <DialogTitle>Update Stock for {selectedRows.length} Variants</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            type="number"
            label="Stock Quantity"
            value={bulkStockValue}
            onChange={(e) => setBulkStockValue(e.target.value)}
            sx={{ mt: 2 }}
            InputProps={{
              inputProps: { min: 0 },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkStockDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleBulkStockUpdate}>
            Update Stock
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

ProductVariantManager.propTypes = {
  variants: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  productName: PropTypes.string,
};
