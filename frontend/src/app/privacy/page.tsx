import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Snowy's Performance",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-void text-primary">
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-16">
        <Link href="/login" className="text-accent text-sm underline">
          ← Back to Snowy's Performance
        </Link>
        <h1 className="font-display text-2xl md:text-3xl font-semibold mt-4 mb-2">Privacy Policy</h1>
        <p className="text-xs text-faint mb-8">Effective date: September 21, 2026</p>

        <div className="space-y-6 text-sm text-muted leading-relaxed">
          <section>
            <h2 className="text-primary font-semibold text-base mb-2">1. Introduction</h2>
            <p>
              This Privacy Policy explains how Snowy's Performance ("we," "us") collects, uses, and protects
              information when you use our training and performance-tracking platform (the "Service").
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">2. Information We Collect</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <span className="text-primary">Account information:</span> name, email address, password (stored
                securely, never in plain text), and role (coach or athlete).
              </li>
              <li>
                <span className="text-primary">Performance &amp; training data:</span> testing results, workout
                logs, training programs, and related notes entered by you or your coach.
              </li>
              <li>
                <span className="text-primary">Team data:</span> team names and rosters, for coaches managing
                athletes.
              </li>
              <li>
                <span className="text-primary">Third-party fitness data</span> (when you connect an integration such
                as WHOOP): recovery, strain, HRV, or similar metrics you choose to share.
              </li>
              <li>
                <span className="text-primary">Log &amp; device data:</span> IP address, browser type, and pages
                visited, collected automatically to keep the Service secure and working properly.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">3. How We Use Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>operate and improve the Service;</li>
              <li>let coaches track and manage their athletes' training and testing;</li>
              <li>display performance and, where connected, recovery/fatigue-related metrics;</li>
              <li>communicate with you about your account; and</li>
              <li>maintain the security of the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">4. How We Share Information</h2>
            <p>
              We do not sell your personal information. Athlete data entered by a coach is visible to that athlete's
              coach(es) and team, and to the athlete, as part of normal use of the Service. We may share information
              with service providers who help us operate the Service (such as our hosting and database providers),
              who are required to protect it. We may disclose information if required by law. If Snowy's Performance
              is involved in a merger, acquisition, or sale of assets, your information may be transferred as part
              of that transaction, and we will notify you of any resulting change in ownership or control of your
              information.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">5. Data Storage &amp; Security</h2>
            <p>
              Data is stored on secure, industry-standard hosting infrastructure. We take reasonable technical and
              administrative measures to protect your information, but no method of storage or transmission is
              completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">6. Data Retention</h2>
            <p>
              We retain account and training data for as long as your account is active, or as needed to provide the
              Service. You may request deletion of your account and associated data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">7. Children's Privacy (Under 13)</h2>
            <p>
              The Service is not directed to children under 13, and we do not knowingly collect personal information
              directly from a child under 13 without verifiable parental consent. An athlete account for a user under
              13 must be created and managed by a parent, legal guardian, or coach acting with a parent or guardian's
              consent; the parent or guardian may review, correct, or request deletion of that child's information at
              any time by contacting us at the email below. If we learn that a child under 13 has provided personal
              information to us directly without appropriate consent, we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">8. Minors 13–17 / Athlete Data</h2>
            <p>
              For athletes between 13 and 17, Snowy's Performance is intended to be used under the supervision of a
              coach or team and with the consent of a parent or legal guardian. Coaches are responsible for ensuring
              appropriate consent is in place before adding a minor athlete's information to the Service. Parents or
              guardians who wish to review, correct, or request deletion of a minor athlete's data may contact us
              directly.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">9. Your Privacy Rights</h2>
            <p className="mb-2">
              <span className="text-primary font-medium">California residents:</span> you have the right to know the
              categories and specific pieces of personal information we have collected about you; know the
              categories of sources, purposes, and third parties with whom we share information; request deletion or
              correction of your personal information; opt out of the "sale" or "sharing" of personal information
              (we do not sell or share personal information for cross-context behavioral advertising); and not be
              discriminated against for exercising these rights.
            </p>
            <p>
              <span className="text-primary font-medium">Residents of other U.S. states</span> with comprehensive
              privacy laws (such as Virginia, Colorado, Connecticut, and others) may have similar rights to access,
              correct, delete, and obtain a copy of their personal information, and to opt out of certain processing.
              To exercise any of these rights, contact us at the email below; we will take reasonable steps to
              verify your request before responding.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">10. Do Not Track</h2>
            <p>
              Some browsers offer a "Do Not Track" signal. Because there is no common industry standard for
              responding to these signals, the Service does not currently respond to them.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">11. International Users</h2>
            <p>
              The Service is hosted in the United States and intended for users located in the United States. If you
              access the Service from outside the United States, you understand that your information will be
              transferred to and processed in the United States.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">12. Cookies &amp; Tracking</h2>
            <p>
              The Service uses minimal, necessary technical storage (such as keeping you signed in) to function. We
              do not use third-party advertising trackers.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">13. Security Incident Notification</h2>
            <p>
              If we discover a security breach that affects your personal information, we will notify you and take
              appropriate steps in accordance with applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">14. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will update the "Effective date" above when
              changes are made. Continued use of the Service after changes are posted constitutes acceptance of the
              revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">15. Contact</h2>
            <p>
              Questions about this Privacy Policy, or requests to access, correct, or delete your data, can be sent
              to{" "}
              <a className="underline text-accent" href="mailto:markbaseball2325@gmail.com">
                markbaseball2325@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
