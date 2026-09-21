import Link from "next/link";

const h2 = "font-display text-base font-semibold mt-8 mb-2 text-primary";
const p = "text-sm text-muted leading-relaxed mb-3";
const li = "text-sm text-muted leading-relaxed mb-1.5";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-void text-primary">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">❄️</span>
          <span className="font-display font-semibold">Snowy's Performance</span>
        </div>
        <h1 className="font-display text-2xl font-bold mt-4">Privacy Policy</h1>
        <p className="text-xs text-faint mt-1 mb-6">Last updated: [DATE] · Effective: [DATE]</p>

        <div className="bg-surface border border-edge rounded-lg p-4 mb-6">
          <p className="text-xs text-muted leading-relaxed">
            This policy was drafted to plainly describe what Snowy's Performance actually collects and does with it. It is not a
            substitute for advice from a licensed attorney — because this app stores health-related data (like WHOOP recovery and
            sleep numbers) and is used by athletes under 18, it's worth having a lawyer review this before you rely on it for legal
            protection, especially the children's-privacy section below.
          </p>
        </div>

        <p className={p}>
          This Privacy Policy explains how Snowy's Performance ("we," "us," "the app") collects, uses, and protects information
          when a coach or athlete uses the platform. Snowy's Performance is operated by Mark Snowden, reachable at{" "}
          <a className="text-accent underline" href="mailto:markbaseball2325@gmail.com">markbaseball2325@gmail.com</a>.
        </p>

        <h2 className={h2}>Information We Collect</h2>
        <p className={p}>We collect only what's needed to run the coaching platform:</p>
        <ul className="list-disc pl-5 mb-3">
          <li className={li}><span className="text-primary font-medium">Account information</span> — name, email address, and password (stored as a one-way hash, never in plain text), and whether you're registered as a coach or an athlete.</li>
          <li className={li}><span className="text-primary font-medium">Team information</span> — the team you coach or belong to, and your role on it.</li>
          <li className={li}><span className="text-primary font-medium">Training data</span> — workouts and programs a coach builds, and the sets, reps, and weights an athlete logs.</li>
          <li className={li}><span className="text-primary font-medium">Coach's private notes</span> — notes a coach writes about an athlete, visible only to coaches on that athlete's team.</li>
          <li className={li}><span className="text-primary font-medium">Wearable / health data</span> — if an athlete chooses to connect a WHOOP account, we receive recovery score, strain, sleep score, and resting heart rate from WHOOP. This is health-related data and is only collected if the athlete actively connects their own WHOOP account — it is never required to use the app.</li>
          <li className={li}><span className="text-primary font-medium">Messages</span> — messages sent between a coach and an athlete inside the app.</li>
          <li className={li}><span className="text-primary font-medium">Invite information</span> — the email address of anyone invited to join a team.</li>
        </ul>
        <p className={p}>
          We do not collect payment information, and we do not use advertising trackers, ad networks, or third-party analytics
          services. The only thing stored in your browser is a login token (so you stay signed in) — no tracking cookies.
        </p>

        <h2 className={h2}>How We Use This Information</h2>
        <ul className="list-disc pl-5 mb-3">
          <li className={li}>To operate the core features: building and assigning training programs, logging workouts, tracking progress and personal records, and coach-athlete messaging.</li>
          <li className={li}>To show recovery and wearable trends to an athlete (and their coach, for athletes on that coach's team) when WHOOP is connected.</li>
          <li className={li}>To keep accounts secure (for example, checking login credentials and account status).</li>
          <li className={li}>To communicate with you about your account if needed (for example, responding to a support request).</li>
        </ul>
        <p className={p}>We do not sell personal information, and we do not share it for advertising purposes.</p>

        <h2 className={h2}>Who We Share Information With</h2>
        <ul className="list-disc pl-5 mb-3">
          <li className={li}><span className="text-primary font-medium">Your own team.</span> A coach can see the training data, notes, and wearable data of athletes on their team. An athlete can see their own data and whatever their coach shares with them.</li>
          <li className={li}><span className="text-primary font-medium">Hosting providers.</span> The app's code and database run on Vercel and Railway, two hosting companies that store and process data on our behalf to keep the app running. They don't use your data for their own purposes.</li>
          <li className={li}><span className="text-primary font-medium">WHOOP.</span> If an athlete connects WHOOP, we exchange data with WHOOP's servers under that athlete's own authorization, governed by WHOOP's own privacy policy. Disconnecting stops this at any time.</li>
          <li className={li}>We may disclose information if required by law, or to protect the safety of a user or the public.</li>
        </ul>

        <h2 className={h2}>Children's Privacy</h2>
        <p className={p}>
          Snowy's Performance is used by athletes of many ages, including some under 18. An athlete account is expected to be set
          up with the knowledge and consent of a parent or guardian, arranged through the athlete's coach or team (for example,
          many teams collect that consent as part of enrolling in the program itself, outside of this app). A parent or guardian
          who wants to review, correct, or delete their child's information can contact us at{" "}
          <a className="text-accent underline" href="mailto:markbaseball2325@gmail.com">markbaseball2325@gmail.com</a>, or contact
          their child's coach directly.
        </p>
        <p className={p}>
          <span className="text-primary font-medium">This section in particular should be reviewed by a lawyer</span> — laws
          protecting children's data (for example, COPPA in the U.S. for children under 13, and various state student-athlete
          data laws) can require specific consent processes depending on how old the athletes are and how the team is run.
        </p>

        <h2 className={h2}>Data Retention</h2>
        <p className={p}>
          We keep account and training data for as long as the account is active, so coaches and athletes can see training
          history over time. If you'd like your account and its data deleted, contact us at the email above and we'll remove it,
          other than what we're legally required to keep.
        </p>

        <h2 className={h2}>Security</h2>
        <p className={p}>
          Passwords are stored as one-way hashes, not as plain text. Data is transmitted over encrypted (HTTPS) connections. No
          system is perfectly secure, but we take reasonable steps to protect your information.
        </p>

        <h2 className={h2}>Your Rights</h2>
        <p className={p}>
          You can ask us to access, correct, or delete your personal information at any time by emailing{" "}
          <a className="text-accent underline" href="mailto:markbaseball2325@gmail.com">markbaseball2325@gmail.com</a>. If you're
          an athlete, your coach may also be able to help with changes to your training data directly in the app.
        </p>

        <h2 className={h2}>Changes to This Policy</h2>
        <p className={p}>
          If this policy changes in a meaningful way, we'll update the date at the top of this page. Continuing to use the app
          after a change means you accept the updated policy.
        </p>

        <h2 className={h2}>Contact</h2>
        <p className={p}>
          Questions about this policy or your data:{" "}
          <a className="text-accent underline" href="mailto:markbaseball2325@gmail.com">markbaseball2325@gmail.com</a>
        </p>

        <div className="mt-10 pt-6 border-t border-edgesoft flex gap-4 text-sm">
          <Link className="text-accent underline" href="/terms">Terms &amp; Conditions</Link>
          <Link className="text-accent underline" href="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
