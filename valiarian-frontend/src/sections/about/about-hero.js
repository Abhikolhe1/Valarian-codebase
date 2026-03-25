import { m } from 'framer-motion';
import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// components
import { MotionContainer, varFade } from 'src/components/animate';

// ----------------------------------------------------------------------

export default function AboutHero() {
  return (
    <Box
      sx={{
        height: { md: 560 },
        py: { xs: 10, md: 0 },
        overflow: 'hidden',
        position: 'relative',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundImage:
          'url(/assets/background/overlay_1.svg), url(/assets/images/about/hero.jpg)',
      }}
    >
      <Container component={MotionContainer}>
        <Box
          sx={{
            // pl: { xs: 0, md: 10 },
            bottom: { md: 80 },
            position: { md: 'absolute' },
            textAlign: {
              xs: 'center',
              md: 'unset',
            },
          }}
        >
          <TextAnimate text="Our Story" variants={varFade().inRight} sx={{ color: 'warning.light' }} />

          <br />

          {/* <Stack spacing={2} display="inline-flex" direction="row" sx={{ color: 'common.white' }}>
            <TextAnimate text="we" />
            <TextAnimate text="are?" />
          </Stack> */}

          <m.div variants={varFade().inRight}>
            <Typography
              variant="h4"
              sx={{
                mt: 3,
                color: 'common.white',
                fontWeight: 'fontWeightSemiBold',
              }}
            >
              A commitment to timeless quality,<br /> sustainable
              craftsmanship, and the perfect polo shirt.
            </Typography>
          </m.div>
        </Box>
      </Container>
    </Box>
  );
}

// ----------------------------------------------------------------------

function TextAnimate({ text, variants, sx, ...other }) {
  return (
    <Box
      component={m.div}
      sx={{
        typography: 'h1',
        overflow: 'hidden',
        display: 'inline-flex',
        ...sx,
      }}
      {...other}
    >
      {text.split().map((letter, index) => (
        <m.span key={index} variants={variants || varFade().inUp}>
          {letter}
        </m.span>
      ))}
    </Box>
  );
}

TextAnimate.propTypes = {
  sx: PropTypes.object,
  text: PropTypes.string,
  variants: PropTypes.object,
};
