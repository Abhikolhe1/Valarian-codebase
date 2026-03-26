import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { LoadingButton } from '@mui/lab';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
import { useSnackbar } from 'src/components/snackbar';
import { updateAboutPage } from 'src/api/about-page';
import CMSMediaField from './cms-media-field';

const defaultValues = {
  hero: {
    eyebrow: '',
    title: '',
    backgroundImage: '',
    overlayImage: '',
  },
  stories: [
    {
      id: '',
      title: '',
      description: '',
      image: '',
      video: '',
    },
  ],
  thoughts: {
    items: [
      {
        id: '',
        quote: '',
        author: '',
      },
    ],
  },
  values: {
    heading: '',
    items: [
      {
        id: '',
        icon: '',
        title: '',
        description: '',
      },
    ],
  },
  team: {
    heading: '',
    description: '',
    ctaText: '',
    members: [
      {
        id: '',
        name: '',
        role: '',
        image: '',
        socialLinks: {
          facebook: '',
          instagram: '',
          linkedin: '',
          twitter: '',
        },
      },
    ],
  },
  seo: {
    title: '',
    description: '',
  },
};

const defaultTeamMember = defaultValues.team.members[0];

function ArraySectionCard({ title, children, onRemove, disableRemove }) {
  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1">{title}</Typography>
          <IconButton color="error" onClick={onRemove} disabled={disableRemove}>
            <Iconify icon="solar:trash-bin-trash-bold" />
          </IconButton>
        </Stack>
        {children}
      </Stack>
    </Card>
  );
}

ArraySectionCard.propTypes = {
  children: PropTypes.node,
  disableRemove: PropTypes.bool,
  onRemove: PropTypes.func,
  title: PropTypes.string,
};

