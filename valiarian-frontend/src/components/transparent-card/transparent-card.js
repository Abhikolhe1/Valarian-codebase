import PropTypes from 'prop-types';
// @mui
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { styled, alpha } from '@mui/material/styles';
// routes
import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

const StyledCard = styled(Card)(({ theme, variant = 'default' }) => {
  const variants = {
    default: {
      backgroundColor: alpha(theme.palette.common.white, 0.1),
      border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
    },
    dark: {
      backgroundColor: alpha(theme.palette.common.black, 0.3),
      border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
    },
    light: {
      backgroundColor: alpha(theme.palette.common.white, 0.2),
      border: `1px solid ${alpha(theme.palette.common.white, 0.3)}`,
    },
  };

  return {
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: theme.shape.borderRadius * 2,

    width: '100%',
    maxWidth: 'clamp(320px, 40vw, 520px)',
    padding: theme.spacing(2.5),

    [theme.breakpoints.up('md')]: {
      padding: theme.spacing(3, 4),
    },

    ...variants[variant],
  };
});

// ----------------------------------------------------------------------

export default function TransparentCard({
  title,
  buttonLabel,
  buttonHref,
  variant = 'default',
}) {
  return (
    <StyledCard variant={variant} elevation={0}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography
          variant="h2"
          sx={{
            color: 'common.white',
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: '0.05em',
          }}
        >
          {title}
        </Typography>

        {buttonLabel && buttonHref && (
          <Button
            component={RouterLink}
            href={buttonHref}
            variant="outlined"
            size="large"
            sx={{
              alignSelf: 'flex-start',
              minWidth: { xs: '100%', sm: 180 },
              py: 1.4,
              fontWeight: 600,
              borderColor: 'common.white',
              color: 'common.white',
              '&:hover': {
                borderColor: 'common.white',
                backgroundColor: alpha('#ffffff', 0.1),
              },
            }}
          >
            {buttonLabel}
          </Button>
        )}
      </Box>
    </StyledCard>
  );
}

TransparentCard.propTypes = {
  title: PropTypes.string.isRequired,
  buttonLabel: PropTypes.string,
  buttonHref: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'dark', 'light']),
};
