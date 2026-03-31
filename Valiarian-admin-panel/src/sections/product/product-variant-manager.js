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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import axiosInstance, { endpoints } from 'src/utils/axios';
import {v4 as uuidv4} from 'uuid';

// components
import { ColorPicker } from 'src/components/color-utils';
import { ConfirmDialog } from 'src/components/custom-dialog';
import Iconify from 'src/components/iconify';
import Image from 'src/components/image';
import Label from 'src/components/label';
import Scrollbar from 'src/components/scrollbar';
import { useSnackbar } from 'src/components/snackbar';
import {
  emptyRows,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TableNoData,
  TablePaginationCustom,
  TableSelectedAction,
  useTable,
} from 'src/components/table';
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

const TABLE_HEAD = [
  { id: 'variant', label: 'Variant' },
  { id: 'sku', label: 'SKU', width: 160 },
  { id: 'stockQuantity', label: 'Stock', width: 120 },
  { id: 'price', label: 'Offer Price', width: 140 },
  { id: 'isDefault', label: 'Default', width: 100 },
  { id: 'actions', label: 'Actions', width: 140, align: 'right' },
];

// ----------------------------------------------------------------------

function normalizeVariants(variants = []) {
  if (!Array.isArray(variants) || variants.length === 0) {
    return [];
  }

  const normalizedVariants = variants.map((variant, index) => {
    const stockQuantity = Math.max(0, Number(variant.stockQuantity || 0));

    return {
      ...variant,
      stockQuantity,
      inStock: stockQuantity > 0,
      isDefault: variants.length === 1 ? true : Boolean(variant.isDefault && index >= 0),
    };
  });

  const defaultVariants = normalizedVariants.filter((variant) => variant.isDefault);

  return normalizedVariants.map((variant, index) => ({
    ...variant,
    isDefault: defaultVariants.length > 0 ? variant.id === defaultVariants[0].id : index === 0,
  }));
}

