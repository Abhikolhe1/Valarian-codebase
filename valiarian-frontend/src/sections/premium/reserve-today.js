import { LoadingButton } from '@mui/lab';
import { Box, Typography } from '@mui/material';
import { LazyMotion, domAnimation } from 'framer-motion';
import { useState } from 'react';

export default function ReserveTodayDetail() {
  const [index, setIndex] = useState(0);


  return (
    <LazyMotion features={domAnimation}>
      <Box
        sx={{
          py: { xs: 10, md: 14 },
          px: { xs: 2, md: 0 },
          background: '#AC7F5E45',
        }}
      >
        {/* Header */}
        <Box textAlign="center">
          <Typography
            sx={{
              fontFamily: 'Lora, serif',
              fontSize: { xs: '2rem', md: '2.8rem' },
              fontWeight: 600,
              color: '#8C6549',
            }}
          >
            Reserve Your&apos;s Today

          </Typography>

          <Typography
            align="center"
            sx={{
              mt: 2,
              letterSpacing: 1,
              fontSize: 13,
              fontWeight: 500,
              color: '#637381',
            }}
          >
            Only 150 pieces available worldwide. Once they&apos;re gone, they&apos;re gone forever.
          </Typography>

          <Typography
            align="center"
            sx={{
              mt: 6,

              letterSpacing: 1,
              fontSize: 13,
              fontWeight: 500,
              color: '#637381',
            }}
          >
            Only Available Until 15th January 2026
          </Typography>

          <LoadingButton
            variant="contained"
            sx={(theme)=>({
              mt: 4,
              px: 5,
              backgroundColor: theme.palette.secondary.main,
              '&:hover': {
                backgroundColor: theme.palette.secondary.main,
              },
            })}
          >
            Buy Now
          </LoadingButton>

        </Box>
      </Box>
    </LazyMotion>
  );
}

