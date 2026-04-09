import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
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

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser();

    if (callerError || !caller) {
      return jsonResponse({ error: "You must be signed in." }, 401);
    }

    const { data: callerRoleRows, error: callerRoleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .limit(1);

    if (callerRoleError) {
      return jsonResponse({ error: callerRoleError.message }, 500);
    }

    if (!callerRoleRows?.length) {
      return jsonResponse({ error: "Only admins can grant admin access." }, 403);
    }

    const { email } = await request.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();

    if (!normalizedEmail) {
      return jsonResponse({ error: "Email is required." }, 400);
    }

    const { data: usersPage, error: usersError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) {
      return jsonResponse({ error: usersError.message }, 500);
    }

    const targetUser = usersPage.users.find(
      (candidate) => candidate.email?.trim().toLowerCase() === normalizedEmail
    );

    if (!targetUser) {
      return jsonResponse(
        { error: "No account was found with that email. Ask the user to sign up first." },
        404
      );
    }

    const { error: deleteError } = await adminClient.from("user_roles").delete().eq("user_id", targetUser.id);
    if (deleteError) {
      return jsonResponse({ error: deleteError.message }, 500);
    }

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
      message: "Admin access granted successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
