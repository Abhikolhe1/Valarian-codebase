// @mui
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Unstable_Grid2';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
// routes
import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hook';
import { RouterLink } from 'src/routes/components';
// _mock
import { _socials } from 'src/_mock';
// components
import Logo from 'src/components/logo';
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

const LINKS = [
  {
    headline: 'Valiarian',
    children: [
      { name: 'Products', href: paths.about },
      { name: 'Our Story', href: paths.contact },
      { name: 'FAQs', href: paths.faqs },
    ],
  },
  {
    headline: 'Legal',
    children: [
      { name: 'Terms and Condition', href: '#' },
      { name: 'Privacy Policy', href: '#' },
    ],
  },
  {
    headline: 'Contact',
    children: [{ name: 'support@Valiarian.in', href: '#' }],
  },
];

// ----------------------------------------------------------------------

export default function Footer() {
  const pathname = usePathname();

  const isHome = pathname === '/';

  const simpleFooter = (
    <Box
      component="footer"
      sx={{
        py: 5,
        textAlign: 'center',
        position: 'relative',
        bgcolor: 'background.default',
      }}
    >
      <Container>
        <Logo sx={{ mb: 1, mx: 'auto' }} />

        <Typography variant="caption" component="div">
          © All rights reserved
          <br /> made by
          <Link href="https://minimals.cc/"> minimals.cc </Link>
        </Typography>
      </Container>
    </Box>
  );

  const mainFooter = (
    <Box
      component="footer"
      sx={{
        mt: 5,
        position: 'relative',
        bgcolor: 'background.default',
      }}
    >
      <Divider />

      <Container
        sx={{
          pt: 10,
          pb: 5,
          textAlign: { xs: 'center', md: 'unset' },
        }}
      >
        <Grid container direction="row">
        <Grid xs={12} md={6}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
            <Box
              component="img"
              src="/logo/footer-logo.png"
              alt="Valiarian"
              sx={{
                width: 32,
                height: 32,
                objectFit: 'contain',
              }}
            />

            <Typography
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 900,
                fontSize: '25px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                lineHeight: 1,
                color: 'text.primary',
           
              }}
            >
              VALIARIAN
            </Typography>
          </Stack>
            <Typography
              variant="body2"
              sx={{
                maxWidth: 270,
                mx: { xs: 'auto', md: 'unset' },
              }}
            >
              The starting point for your next project with Minimal UI Kit, built on the newest
              version of Material-UI ©, ready to be customized to your style.
            </Typography>

            <Stack
              direction="row"
              justifyContent={{ xs: 'center', md: 'flex-start' }}
              sx={{
                mt: 3,
                mb: { xs: 5, md: 0 },
              }}
            >
              {_socials.map((social) => (
                <IconButton
                  key={social.name}
                  sx={{
                    '&:hover': {
                      bgcolor: alpha(social.color, 0.08),
                    },
                  }}
                >
                  <Iconify color={social.color} icon={social.icon} />
                </IconButton>
              ))}
            </Stack>
        </Grid>


        <Grid xs={12} md={6}>
          <Stack spacing={5} direction={{ xs: 'column', md: 'row' }}>
            {LINKS.map((list) => (
              <Stack
                key={list.headline}
                spacing={2}
                alignItems={{ xs: 'center', md: 'flex-start' }}
                sx={{ width: 1 }}
              >
                <Typography component="div" variant="overline">
                  {list.headline}
                </Typography>

                {list.children.map((link) => (
                  <Link
                    key={link.name}
                    component={RouterLink}
                    href={link.href}
                    color="inherit"
                    variant="body2"
                  >
                    {link.name}
                  </Link>
                ))}
              </Stack>
            ))}
          </Stack>
        </Grid>
        </Grid>

        <Grid
          container
          justifyContent={{
            xs: 'center',
            md: 'space-between',
          }}
        >
          {/* <Grid xs={8} md={3} >
          
          </Grid> */}

        </Grid>

        <Typography variant="body2" sx={{ mt: 2 }}>
          © 2026. All rights reserved
        </Typography>
      </Container>
    </Box>
  );

  return mainFooter;
}
