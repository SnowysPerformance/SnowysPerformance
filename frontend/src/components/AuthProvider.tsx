"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, clearSession } from "@/lib/api";

const AuthContext = createContext<{ user: any; logout: () => void; refreshUser: () => void }>({
  user: null,
  logout: () => {},
  refreshUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
  }, [router]);

  const logout = () => {
    clearSession();
    router.replace("/login");
  };

  // Re-reads the user from localStorage — call this after saving an
  // account change (name/email) so the nav bar etc. update immediately.
  const refreshUser = () => setUser(getUser());

  if (!user) return <div className="p-8 text-faint bg-void min-h-screen">Loading…</div>;
  return <AuthContext.Provider value={{ user, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
