import InfoPageLayout from "@/components/InfoPageLayout";

const PrivacyPolicy = () => (
  <InfoPageLayout
    eyebrow="Privacy Policy"
    title="How Visa Champ handles your information"
    description="This page explains the basics of what information may be collected inside the app and how it is used."
    sections={[
      { title: "Information you provide", body: <><p>We may store information that you add to your account — profile details, documents, bookings, saved applications, and chat history.</p><p>This information supports the features you actively use.</p></> },
      { title: "How your data is used", body: <><p>Your information personalizes guidance, keeps your account available across sessions, and supports bookings, applications, and document flows.</p><p>Profile details may help the AI assistant respond with more relevant context when appropriate.</p></> },
      { title: "Your control", body: <><p>You can update your profile details inside your account at any time.</p><p>As with any visa planning workflow, avoid uploading anything you do not want to store digitally.</p></> },
    ]}
  />
);

export default PrivacyPolicy;