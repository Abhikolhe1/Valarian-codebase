import { m } from 'framer-motion';
import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
// components
import { MotionViewport, varFade } from 'src/components/animate';
import Carousel, { CarouselArrows, useCarousel } from 'src/components/carousel';
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function FeaturesSection({ section }) {
  const { content } = section;
  const {
    heading,
    description,
    features = [],
    layout = 'grid',
    columns = 3,
  } = content;

  const carousel = useCarousel({
    slidesToShow: columns,
    responsive: [
      {
        breakpoint: 1024,
        settings: { slidesToShow: 2 },
      },
      {
        breakpoint: 600,
        settings: { slidesToShow: 1 },
      },
    ],
  });

  return (
    <Container
      component={MotionViewport}
      sx={{
        py: { xs: 10, md: 15 },
      }}
    >
      {/* Header */}
      {(heading || description) && (
        <Stack
          spacing={3}
          sx={{
            textAlign: 'center',
            mb: { xs: 5, md: 10 },
          }}
        >
          {heading && (
            <m.div variants={varFade().inDown}>
              <Typography variant="h2">{heading}</Typography>
            </m.div>
          )}

          {description && (
            <m.div variants={varFade().inUp}>
              <Typography sx={{ color: 'text.secondary' }}>{description}</Typography>
            </m.div>
          )}
        </Stack>
      )}

      {/* Features Grid Layout */}
      {layout === 'grid' && (
        <Box
          gap={{ xs: 3, lg: 5 }}
          display="grid"
          alignItems="flex-start"
          gridTemplateColumns={{
            xs: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)',
            md: `repeat(${Math.min(columns, 4)}, 1fr)`,
          }}
        >
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </Box>
      )}

      {/* Features List Layout */}
      {layout === 'list' && (
        <Stack spacing={3}>
          {features.map((feature, index) => (
            <FeatureListItem key={index} feature={feature} index={index} />
          ))}
        </Stack>
      )}

      {/* Features Carousel Layout */}
      {layout === 'carousel' && (
        <Box sx={{ position: 'relative' }}>
          <CarouselArrows
            filled
            onNext={carousel.onNext}
            onPrev={carousel.onPrev}
            leftButtonProps={{
              sx: { left: 0 },
            }}
            rightButtonProps={{
              sx: { right: 0 },
            }}
          >
            <Carousel ref={carousel.carouselRef} {...carousel.carouselSettings}>
              {features.map((feature, index) => (
                <Box key={index} sx={{ px: 1.5 }}>
                  <FeatureCard feature={feature} index={index} />
                </Box>
              ))}
            </Carousel>
          </CarouselArrows>
        </Box>
      )}
    </Container>
  );
}

FeaturesSection.propTypes = {
  section: PropTypes.shape({
    content: PropTypes.shape({
      heading: PropTypes.string,
      description: PropTypes.string,
      features: PropTypes.arrayOf(
        PropTypes.shape({
          icon: PropTypes.string,
          title: PropTypes.string.isRequired,
          description: PropTypes.string.isRequired,
          link: PropTypes.string,
        })
      ).isRequired,
      layout: PropTypes.oneOf(['grid', 'list', 'carousel']),
      columns: PropTypes.number,
    }).isRequired,
  }).isRequired,
};

// ----------------------------------------------------------------------

function FeatureCard({ feature, index }) {
  const { icon, title, description, link } = feature;

  const content = (
    <Card
      sx={{
        textAlign: 'center',
        boxShadow: { md: 'none' },
        bgcolor: 'background.default',
        p: (theme) => theme.spacing(5, 3),
        height: '100%',
        transition: 'all 0.3s',
        '&:hover': {
          boxShadow: (theme) => ({
            md: `-20px 20px 40px ${theme.palette.mode === 'light'
                ? alpha(theme.palette.grey[500], 0.16)
                : alpha(theme.palette.common.black, 0.4)
              }`,
          }),
          transform: 'translateY(-4px)',
        },
      }}
    >
      {icon && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          {icon.startsWith('http') || icon.startsWith('/') ? (
            <Box
              component="img"
              src={icon}
              alt={title}
              sx={{ width: 64, height: 64 }}
            />
          ) : (
            <Iconify icon={icon} width={64} />
          )}
        </Box>
      )}

      <Typography variant="h5" sx={{ mb: 2 }}>
        {title}
      </Typography>

      <Typography sx={{ color: 'text.secondary' }}>{description}</Typography>
    </Card>
  );

  return (
    <m.div variants={varFade().inUp}>
      {link ? (
        <Link href={link} underline="none" color="inherit">
          {content}
        </Link>
      ) : (
        content
      )}
    </m.div>
  );
}

FeatureCard.propTypes = {
  feature: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
};

// ----------------------------------------------------------------------

function FeatureListItem({ feature, index }) {
  const { icon, title, description, link } = feature;

  const content = (
    <Card
      sx={{
        p: 3,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 3,
        transition: 'all 0.3s',
        '&:hover': {
          boxShadow: (theme) => theme.customShadows.z8,
          transform: 'translateX(8px)',
        },
      }}
    >
      {icon && (
        <Box sx={{ flexShrink: 0 }}>
          {icon.startsWith('http') || icon.startsWith('/') ? (
            <Box
              component="img"
              src={icon}
              alt={title}
              sx={{ width: 48, height: 48 }}
            />
          ) : (
            <Iconify icon={icon} width={48} />
          )}
        </Box>
      )}

      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>{description}</Typography>
      </Box>

      {link && (
        <Iconify
          icon="eva:arrow-ios-forward-fill"
          width={24}
          sx={{ color: 'text.disabled', flexShrink: 0 }}
        />
      )}
    </Card>
  );

  return (
    <m.div variants={varFade().inUp}>
      {link ? (
        <Link href={link} underline="none" color="inherit">
          {content}
        </Link>
      ) : (
        content
      )}
    </m.div>
  );
}

FeatureListItem.propTypes = {
  feature: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
};
