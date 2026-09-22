import HeroSection from '@/components/home/HeroSection';
import Marquee from '@/components/home/Marquee';
import HowItWorks from '@/components/home/HowItWorks';
import FeaturedSessions from '@/components/home/FeaturedSessions';
import SportsTiles from '@/components/home/SportsTiles';
import MechanicSection from '@/components/home/MechanicSection';
import VenuesRail from '@/components/home/VenuesRail';
import Testimonials from '@/components/home/Testimonials';
import FinalCTA from '@/components/home/FinalCTA';

export default function Home() {
  return (
    <>
      <HeroSection />
      <Marquee />
      <HowItWorks />
      <FeaturedSessions />
      <SportsTiles />
      <MechanicSection />
      <VenuesRail />
      <Testimonials />
      <FinalCTA />
    </>
  );
}
