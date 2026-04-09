import InfoPageLayout from "@/components/InfoPageLayout";

const HelpCenter = () => (
  <InfoPageLayout
    eyebrow="Help Center"
    title="Common questions, clearer answers"
    description="Here are the most common things users need when planning a tourist visa journey with Visa Champ."
    sections={[
      { title: "What can I ask Visa Champ?", body: <ul className="list-disc space-y-2 pl-5"><li>Tourist visa document requirements</li><li>Approval tips and rejection risks</li><li>Eligibility guidance for different countries</li><li>How to organize documents before applying</li></ul> },
      { title: "Does Visa Champ use my profile details?", body: <><p>Yes — when signed in, Visa Champ uses your saved profile to make answers feel more relevant and personalized.</p><p>That context improves guidance, it does not replace official requirements.</p></> },
      { title: "What should I do after chat?", body: <><p>After getting a response, you can either apply for a visa directly or book a call to speak with a visa officer.</p><p>Both options are available throughout the app so you can move forward without hunting for the next step.</p></> },
    ]}
  />
);

export default HelpCenter;