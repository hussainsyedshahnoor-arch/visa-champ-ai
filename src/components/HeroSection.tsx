import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, Shield, Zap } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute top-20 right-0 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-10 left-0 -z-10 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />

      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground animate-fade-in">
            <Zap className="h-4 w-4 text-accent" />
            AI-Powered Visa Guidance
          </div>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight md:text-6xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Your AI{" "}
            <span className="text-primary">Visa Consultant</span>
          </h1>

          <p className="mb-10 text-lg text-muted-foreground md:text-xl animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Get instant answers about visa requirements, eligibility, and documents.
            Visa Champ guides you from questions to application — in minutes, not weeks.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button size="lg" className="gap-2 text-base px-8" asChild>
              <Link to="/chat">
                <MessageCircle className="h-5 w-5" />
                Chat with Visa Champ
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base" asChild>
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>

          {/* Quick prompt chips */}
          <div className="mt-10 flex flex-wrap justify-center gap-2 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            {["Tourist visa for UAE", "Student visa for UK", "Work visa for Canada"].map((prompt) => (
              <Link
                key={prompt}
                to={`/chat?prompt=${encodeURIComponent(prompt)}`}
                className="rounded-full border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                "{prompt}"
              </Link>
            ))}
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-primary" />
              Secure & Private
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-accent" />
              Instant Answers
            </div>
            <div className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-primary" />
              Free to Try
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
