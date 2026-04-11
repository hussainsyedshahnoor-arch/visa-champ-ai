import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formData, visaTypeName, countryName, documents, criteria } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `You are Visa Champion, an expert visa eligibility evaluator for Pakistani passport holders.

Evaluate this tourist visa application and provide a detailed, profile-aware assessment.

**Destination:** ${countryName}
**Visa Type:** ${visaTypeName}

**Applicant Profile:**
- Full Name: ${formData.fullName}
- Age: ${formData.age}
- Marital Status: ${formData.maritalStatus}
- Travelling With: ${formData.travellingWith || "Solo"}
- Number of Dependents: ${formData.numberOfDependents || "0"}
- Employment Status: ${formData.employmentStatus}
- Business Type/Model: ${formData.businessType || "N/A"}
- Source of Income: ${formData.incomeSource || "Not specified"}
- Monthly Income (PKR): ${formData.monthlyIncome}
- Tax Filer (FBR): ${formData.isTaxFiler ? "Yes" : "No"}
- Purpose of Visit: ${formData.purposeOfVisit}

**Financial Documents:**
- Bank Statement Duration: ${formData.bankStatementMonths || "Not specified"} months
- Closing Balance (PKR): ${formData.closingBalance || formData.bankBalance || "Not specified"}
- Balance Maintained Consistently (no sudden deposits): ${formData.maintainedBalance ? "Yes" : "No"}
- Has Active Credit Card: ${formData.hasCreditCard ? "Yes" : "No"}

**Travel History:**
- Has Travel History: ${formData.hasTravelHistory ? "Yes" : "No"}
- Previous Countries Visited: ${formData.previousCountries || "None"}
- Travel Frequency: ${formData.travelFrequency || "Not specified"}
- Previously Visited Destination Country: ${formData.previousVisitToDestination ? "Yes" : "No"}
- Purpose of Previous Travels: ${formData.travelPurposeHistory || "N/A"}
- Previous Trips Were: ${formData.travelledSoloOrFamily || "N/A"}

**Ties to Home Country:**
- Owns Property in Pakistan (own name): ${formData.ownsProperty ? "Yes" : "No"}
- Property Details: ${formData.propertyDetails || "N/A"}
- Close Family in Pakistan: ${formData.closeFamilyInPakistan || "Not specified"}

**Other Nationality/Residency:**
- Has Other Nationality/Passport: ${formData.hasOtherNationality ? "Yes — " + (formData.otherNationality || "Not specified") : "No"}
- Has Residency in Another Country: ${formData.hasOtherResidency ? "Yes — " + (formData.otherResidencyCountry || "Not specified") : "No"}

**Required Documents for this visa:**
${documents.map((d: any) => `- ${d.document_name} (${d.is_mandatory ? "Mandatory" : "Optional"}): ${d.description}`).join("\n")}

**Eligibility Criteria:**
${criteria.map((c: any) => `- ${c.criteria_name}: ${c.criteria_description}${c.min_value ? " (Min: " + c.min_value + ")" : ""} [${c.is_mandatory ? "Required" : "Recommended"}]`).join("\n")}

SCORING INSTRUCTIONS — YOU MUST FOLLOW THIS STRICTLY:

The score MUST reflect the TRUE difficulty of getting a visa. Be STRICT and REALISTIC. A score of 80+ means HIGH chance — reserve this ONLY for genuinely strong profiles.

**Score Bands (STRICT):**
- 80-95: HIGH CHANCE — Reserved for profiles with MOST of: strong finances (maintained balance, high closing balance, tax filer), extensive travel history (multiple countries, frequent), strong ties (property in own name, spouse+children in Pakistan), stable employment/business, prior visit to destination country
- 50-79: MEDIUM CHANCE — Decent profiles with some strengths but notable gaps
- 20-49: LOW CHANCE — Weak profiles with multiple red flags
- 0-19: VERY LOW CHANCE — Major disqualifying factors

**KEY SCORING RULES:**
- Travelling with spouse alone does NOT make it a strong profile. It is only ONE factor.
- Being married is NOT enough for a high score without strong financial + travel evidence.
- Sudden bank deposits (maintainedBalance = No) is a RED FLAG, penalize by 10-15 points.
- No tax filing is a negative for employed/business profiles.
- No credit card = minor negative.
- No travel history = significant negative (-15 to -20 points from baseline).
- No property = moderate negative.
- No close family = moderate negative.
- Single + young + unemployed/student + no travel + no property = score should be 15-35 MAX.
- Has residency/nationality in a Western/developed country = SIGNIFICANT BOOST (+15-25 points).

**Financial Document Analysis (CRITICAL):**
- Bank statement of only 3 months = weak, 6 months = acceptable, 12 months = strong
- Closing balance must match destination country's expected funds
- Maintained/consistent balance is MORE important than a high closing balance
- Credit card ownership shows financial stability

**Travel History Analysis:**
- Previous visit to SAME destination country = strong positive
- Frequent traveller (4+/year) = very strong
- Travel with family historically = moderate positive
- Only visited visa-free/easy countries (e.g., Malaysia, Turkey) = less impactful than Schengen/US/UK visits

Provide your assessment in this format:
1. **Eligibility Score:** X/100
2. **Applicant Profile:** (e.g., "Single traveller with weak ties" or "Family traveller with strong ties")
3. **Verdict:** (High Chance / Medium Chance / Low Chance)
4. **Strengths:** (bullet points of strong aspects)
5. **Weaknesses:** (bullet points of concerns)
6. **Missing Documents:** (list any they likely need to prepare)
7. **Tips to Improve Chances:** (actionable advice specific to their profile type)
8. **Estimated Processing Time:** based on the visa type

CRITICAL RULES:
- Do NOT mention any pricing, fees, or costs
- Do NOT share website links or URLs
- Do NOT mention where to apply
- Focus only on eligibility evaluation and guidance
- Be REALISTIC — do not sugarcoat weak profiles
- A married person travelling with spouse but no travel history, no property, low balance = score should be 35-50, NOT 70+
- End with: "This is AI guidance based on expert analysis, not legal advice. Final decisions rest with the consulate/embassy."`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "Unable to generate analysis.";

    const scoreMatch = analysis.match(/(\d{1,3})\/100/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : null;

    return new Response(JSON.stringify({ analysis, score }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("eligibility-check error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
