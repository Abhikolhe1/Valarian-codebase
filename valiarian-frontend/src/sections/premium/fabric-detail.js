import { Icon } from '@iconify/react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
import PropTypes from 'prop-types';
import { useState } from 'react';

const fabrics = [
  {
    id: 1,
    name: 'Premium Egyptian Cotton',
    description:
      'Woven from long-staple Egyptian cotton fibers for unmatched softness, breathability, and durability. Designed for everyday luxury.',
    weight: '180 GSM',
    weave: 'Plain weave',
    feel: 'Ultra-soft',
  },
  {
    id: 2,
    name: 'Organic Piqué Knit',
    description:
      'A timeless polo knit structure that enhances airflow while maintaining a sharp, structured silhouette.',
    weight: '200 GSM',
    weave: 'Piqué knit',
    feel: 'Structured & airy',
  },
  {
    id: 3,
    name: 'Mercerized Cotton',
    description:
      'Mercerization strengthens the yarn, enhances luster, and delivers a refined, silky surface with long-lasting color.',
    weight: '190 GSM',
    weave: 'Mercerized weave',
    feel: 'Smooth & lustrous',
  },
];

export default function FabricDetail() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const fabric = fabrics[index];

  const next = () => {
    setDirection(1);
    setIndex((i) => (i + 1) % fabrics.length);
  };

  const prev = () => {
    setDirection(-1);
    setIndex((i) => (i - 1 + fabrics.length) % fabrics.length);
  };

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setIndex((pre) => (pre + 1) % fabrics.length);
  //   }, 4000);

  //   return () => clearInterval(interval);
  // }, [index]);

  return (
    <LazyMotion features={domAnimation}>
      <Box
        sx={{
          py: { xs: 10, md: 14 },
          background: 'linear-gradient(180deg, #fafafa 0%, #f3f3f3 100%)',
        }}
      >
        {/* Header */}
        <Box textAlign="center" mb={8} p={0.5}>
          <Typography
            sx={{
              fontSize: '0.75rem',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              color: '#999',
              mb: 1,
            }}
          >
            Fabric Story
          </Typography>

          <Typography
            sx={{
              fontFamily: 'Lora, serif',
              fontSize: { xs: '2rem', md: '2.8rem' },
              fontWeight: 600,
              color: '#1a1a1a',
            }}
          >
            Crafted From Exceptional Materials
          </Typography>
        </Box>

        {/* Card */}
        <Box
          sx={{
            maxWidth: 900,
            mx: 'auto',
            p: 2,
            position: 'relative',
            overflow: 'hidden',
            touchAction: 'pan-y',
          }}
        >
          <AnimatePresence mode="wait">
            <m.div
              key={fabric.id}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.35}
              dragMomentum='true'
              whileDrag={{ scale: 0.98 }}

              onDragEnd={(e, info) => {
                const swipePower = Math.abs(info.velocity.x) * info.offset.x;

                if (swipePower < -10000) {
                  next();
                } else if (swipePower > 10000) {
                  prev();
                }
              }}

              initial={{ x: direction === 1 ? '100%' : '-100%', opacity: 0.0 }}
              animate={{ x: '0%', opacity: 1 }}
              exit={{ x: direction === 1 ? '-100%' : '100%', opacity: 0.0 }}
              transition={{ duration: 0.2, ease: [0.43, 0.13, 0.23, 0.96] }}

            // initial={{ opacity: 0, x: 30 }}
            // animate={{ opacity: 1, x: 0 }}
            // exit={{ opacity: 0, x: -10 }}

            // transition={{
            //   type: 'spring',
            //   stiffness: 500,
            //   damping: 50,
            //   // restDelta: 0.001,

            // }}
            >
              <Box
                sx={{
                  backgroundColor: '#ffffff',
                  borderRadius: '28px',
                  p: { xs: 5, md: 6 },
                  boxShadow: '0 30px 80px rgba(0,0,0,0.12)',
                  backdropFilter: 'blur(6px)',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'Lora, serif',
                    fontSize: '0.75 rem',
                    fontWeight: 600,
                    mb: 2,
                    color: '#1a1a1a',
                  }}
                >
                  {fabric.name}
                </Typography>

                <Typography
                  sx={{
                    fontSize: '0.50 rem',
                    color: '#555',
                    lineHeight: 1.8,
                    mb: 4,
                    maxWidth: 700,
                  }}
                >
                  {fabric.description}
                </Typography>

                {/* Specs */}
                <Stack direction="row" spacing={{ xs: 3, md: 6 }} display='flex' justifyContent={{ xs: "center", md: "space-between" }} p={{ xs: 2, md: 0 }}>
                  <Spec label="Weight" value={fabric.weight} />
                  <Spec label="Weave" value={fabric.weave} />
                  <Spec label="Feel" value={fabric.feel} />
                </Stack>
              </Box>
            </m.div>
          </AnimatePresence>

          {/* Arrows */}
          <IconButton
            onClick={prev}
            sx={{
              position: 'absolute',
              left: { md: 10, },
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: '#fff',
              display: { xs: 'none', md: 'flex' },
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              '&:hover': { backgroundColor: '#fff' },
            }}
          >
            <Icon icon="mdi:chevron-left" width={22} />
          </IconButton>

          <IconButton
            onClick={next}
            sx={{
              position: 'absolute',
              right: { md: 10 },
              top: '50%',
              display: { xs: 'none', md: 'flex' },
              transform: 'translateY(-50%)',
              backgroundColor: '#fff',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              '&:hover': { backgroundColor: '#fff' },
            }}
          >
            <Icon icon="mdi:chevron-right" width={22} />
          </IconButton>
        </Box>

        {/* Dots */}
        <Stack direction="row" justifyContent="center" spacing={1.5} mt={6}>
          {fabrics.map((_, i) => (
            <Box
              key={i}
              onClick={() => setIndex(i)}
              sx={{
                width: index === i ? 26 : 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: index === i ? '#1a1a1a' : '#ccc',
                transition: 'all 0.4s ease',
                cursor: 'pointer',
              }}
            />
          ))}
        </Stack>
      </Box>
    </LazyMotion>
  );
}

const Spec = ({ label, value }) => (
  <Box>
    <Typography
      sx={{
        fontSize: '0.7rem',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: '#999',
        mb: 0.5,
      }}
    >
      {label}
    </Typography>
    <Typography sx={{ fontWeight: 600, color: '#1a1a1a' }}>{value}</Typography>
  </Box>
);

Spec.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};
