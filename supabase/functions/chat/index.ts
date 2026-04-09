import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Visa Champ, a warm and friendly AI buddy who helps Pakistani passport holders with tourist visa questions.

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
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    // Auth is optional — frontend gates after 2 free messages
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      try {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: claimsData } = await userClient.auth.getClaims(
          authHeader.replace("Bearer ", "")
        );
        userId = claimsData?.claims?.sub ?? null;
      } catch (_) { /* guest user */ }
    }

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Try to enrich system prompt with user profile
    let systemPrompt = SYSTEM_PROMPT;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (authHeader && supabaseUrl && serviceKey) {
      try {
        const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await sb.auth.getUser(token);
        if (user) {
          const { data: profile } = await sb.from("profiles").select("display_name, phone").eq("user_id", user.id).maybeSingle();
          const lines = [
            profile?.display_name ? `- Name: ${profile.display_name}` : null,
            user.email ? `- Email: ${user.email}` : null,
            profile?.phone ? `- Phone: ${profile.phone}` : null,
          ].filter(Boolean);
          if (lines.length) {
            systemPrompt += `\n\nSigned-in user context:\n${lines.join("\n")}\nUse these details only when relevant. Never invent missing info.`;
          }
        }
      } catch (e) { console.error("profile enrichment error:", e); }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
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
