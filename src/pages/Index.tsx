import { useState, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";
import ChatPanel from "@/components/ChatPanel";

const Index = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  const handleStartChat = (prompt: string) => {
    setInitialPrompt(prompt);
    setChatOpen(true);
  };

  useEffect(() => {
    if (chatOpen && chatRef.current) {
      chatRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [chatOpen]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <HeroSection onStartChat={handleStartChat} />
        {chatOpen && (
          <div ref={chatRef} className="relative z-20 -mt-16">
            <ChatPanel initialPrompt={initialPrompt} onClose={() => setChatOpen(false)} />
          </div>
        )}
        <HowItWorks />
        <Features />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
