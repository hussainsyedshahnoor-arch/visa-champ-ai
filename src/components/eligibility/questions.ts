export type FieldType = "text" | "select" | "radio" | "multiselect";

export interface FieldConfig {
  key: string;
  label: string;
  helper?: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  inputMode?: "text" | "numeric" | "email" | "tel";
}

export interface StepConfig {
  /** Short name shown on the right of the progress bar */
  category: string;
  /** Eyebrow badge text, e.g. "STEP 4 — EMPLOYMENT & STATUS" */
  eyebrow: string;
  title: string;
  helper?: string;
  callout?: { title: string; lines: string[] };
  fields: FieldConfig[];
}

export const RESIDENCE_COUNTRIES = [
  "Pakistan",
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Oman",
  "Bahrain",
  "Kuwait",
  "United Kingdom",
  "Other",
];

export const NATIONALITIES = [
  "Pakistani",
  "Pakistani + Another nationality",
  "Other",
];

export const VISITED_COUNTRIES = [
  "UAE / Dubai",
  "Saudi Arabia",
  "Turkey",
  "Malaysia",
  "Singapore",
  "Thailand",
  "UK",
  "Canada",
  "Australia",
  "USA",
  "Schengen / Europe",
  "China",
  "Japan",
  "New Zealand",
  "Other",
];

