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
- Monthly Income (PKR): ${formData.monthlyIncome}
- Bank Balance (PKR): ${formData.bankBalance}
- Has Travel History: ${formData.hasTravelHistory ? "Yes" : "No"}
- Previous Countries Visited: ${formData.previousCountries || "None"}
- Owns Property in Pakistan: ${formData.ownsProperty ? "Yes" : "No"}
- Has Other Nationality/Passport: ${formData.hasOtherNationality ? "Yes — " + (formData.otherNationality || "Not specified") : "No"}
- Has Residency in Another Country: ${formData.hasOtherResidency ? "Yes — " + (formData.otherResidencyCountry || "Not specified") : "No"}
- Ties to Home Country: ${formData.hasReturnTies || "Not specified"}
- Purpose of Visit: ${formData.purposeOfVisit}

**Required Documents for this visa:**
${documents.map((d: any) => `- ${d.document_name} (${d.is_mandatory ? "Mandatory" : "Optional"}): ${d.description}`).join("\n")}

**Eligibility Criteria:**
${criteria.map((c: any) => `- ${c.criteria_name}: ${c.criteria_description}${c.min_value ? " (Min: " + c.min_value + ")" : ""} [${c.is_mandatory ? "Required" : "Recommended"}]`).join("\n")}

SCORING INSTRUCTIONS — YOU MUST FOLLOW THIS:
The score must heavily factor in the applicant's PROFILE TYPE and TIES to home country. Two applicants with similar finances but different profiles must get VERY different scores:

**Profile Risk Matrix:**
- Single, young (18-30), unemployed/student, no property, no travel history, no dependents = HIGH RISK (score 15-35)
- Single, employed, some travel history, no property = MODERATE-HIGH RISK (score 30-50)
- Married, employed, property owner, travel history, travelling with family = LOW RISK (score 60-85)
- Family traveller, property owner, strong income, prior visa stamps, other residency/nationality = VERY LOW RISK (score 75-95)
- Has residency/nationality in a Western/developed country = SIGNIFICANT BOOST (+15-25 points)

**Ties to Home Country (critical factor):**
- Strong ties: owns property, has family/dependents in Pakistan, stable long-term employment, business owner = POSITIVE
- Weak ties: single, no property, no dependents, recently employed/unemployed, student = NEGATIVE

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
- End with: "This is AI guidance, not legal advice."`;

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

    // Extract score from analysis
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