export default function ProductVariantManager({ variants = [], onChange, productName = '' }) {
  const { enqueueSnackbar } = useSnackbar();
  const mediaPicker = useBoolean();
  const table = useTable({ defaultOrderBy: 'colorName', defaultRowsPerPage: 5 });

  const [openDialog, setOpenDialog] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
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

      onChange(normalizeVariants(updatedVariants));
      handleCloseDialog();
    } catch (error) {
      console.error('❌ Failed to save variant:', error);
      enqueueSnackbar(error.message || 'Failed to save variant', { variant: 'error' });
    }
  }, [formData, editingVariant, variants, onChange, validateForm, handleCloseDialog, enqueueSnackbar]);

  // Handle delete variant
  const handleDeleteVariant = useCallback((variantId) => {
    const updatedVariants = variants.filter(v => v.id !== variantId);
    onChange(normalizeVariants(updatedVariants));
    setConfirmDialog({ open: false, variantId: null });
    enqueueSnackbar('Variant deleted successfully', { variant: 'success' });
  }, [variants, onChange, enqueueSnackbar]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(() => {
    const updatedVariants = variants.filter(v => !table.selected.includes(v.id));
    onChange(normalizeVariants(updatedVariants));
    table.setSelected([]);
    setBulkDeleteDialog(false);
    enqueueSnackbar(`${table.selected.length} variants deleted successfully`, { variant: 'success' });
  }, [variants, table, onChange, enqueueSnackbar]);

  // Handle bulk stock update
  const handleBulkStockUpdate = useCallback(() => {
    const stockValue = Number(bulkStockValue);
    if (Number.isNaN(stockValue) || stockValue < 0) {
      enqueueSnackbar('Please enter a valid stock quantity', { variant: 'error' });
      return;
    }

    const updatedVariants = variants.map(v =>
      table.selected.includes(v.id)
        ? { ...v, stockQuantity: stockValue, inStock: stockValue > 0 }
        : v
    );

    onChange(normalizeVariants(updatedVariants));
    table.setSelected([]);
    setBulkStockDialog(false);
    setBulkStockValue('');
    enqueueSnackbar(`Stock updated for ${table.selected.length} variants`, { variant: 'success' });
  }, [variants, table, bulkStockValue, onChange, enqueueSnackbar]);

  const dataFiltered = useMemo(() => {
    const stabilized = variants.map((el, index) => [el, index]);

    stabilized.sort((a, b) => {
      const order = getComparator(table.order, table.orderBy)(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });

    return stabilized.map((el) => el[0]);
  }, [table.order, table.orderBy, variants]);

  const dataInPage = dataFiltered.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  const denseHeight = table.dense ? 56 : 76;
  const notFound = !dataFiltered.length;

  return (
    <>
      <Card>
        <CardHeader
          title="Product Variants"
          subheader={`${variants.length} variant${variants.length !== 1 ? 's' : ''}`}
          action={
            <Stack direction="row" spacing={1}>
              {table.selected.length > 0 && (
                <>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Iconify icon="eva:trash-2-outline" />}
                    onClick={() => setBulkDeleteDialog(true)}
                  >
                    Delete ({table.selected.length})
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Iconify icon="eva:cube-outline" />}
                    onClick={() => setBulkStockDialog(true)}
                  >
                    Update Stock ({table.selected.length})
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

        <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
          <TableSelectedAction
            dense={table.dense}
            numSelected={table.selected.length}
            rowCount={dataFiltered.length}
            onSelectAllRows={(checked) =>
              table.onSelectAllRows(
                checked,
                dataFiltered.map((row) => row.id)
              )
            }
            action={
              <Tooltip title="Delete">
                <IconButton color="primary" onClick={() => setBulkDeleteDialog(true)}>
                  <Iconify icon="solar:trash-bin-trash-bold" />
                </IconButton>
              </Tooltip>
            }
          />

          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headLabel={TABLE_HEAD}
                rowCount={dataFiltered.length}
                numSelected={table.selected.length}
                onSort={table.onSort}
                onSelectAllRows={(checked) =>
                  table.onSelectAllRows(
                    checked,
                    dataFiltered.map((row) => row.id)
                  )
                }
              />

              <TableBody>
                {dataInPage.map((row) => (
                  <VariantTableRow
                    key={row.id}
                    row={row}
                    selected={table.selected.includes(row.id)}
                    onSelectRow={() => table.onSelectRow(row.id)}
                    onEditRow={() => handleOpenDialog(row)}
                    onDeleteRow={() => setConfirmDialog({ open: true, variantId: row.id })}
                  />
                ))}

                <TableEmptyRows
                  height={denseHeight}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                />

                <TableNoData notFound={notFound} />
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>

        <TablePaginationCustom
          count={dataFiltered.length}
          page={table.page}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onRowsPerPageChange={table.onChangeRowsPerPage}
          dense={table.dense}
          onChangeDense={table.onChangeDense}
        />
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
        content={`Are you sure you want to delete ${table.selected.length} variants? This action cannot be undone.`}
        action={
          <Button variant="contained" color="error" onClick={handleBulkDelete}>
            Delete All
          </Button>
        }
      />

      {/* Bulk Stock Update Dialog */}
      <Dialog open={bulkStockDialog} onClose={() => setBulkStockDialog(false)}>
        <DialogTitle>Update Stock for {table.selected.length} Variants</DialogTitle>
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

function VariantTableRow({ row, selected, onSelectRow, onEditRow, onDeleteRow }) {
  const stockColor =
    (row.stockQuantity === 0 && 'error') ||
    (row.stockQuantity < 10 && 'warning') ||
    'success';
  let stockLabel = 'In Stock';
  if (row.stockQuantity === 0) {
    stockLabel = 'Out';
  } else if (row.stockQuantity < 10) {
    stockLabel = 'Low';
  }

  return (
    <TableRow hover selected={selected}>
      <TableCell padding="checkbox">
        <Checkbox checked={selected} onClick={onSelectRow} />
      </TableCell>

      <TableCell>
        <Stack direction="row" spacing={2} alignItems="center">
          {row.images?.[0] ? (
            <Image src={row.images[0]} sx={{ width: 56, height: 56, borderRadius: 1.5, flexShrink: 0 }} />
          ) : (
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 1.5,
                bgcolor: 'background.neutral',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.disabled',
                flexShrink: 0,
              }}
            >
              <Iconify icon="solar:gallery-wide-bold" width={24} />
            </Box>
          )}

          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  bgcolor: row.color,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
              <Typography variant="subtitle2">{row.colorName}</Typography>
              <Label variant="soft" color="default">
                {row.size}
              </Label>
            </Stack>

            <Typography variant="body2" color="text.secondary">
              {row.images?.length ? `${row.images.length} image${row.images.length > 1 ? 's' : ''}` : 'No images'}
            </Typography>
          </Stack>
        </Stack>
      </TableCell>

      <TableCell>{row.sku}</TableCell>

      <TableCell>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2">{row.stockQuantity}</Typography>
          <Label variant="soft" color={stockColor}>
            {stockLabel}
          </Label>
        </Stack>
      </TableCell>

      <TableCell>{row.price ? fCurrency(row.price) : '-'}</TableCell>

      <TableCell>
        {row.isDefault ? (
          <Label variant="soft" color="success">
            Default
          </Label>
        ) : (
          '-'
        )}
      </TableCell>

      <TableCell align="right">
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Edit">
            <IconButton size="small" onClick={onEditRow}>
              <Iconify icon="solar:pen-bold" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={onDeleteRow}>
              <Iconify icon="solar:trash-bin-trash-bold" />
            </IconButton>
          </Tooltip>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

ProductVariantManager.propTypes = {
  variants: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  productName: PropTypes.string,
};

VariantTableRow.propTypes = {
  onDeleteRow: PropTypes.func,
  onEditRow: PropTypes.func,
  onSelectRow: PropTypes.func,
  row: PropTypes.object,
  selected: PropTypes.bool,
};
