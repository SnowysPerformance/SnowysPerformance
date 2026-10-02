import Link from "next/link";

// Open sign-up was removed on purpose (see backend auth.controller.ts):
// accounts are only created by a coach from their roster, or through an
// invite link a coach sends. This page used to be the sign-up form; it now
// just explains that, so old links and bookmarks don't land on a form that
// can't work.
export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-void p-4">
      <div className="bg-surface border border-edge p-8 rounded-lg shadow-lg w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">❄️</span>
          <h1 className="font-display text-lg font-semibold">Snowy's Performance</h1>
        </div>
        <p className="text-sm text-primary">Accounts are set up by your coach — there's no sign-up form.</p>
        <p className="text-sm text-muted">
          <span className="text-primary font-medium">Athletes:</span> ask your coach for your login. They create your account and
          send you your email and password. You don't need a team ID.
        </p>
        <p className="text-sm text-muted">
          <span className="text-primary font-medium">Coaches:</span> new coach accounts are by invitation. If you were sent an
          invite link, open that link to set up your account.
        </p>
        <Link href="/login" className="block text-center w-full bg-accent text-accenttext font-semibold rounded px-3 py-2 hover:bg-accentstrong transition-colors">
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
