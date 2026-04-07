import { Bot, FileCheck, Phone, FolderLock, BarChart3, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  { icon: Bot, title: "AI Consultation", desc: "Get expert visa guidance 24/7. Our AI knows visa rules for 50+ countries." },
  { icon: FileCheck, title: "Eligibility Check", desc: "Upload documents and instantly see if you qualify — with gap analysis." },
  { icon: Phone, title: "Officer Support", desc: "Book a call with a real visa officer when you need human expertise." },
  { icon: FolderLock, title: "Document Vault", desc: "Securely store passports, bank statements, and letters. Upload once, reuse everywhere." },
  { icon: BarChart3, title: "Application Tracker", desc: "Track your application status in real-time from submission to approval." },
  { icon: Globe, title: "Multi-Country", desc: "Tourist, work, student, residency — we cover all major visa categories." },
];

const Features = () => (
  <section id="features" className="py-20">
    <div className="container">
      <div className="mx-auto max-w-2xl text-center mb-14">
        <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
        <p className="text-muted-foreground text-lg">A complete platform to navigate the visa process with confidence.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