/** Steps 2..10 of the wizard (step 1 is the destination picker). */
export const ELIGIBILITY_STEPS: StepConfig[] = [
  {
    category: "Your details",
    eyebrow: "STEP 1 — CONTACT DETAILS",
    title: "Let's start with your basic information",
    helper: "All fields marked * are required.",
    fields: [
      { key: "fullName", label: "Full name", type: "text", placeholder: "Your full name", required: true },
      { key: "whatsappNumber", label: "WhatsApp number", type: "text", placeholder: "+92 300 0000000", required: true, inputMode: "tel" },
      { key: "email", label: "Email address", type: "text", placeholder: "you@example.com", required: true, inputMode: "email" },
      { key: "countryOfResidence", label: "Country of residence", type: "select", required: true, options: RESIDENCE_COUNTRIES },
    ],
  },
  {
    category: "Passport",
    eyebrow: "STEP 2 — PASSPORT",
    title: "Do you have a valid passport?",
    helper: "Your passport must be valid for at least 6 months beyond your intended travel date.",
    fields: [
      {
        key: "hasValidPassport",
        label: "Passport status",
        type: "radio",
        required: true,
        options: ["Yes — I have a valid passport", "No — I need to apply or renew"],
      },
      { key: "nationality", label: "What is your current nationality?", type: "select", required: true, options: NATIONALITIES },
    ],
  },
  {
    category: "Travel History",
    eyebrow: "STEP 3 — TRAVEL HISTORY",
    title: "Have you traveled abroad before?",
    helper: "Your travel history is one of the strongest factors for visa approval.",
    fields: [
      {
        key: "travelHistoryStatus",
        label: "Travel history",
        type: "radio",
        required: true,
        options: ["Yes — with a visa", "No — I have never traveled abroad"],
      },
      {
        key: "visitedCountries",
        label: "Which countries have you visited?",
        helper: "Select all that apply. This helps us understand your travel history.",
        type: "multiselect",
        options: VISITED_COUNTRIES,
      },
      {
        key: "visaRefusalHistory",
        label: "Have you ever been refused a visa?",
        type: "radio",
        required: true,
        options: ["No — never refused", "Yes — once", "Yes — multiple times"],
      },
      {
        key: "overstayHistory",
        label: "Have you ever overstayed a visa or been deported?",
        type: "radio",
        required: true,
        options: ["No", "Yes — overstayed", "Yes — deported or banned"],
      },
    ],
  },
  {
    category: "Employment",
    eyebrow: "STEP 4 — EMPLOYMENT & STATUS",
    title: "What is your current employment status?",
    helper: "Visa officers want to see strong ties to your home country.",
    fields: [
      {
        key: "employmentStatus",
        label: "Employment status",
        type: "select",
        required: true,
        options: [
          "Employed (Private sector)",
          "Employed (Government)",
          "Self-employed",
          "Business owner",
          "Student",
          "Retired",
          "Unemployed",
          "Homemaker",
          "Dependent (family supports me)",
        ],
      },
      {
        key: "yearsInRole",
        label: "How many years have you been in your current role or business?",
        type: "select",
        required: true,
        options: ["Less than 1 year", "1 — 2 years", "3 — 5 years", "5+ years", "Not applicable (student/retired)"],
      },
      {
        key: "incomeSource",
        label: "Do you receive a regular monthly income?",
        type: "select",
        required: true,
        options: [
          "Yes — Regular salary",
          "Yes — Business income",
          "Yes — Pension",
          "Yes — Remittances from abroad",
          "No — I am dependent on family",
        ],
      },
      {
        key: "monthlyIncome",
        label: "What is your approximate monthly income (PKR)?",
        type: "select",
        required: true,
        options: ["Under 50,000", "50,000 — 100,000", "100,000 — 200,000", "200,000 — 500,000", "500,000+"],
      },
    ],
  },
  {
    category: "Assets & Dependents",
    eyebrow: "STEP 5 — ASSETS & DEPENDENTS",
    title: "Do you have any property or assets in your name?",
    helper: "Property ownership shows strong ties to your home country.",
    fields: [
      {
        key: "assetsOwned",
        label: "Property or assets",
        type: "select",
        required: true,
        options: ["No", "Yes — Land or Property", "Yes — Car or Vehicle", "Yes — Both property and vehicle"],
      },
      {
        key: "numberOfDependents",
        label: "How many dependents do you have?",
        helper: "Dependents = children, spouse, or elderly parents you support.",
        type: "select",
        required: true,
        options: ["None", "1 — 2", "3 — 4", "5+"],
      },
    ],
  },
  {
    category: "Purpose of Visit",
    eyebrow: "STEP 6 — PURPOSE OF VISIT",
    title: "What is the primary purpose of your visit?",
    helper: "Be honest — this determines which visa category applies.",
    fields: [
      {
        key: "purposeOfVisit",
        label: "Primary purpose",
        type: "select",
        required: true,
        options: [
          "Tourism / Sightseeing",
          "Visiting family or friends",
          "Business / Conference",
          "Medical treatment",
          "Transit",
          "Study visit (short course)",
          "Other",
        ],
      },
      {
        key: "lengthOfStay",
        label: "How long do you plan to stay?",
        type: "select",
        required: true,
        options: ["Less than 2 weeks", "2 — 4 weeks", "1 — 2 months", "3 — 6 months", "More than 6 months"],
      },
    ],
  },
  {
    category: "Bank & Finances",
    eyebrow: "STEP 7 — BANK & FINANCIAL CAPACITY",
    title: "Tell us about your financial capacity",
    callout: {
      title: "📌 Visa Officer Expectation:",
      lines: [
        "Embassies look at your bank balance AND how long it has been maintained. They want to see:",
        "• Closing balance of PKR 2 million or more",
        "• Balance maintained consistently for at least 3 months",
        "• Regular income deposits showing sustainable cash flow",
      ],
    },
    fields: [
      {
        key: "tripBudget",
        label: "What is your estimated total budget for the trip (PKR)?",
        type: "select",
        required: true,
        options: ["Under 100,000", "100,000 — 250,000", "250,000 — 500,000", "500,000 — 1,000,000", "1,000,000+"],
      },
      {
        key: "sponsor",
        label: "Who will sponsor your trip?",
        type: "select",
        required: true,
        options: ["Self-sponsored", "Family member", "Employer or Company", "Friend or Relative abroad", "Other"],
      },
      {
        key: "bankAccount",
        label: "Do you have a bank account in your own name?",
        type: "select",
        required: true,
        options: ["Yes — Individual account", "Yes — Joint account", "No — I don't have one"],
      },
      {
        key: "bankBalance",
        label: "What is your approximate current bank balance (PKR)?",
        helper: "Visa officers look for PKR 2,000,000+ for most countries.",
        type: "select",
        required: true,
        options: ["Under 500,000", "500,000 — 1,000,000", "1,000,000 — 2,000,000", "2,000,000 — 5,000,000", "5,000,000+"],
      },
      {
        key: "balanceMaintained",
        label: "Has this balance been maintained consistently for at least 3 months?",
        helper: "Embassies are suspicious of sudden large deposits. Consistency is key!",
        type: "select",
        required: true,
        options: [
          "Yes — Balance maintained 3+ months consistently",
          "Yes — But balance fluctuates significantly",
          "Yes — But balance recently increased",
          "No — I don't have bank statements",
          "No — Balance is not maintained consistently",
        ],
      },
      {
        key: "incomeDeposits",
        label: "Can you show regular income deposits in your bank statement?",
        type: "select",
        required: true,
        options: [
          "Yes — Regular monthly deposits visible",
          "Yes — But irregular deposits",
          "No — I am a dependent (family funds me)",
          "No — Cash income not deposited",
        ],
      },
      {
        key: "sixMonthStatements",
        label: "Can you show bank statements for the last 6 months?",
        type: "select",
        required: true,
        options: ["Yes — I have them ready", "I can arrange them", "No — I cannot provide"],
      },
    ],
  },
  {
    category: "Travel Itinerary",
    eyebrow: "STEP 8 — TRAVEL ITINERARY",
    title: "Do you have a confirmed travel itinerary?",
    helper: "Itinerary shows you have planned your trip properly.",
    fields: [
      {
        key: "hasItinerary",
        label: "Travel itinerary",
        type: "select",
        required: true,
        options: ["Yes — I have it ready", "No — But I can get one"],
      },
      {
        key: "hasAccommodation",
        label: "Do you have confirmed accommodation bookings?",
        type: "select",
        required: true,
        options: ["Yes — I have bookings", "No — I can arrange", "Staying with family or friends"],
      },
    ],
  },
  {
    category: "Referral",
    eyebrow: "STEP 9 — REFERRAL",
    title: "How did you hear about us?",
    helper: "Your feedback helps us improve our services.",
    fields: [
      {
        key: "referralSource",
        label: "Referral source",
        type: "select",
        required: true,
        options: [
          "Google search",
          "Facebook",
          "Instagram",
          "TikTok",
          "YouTube",
          "WhatsApp",
          "Friend or family recommendation",
          "Website",
          "Other",
        ],
      },
    ],
  },
];

