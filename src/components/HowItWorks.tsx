import { MessageCircle, ClipboardList, CheckCircle, Send } from "lucide-react";

const steps = [
  { icon: MessageCircle, title: "Chat with Visa Champ", desc: "Tell us where you want to go and why. Our AI asks the right questions." },
  { icon: ClipboardList, title: "Get Requirements", desc: "Receive a personalized checklist of required documents and eligibility criteria." },
  { icon: CheckCircle, title: "Check Eligibility", desc: "Upload documents for instant verification and gap analysis." },
  { icon: Send, title: "Apply with Confidence", desc: "Submit your application or connect with a visa officer for support." },
];

const HowItWorks = () => (
  <section id="how-it-works" className="py-20 bg-secondary/30">
    <div className="container">
      <div className="mx-auto max-w-2xl text-center mb-14">
        <h2 className="text-3xl font-bold mb-4">How It Works</h2>
        <p className="text-muted-foreground text-lg">From first question to submitted application — four simple steps.</p>
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