export default function AboutPageEditForm({ currentAboutPage }) {
  const { enqueueSnackbar } = useSnackbar();
  const methods = useForm({
    defaultValues,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = methods;

  const stories = useFieldArray({ control, name: 'stories' });
  const thoughtItems = useFieldArray({ control, name: 'thoughts.items' });
  const valueItems = useFieldArray({ control, name: 'values.items' });
  const teamMembers = useFieldArray({ control, name: 'team.members' });

  useEffect(() => {
    if (currentAboutPage) {
      reset({
        ...defaultValues,
        ...currentAboutPage,
        stories: currentAboutPage.stories?.length ? currentAboutPage.stories : defaultValues.stories,
        thoughts: {
          ...defaultValues.thoughts,
          ...currentAboutPage.thoughts,
          items: currentAboutPage.thoughts?.items?.length
            ? currentAboutPage.thoughts.items
            : defaultValues.thoughts.items,
        },
        values: {
          ...defaultValues.values,
          ...currentAboutPage.values,
          items: currentAboutPage.values?.items?.length
            ? currentAboutPage.values.items
            : defaultValues.values.items,
        },
        team: {
          ...defaultValues.team,
          ...currentAboutPage.team,
          members: currentAboutPage.team?.members?.length
            ? currentAboutPage.team.members.map((member) => ({
                ...defaultTeamMember,
                ...member,
                socialLinks: {
                  ...defaultTeamMember.socialLinks,
                  ...member?.socialLinks,
                },
              }))
            : defaultValues.team.members,
        },
      });
    }
  }, [currentAboutPage, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      await updateAboutPage(data);
      enqueueSnackbar('About Us page updated successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(error?.message || 'Failed to update About Us page', { variant: 'error' });
    }
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
            <Typography variant="h6">Hero Section</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              <RHFTextField name="hero.eyebrow" label="Eyebrow Text" />
              <RHFTextField name="hero.title" label="Title" multiline rows={3} />
              <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
                <CMSMediaField
                  name="hero.backgroundImage"
                  label="Hero Background Image"
                  helperText="Choose an existing image or upload a new one."
                  accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.svg'] }}
                />
                <CMSMediaField
                  name="hero.overlayImage"
                  label="Overlay Image"
                  helperText="Optional overlay asset."
                  accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.svg'] }}
                />
              </Stack>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ width: 1, pr: 2 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Story Timeline
              </Typography>
              <Button
                size="small"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={(event) => {
                  event.stopPropagation();
                  stories.append({ id: '', title: '', description: '', image: '', video: '' });
                }}
              >
                Add More
              </Button>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              {stories.fields.map((field, index) => (
                <ArraySectionCard
                  key={field.id}
                  title={`Story ${index + 1}`}
                  onRemove={() => stories.remove(index)}
                  disableRemove={stories.fields.length === 1}
                >
                  <RHFTextField name={`stories.${index}.id`} label="Item Key" />
                  <RHFTextField name={`stories.${index}.title`} label="Title" />
                  <RHFTextField
                    name={`stories.${index}.description`}
                    label="Description"
                    multiline
                    rows={4}
                  />
                  <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
                    <CMSMediaField
                      name={`stories.${index}.image`}
                      label="Story Image"
                      accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.svg'] }}
                    />
                    <RHFTextField
                      name={`stories.${index}.video`}
                      label="Video URL"
                      helperText="Use uploaded media URL or external video URL"
                    />
                  </Stack>
                </ArraySectionCard>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ width: 1, pr: 2 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Thoughts Carousel
              </Typography>
              <Button
                size="small"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={(event) => {
                  event.stopPropagation();
                  thoughtItems.append({ id: '', quote: '', author: '' });
                }}
              >
                Add More
              </Button>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              {thoughtItems.fields.map((field, index) => (
                <ArraySectionCard
                  key={field.id}
                  title={`Thought ${index + 1}`}
                  onRemove={() => thoughtItems.remove(index)}
                  disableRemove={thoughtItems.fields.length === 1}
                >
                  <RHFTextField name={`thoughts.items.${index}.id`} label="Item Key" />
                  <RHFTextField
                    name={`thoughts.items.${index}.quote`}
                    label="Quote"
                    multiline
                    rows={4}
                  />
                  <RHFTextField name={`thoughts.items.${index}.author`} label="Author" />
                </ArraySectionCard>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ width: 1, pr: 2 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Values Section
              </Typography>
              <Button
                size="small"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={(event) => {
                  event.stopPropagation();
                  valueItems.append({ id: '', icon: '', title: '', description: '' });
                }}
              >
                Add More
              </Button>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              <RHFTextField name="values.heading" label="Section Heading" />
              {valueItems.fields.map((field, index) => (
                <ArraySectionCard
                  key={field.id}
                  title={`Value ${index + 1}`}
                  onRemove={() => valueItems.remove(index)}
                  disableRemove={valueItems.fields.length === 1}
                >
                  <RHFTextField name={`values.items.${index}.id`} label="Item Key" />
                  <RHFTextField name={`values.items.${index}.icon`} label="Icon Name" />
                  <RHFTextField name={`values.items.${index}.title`} label="Title" />
                  <RHFTextField
                    name={`values.items.${index}.description`}
                    label="Description"
                    multiline
                    rows={3}
                  />
                </ArraySectionCard>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ width: 1, pr: 2 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Team Section
              </Typography>
              <Button
                size="small"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={(event) => {
                  event.stopPropagation();
                  teamMembers.append({
                    ...defaultTeamMember,
                  });
                }}
              >
                Add More
              </Button>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              <RHFTextField name="team.heading" label="Section Heading" />
              <RHFTextField name="team.description" label="Section Description" multiline rows={3} />
              <RHFTextField name="team.ctaText" label="CTA Button Text" />
              <Divider />
              {teamMembers.fields.map((field, index) => (
                <ArraySectionCard
                  key={field.id}
                  title={`Member ${index + 1}`}
                  onRemove={() => teamMembers.remove(index)}
                  disableRemove={teamMembers.fields.length === 1}
                >
                  <RHFTextField name={`team.members.${index}.id`} label="Item Key" />
                  <RHFTextField name={`team.members.${index}.name`} label="Name" />
                  <RHFTextField name={`team.members.${index}.role`} label="Role" />
                  <CMSMediaField
                    name={`team.members.${index}.image`}
                    label="Member Image"
                    accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.svg'] }}
                  />
                  <Divider />
                  <Typography variant="subtitle2">Social Media Links</Typography>
                  <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
                    <RHFTextField
                      name={`team.members.${index}.socialLinks.facebook`}
                      label="Facebook URL"
                      placeholder="https://facebook.com/your-profile"
                    />
                    <RHFTextField
                      name={`team.members.${index}.socialLinks.instagram`}
                      label="Instagram URL"
                      placeholder="https://instagram.com/your-profile"
                    />
                  </Stack>
                  <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
                    <RHFTextField
                      name={`team.members.${index}.socialLinks.linkedin`}
                      label="LinkedIn URL"
                      placeholder="https://linkedin.com/in/your-profile"
                    />
                    <RHFTextField
                      name={`team.members.${index}.socialLinks.twitter`}
                      label="Twitter/X URL"
                      placeholder="https://twitter.com/your-profile"
                    />
                  </Stack>
                </ArraySectionCard>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
            <Typography variant="h6">SEO</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              <RHFTextField name="seo.title" label="SEO Title" />
              <RHFTextField name="seo.description" label="SEO Description" multiline rows={3} />
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
            Save About Us
          </LoadingButton>
        </Box>
      </Stack>
    </FormProvider>
  );
}

AboutPageEditForm.propTypes = {
  currentAboutPage: PropTypes.object,
};
