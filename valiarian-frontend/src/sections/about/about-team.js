import { m } from 'framer-motion';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { _carouselsMembers, _socials } from 'src/_mock';
import { MotionViewport, varFade } from 'src/components/animate';
import Carousel, { CarouselArrows, useCarousel } from 'src/components/carousel';
import Iconify from 'src/components/iconify';
import Image from 'src/components/image';

const DEFAULT_CONTENT = {
  heading: 'Great team is the key',
  description:
    'Valiarian will provide you support if you have any problems, our support team will reply within a day and we also have detailed documentation.',
  ctaText: 'All Members',
  members: _carouselsMembers,
};

export default function AboutTeam({ content = DEFAULT_CONTENT }) {
  const teamContent = {
    ...DEFAULT_CONTENT,
    ...(content || {}),
    members: content?.members?.length ? content.members : DEFAULT_CONTENT.members,
  };

  const carousel = useCarousel({
    infinite: false,
    slidesToShow: 4,
    responsive: [
      { breakpoint: 1279, settings: { slidesToShow: 3 } },
      { breakpoint: 959, settings: { slidesToShow: 2 } },
      { breakpoint: 600, settings: { slidesToShow: 1 } },
    ],
  });

  return (
    <Container component={MotionViewport} sx={{ textAlign: 'center', py: { xs: 10, md: 15 } }}>
      <m.div variants={varFade().inUp}>
        <Typography variant="h3" sx={{ my: 3 }} fontWeight="900" color="primary.main">
          {teamContent.heading}
        </Typography>
      </m.div>

      <m.div variants={varFade().inUp}>
        <Typography sx={{ mx: 'auto', maxWidth: 640, color: 'text.secondary' }}>
          {teamContent.description}
        </Typography>
      </m.div>

      <Box sx={{ position: 'relative' }}>
        <CarouselArrows
          filled
          shape="rounded"
          onNext={carousel.onNext}
          onPrev={carousel.onPrev}
          leftButtonProps={{
            sx: {
              left: 24,
              ...(teamContent.members.length < 5 && { display: 'none' }),
            },
          }}
          rightButtonProps={{
            sx: {
              right: 24,
              ...(teamContent.members.length < 5 && { display: 'none' }),
            },
          }}
        >
          <Carousel ref={carousel.carouselRef} {...carousel.carouselSettings}>
            {teamContent.members.map((member) => (
              <Box
                key={member.id || member.name}
                component={m.div}
                variants={varFade().in}
                sx={{ px: 1.5, py: { xs: 8, md: 10 } }}
              >
                <MemberCard member={member} />
              </Box>
            ))}
          </Carousel>
        </CarouselArrows>
      </Box>

      <Button
        size="large"
        color="secondary"
        backgroundcolur
        variant="outlined"
        endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={24} />}
        sx={{ mx: 'auto' }}
      >
        {teamContent.ctaText}
      </Button>
    </Container>
  );
}

AboutTeam.propTypes = {
  content: PropTypes.shape({
    ctaText: PropTypes.string,
    description: PropTypes.string,
    heading: PropTypes.string,
    members: PropTypes.arrayOf(PropTypes.object),
  }),
};

const SOCIAL_ITEMS = _socials.map((social) => ({
  key: social.value,
  name: social.name,
  icon: social.icon,
  color: social.color,
}));

function MemberCard({ member }) {
  const { name, role, avatarUrl, image, socialLinks } = member;
  const visibleSocials = SOCIAL_ITEMS.filter((social) => socialLinks?.[social.key]);

  return (
    <Card key={name}>
      <Typography variant="subtitle1" sx={{ mt: 2.5, mb: 0.5 }}>
        {name}
      </Typography>

      <Typography variant="body2" sx={{ mb: 2.5, color: 'text.secondary' }}>
        {role}
      </Typography>

      <Box sx={{ px: 1 }}>
        <Image alt={name} src={image || avatarUrl} ratio="1/1" sx={{ borderRadius: 2 }} />
      </Box>

      <Stack direction="row" alignItems="center" justifyContent="center" sx={{ p: 2, minHeight: 56 }}>
        {visibleSocials.map((social) => (
          <IconButton
            key={social.name}
            component="a"
            href={socialLinks?.[social.key]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.name}
            sx={{
              color: social.color,
              '&:hover': {
                bgcolor: alpha(social.color, 0.08),
              },
            }}
          >
            <Iconify icon={social.icon} />
          </IconButton>
        ))}
      </Stack>
    </Card>
  );
}

MemberCard.propTypes = {
  member: PropTypes.object,
};
