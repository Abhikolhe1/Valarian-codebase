import { useCallback, useEffect, useState } from 'react';
// @mui
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TextField from '@mui/material/TextField';
import { useNavigate } from 'react-router-dom';
// routes
import { paths } from 'src/routes/paths';
// utils
import axios, { endpoints } from 'src/utils/axios';
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
  useTable,
} from 'src/components/table';
// local
import AdminTableRow from '../admin-table-row';
import AdminQuickEditForm from '../admin-quick-edit-form';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'fullName', label: 'Full Name' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'isActive', label: 'Status' },
  { id: 'createdAt', label: 'Created At' },
  { id: 'actions', label: 'Actions', align: 'right' },
];

// ----------------------------------------------------------------------

export default function AdminListView() {
  const table = useTable({ defaultOrderBy: 'createdAt', defaultOrder: 'desc' });
  const settings = useSettingsContext();
  const navigate = useNavigate();

  const [tableData, setTableData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterSearch, setFilterSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [quickEditOpen, setQuickEditOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filterSearch);
    }, 400);

    return () => clearTimeout(timer);
  }, [filterSearch]);

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const params = {
        page: table.page + 1,
        limit: table.rowsPerPage,
        sortBy: table.orderBy,
        sortOrder: table.order,
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      const response = await axios.get(endpoints.auth.adminList, { params });
      const adminRows = response.data?.admins || response.data?.data || response.data || [];
      const total =
        response.data?.pagination?.total ||
        response.data?.total ||
        (Array.isArray(adminRows) ? adminRows.length : 0);

      setTableData(Array.isArray(adminRows) ? adminRows : []);
      setTotalCount(total);
    } catch (error) {
      console.error('Error fetching admins:', error);
      setTableData([]);
      setTotalCount(0);
      setErrorMessage(error?.message || 'Unable to load admin list right now.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.page, table.rowsPerPage, table.orderBy, table.order, debouncedSearch]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleFilterSearch = useCallback((event) => {
    setFilterSearch(event.target.value);
    table.onChangePage(null, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEditRow = useCallback(
    (id) => {
      navigate(paths.dashboard.admins.edit(id));
    },
    [navigate]
  );

  const handleQuickEditRow = useCallback(
    (row) => {
      setSelectedAdmin(row);
      setQuickEditOpen(true);
    },
    []
  );

  const handleCloseQuickEdit = useCallback(() => {
    setQuickEditOpen(false);
    setSelectedAdmin(null);
  }, []);

  const notFound = !loading && !tableData.length;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Admin List"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Admins', href: paths.dashboard.admins.list },
          { name: 'List' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {!!errorMessage && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Card>
        <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} sx={{ p: 2.5 }}>
          <TextField
            fullWidth
            value={filterSearch}
            onChange={handleFilterSearch}
            placeholder="Search by name, email, or phone..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
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
                      <AdminTableRow
                        key={row.id || row.email}
                        row={row}
                        onQuickEditRow={() => handleQuickEditRow(row)}
                        onEditRow={() => handleEditRow(row.id)}
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

      <AdminQuickEditForm
        currentAdmin={selectedAdmin}
        open={quickEditOpen}
        onClose={handleCloseQuickEdit}
        onUpdated={fetchAdmins}
      />
    </Container>
  );
}
