import Link from "next/link";

const h2 = "font-display text-base font-semibold mt-8 mb-2 text-primary";
const p = "text-sm text-muted leading-relaxed mb-3";
const li = "text-sm text-muted leading-relaxed mb-1.5";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-void text-primary">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">❄️</span>
          <span className="font-display font-semibold">Snowy's Performance</span>
        </div>
        <h1 className="font-display text-2xl font-bold mt-4">Terms &amp; Conditions</h1>
        <p className="text-xs text-faint mt-1 mb-6">Last updated: [DATE] · Effective: [DATE]</p>

        <div className="bg-surface border border-edge rounded-lg p-4 mb-6">
          <p className="text-xs text-muted leading-relaxed">
            This is a solid starting draft, not legal advice — it wasn't written or reviewed by a lawyer. Given that this app is
            used by minors and involves physical training (which carries real injury risk), it's worth having an attorney review
            it, especially the liability, disclaimer, and governing-law sections, before you rely on it for legal protection.
            Wherever you see <span className="font-mono text-chalk">[YOUR STATE]</span>, fill in the state whose law should govern
            this agreement — usually where you live or run the business from.
          </p>
        </div>

        <p className={p}>
          These Terms &amp; Conditions ("Terms") govern your use of Snowy's Performance (the "Service"), operated by Mark
          Snowden ("we," "us"). By creating an account or using the Service, you agree to these Terms. If you don't agree, please
          don't use the Service.
        </p>

        <h2 className={h2}>1. What the Service Is</h2>
        <p className={p}>
          Snowy's Performance is a training-management tool for coaches and athletes: building and assigning workout programs,
          logging training data, tracking progress and personal records, optionally connecting a WHOOP wearable, and messaging
          between coach and athlete. It is a record-keeping and communication tool — it does not provide medical, nutritional, or
          professional coaching advice itself, and it is not a substitute for in-person coaching judgment or medical guidance.
        </p>

        <h2 className={h2}>2. Accounts &amp; Eligibility</h2>
        <ul className="list-disc pl-5 mb-3">
          <li className={li}>You need an account to use the Service, as either a coach or an athlete on a team.</li>
          <li className={li}>You're responsible for keeping your password secure and for activity that happens under your account.</li>
          <li className={li}>Athlete accounts for anyone under 18 are expected to be created with the knowledge and consent of a parent or guardian, arranged through the athlete's coach or team.</li>
          <li className={li}>You agree to provide accurate information when creating your account.</li>
        </ul>

        <h2 className={h2}>3. Acceptable Use</h2>
        <p className={p}>You agree not to:</p>
        <ul className="list-disc pl-5 mb-3">
          <li className={li}>Use the Service for anything illegal, or to harass, harm, or impersonate another person.</li>
          <li className={li}>Try to access another user's account or data without permission.</li>
          <li className={li}>Attempt to disrupt, overload, or reverse-engineer the Service.</li>
          <li className={li}>Upload content you don't have the right to share.</li>
        </ul>

        <h2 className={h2}>4. Your Training Data</h2>
        <p className={p}>
          You (or, for a minor athlete, their parent/guardian and coach) retain ownership of the training data, notes, and
          messages entered into the Service. You grant us the limited right to store and display that data back to you and to
          the coaches/athletes it's shared with, solely to operate the Service. A coach's programs and notes remain the coach's
          own content.
        </p>

        <h2 className={h2}>5. Wearable Data &amp; Third-Party Services</h2>
        <p className={p}>
          Connecting WHOOP is optional and happens through WHOOP's own authorization flow. Your use of WHOOP is also governed by
          WHOOP's own terms and privacy policy, which we don't control. We aren't responsible for the accuracy of data WHOOP
          provides, or for WHOOP's availability.
        </p>

        <h2 className={h2}>6. Physical Activity &amp; Health Disclaimer</h2>
        <p className={p}>
          <span className="text-primary font-medium">The Service is a tool for recording and organizing training — it does not
          replace a doctor, physical therapist, or in-person coaching judgment.</span> Physical training carries an inherent risk
          of injury. By using the Service, you acknowledge that:
        </p>
        <ul className="list-disc pl-5 mb-3">
          <li className={li}>Any programs, targets, or recovery information shown in the app are informational only and are not medical advice.</li>
          <li className={li}>You (or, for a minor athlete, their parent/guardian) are responsible for consulting a physician before beginning or continuing a training program, especially with any pre-existing condition.</li>
          <li className={li}>You use any training program or information from the Service at your own risk, and voluntarily assume the risks of physical training.</li>
        </ul>

        <h2 className={h2}>7. Termination</h2>
        <p className={p}>
          You may stop using the Service and request account deletion at any time. We may suspend or terminate an account that
          violates these Terms or that we reasonably believe is being misused.
        </p>

        <h2 className={h2}>8. Disclaimer of Warranties</h2>
        <p className={p}>
          The Service is provided "as is," without warranties of any kind, express or implied. We don't guarantee the Service
          will be uninterrupted, error-free, or that any training outcome or result will be achieved.
        </p>

        <h2 className={h2}>9. Limitation of Liability</h2>
        <p className={p}>
          To the fullest extent permitted by law, Mark Snowden / Snowy's Performance is not liable for any indirect, incidental,
          or consequential damages arising from your use of the Service, including injury arising from physical training,
          except where such liability cannot be limited under applicable law.
        </p>

        <h2 className={h2}>10. Governing Law</h2>
        <p className={p}>
          These Terms are governed by the laws of <span className="font-mono text-chalk">[YOUR STATE]</span>, without regard to
          its conflict-of-law rules.
        </p>

        <h2 className={h2}>11. Changes to These Terms</h2>
        <p className={p}>
          We may update these Terms from time to time. If we make a meaningful change, we'll update the date at the top of this
          page. Continuing to use the Service after a change means you accept the updated Terms.
        </p>

        <h2 className={h2}>12. Contact</h2>
        <p className={p}>
          Questions about these Terms:{" "}
          <a className="text-accent underline" href="mailto:markbaseball2325@gmail.com">markbaseball2325@gmail.com</a>
        </p>

        <div className="mt-10 pt-6 border-t border-edgesoft flex gap-4 text-sm">
          <Link className="text-accent underline" href="/privacy">Privacy Policy</Link>
          <Link className="text-accent underline" href="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
