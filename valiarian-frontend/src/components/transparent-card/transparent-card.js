import PropTypes from 'prop-types';
// @mui
import { styled, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

const StyledTransparentCard = styled(Box)(({ theme, variant = 'default' }) => {
  const variants = {
    default: {
      backgroundColor: alpha(theme.palette.common.white, 0.1),
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
    },
    dark: {
      backgroundColor: alpha(theme.palette.common.black, 0.3),
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
    },
    light: {
      backgroundColor: alpha(theme.palette.common.white, 0.2),
      backdropFilter: 'blur(15px)',
      WebkitBackdropFilter: 'blur(15px)',
      border: `1px solid ${alpha(theme.palette.common.white, 0.3)}`,
    },
  };

  return {
    borderRadius: theme.shape.borderRadius * 2,
    padding: theme.spacing(3, 4),
    ...variants[variant],
    transition: theme.transitions.create(['background-color', 'border-color'], {
      duration: theme.transitions.duration.standard,
    }),
  };
});

// ----------------------------------------------------------------------

export default function TransparentCard({ children, variant = 'default', sx, ...other }) {
  return (
    <StyledTransparentCard variant={variant} sx={sx} {...other}>
      {children}
    </StyledTransparentCard>
  );
}

TransparentCard.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['default', 'dark', 'light']),
  sx: PropTypes.object,
};

