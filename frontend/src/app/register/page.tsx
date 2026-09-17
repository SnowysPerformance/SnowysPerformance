"use client";
import Link from "next/link";

// There's no public sign-up anymore, for coaches or athletes — every
// account is created by accepting an invite link an existing coach sends to
// a specific email address (see /accept-invite). This page just explains
// that to anyone who lands here looking for a sign-up form.
export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-void">
      <div className="bg-surface border border-edge p-8 rounded-lg shadow-lg w-full max-w-sm space-y-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg">❄️</span>
          <h1 className="font-display text-lg font-semibold">Snowy's Performance</h1>
        </div>
        <p className="text-sm text-muted">
          There's no public sign-up here. Every account — coach or athlete — is created by accepting an invite link sent to your exact email address.
        </p>
        <p className="text-sm text-muted">Ask whoever runs your team to send you one.</p>
        <p className="text-sm text-muted">
          Already have an account?{" "}
          <Link className="underline text-accent" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
