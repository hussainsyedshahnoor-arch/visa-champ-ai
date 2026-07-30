import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

import FlagMarquee from "@/components/FlagMarquee";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";

const Index = () => (
  <div className="min-h-screen">
    <Navbar />
    <main>
      <HeroSection />
      
      <FlagMarquee />
      <HowItWorks />
      <Features />
      <Testimonials />
    </main>
    <Footer />
  </div>
);

export default Index;
