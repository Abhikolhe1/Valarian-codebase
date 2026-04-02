import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
// api
import { useGetSettings } from 'src/api/cms-settings';
// utils
import axiosInstance, { endpoints } from 'src/utils/axios';
// components
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import FormProvider from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import { useSnackbar } from 'src/components/snackbar';
// routes
import { paths } from 'src/routes/paths';
//
import CMSMediaPickerField from '../cms-media-picker-field';

// ----------------------------------------------------------------------

const TABS = [
  {
    value: 'general',
    label: 'General',
    icon: 'solar:settings-bold',
  },
  {
    value: 'seo',
    label: 'SEO',
    icon: 'solar:magnifer-bold',
  },
  {
    value: 'social',
    label: 'Social Media',
    icon: 'solar:share-bold',
  },
  {
    value: 'analytics',
    label: 'Analytics',
    icon: 'solar:chart-bold',
  },
  {
    value: 'contact',
    label: 'Contact Page',
    icon: 'solar:map-point-bold',
  },
  {
    value: 'legal',
    label: 'Legal Docs',
    icon: 'solar:document-text-bold',
  },
  {
    value: 'theme',
    label: 'Theme',
    icon: 'solar:pallete-2-bold',
  },
];

// ----------------------------------------------------------------------

export default function CMSSettingsView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [currentTab, setCurrentTab] = useState('general');

  // Use SWR to fetch settings
  const { settings: siteSettings, settingsLoading, mutate } = useGetSettings();

  const defaultValues = useMemo(
    () => ({
      siteName: siteSettings?.siteName || '',
      siteDescription: siteSettings?.siteDescription || '',
      logo: siteSettings?.logo || '',
      favicon: siteSettings?.favicon || '',
      contactEmail: siteSettings?.contactEmail || '',
      contactPhone: siteSettings?.contactPhone || '',
      socialMedia: {
        facebook: siteSettings?.socialMedia?.facebook || '',
        instagram: siteSettings?.socialMedia?.instagram || '',
        twitter: siteSettings?.socialMedia?.twitter || '',
        linkedin: siteSettings?.socialMedia?.linkedin || '',
        youtube: siteSettings?.socialMedia?.youtube || '',
        pinterest: siteSettings?.socialMedia?.pinterest || '',
      },
      footerText: siteSettings?.footerText || '',
      copyrightText: siteSettings?.copyrightText || '',
      gtmId: siteSettings?.gtmId || '',
      gaId: siteSettings?.gaId || '',
      contactPage: {
        heroBadge: siteSettings?.contactPage?.heroBadge || 'Where',
        heroTitleLine1: siteSettings?.contactPage?.heroTitleLine1 || 'to',
        heroTitleLine2: siteSettings?.contactPage?.heroTitleLine2 || 'find',
        heroTitleLine3: siteSettings?.contactPage?.heroTitleLine3 || 'us?',
        heroImage: siteSettings?.contactPage?.heroImage || '/assets/images/contact/hero.jpg',
        formTitle: siteSettings?.contactPage?.formTitle || 'Feel free to contact us.',
        formDescription:
          siteSettings?.contactPage?.formDescription || "We'll be glad to hear from you, buddy.",
        submitLabel: siteSettings?.contactPage?.submitLabel || 'Submit Now',
        mapTitle: siteSettings?.contactPage?.mapTitle || 'Visit our office',
        mapDescription:
          siteSettings?.contactPage?.mapDescription ||
          'Find us on the map or reach out directly using the form.',
        mapEmbedUrl: siteSettings?.contactPage?.mapEmbedUrl || '',
        locations: siteSettings?.contactPage?.locations?.length
          ? siteSettings.contactPage.locations
          : [
              {
                title: 'Head Office',
                address: '508 Bridle Avenue Newnan, GA 30263',
                phoneNumber: '(239) 555-0108',
                latitude: 33,
                longitude: 65,
              },
            ],
      },
      legalDocuments: {
        termsAndConditionsUrl: siteSettings?.legalDocuments?.termsAndConditionsUrl || '',
        privacyPolicyUrl: siteSettings?.legalDocuments?.privacyPolicyUrl || '',
      },
      theme: {
        primary: {
          lighter: siteSettings?.theme?.primary?.lighter || '#C8FAD6',
          light: siteSettings?.theme?.primary?.light || '#5BE49B',
          main: siteSettings?.theme?.primary?.main || '#00A76F',
          dark: siteSettings?.theme?.primary?.dark || '#007867',
          darker: siteSettings?.theme?.primary?.darker || '#004B50',
          contrastText: siteSettings?.theme?.primary?.contrastText || '#FFFFFF',
        },
        secondary: {
          lighter: siteSettings?.theme?.secondary?.lighter || '#EFD6FF',
          light: siteSettings?.theme?.secondary?.light || '#C684FF',
          main: siteSettings?.theme?.secondary?.main || '#8E33FF',
          dark: siteSettings?.theme?.secondary?.dark || '#5119B7',
          darker: siteSettings?.theme?.secondary?.darker || '#27097A',
          contrastText: siteSettings?.theme?.secondary?.contrastText || '#FFFFFF',
        },
      },
    }),
    [siteSettings]
  );

  const methods = useForm({
    defaultValues,
    shouldUnregister: false,
  });


  const {
    reset,
    watch,
    control,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'contactPage.locations',
  });

  const values = watch();

  // Reset form when settings are loaded
  useEffect(() => {
    if (siteSettings) {
      reset(defaultValues);
    }
  }, [siteSettings, defaultValues, reset]);

  const buildSettingsPayload = (data) => ({
    ...data,
    contactPage: {
      ...data.contactPage,
      locations: (data.contactPage?.locations || []).map((location) => ({
        ...location,
        latitude:
          location.latitude === '' || Number.isNaN(location.latitude)
            ? undefined
            : Number(location.latitude),
        longitude:
          location.longitude === '' || Number.isNaN(location.longitude)
            ? undefined
            : Number(location.longitude),
      })),
    },
    theme: {
      primary: {
        lighter: String(data.theme?.primary?.lighter || '').trim(),
        light: String(data.theme?.primary?.light || '').trim(),
        main: String(data.theme?.primary?.main || '').trim(),
        dark: String(data.theme?.primary?.dark || '').trim(),
        darker: String(data.theme?.primary?.darker || '').trim(),
        contrastText: String(data.theme?.primary?.contrastText || '').trim(),
      },
      secondary: {
        lighter: String(data.theme?.secondary?.lighter || '').trim(),
        light: String(data.theme?.secondary?.light || '').trim(),
        main: String(data.theme?.secondary?.main || '').trim(),
        dark: String(data.theme?.secondary?.dark || '').trim(),
        darker: String(data.theme?.secondary?.darker || '').trim(),
        contrastText: String(data.theme?.secondary?.contrastText || '').trim(),
      },
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = buildSettingsPayload(data);
      const response = await axiosInstance.patch(endpoints.cms.settings, payload);
      reset(response.data || payload);
      await mutate();
      enqueueSnackbar('Site settings updated successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error updating site settings:', error);
      enqueueSnackbar(
        error?.message || error?.error?.message || 'Failed to update site settings',
        { variant: 'error' }
      );
    }
  });

  const handleChangeTab = useCallback((event, newValue) => {
    setCurrentTab(newValue);
  }, []);

  const renderGeneral = (
    <Stack spacing={3}>
      <Typography variant="h6">General Settings</Typography>

      <TextField
        fullWidth
        label="Site Name"
        placeholder="e.g., My Awesome Site"
        {...methods.register('siteName', {
          required: 'Site name is required',
        })}
        error={!!methods.formState.errors.siteName}
        helperText={methods.formState.errors.siteName?.message}
      />

      <TextField
        fullWidth
        multiline
        rows={3}
        label="Site Description"
        placeholder="A brief description of your site"
        {...methods.register('siteDescription')}
      />

      <CMSMediaPickerField
        label="Logo"
        value={values.logo}
        onChange={(url) => setValue('logo', url)}
        helperText="Upload your site logo (PNG, JPG, SVG, or WebP)"
        accept={{
          'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.webp'],
        }}
      />

      <CMSMediaPickerField
        label="Favicon"
        value={values.favicon}
        onChange={(url) => setValue('favicon', url)}
        helperText="Upload your site favicon (recommended: 32x32 or 64x64 pixels, PNG or ICO format)"
        accept={{
          'image/*': ['.png', '.ico', '.svg'],
        }}
      />

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Contact Information
      </Typography>

      <TextField
        fullWidth
        type="email"
        label="Contact Email"
        placeholder="contact@example.com"
        {...methods.register('contactEmail')}
        helperText="Primary contact email for your site"
      />

      <TextField
        fullWidth
        label="Contact Phone"
        placeholder="+1 (555) 123-4567"
        {...methods.register('contactPhone')}
        helperText="Primary contact phone number"
      />

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Footer Content
      </Typography>

      <TextField
        fullWidth
        multiline
        rows={3}
        label="Footer Text"
        placeholder="Additional footer content"
        {...methods.register('footerText')}
      />

      <TextField
        fullWidth
        label="Copyright Text"
        placeholder="© 2024 Your Company. All rights reserved."
        {...methods.register('copyrightText')}
      />
    </Stack>
  );

  const renderSEO = (
    <Stack spacing={3}>
      <Typography variant="h6">SEO Settings</Typography>

      <Typography variant="body2" color="text.secondary">
        SEO settings are configured per page. Use the page editor to set meta titles,
        descriptions, and keywords for individual pages.
      </Typography>

      <Box
        sx={{
          p: 3,
          bgcolor: 'background.neutral',
          borderRadius: 1,
        }}
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Iconify icon="solar:check-circle-bold" width={24} color="success.main" />
            <Typography variant="body2">
              Meta titles and descriptions can be set per page
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <Iconify icon="solar:check-circle-bold" width={24} color="success.main" />
            <Typography variant="body2">
              Open Graph tags are automatically generated from page SEO fields
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <Iconify icon="solar:check-circle-bold" width={24} color="success.main" />
            <Typography variant="body2">
              XML sitemap is automatically generated from published pages
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );

  const renderSocial = (
    <Stack spacing={3}>
      <Typography variant="h6">Social Media Links</Typography>

      <Typography variant="body2" color="text.secondary">
        Add your social media profile URLs. These will be displayed in your site footer and can
        be used for social sharing.
      </Typography>

      <TextField
        fullWidth
        label="Facebook"
        placeholder="https://facebook.com/yourpage"
        {...methods.register('socialMedia.facebook')}
        InputProps={{
          startAdornment: <Iconify icon="eva:facebook-fill" width={24} sx={{ mr: 1 }} />,
        }}
      />

      <TextField
        fullWidth
        label="Instagram"
        placeholder="https://instagram.com/yourprofile"
        {...methods.register('socialMedia.instagram')}
        InputProps={{
          startAdornment: <Iconify icon="ant-design:instagram-filled" width={24} sx={{ mr: 1 }} />,
        }}
      />

      <TextField
        fullWidth
        label="Twitter"
        placeholder="https://twitter.com/yourhandle"
        {...methods.register('socialMedia.twitter')}
        InputProps={{
          startAdornment: <Iconify icon="eva:twitter-fill" width={24} sx={{ mr: 1 }} />,
        }}
      />

      <TextField
        fullWidth
        label="LinkedIn"
        placeholder="https://linkedin.com/company/yourcompany"
        {...methods.register('socialMedia.linkedin')}
        InputProps={{
          startAdornment: <Iconify icon="eva:linkedin-fill" width={24} sx={{ mr: 1 }} />,
        }}
      />

      <TextField
        fullWidth
        label="YouTube"
        placeholder="https://youtube.com/c/yourchannel"
        {...methods.register('socialMedia.youtube')}
        InputProps={{
          startAdornment: <Iconify icon="ant-design:youtube-filled" width={24} sx={{ mr: 1 }} />,
        }}
      />

      <TextField
        fullWidth
        label="Pinterest"
        placeholder="https://pinterest.com/yourprofile"
        {...methods.register('socialMedia.pinterest')}
        InputProps={{
          startAdornment: <Iconify icon="ant-design:pinterest-filled" width={24} sx={{ mr: 1 }} />,
        }}
      />
    </Stack>
  );

  const renderAnalytics = (
    <Stack spacing={3}>
      <Typography variant="h6">Analytics Integration</Typography>

      <Typography variant="body2" color="text.secondary">
        Add your analytics tracking IDs to enable site analytics. These scripts will be
        automatically injected into your site.
      </Typography>

      <TextField
        fullWidth
        label="Google Tag Manager ID"
        placeholder="GTM-XXXXXXX"
        {...methods.register('gtmId')}
        helperText="Your Google Tag Manager container ID"
        InputProps={{
          startAdornment: (
            <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                GTM-
              </Typography>
            </Box>
          ),
        }}
      />

      <TextField
        fullWidth
        label="Google Analytics ID"
        placeholder="G-XXXXXXXXXX or UA-XXXXXXXXX-X"
        {...methods.register('gaId')}
        helperText="Your Google Analytics measurement ID or tracking ID"
        InputProps={{
          startAdornment: (
            <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                GA-
              </Typography>
            </Box>
          ),
        }}
      />

      <Box
        sx={{
          p: 3,
          bgcolor: 'warning.lighter',
          borderRadius: 1,
          border: (theme) => `1px solid ${theme.palette.warning.light}`,
        }}
      >
        <Stack direction="row" spacing={2}>
          <Iconify icon="solar:info-circle-bold" width={24} color="warning.main" />
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Privacy Notice
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Make sure to comply with privacy regulations (GDPR, CCPA, etc.) when using
              analytics. Consider adding a cookie consent banner to your site.
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Stack>
  );

  const renderContact = (
    <Stack spacing={3}>
      <Typography variant="h6">Contact Page Content</Typography>

      <Typography variant="body2" color="text.secondary">
        These fields control the frontend contact-us page hero text, form labels, office cards,
        and the map embed.
      </Typography>

      <TextField fullWidth label="Hero Badge" {...methods.register('contactPage.heroBadge')} />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField fullWidth label="Hero Word 1" {...methods.register('contactPage.heroTitleLine1')} />
        <TextField fullWidth label="Hero Word 2" {...methods.register('contactPage.heroTitleLine2')} />
        <TextField fullWidth label="Hero Word 3" {...methods.register('contactPage.heroTitleLine3')} />
      </Stack>

      <CMSMediaPickerField
        label="Contact Hero Image"
        value={values.contactPage?.heroImage}
        onChange={(url) => setValue('contactPage.heroImage', url)}
        helperText="Recommended wide banner image for the contact hero section"
        accept={{
          'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.webp'],
        }}
      />

      <TextField fullWidth label="Form Title" {...methods.register('contactPage.formTitle')} />

      <TextField
        fullWidth
        multiline
        rows={3}
        label="Form Description"
        {...methods.register('contactPage.formDescription')}
      />

      <TextField fullWidth label="Submit Button Label" {...methods.register('contactPage.submitLabel')} />
      <TextField fullWidth label="Map Title" {...methods.register('contactPage.mapTitle')} />

      <TextField
        fullWidth
        multiline
        rows={2}
        label="Map Description"
        {...methods.register('contactPage.mapDescription')}
      />

      <TextField
        fullWidth
        label="Google Maps Embed URL"
        placeholder="https://www.google.com/maps?q=...&output=embed"
        {...methods.register('contactPage.mapEmbedUrl')}
        helperText="Paste a full embed URL if you want to override the auto-generated location map."
      />

      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1">Locations</Typography>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:add-circle-bold" />}
            onClick={() =>
              append({
                title: '',
                address: '',
                phoneNumber: '',
                latitude: 0,
                longitude: 0,
              })
            }
          >
            Add Location
          </Button>
        </Stack>

        {fields.map((field, index) => (
          <Card key={field.id} variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">Location {index + 1}</Typography>
                <Button
                  color="error"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                >
                  Remove
                </Button>
              </Stack>

              <TextField
                fullWidth
                label="Location Title"
                {...methods.register(`contactPage.locations.${index}.title`)}
              />

              <TextField
                fullWidth
                multiline
                rows={2}
                label="Address"
                {...methods.register(`contactPage.locations.${index}.address`)}
              />

              <TextField
                fullWidth
                label="Phone Number"
                {...methods.register(`contactPage.locations.${index}.phoneNumber`)}
              />

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Latitude"
                  {...methods.register(`contactPage.locations.${index}.latitude`, {
                    valueAsNumber: true,
                  })}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Longitude"
                  {...methods.register(`contactPage.locations.${index}.longitude`, {
                    valueAsNumber: true,
                  })}
                />
              </Stack>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Stack>
  );

  const renderLegal = (
    <Stack spacing={3}>
      <Typography variant="h6">Legal Documents</Typography>

      <Typography variant="body2" color="text.secondary">
        Upload the final Terms and Conditions and Privacy Policy documents here. These file links
        will be used on the storefront and will open in a new browser tab.
      </Typography>

      <CMSMediaPickerField
        label="Terms and Conditions Document"
        value={values.legalDocuments?.termsAndConditionsUrl}
        onChange={(url) => setValue('legalDocuments.termsAndConditionsUrl', url)}
        helperText="Upload a PDF document for Terms and Conditions."
        accept={{
          'application/pdf': ['.pdf'],
        }}
      />

      <CMSMediaPickerField
        label="Privacy Policy Document"
        value={values.legalDocuments?.privacyPolicyUrl}
        onChange={(url) => setValue('legalDocuments.privacyPolicyUrl', url)}
        helperText="Upload a PDF document for Privacy Policy."
        accept={{
          'application/pdf': ['.pdf'],
        }}
      />
    </Stack>
  );

  const renderTheme = (
    <Stack spacing={3}>
      <Typography variant="h6">Theme Colors</Typography>

      <Typography variant="body2" color="text.secondary">
        Manage the storefront primary and secondary brand colors used by the frontend theme.
      </Typography>

      <Card variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1">Primary Palette</Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              type="color"
              label="Primary Lighter"
              InputLabelProps={{ shrink: true }}
              {...methods.register('theme.primary.lighter')}
            />
            <TextField
              fullWidth
              type="color"
              label="Primary Light"
              InputLabelProps={{ shrink: true }}
              {...methods.register('theme.primary.light')}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              type="color"
              label="Primary Main"
              InputLabelProps={{ shrink: true }}
              {...methods.register('theme.primary.main')}
            />
            <TextField
              fullWidth
              label="Primary Contrast Text"
              placeholder="#FFFFFF"
              {...methods.register('theme.primary.contrastText')}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              type="color"
              label="Primary Dark"
              InputLabelProps={{ shrink: true }}
              {...methods.register('theme.primary.dark')}
            />
            <TextField
              fullWidth
              type="color"
              label="Primary Darker"
              InputLabelProps={{ shrink: true }}
              {...methods.register('theme.primary.darker')}
            />
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Chip
              label="Primary Main"
              sx={{
                bgcolor: values.theme?.primary?.main || '#00A76F',
                color: values.theme?.primary?.contrastText || '#FFFFFF',
              }}
            />
            <Chip
              label="Primary Light"
              sx={{
                bgcolor: values.theme?.primary?.light || '#5BE49B',
                color: values.theme?.primary?.contrastText || '#FFFFFF',
              }}
            />
            <Chip
              label="Primary Dark"
              sx={{
                bgcolor: values.theme?.primary?.dark || '#007867',
                color: values.theme?.primary?.contrastText || '#FFFFFF',
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Preview: {values.theme?.primary?.main || '#00A76F'}
            </Typography>
          </Stack>
        </Stack>
      </Card>

      <Card variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1">Secondary Palette</Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              type="color"
              label="Secondary Lighter"
              InputLabelProps={{ shrink: true }}
              {...methods.register('theme.secondary.lighter')}
            />
            <TextField
              fullWidth
              type="color"
              label="Secondary Light"
              InputLabelProps={{ shrink: true }}
              {...methods.register('theme.secondary.light')}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              type="color"
              label="Secondary Main"
              InputLabelProps={{ shrink: true }}
              {...methods.register('theme.secondary.main')}
            />
            <TextField
              fullWidth
              label="Secondary Contrast Text"
              placeholder="#FFFFFF"
              {...methods.register('theme.secondary.contrastText')}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              type="color"
              label="Secondary Dark"
              InputLabelProps={{ shrink: true }}
              {...methods.register('theme.secondary.dark')}
            />
            <TextField
              fullWidth
              type="color"
              label="Secondary Darker"
              InputLabelProps={{ shrink: true }}
              {...methods.register('theme.secondary.darker')}
            />
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Chip
              label="Secondary Main"
              sx={{
                bgcolor: values.theme?.secondary?.main || '#8E33FF',
                color: values.theme?.secondary?.contrastText || '#FFFFFF',
              }}
            />
            <Chip
              label="Secondary Light"
              sx={{
                bgcolor: values.theme?.secondary?.light || '#C684FF',
                color: values.theme?.secondary?.contrastText || '#FFFFFF',
              }}
            />
            <Chip
              label="Secondary Dark"
              sx={{
                bgcolor: values.theme?.secondary?.dark || '#5119B7',
                color: values.theme?.secondary?.contrastText || '#FFFFFF',
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Preview: {values.theme?.secondary?.main || '#8E33FF'}
            </Typography>
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Site Settings"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'CMS', href: paths.dashboard.cms.root },
          { name: 'Settings' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <FormProvider methods={methods} onSubmit={onSubmit}>
        <Card>
          <Tabs
            value={currentTab}
            onChange={handleChangeTab}
            sx={{
              px: 3,
              bgcolor: 'background.neutral',
            }}
          >
            {TABS.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                icon={<Iconify icon={tab.icon} width={24} />}
                iconPosition="start"
              />
            ))}
          </Tabs>

          <Box sx={{ p: 3 }}>
            {settingsLoading ? (
              <Box sx={{ py: 5, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Loading settings...
                </Typography>
              </Box>
            ) : (
              <>
                {currentTab === 'general' && renderGeneral}
                {currentTab === 'seo' && renderSEO}
                {currentTab === 'social' && renderSocial}
                {currentTab === 'analytics' && renderAnalytics}
                {currentTab === 'contact' && renderContact}
                {currentTab === 'legal' && renderLegal}
                {currentTab === 'theme' && renderTheme}

                <Stack direction="row" justifyContent="flex-end" sx={{ mt: 4 }}>
                  <LoadingButton
                    type="submit"
                    variant="contained"
                    size="large"
                    loading={isSubmitting}
                    startIcon={<Iconify icon="solar:diskette-bold" />}
                  >
                    Save Settings
                  </LoadingButton>
                </Stack>
              </>
            )}
          </Box>
        </Card>
      </FormProvider>
    </Container>
  );
}
