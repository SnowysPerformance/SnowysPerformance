"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/api";

// Renders nothing. If the visitor is already logged in (token lives only in
// localStorage, so this can only be checked client-side), send them straight
// to the dashboard instead of showing the marketing homepage.
export default function HomeAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (getUser()) {
      router.replace("/dashboard");
    }
  }, [router]);

  return null;
}
