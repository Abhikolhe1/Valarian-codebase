import PropTypes from 'prop-types';
import { m } from 'framer-motion';
import { useForm, useWatch } from 'react-hook-form';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
// components
import FormProvider, { RHFAutocomplete, RHFTextField } from 'src/components/hook-form';
import { MotionViewport, varFade } from 'src/components/animate';

// ----------------------------------------------------------------------

const ISSUE_OPTIONS = [
  { value: 'refund_problem', label: 'Refund Problem' },
  { value: 'wrong_product', label: 'Wrong Product Received' },
  { value: 'damaged_product', label: 'Damaged Product' },
  { value: 'delivery_delay', label: 'Delivery Delay' },
  { value: 'return_request', label: 'Return Request' },
  { value: 'size_issue', label: 'Size Issue' },
  { value: 'other', label: 'Other' },
];

// ----------------------------------------------------------------------

export default function ContactForm({
  formTitle = 'Feel free to contact us.',
  formDescription = "We'll be glad to hear from you, buddy.",
  submitLabel = 'Submit Now',
  onSubmit,
  isSubmitting = false,
}) {
  const ContactSchema = Yup.object().shape({
    name: Yup.string()
      .trim()
      .required('Name is required')
      .min(2, 'Name must be at least 2 characters'),

    email: Yup.string()
      .trim()
      .required('Email is required')
      .email('Enter a valid email address'),

    phoneNumber: Yup.string()
      .trim()
      .required('Phone number is required')
      .matches(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'),

    issueType: Yup.mixed().required('Issue type is required'),

    customIssueType: Yup.string().when('issueType', {
      is: (issueType) =>
        (typeof issueType === 'object' ? issueType?.value : issueType) === 'other',
      then: (schema) =>
        schema
          .trim()
          .required('Custom issue type is required')
          .min(2, 'Custom issue type must be at least 2 characters'),
      otherwise: (schema) => schema.nullable().transform(() => ''),
    }),

    subject: Yup.string().nullable(),

    message: Yup.string()
      .trim()
      .required('Message is required')
      .min(5, 'Message must be at least 5 characters'),
  });

  const methods = useForm({
    resolver: yupResolver(ContactSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      issueType: null,
      subject: '',
      customIssueType: '',
      message: '',
    },
  });

  const { reset, handleSubmit, control, setValue } = methods;

  const selectedIssueType = useWatch({
    control,
    name: 'issueType',
  });

  const submitHandler = handleSubmit(async (values) => {
    const issueTypeValue =
      typeof values.issueType === 'object' ? values.issueType?.value : values.issueType;

    const issueTypeLabel =
      typeof values.issueType === 'object' ? values.issueType?.label : values.issueType;

    const finalValues = {
      ...values,
      issueType: issueTypeValue || '',
      customIssueType: issueTypeValue === 'other' ? values.customIssueType?.trim() || '' : '',
      subject:
        issueTypeValue === 'other'
          ? values.customIssueType?.trim() || ''
          : issueTypeLabel || '',
    };

    await onSubmit?.(finalValues, reset);
  });

  return (
    <FormProvider methods={methods} onSubmit={submitHandler}>
      <Stack component={MotionViewport} spacing={5}>
        <m.div variants={varFade().inUp}>
          <Typography variant="h3">{formTitle}</Typography>

          {!!formDescription && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
              {formDescription}
            </Typography>
          )}
        </m.div>

        <Stack spacing={3}>
          <m.div variants={varFade().inUp}>
            <RHFTextField name="name" label="Name" />
          </m.div>

          <m.div variants={varFade().inUp}>
            <RHFTextField name="email" label="Email" type="email" />
          </m.div>

          <m.div variants={varFade().inUp}>
            <RHFTextField name="phoneNumber" label="Phone Number" />
          </m.div>

          <m.div variants={varFade().inUp}>
            <RHFAutocomplete
              name="issueType"
              label="Issue Type"
              placeholder="Select issue type"
              autoHighlight
              options={ISSUE_OPTIONS}
              getOptionLabel={(option) => option?.label || ''}
              isOptionEqualToValue={(option, value) => option.value === value?.value}
              onChange={(_, newValue) => {
                setValue('issueType', newValue, { shouldDirty: true, shouldValidate: true });

                if (newValue?.value !== 'other') {
                  setValue('customIssueType', '', { shouldDirty: true, shouldValidate: true });
                }
              }}
              renderOption={(props, option) => (
                <li {...props} key={option.value}>
                  {option.label}
                </li>
              )}
            />
          </m.div>

          {(selectedIssueType?.value === 'other' || selectedIssueType === 'other') && (
            <RHFTextField
              name="customIssueType"
              label="Custom Issue Type"
              placeholder="Enter your custom issue type"
            />
          )}

          <m.div variants={varFade().inUp}>
            <RHFTextField name="message" label="Enter your message here." multiline rows={4} />
          </m.div>
        </Stack>

        <m.div variants={varFade().inUp}>
          <Button size="large" type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : submitLabel}
          </Button>
        </m.div>
      </Stack>
    </FormProvider>
  );
}

ContactForm.propTypes = {
  formDescription: PropTypes.string,
  formTitle: PropTypes.string,
  isSubmitting: PropTypes.bool,
  onSubmit: PropTypes.func,
  submitLabel: PropTypes.string,
};
