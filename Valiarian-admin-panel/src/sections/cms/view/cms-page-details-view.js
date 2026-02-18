import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
// routes
import { paths } from 'src/routes/paths';
// api
import { useGetPage } from 'src/api/cms-pages';
// components
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { LoadingScreen } from 'src/components/loading-screen';
import { useSettingsContext } from 'src/components/settings';
// utils
import { fDateTime } from 'src/utils/format-time';

// ----------------------------------------------------------------------

export default function CMSPageDetailsView({ id }) {
  const settings = useSettingsContext();

  // Use the hook to fetch page data
  const { page: currentPage, pageLoading: loading, pageError: error } = useGetPage(id);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <Container maxWidth={settings.themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Page Details"
          links={[
            {
              name: 'Dashboard',
              href: paths.dashboard.root,
            },
            {
              name: 'CMS',
              href: paths.dashboard.cms.root,
            },
            {
              name: 'Pages',
              href: paths.dashboard.cms.pages.list,
            },
            { name: 'Details' },
          ]}
          sx={{
            mb: { xs: 3, md: 5 },
          }}
        />
        <div>Error: {error?.message || 'Failed to load page'}</div>
      </Container>
    );
  }

  const renderBasicInfo = (
    <Card>
      <CardHeader title="Basic Information" />
      <Stack spacing={3} sx={{ p: 3 }}>
        <TextField
          fullWidth
          label="Title"
          value={currentPage?.title || ''}
          disabled
        />

        <TextField
          fullWidth
          label="Slug"
          value={currentPage?.slug || ''}
          disabled
        />

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Description"
          value={currentPage?.description || ''}
          disabled
        />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Status
          </Typography>
          <Chip
            label={currentPage?.status || 'draft'}
            color={
              (() => {
                if (currentPage?.status === 'published') return 'success';
                if (currentPage?.status === 'scheduled') return 'warning';
                return 'default';
              })()
            }
            size="small"
          />
        </Box>

        {currentPage?.publishedAt && (
          <TextField
            fullWidth
            label="Published At"
            value={fDateTime(currentPage.publishedAt)}
            disabled
          />
        )}

        {currentPage?.scheduledAt && (
          <TextField
            fullWidth
            label="Scheduled At"
            value={fDateTime(currentPage.scheduledAt)}
            disabled
          />
        )}
      </Stack>
    </Card>
  );

  const renderSEO = (
    <Card>
      <CardHeader title="SEO Settings" />
      <Stack spacing={3} sx={{ p: 3 }}>
        <TextField
          fullWidth
          label="SEO Title"
          value={currentPage?.seoTitle || ''}
          disabled
        />

        <TextField
          fullWidth
          multiline
          rows={3}
          label="SEO Description"
          value={currentPage?.seoDescription || ''}
          disabled
        />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            SEO Keywords
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {currentPage?.seoKeywords?.length > 0 ? (
              currentPage.seoKeywords.map((keyword, index) => (
                <Chip key={index} label={keyword} size="small" />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No keywords
              </Typography>
            )}
          </Stack>
        </Box>

        {currentPage?.ogImage && (
          <TextField
            fullWidth
            label="OG Image"
            value={currentPage.ogImage}
            disabled
          />
        )}

        {currentPage?.ogImageAlt && (
          <TextField
            fullWidth
            label="OG Image Alt"
            value={currentPage.ogImageAlt}
            disabled
          />
        )}
      </Stack>
    </Card>
  );

  const renderMetadata = (
    <Card>
      <CardHeader title="Metadata" />
      <Stack spacing={2} sx={{ p: 3 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            ID
          </Typography>
          <Typography variant="body2">{currentPage?.id}</Typography>
        </Box>

        <Divider />

        <Box>
          <Typography variant="caption" color="text.secondary">
            Version
          </Typography>
          <Typography variant="body2">{currentPage?.version || 1}</Typography>
        </Box>

        <Divider />

        <Box>
          <Typography variant="caption" color="text.secondary">
            Created At
          </Typography>
          <Typography variant="body2">
            {currentPage?.createdAt ? fDateTime(currentPage.createdAt) : '-'}
          </Typography>
        </Box>

        <Divider />

        <Box>
          <Typography variant="caption" color="text.secondary">
            Updated At
          </Typography>
          <Typography variant="body2">
            {currentPage?.updatedAt ? fDateTime(currentPage.updatedAt) : '-'}
          </Typography>
        </Box>

        {currentPage?.createdBy && (
          <>
            <Divider />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Created By
              </Typography>
              <Typography variant="body2">{currentPage.createdBy}</Typography>
            </Box>
          </>
        )}

        {currentPage?.updatedBy && (
          <>
            <Divider />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Updated By
              </Typography>
              <Typography variant="body2">{currentPage.updatedBy}</Typography>
            </Box>
          </>
        )}
      </Stack>
    </Card>
  );

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Page Details"
        links={[
          {
            name: 'Dashboard',
            href: paths.dashboard.root,
          },
          {
            name: 'CMS',
            href: paths.dashboard.cms.root,
          },
          {
            name: 'Pages',
            href: paths.dashboard.cms.pages.list,
          },
          { name: currentPage?.title || 'Details' },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Stack spacing={3}>
            {renderBasicInfo}
            {renderSEO}
          </Stack>
        </Grid>

        <Grid xs={12} md={4}>
          {renderMetadata}
        </Grid>
      </Grid>
    </Container>
  );
}

CMSPageDetailsView.propTypes = {
  id: PropTypes.string,
};
