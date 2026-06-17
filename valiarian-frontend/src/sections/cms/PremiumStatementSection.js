import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const DEFAULT_CONTENT = {
  lineOne: 'Not Just a Shirt.',
  lineTwo: 'A Statement of Arrival.',
  background: '#fafafa',
  lineOneColor: '#8C6549',
  lineTwoColor: '#4A3918',
};

export default function PremiumStatementSection({ section }) {
  const content = { ...DEFAULT_CONTENT, ...(section?.content || {}) };

  return (
    <Box sx={{ py: { xs: 10, md: 14 }, background: content.background, textAlign: 'center', px: 2 }}>
      <Typography sx={{ fontFamily: 'Lora, serif', fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 500, color: content.lineOneColor }}>
        {content.lineOne}
      </Typography>
      <Typography sx={{ fontFamily: 'Lora, serif', fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 600, color: content.lineTwoColor }}>
        {content.lineTwo}
      </Typography>
    </Box>
  );
}

PremiumStatementSection.propTypes = {
  section: PropTypes.shape({
    content: PropTypes.object,
  }),
};
