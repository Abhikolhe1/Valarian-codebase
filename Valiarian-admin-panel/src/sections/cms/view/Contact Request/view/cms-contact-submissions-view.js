import isEqual from 'lodash/isEqual';
import { useState, useMemo, useCallback } from 'react';
// @mui
import { alpha } from '@mui/material/styles';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';

import { useGetContactSubmissions } from 'src/api/contact-submissions';

// routes
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hook';

// hooks
import { useBoolean } from 'src/hooks/use-boolean';

// components
import Label from 'src/components/label';
import Scrollbar from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import UserTableFiltersResult from 'src/sections/user/user-table-filters-result';
import ConatctRequestTableToolbar from '../contact-request-table-toolbar';
import ContactReqestTableRow from '../contact-request-table-row';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'name', label: 'Name' },
  { id: 'contactTokenId', label: 'Token ID', width: 180 },
  { id: 'subject', label: 'Subject', width: 160 },
  { id: 'createdAt', label: 'Created At', width: 160 },
  { id: 'status', label: 'Status', width: 120 },
  { id: 'message', label: 'User Issue', width: 280 },
  { id: 'action', label: 'Action', align: 'right', width: 88 },
  { id: '', width: 88 },
];

const defaultFilters = {
  name: '',
  status: 'all',
};



// ----------------------------------------------------------------------

export default function ContactRequestListView() {
  const table = useTable({
    defaultOrderBy: 'createdAt',
    defaultOrder: 'desc',
    defaultRowsPerPage: 5,
  });
  const settings = useSettingsContext();
  const router = useRouter();
  const confirm = useBoolean();

  const [filters, setFilters] = useState(defaultFilters);

  const { submissions = [], total = 0, submissionsLoading = false } = useGetContactSubmissions({
    page: table.page + 1,
    limit: table.rowsPerPage,
    search: filters.name,
    status: filters.status,
  });

  const tableData = useMemo(() => (Array.isArray(submissions) ? submissions : []), [submissions]);

  const denseHeight = table.dense ? 52 : 72;
  const canReset = !isEqual(defaultFilters, filters);
  const notFound = (!submissionsLoading && !tableData.length);

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

  const handleDeleteRow = useCallback((id) => {
    console.log('Delete row:', id);
  }, []);

  const handleDeleteRows = useCallback(() => {
    console.log('Delete selected rows:', table.selected);
  }, [table.selected]);

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.dashboard.cms.contactSubmissions.edit(id));
    },
    [router]
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

  const TABS = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'replied', label: 'Replied' },
    { value: 'spam', label: 'Spam' },
  ];
  const statusCounts = {
    all: total,
    new: tableData.filter((item) => item.status === 'new').length,
    replied: tableData.filter((item) => item.status === 'replied').length,
    spam: tableData.filter((item) => item.status === 'spam').length,
  };

  return (
    <>
      <Container maxWidth={settings.themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Contact Requests"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'CMS', href: paths.dashboard.cms.root },
            { name: 'Contact Requests' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card>
          <Tabs
            value={filters.status}
            onChange={handleFilterStatus}
            sx={{
              px: 2.5,
              boxShadow: (theme) => `inset 0 -2px 0 0 ${alpha(theme.palette.grey[500], 0.08)}`,
            }}
          >
            {TABS.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                iconPosition="end"
                icon={
                  <Label
                    variant={tab.value === filters.status ? 'filled' : 'soft'}
                    color={
                      (tab.value === 'new' && 'info') ||
                      (tab.value === 'replied' && 'success') ||
                      (tab.value === 'spam' && 'error') ||
                      'default'
                    }
                  >
                    {statusCounts[tab.value] || 0}
                  </Label>
                }
              />
            ))}
          </Tabs>

          <ConatctRequestTableToolbar
            filters={filters}
            onFilters={handleFilters}
          />

          {canReset && (
            <UserTableFiltersResult
              filters={filters}
              onFilters={handleFilters}
              onResetFilters={handleResetFilters}
              results={total}
              sx={{ p: 2.5, pt: 0 }}
            />
          )}

          <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
            {/* <TableSelectedAction
              dense={table.dense}
              numSelected={table.selected.length}
              rowCount={tableData.length}
              // onSelectAllRows={(checked) =>
              //   table.onSelectAllRows(
              //     checked,
              //     tableData.map((row) => row.id)
              //   )
              // }
              // action={
              //   <Tooltip title="Delete">
              //     <IconButton color="primary" onClick={confirm.onTrue}>
              //       <Iconify icon="solar:trash-bin-trash-bold" />
              //     </IconButton>
              //   </Tooltip>
              // }
            /> */}

            <Scrollbar>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headLabel={TABLE_HEAD}
                  rowCount={tableData.length}
                  numSelected={table.selected.length}
                  onSort={table.onSort}
                  // onSelectAllRows={(checked) =>
                  //   table.onSelectAllRows(
                  //     checked,
                  //     tableData.map((row) => row.id)
                  //   )
                  // }
                />

                <TableBody>
                  {tableData.map((row) => (
                    <ContactReqestTableRow
                      key={row.id}
                      row={row}
                      selected={table.selected.includes(row.id)}
                      onSelectRow={() => table.onSelectRow(row.id)}
                      onDeleteRow={() => handleDeleteRow(row.id)}
                      onEditRow={() => handleEditRow(row.id)}
                    />
                  ))}

                  <TableEmptyRows
                    height={denseHeight}
                    emptyRows={emptyRows(0, table.rowsPerPage, tableData.length)}
                  />

                  <TableNoData notFound={notFound} />
                </TableBody>
              </Table>
            </Scrollbar>
          </TableContainer>

          <TablePaginationCustom
            count={total}
            page={table.page}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onRowsPerPageChange={table.onChangeRowsPerPage}
            dense={table.dense}
            onChangeDense={table.onChangeDense}
          />
        </Card>
      </Container>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content={
          <>
            Are you sure want to delete <strong>{table.selected.length}</strong> items?
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              handleDeleteRows();
              confirm.onFalse();
            }}
          >
            Delete
          </Button>
        }
      />
    </>
  );
}
