
# Eligibility Check Wizard + Remove Homepage Globe

Two scoped changes only. Nothing else in the app changes.

## 1. Remove the globe from the homepage

Drop `GlobeSection` from `src/pages/Index.tsx`. The flag marquee, hero, how-it-works, features, testimonials and footer all stay exactly as they are. The `GlobeSection.tsx` file itself stays in the repo (unused) so it can be re-enabled later.

## 2. Rebuild `/eligibility` as a categorized, dropdown-driven wizard

Only `src/pages/EligibilityCheck.tsx` (and its new step components) changes — no other calculator, form, or page is touched.

### Flow

1. **Destination** — unchanged (existing country + visa type pickers, DB-driven).
2. **Contact details** — full name, WhatsApp number, email (typed); country of residence (dropdown, default Pakistan).
3. **Passport** — valid passport? (Yes / No — need to apply or renew); nationality (dropdown).
4. **Travel history** — traveled abroad before?; countries visited (multi-select); ever refused a visa? (Never / Once / Multiple); ever overstayed or deported? (No / Overstayed / Deported or banned).
5. **Employment & status** — employment status; years in current role; regular monthly income type; monthly income range (PKR).
6. **Assets & dependents** — property/assets in own name; number of dependents.
7. **Purpose of visit** — primary purpose; planned length of stay.
8. **Bank & financial capacity** — "Visa Officer Expectation" callout; trip budget range; sponsor; bank account type; bank balance range; balance maintained 3+ months; regular income deposits; 6-month statements availability.
9. **Travel itinerary** — confirmed itinerary; accommodation bookings.
10. **Referral** — how did you hear about us.
11. **Review → Results** — existing AI score screen, unchanged in look and behaviour.

Every option list uses exactly the wording supplied. Only name, WhatsApp number, and email are typed — everything else is a dropdown or selectable option card.

### Screen structure

Each step is its own screen: "Step N of 10" progress bar with the category name on the right, a "Your visa profile" status strip, a step eyebrow badge (e.g. "STEP 5 — ASSETS & DEPENDENTS"), the question heading with helper text, then Back / Next. Next stays disabled until the required answers on that step are given.

The profile strip shows a live badge — `Not assessed` → `In progress` → `⚠️ Needs improvement` — derived client-side from answers already given.

### Login gate

Unchanged behaviour: signup gate before the Review step, form state saved to localStorage, score auto-submits on return from login.

### Scoring

The `eligibility-check` edge function prompt is updated to read the new fields (bank balance band, balance consistency, sponsor, itinerary, accommodation, refusal/overstay history, dependents, purpose, stay length). Score bands stay as today (80+ = High Chance). Visa refusal and overstay/deportation history are added as explicit negative factors.

## Technical notes

- Step content is split into `src/components/eligibility/` (one component per step) plus a shared step shell and a `eligibility-questions.ts` file holding every option list, so questions are data-driven and easy to edit later.
- Answers live in one `formData` object; existing field names are kept where they map, new keys added for new questions.
- Selects use the existing shadcn `Select`; radio-style questions use option cards styled with design tokens (no hardcoded colors).
- No database schema changes.
