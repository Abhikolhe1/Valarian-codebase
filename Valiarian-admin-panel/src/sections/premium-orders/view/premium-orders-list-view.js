import { alpha } from '@mui/material/styles';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { emptyRows } from 'src/components/table/utils';
import { paths } from 'src/routes/paths';
import axios from 'src/utils/axios';
import PremiumOrderTableRow from '../premium-order-table-row';

const TABLE_HEAD = [
  { id: 'preorderNumber', label: 'Preorder' },
  { id: 'customer', label: 'Customer' },
  { id: 'product', label: 'Product' },
  { id: 'variant', label: 'Variant' },
  { id: 'createdAt', label: 'Date' },
  { id: 'status', label: 'Status' },
  { id: 'paymentStatus', label: 'Payment' },
  { id: 'total', label: 'Total' },
  { id: 'actions', label: 'Actions' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'initiated', label: 'Initiated' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'payment_failed', label: 'Payment Failed' },
  { value: 'payment_review', label: 'Payment Review' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'ready_to_fulfill', label: 'Ready to Fulfill' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'created', label: 'Created' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const getChipColor = (value) => {
  switch (value) {
    case 'paid':
    case 'fulfilled':
      return 'success';
    case 'payment_review':
      return 'warning';
    case 'ready_to_fulfill':
    case 'reserved':
      return 'warning';
    case 'failed':
    case 'payment_failed':
    case 'cancelled':
      return 'error';
    case 'refunded':
      return 'info';
    default:
      return 'default';
  }
};

export default function PremiumOrdersListView() {
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
    }, 400);

    return () => clearTimeout(timer);
  }, [filterSearch]);

  const fetchPreorders = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        page: table.page + 1,
        limit: table.rowsPerPage,
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

      const response = await axios.get('/api/admin/premium-preorders', { params });
      setTableData(response.data.preorders || []);
      setTotalCount(response.data.pagination?.total || 0);
      setStatusCounts(response.data.counts || { all: 0 });
    } catch (error) {
      console.error('Failed to load premium preorders:', error);
      setTableData([]);
      setTotalCount(0);
      setStatusCounts({ all: 0 });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterPaymentStatus, filterStatus, table.page, table.rowsPerPage]);

  useEffect(() => {
    fetchPreorders();
  }, [fetchPreorders]);

  const notFound = !loading && !tableData.length;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Premium Orders"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Premium Orders', href: paths.dashboard.premiumOrder.root },
          { name: 'List' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <Tabs
          value={filterStatus}
          onChange={(event, value) => {
            setFilterStatus(value);
            table.onChangePage(null, 0);
          }}
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
                  color={option.value === 'all' ? 'default' : getChipColor(option.value)}
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
            onChange={(event) => {
              setFilterSearch(event.target.value);
              table.onChangePage(null, 0);
            }}
            placeholder="Search by preorder number..."
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
            onChange={(event) => {
              setFilterPaymentStatus(event.target.value);
              table.onChangePage(null, 0);
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
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1200 }}>
              <TableHeadCustom headLabel={TABLE_HEAD} />
              <TableBody>
                {tableData.map((row) => (
                  <PremiumOrderTableRow
                    key={row.id}
                    row={row}
                    onViewRow={() => navigate(paths.dashboard.premiumOrder.details(row.id))}
                  />
                ))}

                <TableEmptyRows height={72} emptyRows={emptyRows(table.page, table.rowsPerPage, tableData.length)} />
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
    </Container>
  );
}
