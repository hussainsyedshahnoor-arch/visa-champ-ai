import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface InfoSection { body: ReactNode; title: string }

interface InfoPageLayoutProps {
  description: string;
  eyebrow: string;
  sections: InfoSection[];
  title: string;
}

const InfoPageLayout = ({ description, eyebrow, sections, title }: InfoPageLayoutProps) => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container px-4 py-12 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">{description}</p>
          <div className="mt-10 space-y-5">
            {sections.map((s) => (
              <Card key={s.title} className="border-border/70 bg-card/90">
                <CardContent className="space-y-3 p-6">
                  <h2 className="text-xl font-semibold text-foreground">{s.title}</h2>
                  <div className="space-y-3 text-sm leading-7 text-muted-foreground md:text-base">{s.body}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden border-border/70 bg-card/90">
            <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-accent" />
            <CardContent className="space-y-5 p-6">
              <BrandLogo size="sm" />
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">Need personal help?</h2>
                <p className="text-sm leading-6 text-muted-foreground">Start with AI guidance, book a call with a visa officer, or move straight into your tourist visa application.</p>
              </div>
              <div className="flex flex-col gap-3">
                <Button asChild className="w-full justify-between"><Link to="/chat">AI Chat <ArrowRight className="h-4 w-4" /></Link></Button>
                <Button asChild variant="secondary" className="w-full justify-between"><Link to="/book-call">Talk to Visa Officer <ArrowRight className="h-4 w-4" /></Link></Button>
                <Button asChild variant="outline" className="w-full justify-between"><Link to="/apply">Apply for Visa <ArrowRight className="h-4 w-4" /></Link></Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
    <Footer />
  </div>
);

export default InfoPageLayout;