export const TOTAL_STEPS = ELIGIBILITY_STEPS.length + 1; // + destination step

export type EligibilityFormData = Record<string, string | string[]>;

export const INITIAL_FORM_DATA: EligibilityFormData = {
  fullName: "",
  whatsappNumber: "",
  email: "",
  countryOfResidence: "Pakistan",
  hasValidPassport: "",
  nationality: "",
  travelHistoryStatus: "",
  visitedCountries: [],
  visaRefusalHistory: "",
  overstayHistory: "",
  employmentStatus: "",
  yearsInRole: "",
  incomeSource: "",
  monthlyIncome: "",
  assetsOwned: "",
  numberOfDependents: "",
  purposeOfVisit: "",
  lengthOfStay: "",
  tripBudget: "",
  sponsor: "",
  bankAccount: "",
  bankBalance: "",
  balanceMaintained: "",
  incomeDeposits: "",
  sixMonthStatements: "",
  hasItinerary: "",
  hasAccommodation: "",
  referralSource: "",
};

/** Live profile badge shown above each step card. */
export function getProfileStatus(data: EligibilityFormData, stepIndex: number) {
  if (stepIndex <= 1) return { label: "Not assessed", tone: "muted" as const };

  const weakSignals = [
    data.travelHistoryStatus === "No — I have never traveled abroad",
    data.visaRefusalHistory === "Yes — multiple times",
    typeof data.overstayHistory === "string" && data.overstayHistory.startsWith("Yes"),
    data.bankBalance === "Under 500,000" || data.bankBalance === "500,000 — 1,000,000",
    typeof data.balanceMaintained === "string" && data.balanceMaintained.startsWith("No"),
    data.employmentStatus === "Unemployed" || data.employmentStatus === "Dependent (family supports me)",
    data.sixMonthStatements === "No — I cannot provide",
  ].filter(Boolean).length;

  if (weakSignals >= 2) return { label: "⚠️ Needs improvement", tone: "warning" as const };
  return { label: "In progress", tone: "muted" as const };
}

export function isStepComplete(step: StepConfig, data: EligibilityFormData) {
  return step.fields.every((f) => {
    if (!f.required) return true;
    const value = data[f.key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });
}
