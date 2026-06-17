import {format} from 'date-fns';
import {useCallback, useEffect, useMemo, useState} from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import {alpha} from '@mui/material/styles';
import axios, {endpoints} from 'src/utils/axios';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import Iconify from 'src/components/iconify';
import Label from 'src/components/label';
import Scrollbar from 'src/components/scrollbar';
import {useSettingsContext} from 'src/components/settings';
import {useSnackbar} from 'src/components/snackbar';
import {
  TableEmptyRows,
  TableNoData,
  TablePaginationCustom,
  useTable,
} from 'src/components/table';
import {paths} from 'src/routes/paths';

const DISCOUNT_TYPE_OPTIONS = [
  {value: 'percentage', label: 'Percentage'},
  {value: 'fixed', label: 'Fixed amount'},
];

const PAYMENT_METHOD_OPTIONS = [
  {value: 'razorpay', label: 'Razorpay'},
  {value: 'cod', label: 'Cash on Delivery'},
  {value: 'wallet', label: 'Wallet'},
];

const ACTIVE_FILTER_OPTIONS = [
  {value: 'all', label: 'All'},
  {value: 'true', label: 'Active'},
  {value: 'false', label: 'Inactive'},
];

const createDefaultForm = () => ({
  code: '',
  title: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  maxDiscountAmount: '',
  minOrderAmount: '',
  totalUsageLimit: '',
  perUserUsageLimit: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
  isFirstOrderOnly: false,
  applicablePaymentMethods: [],
});

const getCouponStatus = (coupon) => {
  const now = new Date();

  if (!coupon?.isActive) {
    return {label: 'Inactive', color: 'default'};
  }

  if (coupon?.startsAt && new Date(coupon.startsAt) > now) {
    return {label: 'Scheduled', color: 'warning'};
  }

  if (coupon?.endsAt && new Date(coupon.endsAt) < now) {
    return {label: 'Expired', color: 'error'};
  }

  return {label: 'Active', color: 'success'};
};

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  return format(new Date(value), 'dd MMM yyyy, hh:mm a');
};

const normalizeNumericField = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : undefined;
};

