import PropTypes from 'prop-types';
import { LoadingButton } from '@mui/lab';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const DEFAULT_CONTENT = {
  heading: 'Reserve Yours Today',
  description: "Only 150 pieces available worldwide. Once they're gone, they're gone forever.",
  availabilityText: 'Only Available Until 15th January 2026',
  buttonText: 'Buy Now',
  buttonLink: '/products',
  background: '#f3e5d8',
  headingColor: '#8C6549',
  textColor: '#637381',
};

export default function PremiumReserveCtaSection({ section }) {
  const content = { ...DEFAULT_CONTENT, ...(section?.content || {}) };

  return (
    <Box sx={{ py: { xs: 10, md: 14 }, px: { xs: 2, md: 0 }, background: content.background, textAlign: 'center' }}>
      <Typography sx={{ fontFamily: 'Lora, serif', fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 600, color: content.headingColor }}>
        {content.heading}
      </Typography>

      <Typography sx={{ mt: 2, letterSpacing: 1, fontSize: 13, fontWeight: 500, color: content.textColor }}>
        {content.description}
      </Typography>

      <Typography sx={{ mt: 6, letterSpacing: 1, fontSize: 13, fontWeight: 500, color: content.textColor }}>
        {content.availabilityText}
      </Typography>

      <LoadingButton
        variant="contained"
        href={content.buttonLink}
        sx={(theme) => ({
          mt: 4,
          px: 5,
          backgroundColor: theme.palette.secondary.main,
          '&:hover': {
            backgroundColor: theme.palette.secondary.main,
          },
        })}
      >
        {content.buttonText}
      </LoadingButton>
    </Box>
  );
}

PremiumReserveCtaSection.propTypes = {
  section: PropTypes.shape({
    content: PropTypes.object,
  }),
};
