const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export async function api(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  // A sign-in only lasts so long (see signToken on the backend). Once it has
  // expired -- or the account was removed -- every request comes back 401
  // and every page would otherwise just look empty ("no plans", "no
  // athletes") with no hint why. Sign the person out and send them to the
  // login page instead. Matched on the auth middleware's own messages so a
  // wrong "current password" (also a 401) doesn't log anyone out.
  if (res.status === 401 && token && SESSION_ENDED.includes(data?.error)) {
    clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login?expired=1";
    }
    throw new Error("Your sign-in expired. Please sign in again.");
  }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

const SESSION_ENDED = ["Invalid or expired token", "This account no longer exists", "Missing or invalid Authorization header"];

export function saveSession(token: string, user: any) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getUser(): any | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

// After a self-service account change (name/email), patch the locally
// stored user so the rest of the app (nav, "logged in as", etc.) reflects
// it immediately without requiring a re-login.
export function updateStoredUser(patch: any) {
  const current = getUser();
  if (!current) return;
  localStorage.setItem("user", JSON.stringify({ ...current, ...patch }));
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
