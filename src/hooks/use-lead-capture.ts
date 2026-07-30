import { useEffect, useRef } from "react";

const TOKEN_KEY = "eligibility_lead_token";

export const getLeadToken = () => {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
};

export const resetLeadToken = () => {
  const token = crypto.randomUUID();
  localStorage.setItem(TOKEN_KEY, token);
  return token;
};

interface LeadPayload {
  formData: Record<string, unknown>;
  countryName?: string;
  visaTypeName?: string;
  currentStep?: number;
  status?: "in_progress" | "abandoned" | "submitted";
  score?: number | null;
}

const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-eligibility-lead`;

export const saveLead = async (payload: LeadPayload, keepalive = false) => {
  try {
    await fetch(endpoint, {
      method: "POST",
      keepalive,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ leadToken: getLeadToken(), ...payload }),
    });
  } catch {
    /* silent — lead capture must never break the flow */
  }
};

/**
 * Debounced autosave of partially completed eligibility forms so the team can
 * follow up with people who abandon the wizard.
 */
export const useLeadCapture = (payload: LeadPayload, enabled: boolean) => {
  const latest = useRef(payload);
  latest.current = payload;

  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => saveLead(latest.current), 1200);
    return () => clearTimeout(t);
  }, [enabled, JSON.stringify(payload)]);

  useEffect(() => {
    if (!enabled) return;
    const onLeave = () => {
      const p = latest.current;
      saveLead({ ...p, status: p.status === "submitted" ? "submitted" : "abandoned" }, true);
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, [enabled]);
};
