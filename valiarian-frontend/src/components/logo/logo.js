import PropTypes from 'prop-types';
import { forwardRef } from 'react';
// @mui
import { useTheme } from '@mui/material/styles';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
// routes
import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

const Logo = forwardRef(({ disabledLink = false, sx, ...other }, ref) => {
  const theme = useTheme();

  const PRIMARY_LIGHT = theme.palette.primary.light;

  const PRIMARY_MAIN = theme.palette.primary.main;

  const PRIMARY_DARK = theme.palette.primary.dark;

  // Using text branding instead of logo image
  const logo = (
    <Box
      ref={ref}
      component="div"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        ...sx,
      }}
      {...other}
    >
      <Box
        component="span"
        sx={{
          fontFamily: '"Playfair Display", "Bodoni MT", "Bodoni 72", "Didot", "Baskerville", "Times New Roman", serif',
          fontWeight: 600,
          fontSize: '1.8rem', // Larger header text
          letterSpacing: '0.25em',
          color: 'text.primary',
          textTransform: 'uppercase',
          lineHeight: 1,
          fontStyle: 'normal',
        }}
      >
        VALIARIAN
      </Box>
      {/* Logo image commented out - using text branding instead */}
      {/* <Box
        component="img"
        src="/logo/Valarian_LOGO.png"
        alt="Valarian"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
        onError={(e) => {
          // Fallback to SVG if image doesn't load
          e.target.style.display = 'none';
          const svgFallback = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svgFallback.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          svgFallback.setAttribute('width', '100%');
          svgFallback.setAttribute('height', '100%');
          svgFallback.setAttribute('viewBox', '0 0 512 512');
          e.target.parentElement.appendChild(svgFallback);
        }}
      /> */}
    </Box>
  );

  if (disabledLink) {
    return logo;
  }

  return (
    <Link component={RouterLink} href="/" sx={{ display: 'contents' }}>
      {logo}
    </Link>
  );
});

Logo.propTypes = {
  disabledLink: PropTypes.bool,
  sx: PropTypes.object,
};

export default Logo;
