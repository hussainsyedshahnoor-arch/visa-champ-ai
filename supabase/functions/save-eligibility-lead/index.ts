import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      leadToken,
      formData = {},
      countryName,
      visaTypeName,
      currentStep,
      status,
      score,
    } = body ?? {};

    if (!leadToken) throw new Error("leadToken is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve user id from the caller's token if present
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (jwt) {
      const { data } = await supabase.auth.getUser(jwt);
      userId = data?.user?.id ?? null;
    }

    const { data: existing } = await supabase
      .from("eligibility_leads")
      .select("id, furthest_step, status")
      .eq("lead_token", leadToken)
      .maybeSingle();

    const payload: Record<string, unknown> = {
      lead_token: leadToken,
      user_id: userId,
      full_name: formData.fullName || null,
      email: formData.email || null,
      whatsapp: formData.whatsappNumber || null,
      country_name: countryName || null,
      visa_type_name: visaTypeName || null,
      current_step: currentStep ?? null,
      furthest_step: Math.max(currentStep ?? 0, existing?.furthest_step ?? 0),
      form_data: formData,
      status: status ?? (existing?.status === "submitted" ? "submitted" : "in_progress"),
      score: score ?? null,
    };

    if (existing) {
      if (existing.status === "submitted" && payload.status !== "submitted") {
        payload.status = "submitted";
      }
      if (score === undefined || score === null) delete payload.score;
      const { error } = await supabase
        .from("eligibility_leads")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("eligibility_leads").insert(payload);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
