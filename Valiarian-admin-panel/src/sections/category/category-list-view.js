import PropTypes from 'prop-types';
import { useCallback } from 'react';
// @mui
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
// routes
import { RouterLink } from 'src/routes/components';
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// utils
import axios, { endpoints } from 'src/utils/axios';
// hooks
// api
import { useGetCategories, useGetParentCategories } from 'src/api/category';
// components
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import { useSettingsContext } from 'src/components/settings';
import {
  emptyRows,
  TableEmptyRows,
  TableHeadCustom,
  TableNoData,
  TablePaginationCustom,
  TableSkeleton,
  useTable,
} from 'src/components/table';
//
import CategoryTableRow from './category-table-row';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'name', label: 'Category' },
  { id: 'parentId', label: 'Parent' },
  { id: 'slug', label: 'Slug' },
  { id: 'isActive', label: 'Status' },
  { id: 'action', label: 'Actions', align: 'right' },
];

// ----------------------------------------------------------------------

export default function CategoryListView({ isParentCategory = false }) {
  const router = useRouter();
  const table = useTable();
  const settings = useSettingsContext();

  const { categories, categoriesLoading, categoriesEmpty, mutate } = useGetCategories(
    !isParentCategory
  );
  const {
    parentCategories,
    parentCategoriesLoading,
    parentCategoriesEmpty,
    mutate: mutateParentCategories,
  } = useGetParentCategories(isParentCategory);

  const rows = isParentCategory ? parentCategories : categories;
  const rowsLoading = isParentCategory ? parentCategoriesLoading : categoriesLoading;
  const rowsEmpty = isParentCategory ? parentCategoriesEmpty : categoriesEmpty;
  const handleMutate = isParentCategory ? mutateParentCategories : mutate;
  const tableHead = isParentCategory
    ? [
        { id: 'name', label: 'Parent Category' },
        { id: 'slug', label: 'Slug' },
        { id: 'isActive', label: 'Status' },
        { id: 'action', label: 'Actions', align: 'right' },
      ]
    : TABLE_HEAD;
  const createPath = isParentCategory
    ? paths.dashboard.parentCategory.new
    : paths.dashboard.category.new;
  const editPath = isParentCategory
    ? paths.dashboard.parentCategory.edit
    : paths.dashboard.category.edit;
  const breadcrumbLabel = isParentCategory ? 'Parent Category' : 'Category';
  const heading = isParentCategory ? 'Parent Category List' : 'Category List';
  const createLabel = isParentCategory ? 'New Parent Category' : 'New Category';

  const denseHeight = table.dense ? 60 : 80;

  const handleDeleteRow = useCallback(
    async (id) => {
      try {
        if (isParentCategory) {
          await axios.delete(`${endpoints.parentCategory.list}/${id}`);
        } else {
          await axios.delete(`${endpoints.category.list}/${id}`);
        }

        handleMutate();
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    },
    [handleMutate, isParentCategory]
  );

  const handleEditRow = useCallback(
    (id) => {
      router.push(editPath(id));
    },
    [editPath, router]
  );

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading={heading}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          {
            name: breadcrumbLabel,
            href: isParentCategory
              ? paths.dashboard.parentCategory.root
              : paths.dashboard.category.root,
          },
          { name: 'List' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={createPath}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            {createLabel}
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headLabel={tableHead}
                rowCount={rows.length}
                numSelected={table.selected.length}
                onSort={table.onSort}
              />

              <TableBody>
                {rowsLoading
                  ? [...Array(table.rowsPerPage)].map((i, index) => (
                      <TableSkeleton key={index} sx={{ height: denseHeight }} />
                    ))
                  : rows
                      .slice(
                        table.page * table.rowsPerPage,
                        table.page * table.rowsPerPage + table.rowsPerPage
                      )
                      .map((row) => (
                        <CategoryTableRow
                          key={row.id}
                          row={row}
                          isParentCategory={isParentCategory}
                          selected={table.selected.includes(row.id)}
                          onSelectRow={() => table.onSelectRow(row.id)}
                          onDeleteRow={() => handleDeleteRow(row.id)}
                          onEditRow={() => handleEditRow(row.id)}
                        />
                      ))}

                <TableEmptyRows
                  height={denseHeight}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, rows.length)}
                />

                <TableNoData notFound={rowsEmpty} />
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>

        <TablePaginationCustom
          count={rows.length}
          page={table.page}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onRowsPerPageChange={table.onChangeRowsPerPage}
          //
          dense={table.dense}
          onChangeDense={table.onChangeDense}
        />
      </Card>
    </Container>
  );
}

CategoryListView.propTypes = {
  isParentCategory: PropTypes.bool,
};
