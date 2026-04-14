const AUTH_RETURN_STORAGE_KEY = "visa_champ_auth_return";

export type AuthReturnContext =
  | {
      source: "hero-chat";
      redirectTo: string;
      chatSessionId?: string | null;
    }
  | {
      source: "eligibility";
      redirectTo: string;
    };

export const buildReturnPath = (pathname: string, search = "", hash = "") =>
  `${pathname}${search}${hash}` || "/";

export const getSafeRedirect = (value: string | null | undefined, fallback = "/") => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
};

export function saveAuthReturnContext(context: AuthReturnContext) {
  localStorage.setItem(
    AUTH_RETURN_STORAGE_KEY,
    JSON.stringify({
      ...context,
      redirectTo: getSafeRedirect(context.redirectTo, "/"),
    }),
  );
}

export function getAuthReturnContext(): AuthReturnContext | null {
  const raw = localStorage.getItem(AUTH_RETURN_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthReturnContext;
    return {
      ...parsed,
      redirectTo: getSafeRedirect(parsed.redirectTo, "/"),
    };
  } catch {
    return null;
  }
}

export function clearAuthReturnContext() {
  localStorage.removeItem(AUTH_RETURN_STORAGE_KEY);
}
