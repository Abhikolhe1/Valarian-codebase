import PropTypes from 'prop-types';
import { Stack } from '@mui/material';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Carousel, { CarouselDots, useCarousel } from 'src/components/carousel';

const DEFAULT_THOUGHTS = [
  {
    id: 1,
    thought:
      '"We believe that the best clothes are the ones you forget you\'re wearing, those that fit so perfectly, feel so comfortable, and look so good that they become second nature."',
    sign: 'The Premium Cotton Co Team',
  },
  {
    id: 2,
    thought: '"Comfort meets confidence when design becomes effortless."',
    sign: 'The Premium Cotton Co Team',
  },
];

export default function AboutThoughtCarousel({ items = DEFAULT_THOUGHTS }) {
  const carousel = useCarousel({
    speed: 800,
    autoplay: true,
    ...CarouselDots({
      sx: {
        position: 'sticky',
        bottom: { xs: 15, md: 15 },
        left: 0,
        right: 0,
        mx: 'auto',
        zIndex: 9,
        display: 'flex',
        justifyContent: 'center',
        '& .slick-dots li button:before': {
          color: '#000',
          fontSize: 10,
          opacity: 0.5,
        },
        '& .slick-dots li.slick-active button:before': {
          color: '#000',
          opacity: 1,
        },
      },
    }),
  });

  return (
    <Card
      sx={{
        position: 'relative',
        textAlign: 'center',
        '& .MuiCarousel-root': {
          height: 'auto !important',
        },
        '& .MuiCarousel-item': {
          height: 'auto !important',
        },
      }}
    >
      <Carousel {...carousel.carouselSettings} autoHeight textAlign="center">
        {(items?.length ? items : DEFAULT_THOUGHTS).map((item) => (
          <CarouselItem key={item.id} item={item} />
        ))}
      </Carousel>
    </Card>
  );
}

AboutThoughtCarousel.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      author: PropTypes.string,
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      quote: PropTypes.string,
      sign: PropTypes.string,
      thought: PropTypes.string,
    })
  ),
};

function CarouselItem({ item }) {
  const thought = item.thought || item.quote;
  const sign = item.sign || item.author;

  return (
    <Box
      sx={{
        pt: '50',
        position: 'relative',
        height: 1,
      }}
    >
      <CardContent
        sx={{
          width: 1,
          height: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <Stack spacing={2} alignItems="center">
          <Typography
            sx={{
              maxWidth: 900,
              fontWeight: 400,
              fontFamily: '"Brush Script MT", cursive',
              fontSize: { xs: '28px', md: '40px' },
              lineHeight: 1.6,
              color: 'text.primary',
            }}
          >
            {thought}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Brush Script MT", cursive',
              fontSize: { xs: '20px', md: '28px' },
              color: 'text.secondary',
            }}
          >
            {sign}
          </Typography>
        </Stack>
      </CardContent>
    </Box>
  );
}

CarouselItem.propTypes = {
  item: PropTypes.object,
};
