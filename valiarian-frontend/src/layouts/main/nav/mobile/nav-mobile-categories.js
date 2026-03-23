import PropTypes from 'prop-types';
// @mui
import { styled, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import ListItemButton from '@mui/material/ListItemButton';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
// api
import { useGetCategories } from 'src/api/category';
// routes
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
// components
import Image from 'src/components/image';
import Scrollbar from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const drawerBleeding = 56;

const Puller = styled(Box)(({ theme }) => ({
  width: 30,
  height: 6,
  backgroundColor: theme.palette.mode === 'light' ? theme.palette.grey[300] : theme.palette.grey[900],
  borderRadius: 3,
  position: 'absolute',
  top: 8,
  left: 'calc(50% - 15px)',
}));

const StyledBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'light' ? '#fff' : theme.palette.grey[800],
}));

// ----------------------------------------------------------------------

export default function NavMobileCategories({ open, onClose }) {
  const { categories } = useGetCategories();

  const grouped = categories.reduce((acc, cat) => {
    const parentName = cat.parentCategory?.name || cat.parent_name || 'Others';
    if (!acc[parentName]) acc[parentName] = [];
    acc[parentName].push(cat);
    return acc;
  }, {});

  const renderContent = (
    <Scrollbar sx={{ height: '70vh' }}>
      <Stack spacing={3} sx={{ p: 2.5, pb: 5 }}>
        {Object.entries(grouped).map(([parentName, cats]) => (
          <Stack key={parentName} spacing={1.5}>
            <Typography variant="overline" sx={{ color: 'text.disabled', px: 1 }}>
              {parentName}
            </Typography>

            <Box
              gap={2}
              display="grid"
              gridTemplateColumns="repeat(2, 1fr)"
            >
              {cats.map((child) => (
                <ListItemButton
                  key={child.id}
                  component={RouterLink}
                  href={paths.product.category(child.slug)}
                  onClick={onClose}
                  sx={{
                    p: 2,
                    height: 1,
                    borderRadius: 2,
                    flexDirection: 'column',
                    alignItems: 'center',
                    bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                    border: (theme) => `solid 1px ${alpha(theme.palette.grey[500], 0.12)}`,
                    '&:hover': {
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      flexShrink: 0,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      bgcolor: 'background.neutral',
                      mb: 1.5,
                    }}
                  >
                    <Image
                      alt={child.name}
                      src={child.image || '/assets/placeholder.svg'}
                      sx={{ width: 1, height: 1 }}
                    />
                  </Box>

                  <ListItemText
                    primary={child.name}
                    primaryTypographyProps={{ 
                      variant: 'subtitle2',
                      textAlign: 'center',
                    }}
                  />
                </ListItemButton>
              ))}
            </Box>
          </Stack>
        ))}
      </Stack>
    </Scrollbar>
  );

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      swipeAreaWidth={drawerBleeding}
      disableSwipeToOpen={false}
      ModalProps={{
        keepMounted: true,
      }}
      PaperProps={{
        sx: {
          height: `calc(70% - ${drawerBleeding}px)`,
          overflow: 'visible',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        },
      }}
    >
      <Puller />

      <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
        <Typography variant="h6">Browse Categories</Typography>
      </Box>

      {renderContent}
    </SwipeableDrawer>
  );
}

NavMobileCategories.propTypes = {
  onClose: PropTypes.func,
  open: PropTypes.bool,
};
