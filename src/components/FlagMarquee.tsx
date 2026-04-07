const FLAGS = [
  { country: "UAE", code: "🇦🇪" },
  { country: "UK", code: "🇬🇧" },
  { country: "USA", code: "🇺🇸" },
  { country: "Canada", code: "🇨🇦" },
  { country: "Australia", code: "🇦🇺" },
  { country: "Germany", code: "🇩🇪" },
  { country: "France", code: "🇫🇷" },
  { country: "Italy", code: "🇮🇹" },
  { country: "Spain", code: "🇪🇸" },
  { country: "Turkey", code: "🇹🇷" },
  { country: "Malaysia", code: "🇲🇾" },
  { country: "Thailand", code: "🇹🇭" },
  { country: "Japan", code: "🇯🇵" },
  { country: "China", code: "🇨🇳" },
  { country: "Singapore", code: "🇸🇬" },
  { country: "Saudi Arabia", code: "🇸🇦" },
  { country: "Qatar", code: "🇶🇦" },
  { country: "Oman", code: "🇴🇲" },
  { country: "Netherlands", code: "🇳🇱" },
  { country: "Switzerland", code: "🇨🇭" },
];

const FlagMarquee = () => {
  // Double the items for seamless loop
  const items = [...FLAGS, ...FLAGS];

  return (
    <section className="relative overflow-hidden bg-background py-6 md:py-8">
      {/* Gradient masks */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-background to-transparent md:w-24" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-background to-transparent md:w-24" />

      <div className="flex animate-marquee gap-4">
        {items.map((flag, i) => (
          <div
            key={`${flag.country}-${i}`}
            className="flex shrink-0 items-center gap-2.5 rounded-xl border border-border/50 bg-card px-4 py-2.5 shadow-sm transition-shadow hover:shadow-md md:gap-3 md:px-5 md:py-3"
          >
            <span className="text-2xl md:text-3xl leading-none">{flag.code}</span>
            <span className="whitespace-nowrap text-xs font-medium text-foreground md:text-sm">
              {flag.country}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FlagMarquee;
