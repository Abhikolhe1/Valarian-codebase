import { m } from 'framer-motion';
import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// components
import { MotionViewport, varFade } from 'src/components/animate';
import Markdown from 'src/components/markdown';

// ----------------------------------------------------------------------

export default function TextSection({ section }) {
  const { content } = section;
  const {
    heading,
    content: textContent,
    alignment = 'left',
  } = content;

  const alignmentMap = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
  };

  return (
    <Container
      component={MotionViewport}
      sx={{
        py: { xs: 10, md: 15 },
      }}
    >
      <Stack
        spacing={4}
        alignItems={alignmentMap[alignment]}
        sx={{
          maxWidth: 900,
          mx: alignment === 'center' ? 'auto' : 0,
          ml: alignment === 'right' ? 'auto' : alignment === 'center' ? 'auto' : 0,
        }}
      >
        {heading && (
          <m.div variants={varFade().inDown}>
            <Typography
              variant="h2"
              sx={{
                textAlign: alignment,
              }}
            >
              {heading}
            </Typography>
          </m.div>
        )}

        <m.div variants={varFade().inUp} style={{ width: '100%' }}>
          <Box
            sx={{
              textAlign: alignment,
              '& p': {
                mb: 2,
                color: 'text.secondary',
                fontSize: '1.125rem',
                lineHeight: 1.8,
              },
              '& h1, & h2, & h3, & h4, & h5, & h6': {
                mt: 3,
                mb: 2,
                color: 'text.primary',
              },
              '& ul, & ol': {
                pl: 3,
                mb: 2,
              },
              '& li': {
                mb: 1,
                color: 'text.secondary',
              },
              '& a': {
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              },
              '& blockquote': {
                borderLeft: (theme) => `4px solid ${theme.palette.primary.main}`,
                pl: 3,
                py: 1,
                my: 3,
                fontStyle: 'italic',
                color: 'text.secondary',
              },
              '& img': {
                maxWidth: '100%',
                height: 'auto',
                borderRadius: 2,
                my: 3,
              },
              '& code': {
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: 'grey.200',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              },
              '& pre': {
                p: 2,
                borderRadius: 2,
                bgcolor: 'grey.900',
                color: 'common.white',
                overflow: 'auto',
                '& code': {
                  bgcolor: 'transparent',
                  color: 'inherit',
                  p: 0,
                },
              },
            }}
          >
            <Markdown children={textContent} />
          </Box>
        </m.div>
      </Stack>
    </Container>
  );
}

TextSection.propTypes = {
  section: PropTypes.shape({
    content: PropTypes.shape({
      heading: PropTypes.string,
      content: PropTypes.string.isRequired,
      alignment: PropTypes.oneOf(['left', 'center', 'right']),
    }).isRequired,
  }).isRequired,
};
