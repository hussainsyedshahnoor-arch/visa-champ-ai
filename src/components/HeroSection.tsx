import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, ArrowDown } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const SUGGESTED_PROMPTS = [
  "Check my tourist visa eligibility",
  "What documents do I need?",
  "Processing time & costs",
  "Talk to a visa officer",
];

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/chat?prompt=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleChipClick = (prompt: string) => {
    navigate(`/chat?prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0 -z-10">
        <img src={heroBg} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      </div>

      <div className="container relative z-10 flex flex-col items-center px-4 text-center">
        {/* Headline */}
        <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-white md:text-6xl lg:text-7xl animate-fade-in">
          Your visa. Sorted in{" "}
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">minutes.</span>
        </h1>

        <p className="mb-10 max-w-2xl text-lg text-white/70 md:text-xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Ask me about tourist visa eligibility, documents, costs — I'll guide you through it.
        </p>

        {/* Search input */}
        <form
          onSubmit={handleSubmit}
          className="mb-8 flex w-full max-w-2xl items-center gap-2 rounded-2xl bg-white p-2 shadow-2xl animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about tourist visas..."
            className="flex-1 bg-transparent px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="submit"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>

        {/* Suggestion chips */}
        <div className="flex flex-wrap justify-center gap-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleChipClick(prompt)}
              className="rounded-full border border-white/30 px-5 py-2.5 text-sm text-white/80 backdrop-blur-sm transition-all hover:border-white/60 hover:text-white hover:bg-white/10"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Scroll indicator */}
        <a
          href="#how-it-works"
          className="mt-16 flex flex-col items-center gap-1 text-sm text-white/60 transition-colors hover:text-white/80 animate-fade-in"
          style={{ animationDelay: "0.5s" }}
        >
          See how I can help you
          <ArrowDown className="h-4 w-4 animate-bounce" />
        </a>
      </div>
    </section>
  );
};

export default HeroSection;
