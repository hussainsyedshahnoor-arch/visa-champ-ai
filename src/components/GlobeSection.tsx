import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Country {
  id: string;
  name: string;
  flag_emoji: string;
}

const GlobeSection = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("countries")
      .select("id, name, flag_emoji")
      .order("name")
      .then(({ data }) => {
        if (data) setCountries(data);
      });
  }, []);

  const handleClick = (countryId: string) => {
    navigate(`/eligibility?country=${countryId}`);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-card to-background py-16 md:py-24">
      {/* Section header */}
      <div className="container px-4 text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">
          Pick Your Destination 🌍
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Tap a country to instantly check your tourist visa eligibility
        </p>
      </div>

      <div className="container px-4 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
        {/* Globe visual */}
        <div className="relative w-64 h-64 md:w-80 md:h-80 shrink-0 mx-auto lg:mx-0">
          {/* Glow */}
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl animate-pulse" />

          {/* Globe sphere */}
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary/80 via-primary to-primary/60 shadow-2xl overflow-hidden">
            {/* Grid lines */}
            <div className="absolute inset-0 rounded-full" style={{
              background: `
                repeating-conic-gradient(transparent 0deg, transparent 28deg, rgba(255,255,255,0.08) 28deg, rgba(255,255,255,0.08) 30deg),
                repeating-linear-gradient(0deg, transparent 0%, transparent 18%, rgba(255,255,255,0.08) 18%, rgba(255,255,255,0.08) 20%)
              `,
            }} />
            {/* Continents hint */}
            <div className="absolute top-[18%] left-[22%] w-[28%] h-[22%] rounded-[40%] bg-white/12 rotate-[-12deg]" />
            <div className="absolute top-[30%] right-[18%] w-[20%] h-[30%] rounded-[35%] bg-white/10 rotate-[8deg]" />
            <div className="absolute bottom-[22%] left-[30%] w-[18%] h-[16%] rounded-[50%] bg-white/10 rotate-[-5deg]" />
            {/* Highlight */}
            <div className="absolute top-[10%] left-[15%] w-[35%] h-[35%] rounded-full bg-white/15 blur-xl" />
            {/* Rotating ring */}
            <div className="absolute inset-[-8%] rounded-full border-2 border-dashed border-white/15 animate-[spin_30s_linear_infinite]" />
          </div>

          {/* Orbiting flags (decorative) */}
          {countries.slice(0, 6).map((c, i) => {
            const angle = (i / 6) * 360;
            const radius = 52;
            return (
              <button
                key={c.id}
                onClick={() => handleClick(c.id)}
                className="absolute text-2xl md:text-3xl transition-transform duration-300 hover:scale-125 cursor-pointer z-10"
                style={{
                  top: `${50 + radius * Math.sin((angle * Math.PI) / 180)}%`,
                  left: `${50 + radius * Math.cos((angle * Math.PI) / 180)}%`,
                  transform: "translate(-50%, -50%)",
                  animation: `spin 30s linear infinite`,
                  animationDelay: `${-i * 5}s`,
                }}
                title={c.name}
              >
                {c.flag_emoji}
              </button>
            );
          })}
        </div>

        {/* Country grid */}
        <div className="flex-1 w-full">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {countries.map((country) => (
              <button
                key={country.id}
                onClick={() => handleClick(country.id)}
                onMouseEnter={() => setHoveredId(country.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`group flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ${
                  hoveredId === country.id
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/10 scale-[1.03]"
                    : "border-border/60 bg-card hover:border-primary/50 hover:shadow-md"
                }`}
              >
                <span className="text-3xl leading-none">{country.flag_emoji}</span>
                <span className="text-sm font-semibold text-foreground truncate">
                  {country.name}
                </span>
              </button>
            ))}
          </div>

          {countries.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              Loading destinations...
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default GlobeSection;
