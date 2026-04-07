import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const reviews = [
  { name: "Ali R.", initials: "AR", text: "Visa Champ helped me understand exactly what I needed for my UAE tourist visa. Got approved on the first try!" },
  { name: "Fatima K.", initials: "FK", text: "I was confused about Schengen visa documents. Visa Champ gave me a clear checklist — so helpful!" },
  { name: "Hassan M.", initials: "HM", text: "Saved me hours of research. Got all the info about UK tourist visa requirements in minutes." },
];

const Testimonials = () => (
  <section id="testimonials" className="py-20 bg-secondary/30">
    <div className="container">
      <div className="mx-auto max-w-2xl text-center mb-14">
        <h2 className="text-3xl font-bold mb-4">Trusted by Pakistani Travellers</h2>
        <p className="text-muted-foreground text-lg">See what our users say about their experience.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {reviews.map((r, i) => (
          <Card key={i} className="bg-card animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
            <CardContent className="p-6">
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="mb-4 text-sm text-muted-foreground">"{r.text}"</p>
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{r.initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{r.name}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
