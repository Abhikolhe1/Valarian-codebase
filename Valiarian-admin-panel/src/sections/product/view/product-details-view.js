import { useCallback, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
// routes
import { RouterLink } from 'src/routes/components';
import { useParams, useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
import { mutate } from 'swr';
// api
import { useGetProduct } from 'src/api/product';
// utils
import axiosInstance, { endpoints } from 'src/utils/axios';
// components
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import EmptyContent from 'src/components/empty-content';
import Iconify from 'src/components/iconify';
import Image from 'src/components/image';
import Lightbox, { useLightBox } from 'src/components/lightbox';
import { useSettingsContext } from 'src/components/settings';
import { ProductDetailsSkeleton } from '../product-skeleton';

// ----------------------------------------------------------------------

export default function ProductDetailsView() {
  const params = useParams();
  const router = useRouter();

  const { id } = params;

  const { product, productLoading, productError } = useGetProduct(`${id}`);

  const settings = useSettingsContext();

  const [currentTab, setCurrentTab] = useState('details');

  const slides = product?.images?.map((img) => ({ src: img })) || [];

  const lightbox = useLightBox(slides);

  const handleChangeTab = useCallback((event, newValue) => {
    setCurrentTab(newValue);
  }, []);

  const handlePublish = async () => {
    try {
      await axiosInstance.patch(endpoints.products.publish(id));
      // Revalidate SWR
      mutate(endpoints.products.details(id));
      mutate((key) => typeof key === 'string' && key.startsWith(endpoints.products.list));
      router.push(paths.dashboard.product.root);
    } catch (error) {
      console.error('Error publishing product:', error);
    }
  };

  const handleArchive = async () => {
    try {
      await axiosInstance.patch(endpoints.products.archive(id));
      // Revalidate SWR
      mutate(endpoints.products.details(id));
      mutate((key) => typeof key === 'string' && key.startsWith(endpoints.products.list));
      router.push(paths.dashboard.product.root);
    } catch (error) {
      console.error('Error archiving product:', error);
    }
  };

  const renderSkeleton = <ProductDetailsSkeleton />;

  const renderError = (
    <EmptyContent
      filled
      title={`${productError?.message || 'Product not found'}`}
      action={
        <Button
          component={RouterLink}
          href={paths.dashboard.product.root}
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={16} />}
          sx={{ mt: 3 }}
        >
          Back to List
        </Button>
      }
      sx={{ py: 10 }}
    />
  );

  const renderProduct = product && (
    <>
      <CustomBreadcrumbs
        heading="Product Details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Products', href: paths.dashboard.product.root },
          { name: product.name },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              component={RouterLink}
              href={paths.dashboard.product.edit(id)}
              variant="contained"
              startIcon={<Iconify icon="solar:pen-bold" />}
            >
              Edit
            </Button>
            {product.status === 'draft' && (
              <Button
                variant="contained"
                color="success"
                onClick={handlePublish}
                startIcon={<Iconify icon="solar:check-circle-bold" />}
              >
                Publish
              </Button>
            )}
            {product.status === 'published' && (
              <Button
                variant="outlined"
                color="warning"
                onClick={handleArchive}
                startIcon={<Iconify icon="solar:archive-bold" />}
              >
                Archive
              </Button>
            )}
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        <Grid xs={12} md={6} lg={7}>
          <Card sx={{ p: 3 }}>
            {product.coverImage && (
              <Image
                src={product.coverImage}
                alt={product.name}
                ratio="1/1"
                sx={{ borderRadius: 1.5, mb: 3, cursor: 'pointer' }}
                onClick={() => lightbox.onOpen(product.coverImage)}
              />
            )}

            {product.images && product.images.length > 0 && (
              <Box
                gap={1}
                display="grid"
                gridTemplateColumns="repeat(4, 1fr)"
              >
                {product.images.map((img, index) => (
                  <Image
                    key={index}
                    src={img}
                    alt={`${product.name} ${index + 1}`}
                    ratio="1/1"
                    sx={{ borderRadius: 1, cursor: 'pointer' }}
                    onClick={() => lightbox.onOpen(img)}
                  />
                ))}
              </Box>
            )}
          </Card>
        </Grid>

        <Grid xs={12} md={6} lg={5}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip
                  label={product.status}
                  color={
                    (product.status === 'published' && 'success') ||
                    (product.status === 'draft' && 'default') ||
                    'warning'
                  }
                  size="small"
                />
                {product.isNewArrival && <Chip label="New Arrival" color="info" size="small" />}
                {product.isBestSeller && <Chip label="Best Seller" color="success" size="small" />}
                {product.isFeatured && <Chip label="Featured" color="warning" size="small" />}
              </Stack>

              <Typography variant="h4">{product.name}</Typography>

              {product.shortDescription && (
                <Typography variant="body2" color="text.secondary">
                  {product.shortDescription}
                </Typography>
              )}

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Stack direction="row" alignItems="center" spacing={2}>
                {product.salePrice && product.salePrice < product.price ? (
                  <>
                    <Typography variant="h3" color="error">
                      ₹{product.salePrice}
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{ textDecoration: 'line-through', color: 'text.disabled' }}
                    >
                      ₹{product.price}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="h3">₹{product.price}</Typography>
                )}
              </Stack>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2">SKU:</Typography>
                  <Typography variant="body2">{product.sku || 'N/A'}</Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2">Stock:</Typography>
                  <Chip
                    label={product.inStock ? `${product.stockQuantity} in stock` : 'Out of stock'}
                    color={product.inStock ? 'success' : 'error'}
                    size="small"
                  />
                </Stack>

                {product.colors && product.colors.length > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="subtitle2">Colors:</Typography>
                    <Stack direction="row" spacing={0.5}>
                      {product.colors.map((color, index) => (
                        <Box
                          key={index}
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            bgcolor: color,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        />
                      ))}
                    </Stack>
                  </Stack>
                )}

                {product.sizes && product.sizes.length > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="subtitle2">Sizes:</Typography>
                    <Stack direction="row" spacing={0.5}>
                      {product.sizes.map((size, index) => (
                        <Chip key={index} label={size} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Stack>
                )}

                {product.categories && product.categories.length > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="subtitle2">Categories:</Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {product.categories.map((cat, index) => (
                        <Chip key={index} label={cat} size="small" />
                      ))}
                    </Stack>
                  </Stack>
                )}

                {product.tags && product.tags.length > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="subtitle2">Tags:</Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {product.tags.map((tag, index) => (
                        <Chip key={index} label={tag} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Stack>
                )}
              </Stack>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleChangeTab}
          sx={{
            px: 3,
            boxShadow: (theme) => `inset 0 -2px 0 0 ${alpha(theme.palette.grey[500], 0.08)}`,
          }}
        >
          <Tab value="details" label="Details" />
          <Tab value="description" label="Description" />
          {product.seoTitle && <Tab value="seo" label="SEO" />}
        </Tabs>

        {currentTab === 'details' && (
          <Stack spacing={3} sx={{ p: 3 }}>
            <Stack direction="row" spacing={2}>
              <Typography variant="subtitle2" sx={{ minWidth: 150 }}>
                Created At:
              </Typography>
              <Typography variant="body2">
                {new Date(product.createdAt).toLocaleString()}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Typography variant="subtitle2" sx={{ minWidth: 150 }}>
                Updated At:
              </Typography>
              <Typography variant="body2">
                {new Date(product.updatedAt).toLocaleString()}
              </Typography>
            </Stack>

            {product.publishedAt && (
              <Stack direction="row" spacing={2}>
                <Typography variant="subtitle2" sx={{ minWidth: 150 }}>
                  Published At:
                </Typography>
                <Typography variant="body2">
                  {new Date(product.publishedAt).toLocaleString()}
                </Typography>
              </Stack>
            )}

            <Stack direction="row" spacing={2}>
              <Typography variant="subtitle2" sx={{ minWidth: 150 }}>
                View Count:
              </Typography>
              <Typography variant="body2">{product.viewCount || 0}</Typography>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Typography variant="subtitle2" sx={{ minWidth: 150 }}>
                Sold Count:
              </Typography>
              <Typography variant="body2">{product.soldCount || 0}</Typography>
            </Stack>

            {product.trackInventory && (
              <Stack direction="row" spacing={2}>
                <Typography variant="subtitle2" sx={{ minWidth: 150 }}>
                  Low Stock Threshold:
                </Typography>
                <Typography variant="body2">{product.lowStockThreshold || 0}</Typography>
              </Stack>
            )}
          </Stack>
        )}

        {currentTab === 'description' && (
          <Box sx={{ p: 3 }}>
            {product.description ? (
              <div dangerouslySetInnerHTML={{ __html: product.description }} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                No description available
              </Typography>
            )}
          </Box>
        )}

        {currentTab === 'seo' && (
          <Stack spacing={3} sx={{ p: 3 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">SEO Title:</Typography>
              <Typography variant="body2">{product.seoTitle || 'N/A'}</Typography>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle2">SEO Description:</Typography>
              <Typography variant="body2">{product.seoDescription || 'N/A'}</Typography>
            </Stack>

            {product.seoKeywords && product.seoKeywords.length > 0 && (
              <Stack spacing={1}>
                <Typography variant="subtitle2">SEO Keywords:</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {product.seoKeywords.map((keyword, index) => (
                    <Chip key={index} label={keyword} size="small" />
                  ))}
                </Stack>
              </Stack>
            )}

            <Stack spacing={1}>
              <Typography variant="subtitle2">Product URL:</Typography>
              <Typography variant="body2" color="primary">
                /products/{product.slug}
              </Typography>
            </Stack>
          </Stack>
        )}
      </Card>

      <Lightbox
        index={lightbox.selected}
        slides={slides}
        open={lightbox.open}
        close={lightbox.onClose}
      />
    </>
  );

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      {productLoading && renderSkeleton}

      {productError && renderError}

      {product && renderProduct}
    </Container>
  );
}
