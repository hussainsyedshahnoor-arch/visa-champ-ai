import InfoPageLayout from "@/components/InfoPageLayout";

const TermsOfService = () => (
  <InfoPageLayout
    eyebrow="Terms"
    title="Terms for using Visa Champ"
    description="By using Visa Champ, you agree to use the platform responsibly and understand the limits of AI-powered tourist visa guidance."
    sections={[
      { title: "Use of the service", body: <><p>Visa Champ is intended for tourist and visit visa guidance for Pakistani passport holders. You agree to use the platform only for lawful and accurate purposes.</p><p>Do not upload false information or misuse the chat, booking, or document features.</p></> },
      { title: "AI guidance disclaimer", body: <><p>Responses are generated for guidance and planning support. They are not legal advice and should not replace official government instructions or professional legal counsel.</p><p>You are responsible for reviewing your own application details before submission.</p></> },
      { title: "Availability and updates", body: <><p>Features, content, and country guidance may change over time. We may improve or update the service as requirements evolve.</p><p>Using the platform after those updates means you accept the latest version of the experience.</p></> },
    ]}
  />
);

export default TermsOfService;