import PropTypes from 'prop-types';
// @mui
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
// routes
import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

const StyledCard = styled(Card)({
  width: '100%',
  maxWidth: 720,
  padding: 0,
  overflow: 'visible',
  color: 'inherit',
  background: 'transparent',
});

// ----------------------------------------------------------------------

export default function TransparentCard({
  title,
  buttonLabel,
  buttonHref,
}) {
  return (
    <StyledCard elevation={0}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Typography
          component="h1"
          variant="h4"
          sx={{
            color: 'common.white',
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: '0.025em',
            textAlign: 'center',
            textTransform: 'uppercase',
            textShadow: '0 1px 12px rgba(0, 0, 0, 0.35)',
            fontSize: { xs: '1.15rem', sm: '1.4rem', md: '1.65rem' },
          }}
        >
          {title}
        </Typography>

        {buttonLabel && buttonHref && (
          <Button
            component={RouterLink}
            href={buttonHref}
            variant="text"
            sx={{
              minWidth: 0,
              p: 0,
              borderRadius: 0,
              fontSize: { xs: '0.95rem', md: '1.05rem' },
              fontWeight: 700,
              lineHeight: 1.5,
              color: 'common.white',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              textTransform: 'none',
              textShadow: '0 1px 8px rgba(0, 0, 0, 0.35)',
              '&:hover': {
                backgroundColor: 'transparent',
                opacity: 0.8,
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
};
