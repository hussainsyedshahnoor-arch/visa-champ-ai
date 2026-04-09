import { MessageCircle, ClipboardList, CheckCircle, Plane } from "lucide-react";

const steps = [
  { icon: MessageCircle, title: "Ask Visa Champ", desc: "Tell us which country you want to visit. Our AI knows the requirements." },
  { icon: ClipboardList, title: "Get Your Checklist", desc: "Receive a personalized document checklist for your tourist visa." },
  { icon: CheckCircle, title: "Check Eligibility", desc: "Find out if you qualify and what gaps need to be addressed." },
  { icon: Plane, title: "Apply & Travel", desc: "Follow the step-by-step guide to submit your tourist visa application." },
];

const HowItWorks = () => (
  <section id="how-it-works" className="py-20 bg-secondary/30">
    <div className="container">
      <div className="mx-auto max-w-2xl text-center mb-14">
        <h2 className="text-3xl font-bold mb-4">How It Works</h2>
        <p className="text-muted-foreground text-lg">From first question to tourist visa application — four simple steps.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-4">
        {steps.map((step, i) => (
          <div key={i} className="relative flex flex-col items-center text-center animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <step.icon className="h-7 w-7" />
            </div>
            <span className="mb-1 text-xs font-semibold uppercase text-accent">Step {i + 1}</span>
            <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.desc}</p>
            {i < steps.length - 1 && (
              <div className="absolute right-0 top-8 hidden h-0.5 w-8 translate-x-full bg-border md:block" />
            )}
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
