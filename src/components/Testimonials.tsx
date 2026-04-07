import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const reviews = [
  { name: "Ali R.", initials: "AR", text: "Visa Champ helped me understand exactly what I needed for my UAE tourist visa. Got approved on the first try!" },
  { name: "Fatima K.", initials: "FK", text: "I was confused about Schengen visa documents. Visa Champ gave me a clear checklist — so helpful!" },
  { name: "Hassan M.", initials: "HM", text: "Saved me hours of research. Got all the info about UK tourist visa requirements in minutes." },
  { name: "Zainab S.", initials: "ZS", text: "The AI knew exactly which documents I needed for Canada. Super impressed with the guidance!" },
  { name: "Usman T.", initials: "UT", text: "Applied for Turkey tourist visa after chatting with Visa Champ. Approved in 3 days!" },
  { name: "Sara A.", initials: "SA", text: "Best visa guidance I've ever received. Clear, simple and straight to the point." },
];

const Testimonials = () => {
  const items = [...reviews, ...reviews];

  return (
    <section id="testimonials" className="overflow-hidden bg-secondary/30 py-16 md:py-20">
      <div className="container mb-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">Trusted by Pakistani Travellers</h2>
          <p className="text-lg text-muted-foreground">See what our users say about their experience.</p>
        </div>
      </div>

      {/* Marquee */}
      <div className="relative">
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-secondary/30 to-transparent md:w-24" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-secondary/30 to-transparent md:w-24" />

        <div className="flex animate-marquee-slow gap-5">
          {items.map((r, i) => (
            <div
              key={`${r.name}-${i}`}
              className="w-72 shrink-0 rounded-2xl border border-border/50 bg-card p-5 shadow-sm transition-shadow hover:shadow-md md:w-80 md:p-6"
            >
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">"{r.text}"</p>
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{r.initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">{r.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
