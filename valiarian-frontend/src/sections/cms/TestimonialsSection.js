import { m } from 'framer-motion';
import PropTypes from 'prop-types';
// @mui
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// components
import { MotionViewport, varFade } from 'src/components/animate';
import Carousel, { CarouselArrows, useCarousel } from 'src/components/carousel';
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function TestimonialsSection({ section }) {
  const { content } = section;
  const {
    heading,
    testimonials = [],
    layout = 'grid',
    showRatings = true,
  } = content;

  const carousel = useCarousel({
    slidesToShow: 1,
    autoplay: true,
    autoplaySpeed: 5000,
  });

  return (
    <Container
      component={MotionViewport}
      sx={{
        py: { xs: 10, md: 15 },
      }}
    >
      {/* Header */}
      {heading && (
        <Stack
          spacing={3}
          sx={{
            textAlign: 'center',
            mb: { xs: 5, md: 10 },
          }}
        >
          <m.div variants={varFade().inDown}>
            <Typography variant="h2">{heading}</Typography>
          </m.div>
        </Stack>
      )}

      {/* Grid Layout */}
      {layout === 'grid' && (
        <Box
          gap={{ xs: 3, lg: 5 }}
          display="grid"
          alignItems="flex-start"
          gridTemplateColumns={{
            xs: 'repeat(1, 1fr)',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          }}
        >
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={index}
              testimonial={testimonial}
              index={index}
              showRatings={showRatings}
            />
          ))}
        </Box>
      )}

      {/* Carousel Layout */}
      {layout === 'carousel' && (
        <Box sx={{ position: 'relative', maxWidth: 800, mx: 'auto' }}>
          <CarouselArrows
            filled
            onNext={carousel.onNext}
            onPrev={carousel.onPrev}
            leftButtonProps={{
              sx: { left: -16 },
            }}
            rightButtonProps={{
              sx: { right: -16 },
            }}
          >
            <Carousel ref={carousel.carouselRef} {...carousel.carouselSettings}>
              {testimonials.map((testimonial, index) => (
                <Box key={index} sx={{ px: 2 }}>
                  <TestimonialCard
                    testimonial={testimonial}
                    index={index}
                    showRatings={showRatings}
                    variant="carousel"
                  />
                </Box>
              ))}
            </Carousel>
          </CarouselArrows>
        </Box>
      )}

      {/* Masonry Layout */}
      {layout === 'masonry' && (
        <Box
          sx={{
            columnCount: { xs: 1, md: 2, lg: 3 },
            columnGap: 3,
          }}
        >
          {testimonials.map((testimonial, index) => (
            <Box
              key={index}
              sx={{
                breakInside: 'avoid',
                mb: 3,
              }}
            >
              <TestimonialCard
                testimonial={testimonial}
                index={index}
                showRatings={showRatings}
              />
            </Box>
          ))}
        </Box>
      )}
    </Container>
  );
}

TestimonialsSection.propTypes = {
  section: PropTypes.shape({
    content: PropTypes.shape({
      heading: PropTypes.string,
      testimonials: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string.isRequired,
          role: PropTypes.string.isRequired,
          company: PropTypes.string.isRequired,
          avatar: PropTypes.string,
          content: PropTypes.string.isRequired,
          rating: PropTypes.number,
        })
      ).isRequired,
      layout: PropTypes.oneOf(['grid', 'carousel', 'masonry']),
      showRatings: PropTypes.bool,
    }).isRequired,
  }).isRequired,
};

// ----------------------------------------------------------------------

function TestimonialCard({ testimonial, index, showRatings, variant = 'default' }) {
  const { name, role, company, avatar, content, rating } = testimonial;

  return (
    <m.div variants={varFade().inUp}>
      <Card
        sx={{
          p: 4,
          height: variant === 'carousel' ? 'auto' : '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          ...(variant === 'carousel' && {
            textAlign: 'center',
            alignItems: 'center',
          }),
        }}
      >
        {/* Quote Icon */}
        <Iconify
          icon="eva:quote-fill"
          width={48}
          sx={{
            opacity: 0.08,
            position: 'absolute',
            top: 16,
            right: 16,
          }}
        />

        {/* Rating */}
        {showRatings && rating && (
          <Rating
            value={rating}
            readOnly
            size="small"
            sx={{
              mb: 2,
              ...(variant === 'carousel' && {
                justifyContent: 'center',
              }),
            }}
          />
        )}

        {/* Content */}
        <Typography
          variant="body1"
          sx={{
            mb: 3,
            flexGrow: 1,
            color: 'text.secondary',
            fontStyle: 'italic',
          }}
        >
          &ldquo;{content}&rdquo;
        </Typography>

        {/* Author */}
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{
            ...(variant === 'carousel' && {
              justifyContent: 'center',
            }),
          }}
        >
          <Avatar
            src={avatar}
            alt={name}
            sx={{
              width: 48,
              height: 48,
            }}
          >
            {!avatar && name.charAt(0)}
          </Avatar>

          <Box>
            <Typography variant="subtitle2">{name}</Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {role} at {company}
            </Typography>
          </Box>
        </Stack>
      </Card>
    </m.div>
  );
}

TestimonialCard.propTypes = {
  testimonial: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  showRatings: PropTypes.bool,
  variant: PropTypes.oneOf(['default', 'carousel']),
};
