import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png", "webp"];

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t.length ? t : null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const fileName = str(body?.fileName, 200);
    const fileSize = Number(body?.fileSize);
    const mimeType = str(body?.mimeType, 120);

    if (!fileName) throw new Error("fileName is required");
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_SIZE) {
      throw new Error("File must be between 1 byte and 10MB");
    }
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.includes(ext)) throw new Error("Unsupported file type");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Owner is derived from a verified bearer token only — never from the payload.
    let userId: string | null = null;
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    if (jwt) {
      const { data } = await supabase.auth.getUser(jwt);
      userId = data?.user?.id ?? null;
    }

    const safeName = fileName.replace(/[^\w.\-]/g, "_");
    const path = `${userId ?? "guest"}/${crypto.randomUUID()}/${safeName}`;

    const { data: signed, error: signErr } = await supabase.storage
      .from("eligibility-docs")
      .createSignedUploadUrl(path);
    if (signErr) throw signErr;

    const { error: rowErr } = await supabase.from("eligibility_document_submissions").insert({
      user_id: userId,
      full_name: str(body?.fullName, 120),
      email: str(body?.email, 200),
      whatsapp: str(body?.whatsapp, 40),
      country_name: str(body?.countryName, 120),
      visa_type_name: str(body?.visaTypeName, 120),
      score: typeof body?.score === "number" ? body.score : null,
      document_name: safeName,
      file_path: path,
      file_size: fileSize,
      mime_type: mimeType,
    });
    if (rowErr) throw rowErr;

    return new Response(JSON.stringify({ path, token: signed.token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("submit-eligibility-doc error:", e);
    return new Response(JSON.stringify({ error: "Could not process the document upload." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
