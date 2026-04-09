import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = request.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ error: "Server configuration is missing." }, 500);
    }

    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header." }, 401);
    }

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: { user: caller }, error: callerError } = await userClient.auth.getUser();
    if (callerError || !caller) {
      return jsonResponse({ error: "You must be signed in." }, 401);
    }

    const { data: callerRoleRows } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .limit(1);

    if (!callerRoleRows?.length) {
      return jsonResponse({ error: "Only admins can grant admin access." }, 403);
    }

    const { email } = await request.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    if (!normalizedEmail) {
      return jsonResponse({ error: "Email is required." }, 400);
    }

    // Find existing user
    const { data: usersPage } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let targetUser = usersPage?.users?.find(
      (u) => u.email?.trim().toLowerCase() === normalizedEmail
    );

    let invited = false;

    // If no account exists, invite them (creates account + sends invite email)
    if (!targetUser) {
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail);
      if (inviteError) {
        return jsonResponse({ error: `Failed to invite user: ${inviteError.message}` }, 500);
      }
      targetUser = inviteData.user;
      invited = true;
    }

    if (!targetUser) {
      return jsonResponse({ error: "Failed to create or find user." }, 500);
    }

    // Remove existing roles and grant admin
    await adminClient.from("user_roles").delete().eq("user_id", targetUser.id);

    const { error: insertError } = await adminClient.from("user_roles").insert({
      user_id: targetUser.id,
      role: "admin",
    });

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500);
    }

    return jsonResponse({
      email: normalizedEmail,
      user_id: targetUser.id,
      invited,
      message: invited
        ? "Invite sent & admin access pre-granted. They'll be admin when they accept the invite."
        : "Admin access granted successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
