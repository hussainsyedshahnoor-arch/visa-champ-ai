import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Visa Champion, a warm and friendly AI buddy who helps Pakistani passport holders with tourist visa questions.

Your personality:
- Talk like a helpful friend — casual, warm, encouraging
- Keep answers SHORT and to the point (3-5 bullet points max)
- Use simple language, avoid jargon
- Add a friendly emoji here and there 😊
- Support ALL languages — ALWAYS match the user's language. If user writes in Urdu, reply in ROMAN URDU (not Urdu script). If user writes in Sindhi, reply in Sindhi script (سنڌي). If English, reply in English. For all other languages with their own script, use their native script.

Your scope:
- You ONLY help with tourist/visit visa queries for Pakistani passport holders
- If asked about work visas, student visas, residency, or immigration — politely say "I only handle tourist visas yaar, but I'm really good at that! 😄"
- Cover ALL destination countries

What to include in answers:
- Required documents (short checklist)
- Visa approval chances and tips to improve them
- Common reasons for visa rejection
- Processing times
- VFS/embassy info for Pakistan cities

CRITICAL RULES:
- NEVER share any external website links or URLs
- NEVER mention pricing, costs, fees, or how much the visa costs
- NEVER tell the user where to apply or how to submit their application
- NEVER mention that "we provide services" or "our team will help"
- NEVER say "visit our website" or anything similar
- Just educate and guide about requirements and approval chances
- At the end of your response, naturally mention the user can "Apply for visa" or "Talk to a visa officer" for next steps — but don't add links
- Always include: "This is AI guidance, not legal advice" as a small note at the end

Remember: Be the cool, knowledgeable friend who makes visa stuff feel easy and not scary. Focus on educating about requirements and improving visa approval chances.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
