import InfoPageLayout from "@/components/InfoPageLayout";

const Contact = () => (
  <InfoPageLayout
    eyebrow="Contact"
    title="Get help in the way that fits you best"
    description="Whether you need a quick answer, a guided call, or you are ready to move into your application — Visa Champ gives you a clear next step."
    sections={[
      { title: "Start with AI chat", body: <><p>Use the chat for fast answers about tourist visa requirements, documents, approval chances, and common rejection risks.</p><p>It is the quickest way to get country-specific guidance.</p></> },
      { title: "Talk to a visa officer", body: <><p>If you want a more guided discussion, book a call and choose a time slot that works for you.</p><p>Best when your case has multiple moving parts or you want help deciding your next step.</p></> },
      { title: "Ready to move forward?", body: <><p>If you already know your destination, go straight to the application flow and keep everything in one place.</p><p>Use your saved profile and documents to speed things up.</p></> },
    ]}
  />
);

export default Contact;