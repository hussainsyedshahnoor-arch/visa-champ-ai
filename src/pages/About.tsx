import InfoPageLayout from "@/components/InfoPageLayout";

const About = () => (
  <InfoPageLayout
    eyebrow="About Visa Champ"
    title="Tourist visa guidance made clearer for Pakistani travellers"
    description="Visa Champ helps Pakistani passport holders understand tourist visa requirements, prepare stronger applications, and move from confusion to action."
    sections={[
      { title: "What we do", body: <><p>We focus on tourist and visit visa guidance only — document checklists, approval tips, travel history advice, and clearer next steps for different destination countries.</p><p>The goal is simple: make visa information easier to understand so people can plan with confidence.</p></> },
      { title: "How Visa Champ works", body: <><p>Ask questions in chat, check eligibility, save your profile details, upload documents, and book a call when you want more direct help.</p><p>Every part of the flow is designed to reduce guesswork and keep your tourist visa prep organized.</p></> },
      { title: "What we do not cover", body: <><p>Visa Champ is limited to tourist visa guidance for Pakistani passport holders. We do not cover work visas, student visas, immigration, or residency routes.</p><p>All AI responses are informational and should not be treated as legal advice.</p></> },
    ]}
  />
);

export default About;