import { m } from 'framer-motion';
import PropTypes from 'prop-types';
import { useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// components
import { MotionViewport, varFade } from 'src/components/animate';
import Carousel, { CarouselArrows, useCarousel } from 'src/components/carousel';
import Iconify from 'src/components/iconify';
import Image from 'src/components/image';
import Lightbox, { useLightBox } from 'src/components/lightbox';

// ----------------------------------------------------------------------

export default function GallerySection({ section }) {
  const { content } = section;
  const {
    heading,
    images = [],
    layout = 'grid',
    columns = 3,
    aspectRatio = '1/1',
  } = content;

  const slides = images.map((image) => ({
    src: image,
  }));

  const lightbox = useLightBox(slides);

  const carousel = useCarousel({
    slidesToShow: Math.min(columns, 3),
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

  const handleOpenLightbox = (imageUrl) => {
    const imageIndex = images.indexOf(imageUrl);
    lightbox.onOpen(imageUrl);
    lightbox.setSelected(imageIndex);
  };

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
          gap={2}
          display="grid"
          gridTemplateColumns={{
            xs: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)',
            md: `repeat(${Math.min(columns, 4)}, 1fr)`,
          }}
        >
          {images.map((image, index) => (
            <GalleryImage
              key={index}
              image={image}
              index={index}
              aspectRatio={aspectRatio}
              onClick={() => handleOpenLightbox(image)}
            />
          ))}
        </Box>
      )}

      {/* Masonry Layout */}
      {layout === 'masonry' && (
        <Box
          sx={{
            columnCount: { xs: 1, sm: 2, md: columns },
            columnGap: 2,
          }}
        >
          {images.map((image, index) => (
            <Box
              key={index}
              sx={{
                breakInside: 'avoid',
                mb: 2,
              }}
            >
              <GalleryImage
                key={index}
                image={image}
                index={index}
                aspectRatio="auto"
                onClick={() => handleOpenLightbox(image)}
              />
            </Box>
          ))}
        </Box>
      )}

      {/* Carousel Layout */}
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
              {images.map((image, index) => (
                <Box key={index} sx={{ px: 1 }}>
                  <GalleryImage
                    image={image}
                    index={index}
                    aspectRatio={aspectRatio}
                    onClick={() => handleOpenLightbox(image)}
                  />
                </Box>
              ))}
            </Carousel>
          </CarouselArrows>
        </Box>
      )}

      {/* Lightbox */}
      <Lightbox
        index={lightbox.selected}
        slides={slides}
        open={lightbox.open}
        close={lightbox.onClose}
        onGetCurrentIndex={(index) => lightbox.setSelected(index)}
      />
    </Container>
  );
}

GallerySection.propTypes = {
  section: PropTypes.shape({
    content: PropTypes.shape({
      heading: PropTypes.string,
      images: PropTypes.arrayOf(PropTypes.string).isRequired,
      layout: PropTypes.oneOf(['grid', 'masonry', 'carousel']),
      columns: PropTypes.number,
      aspectRatio: PropTypes.string,
    }).isRequired,
  }).isRequired,
};

// ----------------------------------------------------------------------

function GalleryImage({ image, index, aspectRatio, onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <m.div variants={varFade().inUp}>
      <Box
        sx={{
          position: 'relative',
          cursor: 'pointer',
          overflow: 'hidden',
          borderRadius: 2,
          aspectRatio: aspectRatio !== 'auto' ? aspectRatio : undefined,
          '&:hover': {
            '& .overlay': {
              opacity: 1,
            },
          },
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        <Image
          src={image}
          alt={`Gallery image ${index + 1}`}
          ratio={aspectRatio !== 'auto' ? aspectRatio : undefined}
          sx={{
            width: '100%',
            height: '100%',
            transition: 'transform 0.3s',
            ...(isHovered && {
              transform: 'scale(1.1)',
            }),
          }}
        />

        {/* Overlay */}
        <Box
          className="overlay"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            bgcolor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.3s',
          }}
        >
          <IconButton
            sx={{
              color: 'common.white',
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <Iconify icon="eva:expand-fill" width={24} />
          </IconButton>
        </Box>
      </Box>
    </m.div>
  );
}

GalleryImage.propTypes = {
  image: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  aspectRatio: PropTypes.string,
  onClick: PropTypes.func,
};
