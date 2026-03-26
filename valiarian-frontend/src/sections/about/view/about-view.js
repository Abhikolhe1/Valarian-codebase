import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import { useGetAboutPage } from 'src/api/about-page';
import AboutHero from '../about-hero';
import AboutStorySection from '../about-story';
import AboutTeam from '../about-team';
import AboutThoughtCarousel from '../about-thought';
import { AboutValues } from '../about-values';

export default function AboutView() {
  const { aboutPage, aboutPageLoading } = useGetAboutPage();

  if (aboutPageLoading && !aboutPage) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '50vh' }}>
        <CircularProgress color="inherit" />
      </Stack>
    );
  }

  return (
    <>
      <AboutHero content={aboutPage?.hero} />

      <AboutStorySection
        stories={aboutPage?.stories?.map((story) => ({
          ...story,
          name: story?.title || story?.name,
        }))}
      />

      <AboutThoughtCarousel items={aboutPage?.thoughts?.items} />

      <AboutValues content={aboutPage?.values} />

      <AboutTeam content={aboutPage?.team} />
    </>
  );
}
