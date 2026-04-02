import { useEffect, useMemo, useState } from 'react';
import LoadingButton from '@mui/lab/LoadingButton';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useSWRConfig } from 'swr';
import { useGetPages } from 'src/api/cms-pages';
import { useGetSections } from 'src/api/cms-sections';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { useSnackbar } from 'src/components/snackbar';
import { useSettingsContext } from 'src/components/settings';
import { paths } from 'src/routes/paths';
import axiosInstance, { endpoints } from 'src/utils/axios';
import CMSSectionList from '../cms-section-list';

const PREMIUM_PAGE_PAYLOAD = {
  slug: 'premium',
  title: 'Premium',
  description: 'Premium landing page content',
  status: 'draft',
  seoTitle: 'Premium - Valiarian',
  seoDescription: 'Premium collection landing page',
  seoKeywords: ['premium', 'valiarian', 'collection'],
};

export default function CMSPremiumView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const { mutate } = useSWRConfig();
  const { pages, pagesLoading } = useGetPages();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [localSections, setLocalSections] = useState([]);
  const [resolvedPremiumPage, setResolvedPremiumPage] = useState(null);
  const [initializationError, setInitializationError] = useState('');

  const premiumPage = useMemo(
    () => pages.find((page) => page.slug === 'premium') || null,
    [pages]
  );

  const effectivePremiumPage = resolvedPremiumPage || premiumPage;

  const { sections, sectionsLoading } = useGetSections(
    effectivePremiumPage ? { pageId: effectivePremiumPage.id } : null
  );

  useEffect(() => {
    if (sections) {
      setLocalSections(sections);
    }
  }, [sections]);

  useEffect(() => {
    if (premiumPage) {
      setResolvedPremiumPage(premiumPage);
      setInitializationError('');
    }
  }, [premiumPage]);

  const isPremiumActive = effectivePremiumPage?.status === 'published';

  useEffect(() => {
    let isMounted = true;

    async function ensurePremiumPage() {
      if (pagesLoading || effectivePremiumPage || isInitializing) {
        return;
      }

      try {
        setIsInitializing(true);
        setInitializationError('');
        const response = await axiosInstance.post(endpoints.cms.pages.list, PREMIUM_PAGE_PAYLOAD);
        const createdPage = response?.data;

        if (isMounted && createdPage?.id) {
          setResolvedPremiumPage(createdPage);
        }

        await mutate(endpoints.cms.pages.list);
        if (isMounted) {
          enqueueSnackbar('Premium CMS initialized successfully.', { variant: 'success' });
        }
      } catch (error) {
        if (isMounted) {
          const message =
            error?.error?.message || error?.message || 'Failed to initialize premium CMS.';
          setInitializationError(message);
          enqueueSnackbar(error?.error?.message || 'Failed to initialize premium CMS.', {
            variant: 'error',
          });
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    ensurePremiumPage();

    return () => {
      isMounted = false;
    };
  }, [effectivePremiumPage, enqueueSnackbar, isInitializing, mutate, pagesLoading]);

  const isLoading =
    pagesLoading || isInitializing || (Boolean(effectivePremiumPage) && sectionsLoading);
  let content = (
    <Alert severity="error">
      <Typography variant="body2">
        {initializationError || 'Premium CMS could not be initialized. Please refresh and try again.'}
      </Typography>
    </Alert>
  );

  if (isLoading) {
    content = (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 320 }}>
        <CircularProgress />
      </Stack>
    );
  } else if (effectivePremiumPage) {
    content = (
      <CMSSectionList
        pageId={effectivePremiumPage.id}
        sections={localSections}
        onSectionsChange={setLocalSections}
      />
    );
  }

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Premium CMS"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'CMS', href: paths.dashboard.cms.root },
          { name: 'Premium' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <Alert severity="info">
          This screen manages the frontend <strong>/premium</strong> page through CMS sections.
          When Premium is inactive, visitors will see the Coming Soon page. When it is active,
          visitors will see the CMS content configured here.
        </Alert>

        {effectivePremiumPage && (
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h6">
                  Premium Page Status: {isPremiumActive ? 'Active' : 'Inactive'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isPremiumActive
                    ? 'Users visiting /premium will see the CMS-managed Premium page.'
                    : 'Users visiting /premium will see the Coming Soon page.'}
                </Typography>
              </Box>

              <LoadingButton
                variant="contained"
                color={isPremiumActive ? 'warning' : 'success'}
                loading={isUpdatingStatus}
                onClick={async () => {
                  try {
                    setIsUpdatingStatus(true);

                    if (isPremiumActive) {
                      await axiosInstance.patch(
                        endpoints.cms.pages.details(effectivePremiumPage.id),
                        { status: 'draft' }
                      );

                      const updatedPage = {
                        ...effectivePremiumPage,
                        status: 'draft',
                      };

                      setResolvedPremiumPage(updatedPage);
                      enqueueSnackbar('Premium page disabled successfully.', {
                        variant: 'success',
                      });
                    } else {
                      const response = await axiosInstance.post(
                        endpoints.cms.pages.publish(effectivePremiumPage.id),
                        {
                          comment: 'Published from Premium CMS',
                        }
                      );

                      const updatedPage = response?.data || {
                        ...effectivePremiumPage,
                        status: 'published',
                      };

                      setResolvedPremiumPage(updatedPage);
                      enqueueSnackbar('Premium page activated successfully.', {
                        variant: 'success',
                      });
                    }

                    await mutate(endpoints.cms.pages.list);
                  } catch (error) {
                    enqueueSnackbar(
                      error?.error?.message || 'Failed to update Premium page status.',
                      { variant: 'error' }
                    );
                  } finally {
                    setIsUpdatingStatus(false);
                  }
                }}
              >
                {isPremiumActive ? 'Disable Premium' : 'Activate Premium'}
              </LoadingButton>
            </Stack>
          </Box>
        )}

        {content}
      </Stack>
    </Container>
  );
}
