import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
// @mui
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
// components
import FormProvider from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
import CMSIconPicker from './cms-icon-picker';

// ----------------------------------------------------------------------

export default function CMSMenuItemDialog({ open, onClose, item, onSave }) {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const defaultValues = {
    label: item?.label || '',
    url: item?.url || '',
    icon: item?.icon || '',
    openInNewTab: item?.openInNewTab || false,
  };

  const methods = useForm({
    defaultValues,
  });

  const {
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  useEffect(() => {
    if (item) {
      reset({
        label: item.label || '',
        url: item.url || '',
        icon: item.icon || '',
        openInNewTab: item.openInNewTab || false,
      });
    } else {
      reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, reset]);

  const onSubmit = handleSubmit(async (data) => {
    onSave(data);
    onClose();
  });

  const handleIconChange = (icon) => {
    setValue('icon', icon);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{item ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>

        <FormProvider methods={methods} onSubmit={onSubmit}>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              {/* Label */}
              <TextField
                fullWidth
                label="Label"
                placeholder="e.g., Home, About Us, Contact"
                {...methods.register('label', {
                  required: 'Label is required',
                })}
                error={!!methods.formState.errors.label}
                helperText={methods.formState.errors.label?.message}
              />

              {/* URL */}
              <TextField
                fullWidth
                label="URL"
                placeholder="e.g., /about, https://example.com"
                {...methods.register('url', {
                  required: 'URL is required',
                })}
                error={!!methods.formState.errors.url}
                helperText={methods.formState.errors.url?.message || 'Relative or absolute URL'}
              />

              {/* Icon */}
              <TextField
                fullWidth
                label="Icon (Optional)"
                placeholder="Click to select an icon"
                value={values.icon}
                onClick={() => setIconPickerOpen(true)}
                InputProps={{
                  readOnly: true,
                  startAdornment: values.icon && (
                    <InputAdornment position="start">
                      <Iconify icon={values.icon} width={24} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setIconPickerOpen(true)} edge="end">
                        <Iconify icon="solar:gallery-bold" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ cursor: 'pointer' }}
              />

              {/* Open in New Tab */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={values.openInNewTab}
                    onChange={(e) => setValue('openInNewTab', e.target.checked)}
                  />
                }
                label="Open in new tab"
              />
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button onClick={onClose} variant="outlined">
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {item ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogActions>
        </FormProvider>
      </Dialog>

      {/* Icon Picker Dialog */}
      <CMSIconPicker
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        value={values.icon}
        onChange={handleIconChange}
      />
    </>
  );
}

CMSMenuItemDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  item: PropTypes.object,
  onSave: PropTypes.func,
};
