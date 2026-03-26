import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import Iconify from 'src/components/iconify';
import Image from 'src/components/image';
import { useBoolean } from 'src/hooks/use-boolean';
import CMSMediaPicker from './cms-media-picker';

export default function CMSMediaField({ name, label, helperText, accept, multiple = false }) {
  const picker = useBoolean();
  const { watch, setValue } = useFormContext();

  const value = watch(name);
  const previewValue = useMemo(() => {
    if (multiple) {
      return Array.isArray(value) ? value : [];
    }

    return typeof value === 'string' ? value : '';
  }, [multiple, value]);

  const selectedMedia = useMemo(() => [], []);

  const handleSelect = (selected) => {
    if (multiple) {
      setValue(
        name,
        Array.isArray(selected) ? selected.map((item) => item?.url).filter(Boolean) : [],
        { shouldDirty: true }
      );
      return;
    }

    setValue(name, selected?.url || '', { shouldDirty: true });
  };

  const handleClear = () => {
    setValue(name, multiple ? [] : '', { shouldDirty: true });
  };

  return (
    <>
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="subtitle2">{label}</Typography>
            {helperText && (
              <Typography variant="caption" color="text.secondary">
                {helperText}
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Iconify icon="solar:gallery-add-bold-duotone" />}
              onClick={picker.onTrue}
            >
              Select
            </Button>
            {((multiple && previewValue.length > 0) || (!multiple && previewValue)) && (
              <Button size="small" color="error" onClick={handleClear}>
                Clear
              </Button>
            )}
          </Stack>
        </Stack>

        {multiple ? (
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            {previewValue.length ? (
              previewValue.map((item) => (
                <Card
                  key={item}
                  sx={{
                    width: 96,
                    height: 96,
                    overflow: 'hidden',
                    borderRadius: 1.5,
                  }}
                >
                  <Image src={item} alt={label} sx={{ width: 1, height: 1, objectFit: 'cover' }} />
                </Card>
              ))
            ) : (
              <Box
                sx={{
                  width: 96,
                  height: 96,
                  borderRadius: 1.5,
                  border: (theme) => `1px dashed ${alpha(theme.palette.grey[500], 0.32)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.disabled',
                }}
              >
                <Iconify icon="solar:gallery-bold-duotone" width={28} />
              </Box>
            )}
          </Stack>
        ) : (
          <Card
            sx={{
              width: 160,
              height: 160,
              overflow: 'hidden',
              borderRadius: 1.5,
              border: (theme) =>
                previewValue ? 'none' : `1px dashed ${alpha(theme.palette.grey[500], 0.32)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.disabled',
            }}
          >
            {previewValue ? (
              <Image src={previewValue} alt={label} sx={{ width: 1, height: 1, objectFit: 'cover' }} />
            ) : (
              <Iconify icon="solar:gallery-bold-duotone" width={36} />
            )}
          </Card>
        )}
      </Stack>

      <CMSMediaPicker
        open={picker.value}
        onClose={picker.onFalse}
        onSelect={(selected) => {
          handleSelect(selected);
          picker.onFalse();
        }}
        multiple={multiple}
        selectedMedia={selectedMedia}
        accept={accept}
      />
    </>
  );
}

CMSMediaField.propTypes = {
  accept: PropTypes.object,
  helperText: PropTypes.string,
  label: PropTypes.string.isRequired,
  multiple: PropTypes.bool,
  name: PropTypes.string.isRequired,
};
