import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// @mui
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TextField from '@mui/material/TextField';
// routes
import { paths } from 'src/routes/paths';
// utils
import axios from 'src/utils/axios';
// components
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import { useSettingsContext } from 'src/components/settings';
import {
  TableEmptyRows,
  TableHeadCustom,
  TableNoData,
  TablePaginationCustom,
  useTable
} from 'src/components/table';
//
import OrderTableRow from './order-table-row';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'orderNumber', label: 'Order'},
  { id: 'customer', label: 'Customer'},
  { id: 'createdAt', label: 'Date'},
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
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
  { value: 'refunded', label: 'Refunded' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'partially_refunded', label: 'Partially Refunded' },
];

// ----------------------------------------------------------------------

export default function OrdersListView() {
  const table = useTable({ defaultOrderBy: 'createdAt', defaultOrder: 'desc' });
  const settings = useSettingsContext();
  const navigate = useNavigate();

  const [tableData, setTableData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filterSearch);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [filterSearch]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: table.page + 1,
        limit: table.rowsPerPage,
        sortBy: table.orderBy,
        sortOrder: table.order,
      };

      if (filterStatus && filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (filterPaymentStatus && filterPaymentStatus !== 'all') {
        params.paymentStatus = filterPaymentStatus;
      }

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      const response = await axios.get('/api/admin/orders', { params });

      console.log("FULL RESPONSE:", response.data);
      console.log("ORDERS:", response.data.orders);

      setTableData(response.data.orders || []);

      setTotalCount(response.data.pagination?.total || 0);
      console.log("TOTAL:", response.data.pagination.total);
      console.log("ROW COUNT:", table.rowCount);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.page, table.rowsPerPage, table.orderBy, table.order, filterStatus, filterPaymentStatus, debouncedSearch]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);


  console.log('daaaaaaa', tableData)

  const handleFilterStatus = useCallback((event) => {
    setFilterStatus(event.target.value);
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
    console.log('🔍 Viewing order with ID:', id);
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
        <Stack
          spacing={2}
          direction={{ xs: 'column', md: 'row' }}
          sx={{ p: 2.5 }}
        >
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
            label="Order Status"
            value={filterStatus}
            onChange={handleFilterStatus}
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  sx: { maxHeight: 240 },
                },
              },
            }}
            sx={{
              maxWidth: { md: 200 },
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

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
            sx={{
              maxWidth: { md: 200 },
            }}
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