export default function CouponListView() {
  const table = useTable();
  const settings = useSettingsContext();
  const {enqueueSnackbar} = useSnackbar();

  const [coupons, setCoupons] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formValues, setFormValues] = useState(createDefaultForm());
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        page: table.page + 1,
        limit: table.rowsPerPage,
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      if (activeFilter !== 'all') {
        params.isActive = activeFilter;
      }

      const response = await axios.get(endpoints.coupons.list, {params});

      setCoupons(response.data?.coupons || []);
      setTotalCount(response.data?.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
      enqueueSnackbar(error?.message || 'Failed to load coupons', {variant: 'error'});
      setCoupons([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, debouncedSearch, enqueueSnackbar, table.page, table.rowsPerPage]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const openCreateDialog = useCallback(() => {
    setEditingCoupon(null);
    setFormValues(createDefaultForm());
    setSubmitError('');
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((coupon) => {
    setEditingCoupon(coupon);
    setFormValues({
      code: coupon.code || '',
      title: coupon.title || '',
      description: coupon.description || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: coupon.discountValue ?? '',
      maxDiscountAmount: coupon.maxDiscountAmount ?? '',
      minOrderAmount: coupon.minOrderAmount ?? '',
      totalUsageLimit: coupon.totalUsageLimit ?? '',
      perUserUsageLimit: coupon.perUserUsageLimit ?? '',
      startsAt: coupon.startsAt ? new Date(coupon.startsAt).toISOString().slice(0, 16) : '',
      endsAt: coupon.endsAt ? new Date(coupon.endsAt).toISOString().slice(0, 16) : '',
      isActive: coupon.isActive !== false,
      isFirstOrderOnly: Boolean(coupon.isFirstOrderOnly),
      applicablePaymentMethods: Array.isArray(coupon.applicablePaymentMethods)
        ? coupon.applicablePaymentMethods
        : [],
    });
    setSubmitError('');
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingCoupon(null);
    setSubmitError('');
  }, []);

  const handleChangeField = useCallback((field, value) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleTogglePaymentMethod = useCallback((method) => {
    setFormValues((prev) => {
      const selectedMethods = prev.applicablePaymentMethods.includes(method)
        ? prev.applicablePaymentMethods.filter((item) => item !== method)
        : [...prev.applicablePaymentMethods, method];

      return {
        ...prev,
        applicablePaymentMethods: selectedMethods,
      };
    });
  }, []);

  const payload = useMemo(
    () => ({
      code: String(formValues.code || '').trim(),
      title: String(formValues.title || '').trim(),
      description: String(formValues.description || '').trim() || undefined,
      discountType: formValues.discountType,
      discountValue: Number(formValues.discountValue || 0),
      maxDiscountAmount: normalizeNumericField(formValues.maxDiscountAmount),
      minOrderAmount: Number(formValues.minOrderAmount || 0),
      totalUsageLimit: normalizeNumericField(formValues.totalUsageLimit),
      perUserUsageLimit: normalizeNumericField(formValues.perUserUsageLimit),
      startsAt: formValues.startsAt ? new Date(formValues.startsAt).toISOString() : undefined,
      endsAt: formValues.endsAt ? new Date(formValues.endsAt).toISOString() : undefined,
      isActive: Boolean(formValues.isActive),
      isFirstOrderOnly: Boolean(formValues.isFirstOrderOnly),
      applicablePaymentMethods: formValues.applicablePaymentMethods,
    }),
    [formValues]
  );

  const handleSubmit = useCallback(async () => {
    if (!payload.code || !payload.title || payload.discountValue <= 0) {
      setSubmitError('Code, title, and discount value are required.');
      return;
    }

    try {
      setSubmitLoading(true);
      setSubmitError('');

      if (editingCoupon?.id) {
        await axios.patch(endpoints.coupons.update(editingCoupon.id), payload);
        enqueueSnackbar('Coupon updated successfully', {variant: 'success'});
      } else {
        await axios.post(endpoints.coupons.create, payload);
        enqueueSnackbar('Coupon created successfully', {variant: 'success'});
      }

      closeDialog();
      fetchCoupons();
    } catch (error) {
      console.error('Failed to save coupon:', error);
      setSubmitError(error?.message || 'Failed to save coupon');
    } finally {
      setSubmitLoading(false);
    }
  }, [closeDialog, editingCoupon?.id, enqueueSnackbar, fetchCoupons, payload]);

  const handleDeleteCoupon = useCallback(async (coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}?`)) {
      return;
    }

    try {
      await axios.delete(endpoints.coupons.delete(coupon.id));
      enqueueSnackbar('Coupon deleted successfully', {variant: 'success'});
      fetchCoupons();
    } catch (error) {
      console.error('Failed to delete coupon:', error);
      enqueueSnackbar(error?.message || 'Failed to delete coupon', {variant: 'error'});
    }
  }, [enqueueSnackbar, fetchCoupons]);

  const notFound = !loading && coupons.length === 0;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Coupons"
        links={[
          {name: 'Dashboard', href: paths.dashboard.root},
          {name: 'Coupons', href: paths.dashboard.coupon.root},
          {name: 'List'},
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={openCreateDialog}
          >
            New Coupon
          </Button>
        }
        sx={{mb: {xs: 3, md: 5}}}
      />

      <Card>
        <Stack spacing={2} direction={{xs: 'column', md: 'row'}} sx={{p: 2.5}}>
          <TextField
            fullWidth
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              table.onChangePage(null, 0);
            }}
            placeholder="Search by code or title..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{color: 'text.disabled'}} />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            select
            label="Status"
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(event.target.value);
              table.onChangePage(null, 0);
            }}
            sx={{minWidth: 180}}
          >
            {ACTIVE_FILTER_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <TableContainer sx={{position: 'relative', overflow: 'unset'}}>
          <Scrollbar>
            <Table sx={{minWidth: 1100}}>
              <TableHead>
                <TableRow>
                  <TableCell>Coupon</TableCell>
                  <TableCell>Discount</TableCell>
                  <TableCell>Rules</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Schedule</TableCell>
                  <TableCell>Usage</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {coupons.map((coupon) => {
                  const status = getCouponStatus(coupon);

                  return (
                    <TableRow key={coupon.id} hover>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2">{coupon.code}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {coupon.title}
                          </Typography>
                          {!!coupon.description && (
                            <Typography variant="caption" color="text.disabled">
                              {coupon.description}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2">
                            {coupon.discountType === 'percentage'
                              ? `${coupon.discountValue}% off`
                              : `Rs. ${coupon.discountValue} off`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {coupon.maxDiscountAmount
                              ? `Max discount: Rs. ${coupon.maxDiscountAmount}`
                              : 'No cap'}
                          </Typography>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            Min order: Rs. {coupon.minOrderAmount || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Total limit: {coupon.totalUsageLimit || 'Unlimited'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Per user: {coupon.perUserUsageLimit || 'Unlimited'}
                          </Typography>
                          {coupon.isFirstOrderOnly && (
                            <Typography variant="caption" color="warning.main">
                              First order only
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Label color={status.color}>{status.label}</Label>
                      </TableCell>

                      <TableCell>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Start: {formatDateTime(coupon.startsAt)}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          End: {formatDateTime(coupon.endsAt)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">{coupon.usageCount || 0}</Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Stack direction="row" justifyContent="flex-end" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            onClick={() => openEditDialog(coupon)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => handleDeleteCoupon(coupon)}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}

                <TableEmptyRows height={72} emptyRows={Math.max(0, table.rowsPerPage - coupons.length)} />
                <TableNoData notFound={notFound} />
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>

        <TablePaginationCustom
          count={totalCount}
          page={table.page}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md">
        <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{pt: 1}}>
            {!!submitError && <Alert severity="error">{submitError}</Alert>}

            <Stack direction={{xs: 'column', md: 'row'}} spacing={2}>
              <TextField
                fullWidth
                label="Coupon Code"
                value={formValues.code}
                onChange={(event) => handleChangeField('code', event.target.value.toUpperCase())}
                placeholder="e.g. SAVE5"
              />
              <TextField
                fullWidth
                label="Title"
                value={formValues.title}
                onChange={(event) => handleChangeField('title', event.target.value)}
                placeholder="e.g. 5% off up to Rs. 100"
              />
            </Stack>

            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Description"
              value={formValues.description}
              onChange={(event) => handleChangeField('description', event.target.value)}
              placeholder="Internal or storefront campaign description"
            />

            <Stack direction={{xs: 'column', md: 'row'}} spacing={2}>
              <TextField
                select
                fullWidth
                label="Discount Type"
                value={formValues.discountType}
                onChange={(event) => handleChangeField('discountType', event.target.value)}
              >
                {DISCOUNT_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                type="number"
                label={formValues.discountType === 'percentage' ? 'Discount %' : 'Discount Amount'}
                value={formValues.discountValue}
                onChange={(event) => handleChangeField('discountValue', event.target.value)}
              />

              <TextField
                fullWidth
                type="number"
                label="Max Discount Amount"
                value={formValues.maxDiscountAmount}
                onChange={(event) => handleChangeField('maxDiscountAmount', event.target.value)}
                placeholder="Optional"
              />
            </Stack>

            <Stack direction={{xs: 'column', md: 'row'}} spacing={2}>
              <TextField
                fullWidth
                type="number"
                label="Minimum Order Amount"
                value={formValues.minOrderAmount}
                onChange={(event) => handleChangeField('minOrderAmount', event.target.value)}
              />
              <TextField
                fullWidth
                type="number"
                label="Total Usage Limit"
                value={formValues.totalUsageLimit}
                onChange={(event) => handleChangeField('totalUsageLimit', event.target.value)}
                placeholder="Optional"
              />
              <TextField
                fullWidth
                type="number"
                label="Per User Limit"
                value={formValues.perUserUsageLimit}
                onChange={(event) => handleChangeField('perUserUsageLimit', event.target.value)}
                placeholder="Optional"
              />
            </Stack>

            <Stack direction={{xs: 'column', md: 'row'}} spacing={2}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Starts At"
                InputLabelProps={{shrink: true}}
                value={formValues.startsAt}
                onChange={(event) => handleChangeField('startsAt', event.target.value)}
              />
              <TextField
                fullWidth
                type="datetime-local"
                label="Ends At"
                InputLabelProps={{shrink: true}}
                value={formValues.endsAt}
                onChange={(event) => handleChangeField('endsAt', event.target.value)}
              />
            </Stack>

            <Box
              sx={{
                border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.24)}`,
                borderRadius: 1,
                p: 2,
              }}
            >
              <Typography variant="subtitle2" sx={{mb: 1.5}}>
                Applicable Payment Methods
              </Typography>
              <Stack direction={{xs: 'column', md: 'row'}} spacing={1}>
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    control={
                      <Checkbox
                        checked={formValues.applicablePaymentMethods.includes(option.value)}
                        onChange={() => handleTogglePaymentMethod(option.value)}
                      />
                    }
                    label={option.label}
                  />
                ))}
              </Stack>
            </Box>

            <Stack direction={{xs: 'column', md: 'row'}} spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formValues.isActive}
                    onChange={(event) => handleChangeField('isActive', event.target.checked)}
                  />
                }
                label="Active"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formValues.isFirstOrderOnly}
                    onChange={(event) =>
                      handleChangeField('isFirstOrderOnly', event.target.checked)
                    }
                  />
                }
                label="First order only"
              />
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button variant="outlined" color="inherit" onClick={closeDialog}>
            Cancel
          </Button>
          <LoadingButton variant="contained" loading={submitLoading} onClick={handleSubmit}>
            {editingCoupon ? 'Save Changes' : 'Create Coupon'}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
