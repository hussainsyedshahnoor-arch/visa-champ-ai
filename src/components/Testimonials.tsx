import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const reviews = [
  { name: "Sarah M.", initials: "SM", text: "Visa Champ helped me understand exactly what I needed for my UK student visa. Saved me weeks of googling!", rating: 5 },
  { name: "Ahmed K.", initials: "AK", text: "The eligibility check caught a missing document before I submitted. Would have been rejected otherwise!", rating: 5 },
  { name: "Priya R.", initials: "PR", text: "Booked a call with a visa officer through the platform. Super professional and cleared all my doubts.", rating: 5 },
];

const Testimonials = () => (
  <section id="testimonials" className="py-20 bg-secondary/30">
    <div className="container">
      <div className="mx-auto max-w-2xl text-center mb-14">
        <h2 className="text-3xl font-bold mb-4">Loved by Applicants</h2>
        <p className="text-muted-foreground text-lg">See what our users say about their experience.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {reviews.map((r, i) => (
          <Card key={i} className="bg-card animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
            <CardContent className="p-6">
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: r.rating }).map((_, j) => (
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
