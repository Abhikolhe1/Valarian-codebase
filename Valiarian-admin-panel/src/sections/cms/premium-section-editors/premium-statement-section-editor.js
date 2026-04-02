import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormProvider, { RHFTextField } from 'src/components/hook-form';

export default function PremiumStatementSectionEditor({ section, onSave, onCancel }) {
  const methods = useForm({
    defaultValues: {
      name: section?.name || 'Premium Statement',
      content: {
        lineOne: section?.content?.lineOne || 'Not Just a Shirt.',
        lineTwo: section?.content?.lineTwo || 'A Statement of Arrival.',
        background: section?.content?.background || '#fafafa',
        lineOneColor: section?.content?.lineOneColor || '#8C6549',
        lineTwoColor: section?.content?.lineTwoColor || '#4A3918',
      },
      settings: section?.settings || {},
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    await onSave({
      name: data.name,
      type: 'premium-statement',
      content: data.content,
      settings: data.settings || {},
    });
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3} pb={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Statement Content
            </Typography>
            <Stack spacing={2}>
              <RHFTextField name="name" label="Section Name" />
              <RHFTextField name="content.lineOne" label="Line One" />
              <RHFTextField name="content.lineTwo" label="Line Two" />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <RHFTextField name="content.background" label="Background" type="color" />
                <RHFTextField name="content.lineOneColor" label="Line One Color" type="color" />
                <RHFTextField name="content.lineTwoColor" label="Line Two Color" type="color" />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {section ? 'Update Section' : 'Create Section'}
          </Button>
        </Stack>
      </Stack>
    </FormProvider>
  );
}

PremiumStatementSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
