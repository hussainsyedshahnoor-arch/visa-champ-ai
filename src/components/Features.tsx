import { Bot, FileCheck, Clock, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  { icon: Bot, title: "AI Tourist Visa Guidance", desc: "Get expert tourist visa guidance for Pakistani passport holders — 24/7, for any destination." },
  { icon: FileCheck, title: "Eligibility Check", desc: "Instantly check if you qualify for a tourist visa and see what documents you need." },
  { icon: Clock, title: "Processing Times & Costs", desc: "Know the exact fees, processing times, and timelines before you apply." },
  { icon: Globe, title: "All Countries Covered", desc: "From UAE to Schengen, UK to USA — we cover tourist visa requirements for every destination." },
];

const Features = () => (
  <section id="features" className="py-20">
    <div className="container">
      <div className="mx-auto max-w-2xl text-center mb-14">
        <h2 className="text-3xl font-bold mb-4">Everything You Need for Tourist Visas</h2>
        <p className="text-muted-foreground text-lg">Your complete guide to tourist visa applications from Pakistan.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {features.map((f, i) => (
          <Card key={i} className="group border bg-card transition-shadow hover:shadow-lg animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
