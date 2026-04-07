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

    const prompt = `You are Visa Champ, an expert visa eligibility evaluator for Pakistani passport holders.

Evaluate this tourist visa application and provide a detailed assessment.

**Destination:** ${countryName}
**Visa Type:** ${visaTypeName}

**Applicant Details:**
- Full Name: ${formData.fullName}
- Age: ${formData.age}
- Employment Status: ${formData.employmentStatus}
- Monthly Income (PKR): ${formData.monthlyIncome}
- Bank Balance (PKR): ${formData.bankBalance}
- Has Travel History: ${formData.hasTravelHistory ? "Yes" : "No"}
- Previous Countries Visited: ${formData.previousCountries || "None"}
- Owns Property: ${formData.ownsProperty ? "Yes" : "No"}
- Marital Status: ${formData.maritalStatus}
- Purpose of Visit: ${formData.purposeOfVisit}

**Required Documents for this visa:**
${documents.map((d: any) => `- ${d.document_name} (${d.is_mandatory ? "Mandatory" : "Optional"}): ${d.description}`).join("\n")}

**Eligibility Criteria:**
${criteria.map((c: any) => `- ${c.criteria_name}: ${c.criteria_description}${c.min_value ? ` (Min: ${c.min_value})` : ""} [${c.is_mandatory ? "Required" : "Recommended"}]`).join("\n")}

Provide your assessment in this format:
1. **Eligibility Score:** X/100
2. **Verdict:** (High Chance / Medium Chance / Low Chance)
3. **Strengths:** (bullet points of strong aspects)
4. **Weaknesses:** (bullet points of concerns)
5. **Missing Documents:** (list any they likely need to prepare)
6. **Tips to Improve Chances:** (actionable advice)
7. **Estimated Processing Time:** based on the visa type

CRITICAL RULES:
- Do NOT mention any pricing, fees, or costs
- Do NOT share website links or URLs
- Do NOT mention where to apply
- Focus only on eligibility evaluation and guidance
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
