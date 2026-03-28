import isEqual from 'lodash/isEqual';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { alpha } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import { paths } from 'src/routes/paths';
import { useSnackbar } from 'src/components/snackbar';
import Label from 'src/components/label';
import Scrollbar from 'src/components/scrollbar';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';
import { getUsers, updateUserStatus } from 'src/api/users';
import UserTableRow from '../user-table-row';
import UserTableToolbar from '../user-table-toolbar';
import UserTableFiltersResult from '../user-table-filters-result';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'blocked', label: 'Blocked' },
];

const TABLE_HEAD = [
  { id: 'fullName', label: 'Name' },
  { id: 'phone', label: 'Phone Number', width: 180 },
  { id: 'role', label: 'Role', width: 180 },
  { id: 'createdAt', label: 'Created', width: 180 },
  { id: 'lastLoginAt', label: 'Last Login', width: 180 },
  { id: 'status', label: 'Status', width: 120 },
  { id: '', width: 88 },
];

const defaultFilters = {
  name: '',
  role: ['user'],
  status: 'all',
};

// ----------------------------------------------------------------------

export default function UserListView() {
  const table = useTable({ defaultOrderBy: 'createdAt', defaultOrder: 'desc' });
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const [tableData, setTableData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({ all: 0, active: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  const roleOptions = useMemo(() => ['user'], []);

  const canReset = !isEqual(defaultFilters, filters);
  const notFound = !loading && !tableData.length;

  const handleFilters = useCallback(
    (name, value) => {
      table.onResetPage();
      setFilters((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    },
    [table]
  );

  const handleFilterStatus = useCallback(
    (event, newValue) => {
      handleFilters('status', newValue);
    },
    [handleFilters]
  );

  const handleResetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const response = await getUsers({
        page: table.page + 1,
        limit: table.rowsPerPage,
        search: filters.name || undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        sortBy: table.orderBy,
        sortOrder: table.order.toUpperCase(),
      });

      setTableData(response?.users || []);
      setTotalCount(response?.pagination?.total || 0);
      setCounts(response?.counts || { all: 0, active: 0, blocked: 0 });
    } catch (error) {
      setTableData([]);
      setTotalCount(0);
      setCounts({ all: 0, active: 0, blocked: 0 });
      setErrorMessage(error?.message || 'Unable to load users right now.');
    } finally {
      setLoading(false);
    }
  }, [filters.name, filters.status, table.order, table.orderBy, table.page, table.rowsPerPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleBlock = useCallback(
    async (user) => {
      try {
        await updateUserStatus(user.id, user.status !== 'active');
        enqueueSnackbar(
          user.status === 'active' ? 'User blocked successfully.' : 'User unblocked successfully.',
          { variant: 'success' }
        );
        fetchUsers();
      } catch (error) {
        enqueueSnackbar(error?.message || 'Unable to update user status right now.', {
          variant: 'error',
        });
      }
    },
    [enqueueSnackbar, fetchUsers]
  );

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Users"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Users', href: paths.dashboard.user.list },
          { name: 'List' },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      {!!errorMessage && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Card>
        <Tabs
          value={filters.status}
          onChange={handleFilterStatus}
          sx={{
            px: 2.5,
            boxShadow: (theme) => `inset 0 -2px 0 0 ${alpha(theme.palette.grey[500], 0.08)}`,
          }}
        >
          {STATUS_OPTIONS.map((tab) => (
            <Tab
              key={tab.value}
              iconPosition="end"
              value={tab.value}
              label={tab.label}
              icon={
                <Label
                  variant={((tab.value === 'all' || tab.value === filters.status) && 'filled') || 'soft'}
                  color={
                    (tab.value === 'active' && 'success') ||
                    (tab.value === 'blocked' && 'error') ||
                    'default'
                  }
                >
                  {tab.value === 'all' && counts.all}
                  {tab.value === 'active' && counts.active}
                  {tab.value === 'blocked' && counts.blocked}
                </Label>
              }
            />
          ))}
        </Tabs>

        <UserTableToolbar filters={filters} onFilters={handleFilters} roleOptions={roleOptions} />

        {canReset && (
          <UserTableFiltersResult
            filters={filters}
            onFilters={handleFilters}
            onResetFilters={handleResetFilters}
            results={totalCount}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}

        <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1080 }}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headLabel={TABLE_HEAD}
                rowCount={tableData.length}
                onSort={table.onSort}
              />

              <TableBody>
                {tableData.map((row) => (
                  <UserTableRow key={row.id} row={row} onToggleBlock={handleToggleBlock} />
                ))}

                <TableEmptyRows height={table.dense ? 52 : 72} emptyRows={loading ? table.rowsPerPage : 0} />

                <TableNoData notFound={notFound} />
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>

        <Stack sx={{ px: 2.5, pb: 2 }}>
          <TablePaginationCustom
            count={totalCount}
            page={table.page}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onRowsPerPageChange={table.onChangeRowsPerPage}
            dense={table.dense}
            onChangeDense={table.onChangeDense}
          />
        </Stack>
      </Card>
    </Container>
  );
}
