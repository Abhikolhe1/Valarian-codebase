import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
// @mui
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useGetProducts } from 'src/api/product';
// components
import FormProvider, { RHFAutocomplete, RHFSelect, RHFTextField } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const DEFAULT_CONTENT = {
  editionTitle: 'Signature Edition',
  soldCount: 240,
  totalCount: 400,
  sizes: ['S', 'M', 'L', 'XL'],
  selectedSize: 'M',
  preorderButtonText: 'Preorder',
  preorderButtonLink: '/premium/preorder',
  preorderProductSlug: '',
  preorderVariantId: '',
  headingPrimary: 'Time is Luxury',
  headingSecondary: "Don't waste it.",
  description:
    'The allocation window is closing. Once the timer reaches zero, this edition enters the vault.',
  countdownTitle: 'Drop Closes In',
  countdownEndDate: '2026-12-31T23:59:59+05:30',
  timezone: 'Asia/Kolkata',
  sectionBg: '#f5f5f0',
  headingColor: '#a89479',
  descriptionColor: '#666666',
  progressLineColor: '#7a4100',
  buttonBg: '#7a5c45',
  buttonText: '#ffffff',
  buttonHoverBg: '#5f4634',
  countdownCardBg: '#ffffff',
  countdownCardBorder: '#e0e0e0',
  countdownNumberColor: '#2c2c2c',
  countdownLabelColor: '#666666',
};

// ----------------------------------------------------------------------

