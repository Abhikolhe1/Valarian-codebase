import PropTypes from 'prop-types';
import { m } from 'framer-motion';
// @mui
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
// theme
import { bgGradient } from 'src/theme/css';
//
import { MotionContainer, varFade } from 'src/components/animate';

// ----------------------------------------------------------------------

export default function ContactHero({
  heroBadge = 'Where',
  heroTitleLine1 = 'to',
  heroTitleLine2 = 'find',
  heroTitleLine3 = 'us?',
  heroImage = '/assets/images/contact/hero.jpg',
  contacts = [],
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        ...bgGradient({
          color: alpha(theme.palette.grey[900], 0.8),
          imgUrl: heroImage,
        }),
        height: { md: 560 },
        py: { xs: 10, md: 0 },
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Container component={MotionContainer}>
        <Box
          sx={{
            bottom: { md: 80 },
            position: { md: 'absolute' },
            textAlign: { xs: 'center', md: 'unset' },
          }}
        >
          <Box component="h1" sx={{ m: 0, font: 'inherit' }}>
            <TextAnimate
              inline
              text={heroBadge}
              sx={{ color: 'primary.main' }}
              variants={varFade().inRight}
            />
            <br />

            <Stack
              component="span"
              spacing={2}
              display="inline-flex"
              direction="row"
              sx={{ color: 'common.white' }}
            >
              <TextAnimate inline text={heroTitleLine1} />
              <TextAnimate inline text={heroTitleLine2} />
              <TextAnimate inline text={heroTitleLine3} />
            </Stack>
          </Box>

          <Stack
            spacing={5}
            alignItems={{ xs: 'center', md: 'unset' }}
            direction={{ xs: 'column', md: 'row' }}
            sx={{ mt: 5, color: 'common.white' }}
          >
            {contacts.map((contact, index) => (
              <Stack key={contact.title || `contact-location-${index}`} sx={{ maxWidth: 220 }}>
                <m.div variants={varFade().in}>
                  <Typography variant="h6" gutterBottom>
                    {contact.title}
                  </Typography>
                </m.div>

                <m.div variants={varFade().inRight}>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    {contact.address}
                  </Typography>
                  {!!contact.phoneNumber && (
                    <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                      {contact.phoneNumber}
                    </Typography>
                  )}
                </m.div>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}

// ----------------------------------------------------------------------

function TextAnimate({ text, variants, sx, inline = false, ...other }) {
  return (
    <Box
      component={inline ? m.span : m.div}
      sx={{
        typography: 'h1',
        overflow: 'hidden',
        display: 'inline-flex',
        ...sx,
      }}
      {...other}
    >
      {text.split('').map((letter, index) => (
        <m.span key={index} variants={variants || varFade().inUp}>
          {letter}
        </m.span>
      ))}
    </Box>
  );
}

TextAnimate.propTypes = {
  inline: PropTypes.bool,
  sx: PropTypes.object,
  text: PropTypes.string,
  variants: PropTypes.object,
};

ContactHero.propTypes = {
  contacts: PropTypes.array,
  heroBadge: PropTypes.string,
  heroImage: PropTypes.string,
  heroTitleLine1: PropTypes.string,
  heroTitleLine2: PropTypes.string,
  heroTitleLine3: PropTypes.string,
};
