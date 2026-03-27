// @mui
import { Grid } from '@mui/material';
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
// components
import Iconify from 'src/components/iconify';
// contexts
import { useSiteSettings } from 'src/contexts/SiteSettingsContext';
// hooks
import { useFooterNavigation } from './hooks/use-footer-navigation';

export default function Footer() {
  const { navigation: footerLinks } = useFooterNavigation();
  const { settings } = useSiteSettings();
  const legalDocuments = settings?.legalDocuments || {};

  const isExternalLink = (href) =>
    typeof href === 'string' &&
    (href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('blob:') ||
      /\.(pdf|doc|docx)$/i.test(href));

  const normalizeHref = (href) => {
    if (!href || typeof href !== 'string') {
      return '';
    }

    const trimmedHref = href.trim();

    if (!trimmedHref) {
      return '';
    }

    if (
      trimmedHref.startsWith('http://') ||
      trimmedHref.startsWith('https://') ||
      trimmedHref.startsWith('/')
    ) {
      return trimmedHref;
    }

    return `/${trimmedHref}`;
  };

  const resolveFooterLink = (listHeadline, link) => {
    if (listHeadline?.toLowerCase() !== 'legal') {
      return {
        href: normalizeHref(link.href),
        target: link.target,
        rel: link.rel,
      };
    }

    const linkName = link.name?.toLowerCase();
    const termsHref = normalizeHref(legalDocuments.termsAndConditionsUrl);
    const privacyHref = normalizeHref(legalDocuments.privacyPolicyUrl);

    if (linkName?.includes('terms')) {
      return {
        href: termsHref || '#',
        target: termsHref ? '_blank' : undefined,
        rel: termsHref ? 'noopener noreferrer' : undefined,
      };
    }

    if (linkName?.includes('privacy')) {
      return {
        href: privacyHref || '#',
        target: privacyHref ? '_blank' : undefined,
        rel: privacyHref ? 'noopener noreferrer' : undefined,
      };
    }

    return {
      href: normalizeHref(link.href),
      target: link.target,
      rel: link.rel,
    };
  };

  const socialLinks = [
    {
      name: 'Facebook',
      icon: 'eva:facebook-fill',
      color: '#1877F2',
      url: settings.socialMedia?.facebook,
    },
    {
      name: 'Instagram',
      icon: 'ant-design:instagram-filled',
      color: '#E02D69',
      url: settings.socialMedia?.instagram,
    },
    {
      name: 'Twitter',
      icon: 'eva:twitter-fill',
      color: '#00AAEC',
      url: settings.socialMedia?.twitter,
    },
    {
      name: 'LinkedIn',
      icon: 'eva:linkedin-fill',
      color: '#007EBB',
      url: settings.socialMedia?.linkedin,
    },
    {
      name: 'YouTube',
      icon: 'eva:youtube-fill',
      color: '#FF0000',
      url: settings.socialMedia?.youtube,
    },
    {
      name: 'Pinterest',
      icon: 'ant-design:pinterest-filled',
      color: '#E60023',
      url: settings.socialMedia?.pinterest,
    },
  ].filter((social) => social.url);

  return (
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
            <Stack
              direction="row"
              alignItems="center"
              justifyContent={{ xs: 'center', md: 'flex-start' }}
              spacing={1.5}
              mb={2}
              sx={{ textAlign: { xs: 'center', md: 'left' } }}
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
              {settings.general?.siteDescription ||
                'The starting point for your next project with Valiarian UI Kit, built on the newest version of Material-UI, ready to be customized to your style.'}
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
              {footerLinks.map((list) => (
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
                    (() => {
                      const resolvedLink = resolveFooterLink(list.headline, link);

                      return (
                        <Link
                          key={link.name}
                          component={isExternalLink(resolvedLink.href) ? 'a' : RouterLink}
                          href={resolvedLink.href}
                          target={resolvedLink.target}
                          rel={resolvedLink.rel}
                          color="inherit"
                          variant="body2"
                        >
                          {link.name}
                        </Link>
                      );
                    })()
                  ))}
                </Stack>
              ))}
            </Stack>
          </Grid>
        </Grid>

        <Typography variant="body2" sx={{ mt: 10, textAlign: 'center' }}>
          Copyright {new Date().getFullYear()} {settings.general?.siteName || 'Valiarian'}. All
          rights reserved
        </Typography>
      </Container>
    </Box>
  );
}