export default function PremiumCountdownSectionEditor({ section, onSave, onCancel }) {
  const { products: premiumProducts, productsLoading } = useGetProducts({
    isPremium: true,
    status: 'published',
    limit: 100,
  });

  const content = { ...DEFAULT_CONTENT, ...(section?.content || {}) };

  const toDateTimeLocalValue = (value, timezone) => {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';

    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone || 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .format(date)
      .replace(' ', 'T');
  };

  const toIsoByTimezone = (dateTimeLocal, timezone) => {
    if (!dateTimeLocal) return '';

    // dateTimeLocal shape: YYYY-MM-DDTHH:mm
    if (timezone === 'Asia/Kolkata') {
      return `${dateTimeLocal}:00+05:30`;
    }

    if (timezone === 'UTC') {
      return `${dateTimeLocal}:00Z`;
    }

    return `${dateTimeLocal}:00Z`;
  };

  const defaultValues = {
    name: section?.name || 'Premium Countdown Section',
    type: 'premium-countdown',
    content: {
      ...content,
      sizesInput: Array.isArray(content.sizes) ? content.sizes.join(', ') : 'S, M, L, XL',
      countdownEndDateInput: toDateTimeLocalValue(content.countdownEndDate, content.timezone),
    },
    settings: section?.settings || {},
  };

  const methods = useForm({
    defaultValues,
  });

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = methods;

  const sizesInput = watch('content.sizesInput');

  const sizes = useMemo(() => {
    const raw = sizesInput || '';
    const parsed = raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return parsed.length > 0 ? [...new Set(parsed)] : ['M'];
  }, [sizesInput]);

  const onSubmit = handleSubmit(async (data) => {
    const parsedSizes = (data.content.sizesInput || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const uniqueSizes = parsedSizes.length > 0 ? [...new Set(parsedSizes)] : ['M'];
    const selectedSize = uniqueSizes.includes(data.content.selectedSize)
      ? data.content.selectedSize
      : uniqueSizes[0];

    const countdownEndDate = toIsoByTimezone(
      data.content.countdownEndDateInput,
      data.content.timezone
    );

    await onSave({
      name: data.name,
      type: 'premium-countdown',
      content: {
        editionTitle: data.content.editionTitle,
        soldCount: Number(data.content.soldCount || 0),
        totalCount: Number(data.content.totalCount || 0),
        sizes: uniqueSizes,
        selectedSize,
        preorderButtonText: data.content.preorderButtonText,
        preorderButtonLink: data.content.preorderButtonLink,
        preorderProductSlug: data.content.preorderProductSlug,
        preorderVariantId: data.content.preorderVariantId,
        headingPrimary: data.content.headingPrimary,
        headingSecondary: data.content.headingSecondary,
        description: data.content.description,
        countdownTitle: data.content.countdownTitle,
        countdownEndDate,
        timezone: data.content.timezone,
        sectionBg: data.content.sectionBg,
        headingColor: data.content.headingColor,
        descriptionColor: data.content.descriptionColor,
        progressLineColor: data.content.progressLineColor,
        buttonBg: data.content.buttonBg,
        buttonText: data.content.buttonText,
        buttonHoverBg: data.content.buttonHoverBg,
        countdownCardBg: data.content.countdownCardBg,
        countdownCardBorder: data.content.countdownCardBorder,
        countdownNumberColor: data.content.countdownNumberColor,
        countdownLabelColor: data.content.countdownLabelColor,
      },
      settings: data.settings || {},
    });
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3} pb={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Product Info & Controls
            </Typography>
            <Stack spacing={2}>
              <RHFTextField name="name" label="Section Name" />
              <RHFTextField name="content.editionTitle" label="Edition Title" />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <RHFTextField name="content.soldCount" label="Sold Count" type="number" />
                <RHFTextField name="content.totalCount" label="Total Count" type="number" />
              </Stack>

              <RHFTextField
                name="content.sizesInput"
                label="Sizes (comma separated)"
                placeholder="S, M, L, XL"
              />

              <RHFSelect
                name="content.selectedSize"
                label="Selected Size (default)"
                onChange={(event) => setValue('content.selectedSize', event.target.value)}
              >
                {sizes.map((size) => (
                  <MenuItem key={size} value={size}>
                    {size}
                  </MenuItem>
                ))}
              </RHFSelect>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <RHFTextField name="content.preorderButtonText" label="Preorder Button Text" />
                <RHFTextField
                  name="content.preorderButtonLink"
                  label="Preorder Button Link"
                  helperText="Recommended fallback: /premium/preorder"
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <RHFAutocomplete
                  name="content.preorderProductSlug"
                  label="Premium Product"
                  loading={productsLoading}
                  placeholder="Select a premium product"
                  options={premiumProducts.map((product) => product.slug)}
                  getOptionLabel={(option) => {
                    const matchedProduct = premiumProducts.find((product) => product.slug === option);
                    return matchedProduct?.name || option || '';
                  }}
                  isOptionEqualToValue={(option, value) => option === value}
                  renderOption={(props, option) => {
                    const product = premiumProducts.find((item) => item.slug === option);
                    return (
                      <li {...props} key={option}>
                        {product?.name || option}
                      </li>
                    );
                  }}
                  helperText="If filled, the countdown button opens the premium preorder checkout for this premium product."
                />
                <RHFTextField
                  name="content.preorderVariantId"
                  label="Fallback Variant ID"
                  helperText="Optional fixed variant when you do not want size-based matching."
                />
              </Stack>
              <Alert severity="info">
                The selected premium product drives available colors, sizes, stock, and checkout pricing on the storefront countdown section.
              </Alert>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Main Hero Content
            </Typography>
            <Stack spacing={2}>
              <RHFTextField name="content.headingPrimary" label="Heading Primary" />
              <RHFTextField name="content.headingSecondary" label="Heading Secondary" />
              <RHFTextField name="content.description" label="Description" multiline rows={3} />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Countdown
            </Typography>
            <Stack spacing={2}>
              <RHFTextField name="content.countdownTitle" label="Countdown Title" />
              <RHFTextField
                name="content.countdownEndDateInput"
                label="Countdown End Date & Time"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                helperText="Select date and time"
              />
              <RHFSelect name="content.timezone" label="Timezone">
                <MenuItem value="Asia/Kolkata">Asia/Kolkata (IST)</MenuItem>
                <MenuItem value="UTC">UTC</MenuItem>
              </RHFSelect>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Styling
            </Typography>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <RHFTextField name="content.sectionBg" label="Section Background" type="color" />
                <RHFTextField name="content.headingColor" label="Heading Color" type="color" />
                <RHFTextField name="content.descriptionColor" label="Description Color" type="color" />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <RHFTextField name="content.progressLineColor" label="Progress Line Color" type="color" />
                <RHFTextField name="content.buttonBg" label="Button Background" type="color" />
                <RHFTextField name="content.buttonText" label="Button Text Color" type="color" />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <RHFTextField name="content.buttonHoverBg" label="Button Hover Background" type="color" />
                <RHFTextField name="content.countdownCardBg" label="Countdown Card Background" type="color" />
                <RHFTextField name="content.countdownCardBorder" label="Countdown Card Border" type="color" />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <RHFTextField name="content.countdownNumberColor" label="Countdown Number Color" type="color" />
                <RHFTextField name="content.countdownLabelColor" label="Countdown Label Color" type="color" />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            {section ? 'Update Section' : 'Create Section'}
          </Button>
        </Stack>
      </Stack>
    </FormProvider>
  );
}

PremiumCountdownSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
