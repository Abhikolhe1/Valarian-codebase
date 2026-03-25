//

import AboutHero from '../about-hero';
import AboutStorySection from '../about-story';
import AboutTeam from '../about-team';
import AboutThoughtCarousel from '../about-thought';
import { AboutValues } from '../about-values';

// ----------------------------------------------------------------------

export default function AboutView() {
  return (
    <>
      <AboutHero />

      <AboutStorySection />

      <AboutThoughtCarousel />

      <AboutValues />

      <AboutTeam />

      {/* <AboutWhat />
      <AboutVision /> */}
      {/* <AboutTestimonials /> */}
    </>
  );
}
