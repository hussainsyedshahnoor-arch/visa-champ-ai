import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";

const reviews = [
  { name: "Ali Raza", initials: "AR", location: "Lahore", visa: "UAE Tourist Visa", text: "Visa Champ helped me understand exactly what I needed for my UAE tourist visa. Got approved on the first try!" },
  { name: "Fatima Khan", initials: "FK", location: "Karachi", visa: "Schengen Visa", text: "I was confused about Schengen visa documents. Visa Champ gave me a clear checklist — so helpful!" },
  { name: "Hassan Malik", initials: "HM", location: "Islamabad", visa: "UK Tourist Visa", text: "Saved me hours of research. Got all the info about UK tourist visa requirements in minutes." },
  { name: "Zainab Shah", initials: "ZS", location: "Rawalpindi", visa: "Canada Tourist Visa", text: "The AI knew exactly which documents I needed for Canada. Super impressed with the guidance!" },
  { name: "Usman Tariq", initials: "UT", location: "Faisalabad", visa: "Turkey Tourist Visa", text: "Applied for Turkey tourist visa after chatting with Visa Champ. Approved in 3 days!" },
  { name: "Sara Ahmed", initials: "SA", location: "Multan", visa: "Malaysia Tourist Visa", text: "Best visa guidance I've ever received. Clear, simple and straight to the point." },
  { name: "Bilal Hussain", initials: "BH", location: "Peshawar", visa: "USA Tourist Visa", text: "Was nervous about my US visa application. Visa Champ broke it all down beautifully." },
  { name: "Ayesha Noor", initials: "AN", location: "Quetta", visa: "Australia Tourist Visa", text: "Finally understood the Australian visa process. This tool is a game changer for Pakistanis!" },
];

const GRADIENTS = [
  "from-primary/10 to-primary/5",
  "from-accent/10 to-accent/5",
  "from-purple-500/10 to-purple-500/5",
  "from-emerald-500/10 to-emerald-500/5",
  "from-rose-500/10 to-rose-500/5",
  "from-sky-500/10 to-sky-500/5",
  "from-amber-500/10 to-amber-500/5",
  "from-indigo-500/10 to-indigo-500/5",
];

const Testimonials = () => {
  const items = [...reviews, ...reviews];

  return (
    <section id="testimonials" className="overflow-hidden bg-secondary/30 py-16 md:py-20">
      <div className="container mb-12">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            Testimonials
          </span>
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Trusted by Pakistani Travellers
          </h2>
          <p className="text-lg text-muted-foreground">
            Join thousands who simplified their visa journey with Visa Champ.
          </p>
        </div>
      </div>

      {/* Marquee */}
      <div className="relative">
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-secondary/80 to-transparent md:w-32" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-secondary/80 to-transparent md:w-32" />

        <div className="flex animate-marquee-slow gap-5 px-4">
          {items.map((r, i) => {
            const gradientIdx = i % GRADIENTS.length;
            return (
              <div
                key={`${r.name}-${i}`}
                className="group relative w-80 shrink-0 overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 md:w-[340px]"
              >
                {/* Gradient accent top bar */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${GRADIENTS[gradientIdx]}`} />

                <div className="p-6">
                  {/* Quote icon */}
                  <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${GRADIENTS[gradientIdx]}`}>
                    <Quote className="h-5 w-5 text-primary" />
                  </div>

                  {/* Stars */}
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>

                  {/* Review text */}
                  <p className="mb-5 text-sm leading-relaxed text-foreground/80">
                    "{r.text}"
                  </p>

                  {/* Divider */}
                  <div className="mb-4 h-px w-full bg-border/60" />

                  {/* User info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-border/50">
                        <AvatarFallback className={`bg-gradient-to-br ${GRADIENTS[gradientIdx]} text-xs font-bold text-foreground`}>
                          {r.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.location}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
                      {r.visa}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
