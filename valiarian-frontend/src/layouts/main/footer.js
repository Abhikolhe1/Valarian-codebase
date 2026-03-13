// @mui
import { Grid, Skeleton } from '@mui/material';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
// routes
import { RouterLink } from 'src/routes/components';
import { usePathname } from 'src/routes/hook';
// components
import Iconify from 'src/components/iconify';
import Logo from 'src/components/logo';
// contexts
import { useSiteSettings } from 'src/contexts/SiteSettingsContext';
// hooks
import { useFooterNavigation } from './hooks/use-footer-navigation';

export default function Footer() {
  const pathname = usePathname();

  // Fetch footer navigation from CMS
  const { navigation: footerLinks, isLoading: navLoading } = useFooterNavigation();

  // Fetch site settings from CMS
  const { settings } = useSiteSettings();
  console.log('setting 123', settings);

  const isHome = pathname === '/';

  // Social media links from CMS settings
  const socialLinks = [
    { name: 'Facebook', icon: 'eva:facebook-fill', color: '#1877F2', url: settings.socialMedia?.facebook },
    { name: 'Instagram', icon: 'ant-design:instagram-filled', color: '#E02D69', url: settings.socialMedia?.instagram },
    { name: 'Twitter', icon: 'eva:twitter-fill', color: '#00AAEC', url: settings.socialMedia?.twitter },
    { name: 'LinkedIn', icon: 'eva:linkedin-fill', color: '#007EBB', url: settings.socialMedia?.linkedin },
    { name: 'YouTube', icon: 'eva:youtube-fill', color: '#FF0000', url: settings.socialMedia?.youtube },
    { name: 'Pinterest', icon: 'ant-design:pinterest-filled', color: '#E60023', url: settings.socialMedia?.pinterest },
  ].filter(social => social.url); // Only show social links that have URLs configured

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
          © {new Date().getFullYear()} {settings.general?.siteName || 'Valiarian'}. All rights reserved
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
          <Grid item xs={12} md={6}>
            <Stack direction="row" alignItems="center" justifyContent={{ xs: 'center', md: 'flex-start' }}
              spacing={1.5} mb={2} sx={{ textAlign: { xs: 'center', md: 'left' } }}
            >
              <Box
                component="img"
                src={settings.general?.logo || '/logo/footer-logo.png'}
                alt={settings.general?.siteName || 'Valiarian'}
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
                {settings.general?.siteName || 'VALIARIAN'}
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              sx={{
                maxWidth: 270,
                mx: { xs: 'auto', md: 'unset' },
              }}
            >
              {settings.general?.siteDescription || 'The starting point for your next project with Valiarian UI Kit, built on the newest version of Material-UI ©, ready to be customized to your style.'}
            </Typography>

            <Stack
              direction="row"
              justifyContent={{ xs: 'center', md: 'flex-start' }}
              sx={{
                mt: 3,
                mb: { xs: 5, md: 0 },
              }}
            >
              {socialLinks.map((social) => (
                <IconButton
                  key={social.name}
                  component="a"
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
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


          <Grid item xs={12} md={6}>
            <Stack spacing={5} direction={{ xs: 'column', md: 'row' }}>
              {navLoading ? (
                // Loading skeleton for footer navigation
                <>
                  <Stack spacing={2} alignItems={{ xs: 'center', md: 'flex-start' }} sx={{ width: 1 }}>
                    <Skeleton variant="text" width={100} height={24} />
                    <Skeleton variant="text" width={120} height={20} />
                    <Skeleton variant="text" width={120} height={20} />
                    <Skeleton variant="text" width={120} height={20} />
                  </Stack>
                  <Stack spacing={2} alignItems={{ xs: 'center', md: 'flex-start' }} sx={{ width: 1 }}>
                    <Skeleton variant="text" width={100} height={24} />
                    <Skeleton variant="text" width={120} height={20} />
                    <Skeleton variant="text" width={120} height={20} />
                  </Stack>
                  <Stack spacing={2} alignItems={{ xs: 'center', md: 'flex-start' }} sx={{ width: 1 }}>
                    <Skeleton variant="text" width={100} height={24} />
                    <Skeleton variant="text" width={120} height={20} />
                  </Stack>
                </>
              ) : (
                footerLinks.map((list) => (
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
                ))
              )}
            </Stack>
          </Grid>
        </Grid>

        <Typography variant="body2" sx={{ mt: 10, textAlign: 'center' }}>
          © {new Date().getFullYear()} {settings.general?.siteName || 'Valiarian'}. All rights reserved
        </Typography>
      </Container>
    </Box>
  );

  return mainFooter;
}
