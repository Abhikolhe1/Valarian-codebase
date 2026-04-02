import { Icon } from '@iconify/react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
import PropTypes from 'prop-types';
import { useState } from 'react';

const DEFAULT_CONTENT = {
  subheading: 'Fabric Story',
  heading: 'Crafted From Exceptional Materials',
  items: [
    {
      title: 'Premium Egyptian Cotton',
      description:
        'Woven from long-staple cotton fibers for softness, breathability, and durability.',
      weight: '180 GSM',
      weave: 'Plain weave',
      feel: 'Ultra-soft',
    },
  ],
};

export default function PremiumFabricDetailsSection({ section }) {
  const content = { ...DEFAULT_CONTENT, ...(section?.content || {}) };
  const items = content.items?.length ? content.items : DEFAULT_CONTENT.items;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const item = items[index];
  const swipeThreshold = 5000;

  const next = () => {
    setDirection(1);
    setIndex((current) => (current + 1) % items.length);
  };

  const prev = () => {
    setDirection(-1);
    setIndex((current) => (current - 1 + items.length) % items.length);
  };

  return (
    <LazyMotion features={domAnimation}>
      <Box sx={{ py: { xs: 10, md: 14 }, background: 'linear-gradient(180deg, #fafafa 0%, #f3f3f3 100%)' }}>
        <Box textAlign="center" mb={8} px={2}>
          <Typography sx={{ fontSize: '0.75rem', letterSpacing: 4, textTransform: 'uppercase', color: '#999', mb: 1 }}>
            {content.subheading}
          </Typography>
          <Typography sx={{ fontFamily: 'Lora, serif', fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 600, color: '#1a1a1a' }}>
            {content.heading}
          </Typography>
        </Box>

        <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, md: 6 }, py: 2, position: 'relative', overflow: 'visible' }}>
          <Box sx={{ overflow: 'hidden', borderRadius: '28px', display: 'grid', touchAction: 'pan-y' }}>
            <AnimatePresence mode="sync" initial={false}>
              <m.div
                key={`${item.title}-${index}`}
                style={{
                  gridArea: '1 / 1',
                  width: '100%',
                  touchAction: 'pan-y',
                  cursor: 'grab',
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.35}
                dragDirectionLock
                dragMomentum
                whileDrag={{ scale: 0.98 }}

                onDragEnd={(e, info) => {
                  const swipePower = Math.abs(info.offset.x) * info.velocity.x;

                  if (swipePower < -swipeThreshold) {
                    next();
                  } else if (swipePower > swipeThreshold) {
                    prev();
                  }
                }}

                initial={{ x: direction === 1 ? '100%' : '-100%', opacity: 0 }}
                animate={{ x: '0%', opacity: 1 }}
                exit={{ x: direction === 1 ? '-100%' : '100%', opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Box sx={{ backgroundColor: '#fff', borderRadius: '28px', p: { xs: 4, md: 6 }, boxShadow: '0 30px 80px rgba(0,0,0,0.12)' }}>
                  <Typography sx={{ fontFamily: 'Lora, serif', fontSize: '1.75rem', fontWeight: 600, mb: 2, color: '#1a1a1a' }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ color: '#555', lineHeight: 1.8, mb: 4, maxWidth: 700 }}>
                    {item.description}
                  </Typography>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 6 }} justifyContent="space-between">
                    <Spec label="Weight" value={item.weight} />
                    <Spec label="Weave" value={item.weave} />
                    <Spec label="Feel" value={item.feel} />
                  </Stack>
                </Box>
              </m.div>
            </AnimatePresence>
          </Box>

          {items.length > 1 && (
            <>
              <IconButton
                onClick={prev}
                sx={{
                  position: 'absolute',
                  left: { md: -8 },
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: '#fff',
                  display: { xs: 'none', md: 'flex' },
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                  '&:hover': { bgcolor: '#fff' },
                }}
              >
                <Icon icon="mdi:chevron-left" width={22} />
              </IconButton>
              <IconButton
                onClick={next}
                sx={{
                  position: 'absolute',
                  right: { md: -8 },
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: '#fff',
                  display: { xs: 'none', md: 'flex' },
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                  '&:hover': { bgcolor: '#fff' },
                }}
              >
                <Icon icon="mdi:chevron-right" width={22} />
              </IconButton>
            </>
          )}
        </Box>

        {items.length > 1 && (
          <Stack direction="row" justifyContent="center" spacing={1.5} mt={6}>
            {items.map((_, itemIndex) => (
              <Box
                key={itemIndex}
                onClick={() => setIndex(itemIndex)}
                sx={{
                  width: index === itemIndex ? 26 : 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: index === itemIndex ? '#1a1a1a' : '#ccc',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
              />
            ))}
          </Stack>
        )}
      </Box>
    </LazyMotion>
  );
}

function Spec({ label, value }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '0.7rem', letterSpacing: 2, textTransform: 'uppercase', color: '#999', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600, color: '#1a1a1a' }}>{value}</Typography>
    </Box>
  );
}

Spec.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
};

PremiumFabricDetailsSection.propTypes = {
  section: PropTypes.shape({
    content: PropTypes.object,
  }),
};
