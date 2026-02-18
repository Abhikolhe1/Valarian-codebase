import { Box, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import Iconify from '../iconify';

/**
 * Features Section Component
 * Displays a grid of features/benefits with icons
 */
export default function FeaturesSection({ section }) {
  const { content, settings } = section;

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        backgroundColor: settings?.backgroundColor || '#f9fafb',
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={5}>
          {/* Section Header */}
          {(content?.title || content?.subtitle) && (
            <Stack spacing={1} alignItems="center" textAlign="center">
              {content?.subtitle && (
                <Typography variant="overline" color="text.secondary">
                  {content.subtitle}
                </Typography>
              )}
              {content?.title && (
                <Typography variant="h2">{content.title}</Typography>
              )}
            </Stack>
          )}

          {/* Features Grid */}
          {content?.features && (
            <Grid container spacing={settings?.spacing || 3}>
              {content.features.map((feature, index) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={12 / (settings?.columns || 4)}
                  key={index}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      height: '100%',
                      textAlign: 'center',
                      transition: 'transform 0.3s',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                      },
                    }}
                  >
                    <Stack spacing={2} alignItems="center">
                      {feature.icon && (
                        <Box
                          sx={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            backgroundColor: 'primary.lighter',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Iconify
                            icon={feature.icon}
                            width={32}
                            sx={{ color: 'primary.main' }}
                          />
                        </Box>
                      )}

                      {feature.title && (
                        <Typography variant="h6">{feature.title}</Typography>
                      )}

                      {feature.description && (
                        <Typography variant="body2" color="text.secondary">
                          {feature.description}
                        </Typography>
                      )}
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

FeaturesSection.propTypes = {
  section: PropTypes.shape({
    content: PropTypes.object,
    settings: PropTypes.object,
  }).isRequired,
};
