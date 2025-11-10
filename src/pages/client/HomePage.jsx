import HeroSection from "./landing/HeroSection";
import FeatureSection from "./landing/FeatureSection";
import ProgressSection from "./landing/ProgressSection";
import AIMentorSection from "./landing/AIMentorSection";
import LandingFooter from "./landing/LandingFooter";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="">
        <HeroSection />
        <FeatureSection />
        <ProgressSection />
        <AIMentorSection />
      </main>
      <LandingFooter />
    </div>
  );
};

export default HomePage;
