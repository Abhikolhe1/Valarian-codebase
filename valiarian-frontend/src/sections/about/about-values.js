import PropTypes from 'prop-types';
import { Container, Grid, Stack, Typography } from '@mui/material';
import { m } from 'framer-motion';
import { MotionViewport, varFade } from 'src/components/animate';
import Iconify from 'src/components/iconify';

const DEFAULT_VALUES = {
  heading: 'Our Values',
  items: [
    {
      icon: 'mdi:medal-outline',
      title: 'Craftsmanship',
      description:
        'Every detail matters. From the selection of premium cotton to the final stitch, we never compromise on quality.',
    },
    {
      icon: 'mdi:sync',
      title: 'Sustainability',
      description:
        'We are committed to ethical production, sustainable materials, and creating garments designed to last a lifetime.',
    },
    {
      icon: 'mdi:infinity',
      title: 'Timelessness',
      description:
        'We do not follow trends. We create classic pieces that transcend seasons and remain relevant year after year.',
    },
  ],
};

export function AboutValues({ content = DEFAULT_VALUES }) {
  const valuesContent = {
    ...DEFAULT_VALUES,
    ...(content || {}),
    items: content?.items?.length ? content.items : DEFAULT_VALUES.items,
  };

  return (
    <Container component={MotionViewport} sx={{ textAlign: 'center', pt: { xs: 10, md: 15 } }}>
      <Stack spacing={3}>
        <m.div variants={varFade().inUp}>
          <Stack alignItems="center" textAlign="center" spacing={4}>
            <Typography variant="h3" fontWeight="900" color="primary.main">
              {valuesContent.heading}
            </Typography>
            <Grid container spacing={2}>
              {valuesContent.items.map((card, index) => (
                <Grid item xs={12} md={4} key={card.id || index}>
                  <Iconify icon={card.icon} width={28} />
                  <Typography fontWeight="bold" mt={1}>
                    {card.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {card.description}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </m.div>
      </Stack>
    </Container>
  );
}

AboutValues.propTypes = {
  content: PropTypes.shape({
    heading: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        description: PropTypes.string,
        icon: PropTypes.string,
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        title: PropTypes.string,
      })
    ),
  }),
};
