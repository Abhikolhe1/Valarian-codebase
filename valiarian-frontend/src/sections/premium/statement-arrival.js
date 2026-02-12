import { Icon } from '@iconify/react';
import { Box, Typography, Stack, IconButton } from '@mui/material';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function StatementArrivalDetail() {
  const [index, setIndex] = useState(0);


  return (
    <LazyMotion features={domAnimation}>
      <Box
        sx={{
          py: { xs: 10, md: 14 },
          background: 'linear-gradient(180deg, #fafafa 0%, #f3f3f3 100%)',
        }}
      >
        {/* Header */}
        <Box textAlign="center">
         <Typography
            sx={{
              fontFamily: 'Lora, serif',
              fontSize: { xs: '2rem', md: '2.8rem' },
              fontWeight: 500,
              color: '#8C6549',
            }}
          >
            “Not Just a Shirt.

          </Typography>

          <Typography
            sx={{
              fontFamily: 'Lora, serif',
              fontSize: { xs: '2rem', md: '2.8rem' },
              fontWeight: 600,
              color: '#4A39189E',
            }}
          >
            A Statement of Arrival.”
          </Typography>
        </Box>
      </Box>
    </LazyMotion>
  );
}

