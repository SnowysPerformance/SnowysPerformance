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
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

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
