import { Box, Typography, Stack } from '@mui/material';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';

const fabrics = [
  {
    id: 1,
    name: 'Premium Egyptian Cotton',
    description:
      'Woven from long-staple Egyptian cotton fibers for unmatched softness, breathability, and durability.',
    weight: '180 GSM',
    weave: 'Plain weave',
    feel: 'Ultra-soft',
  },
  {
    id: 2,
    name: 'Organic Piqué Knit',
    description:
      'A timeless polo knit structure that enhances airflow while maintaining a sharp silhouette.',
    weight: '200 GSM',
    weave: 'Piqué knit',
    feel: 'Structured & airy',
  },
  {
    id: 3,
    name: 'Mercerized Cotton',
    description: 'Enhances luster and delivers a refined silky surface with long-lasting color.',
    weight: '190 GSM',
    weave: 'Mercerized weave',
    feel: 'Smooth & lustrous',
  },
  {
    id: 4,
    name: 'Mercerized Cotton',
    description: 'Enhances luster and delivers a refined silky surface with long-lasting color.',
    weight: '190 GSM',
    weave: 'Mercerized weave',
    feel: 'Smooth & lustrous',
  },
];

export default function FabricDetailScroll() {
  const containerRef = useRef(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const section = containerRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const totalHeight = section.offsetHeight - window.innerHeight;

      if (rect.top <= 0 && Math.abs(rect.top) <= totalHeight) {
        const progress = Math.abs(rect.top) / totalHeight;
        const step = Math.floor(progress * fabrics.length);
        setIndex(Math.min(step, fabrics.length - 1));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fabric = fabrics[index];

  return (
    <LazyMotion features={domAnimation}>
      {/* Outer Section - controls scroll length */}
      <Box
        ref={containerRef}
        sx={{
          height: `${fabrics.length * 100}vh`,
          position: 'relative',
        }}
      >
        {/* Sticky Inner Content */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, #fafafa 0%, #f3f3f3 100%)',
            px: 3,
          }}
        >
          <Box maxWidth={900} width="100%">
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
                fontSize: { xs: '1.8rem', md: '2.5rem' },
                fontWeight: 600,
                color: '#1a1a1a',
                mb: 6,
              }}
            >
              Crafted From Exceptional Materials
            </Typography>
            <AnimatePresence mode="wait">
              <m.div
                key={fabric.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.6 }}
              >
                <Box
                  sx={{
                    backgroundColor: '#fff',
                    borderRadius: 6,
                    p: { xs: 4, md: 6 },
                    boxShadow: '0 30px 80px rgba(0,0,0,0.12)',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'Lora, serif',
                      fontSize: '2rem',
                      fontWeight: 600,
                      mb: 2,
                    }}
                  >
                    {fabric.name}
                  </Typography>

                  <Typography sx={{ color: '#555', mb: 4, lineHeight: 1.8 }}>
                    {fabric.description}
                  </Typography>

                  <Stack direction="row" spacing={6}>
                    <Spec label="Weight" value={fabric.weight} />
                    <Spec label="Weave" value={fabric.weave} />
                    <Spec label="Feel" value={fabric.feel} />
                  </Stack>
                </Box>
              </m.div>
            </AnimatePresence>
          </Box>
        </Box>
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
    <Typography sx={{ fontWeight: 600 }}>{value}</Typography>
  </Box>
);

Spec.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};
