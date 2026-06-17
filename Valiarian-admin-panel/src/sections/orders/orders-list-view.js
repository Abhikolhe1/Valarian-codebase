import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import { paths } from 'src/routes/paths';
import axios from 'src/utils/axios';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import Iconify from 'src/components/iconify';
import Label from 'src/components/label';
import Scrollbar from 'src/components/scrollbar';
import { useSettingsContext } from 'src/components/settings';
import {
  TableEmptyRows,
  TableHeadCustom,
  TableNoData,
  TablePaginationCustom,
  useTable,
} from 'src/components/table';
import { getOrderStatusColor } from 'src/utils/order-status';
import OrderTableRow from './order-table-row';

const TABLE_HEAD = [
  { id: 'orderNumber', label: 'Order' },
  { id: 'customer', label: 'Customer' },
  { id: 'createdAt', label: 'Date' },
  { id: 'status', label: 'Status' },
  { id: 'paymentStatus', label: 'Payment' },
  { id: 'total', label: 'Total' },
  { id: 'actions', label: 'Actions' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'packed', label: 'Packed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'return_requested', label: 'Return Requested' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'parcel_received', label: 'Parcel Received' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'partially_refunded', label: 'Partially Refunded' },
];

export default function OrdersListView() {
  const table = useTable({ defaultOrderBy: 'createdAt', defaultOrder: 'desc' });
  const settings = useSettingsContext();
  const navigate = useNavigate();

  const [tableData, setTableData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ all: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filterSearch);
    }, 500);

    return () => clearTimeout(timer);
  }, [filterSearch]);

  const fetchOrders = useCallback(async (options = {}) => {
    const { silent = false } = options;
    try {
      if (!silent) {
        setLoading(true);
      }

      const params = {
        page: table.page + 1,
        limit: table.rowsPerPage,
        sortBy: table.orderBy,
        sortOrder: table.order,
      };

      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (filterPaymentStatus !== 'all') {
        params.paymentStatus = filterPaymentStatus;
      }

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      const response = await axios.get('/api/admin/orders', { params });
      setTableData(response.data.orders || []);
      setTotalCount(response.data.pagination?.total || 0);
      setStatusCounts(response.data.counts || { all: 0 });
    } catch (error) {
      console.error('Error fetching orders:', error);
      setTableData([]);
      setTotalCount(0);
      setStatusCounts({ all: 0 });
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [debouncedSearch, filterPaymentStatus, filterStatus, table.order, table.orderBy, table.page, table.rowsPerPage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders({ silent: true });
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleFilterStatus = useCallback((event, value) => {
    setFilterStatus(value);
    table.onChangePage(null, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterPaymentStatus = useCallback((event) => {
    setFilterPaymentStatus(event.target.value);
    table.onChangePage(null, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterSearch = useCallback((event) => {
    setFilterSearch(event.target.value);
    table.onChangePage(null, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewRow = useCallback((id) => {
    navigate(paths.dashboard.order.details(id));
  }, [navigate]);

  const notFound = !loading && !tableData.length;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Orders"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Orders', href: paths.dashboard.order.root },
          { name: 'List' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <Tabs
          value={filterStatus}
          onChange={handleFilterStatus}
          sx={{
            px: 2.5,
            boxShadow: (theme) => `inset 0 -2px 0 0 ${alpha(theme.palette.grey[500], 0.08)}`,
          }}
        >
          {STATUS_OPTIONS.map((option) => (
            <Tab
              key={option.value}
              value={option.value}
              label={option.label}
              iconPosition="end"
              icon={
                <Label
                  variant={((option.value === 'all' || option.value === filterStatus) && 'filled') || 'soft'}
                  color={option.value === 'all' ? 'default' : getOrderStatusColor(option.value)}
                >
                  {statusCounts[option.value] || 0}
                </Label>
              }
            />
          ))}
        </Tabs>

        <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} sx={{ p: 2.5 }}>
          <TextField
            fullWidth
            value={filterSearch}
            onChange={handleFilterSearch}
            placeholder="Search by order number..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            select
            fullWidth
            label="Payment Status"
            value={filterPaymentStatus}
            onChange={handleFilterPaymentStatus}
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  sx: { maxHeight: 240 },
                },
              },
            }}
            sx={{ maxWidth: { md: 220 } }}
          >
            {PAYMENT_STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headLabel={TABLE_HEAD}
                rowCount={tableData.length}
                onSort={table.onSort}
              />

              <TableBody>
                {loading ? (
                  <TableEmptyRows height={72} emptyRows={table.rowsPerPage} />
                ) : (
                  <>
                    {tableData.map((row) => (
                      <OrderTableRow
                        key={row.id}
                        row={row}
                        onViewRow={() => handleViewRow(row.id)}
                        onRefresh={fetchOrders}
                      />
                    ))}

                    <TableNoData notFound={notFound} />
                  </>
                )}
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
    </Container>
  );
}
