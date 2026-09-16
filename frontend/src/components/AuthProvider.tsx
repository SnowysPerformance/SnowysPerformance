"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, clearSession } from "@/lib/api";

const AuthContext = createContext<{ user: any; logout: () => void }>({ user: null, logout: () => {} });

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

  if (!user) return <div className="p-8 text-slate-500">Loading…</div>;
  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
