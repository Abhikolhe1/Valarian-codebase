import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
// components
import Iconify from 'src/components/iconify';
import CustomPopover, { usePopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

export const ALL_CATEGORIES = 'products';

export default function ProductCategoryFilter({ category, onCategory, categories = [] }) {
  const popover = usePopover();

  const options = [
    { value: ALL_CATEGORIES, label: 'All' },
    ...categories.map((item) => ({ value: item.slug || item.id, label: item.name })),
  ];

  const activeLabel =
    options.find((option) => option.value === category || String(option.label) === String(category))
      ?.label || 'All';

  return (
    <>
      <Button
        disableRipple
        color="inherit"
        onClick={popover.onOpen}
        endIcon={
          <Iconify
            icon={popover.open ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
          />
        }
        sx={{
          minWidth: 0,
          width: { xs: 1, sm: 'auto' },
          justifyContent: 'flex-start',
          fontWeight: 'fontWeightSemiBold',
          whiteSpace: 'nowrap',
          '& .MuiButton-endIcon': { ml: { xs: 'auto', sm: 1 }, flexShrink: 0 },
        }}
      >
        Category:
        <Box
          component="span"
          sx={{
            ml: 0.5,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontWeight: 'fontWeightBold',
          }}
        >
          {activeLabel}
        </Box>
      </Button>

      <CustomPopover open={popover.open} onClose={popover.onClose} sx={{ width: 180 }}>
        {options.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === category}
            onClick={() => {
              popover.onClose();
              onCategory(option.value);
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </CustomPopover>
    </>
  );
}

ProductCategoryFilter.propTypes = {
  categories: PropTypes.array,
  category: PropTypes.string,
  onCategory: PropTypes.func,
};
