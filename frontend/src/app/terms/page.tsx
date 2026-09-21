import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Snowy's Performance",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-void text-primary">
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-16">
        <Link href="/login" className="text-accent text-sm underline">
          ← Back to Snowy's Performance
        </Link>
        <h1 className="font-display text-2xl md:text-3xl font-semibold mt-4 mb-2">Terms of Service</h1>
        <p className="text-xs text-faint mb-8">Effective date: September 21, 2026</p>

        <div className="space-y-6 text-sm text-muted leading-relaxed">
          <section>
            <h2 className="text-primary font-semibold text-base mb-2">1. Acceptance of Terms</h2>
            <p>
              By creating an account or otherwise using Snowy's Performance (the "Service"), you agree to be bound by
              these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service. If you
              are creating or using an account on behalf of an athlete under the age of 18, you represent that you
              are that athlete's parent, legal guardian, or an authorized coach acting with the consent of a parent
              or guardian.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">2. Description of Service</h2>
            <p>
              Snowy's Performance is a training and performance-tracking platform that allows coaches to build
              training programs, record athlete testing results, log workouts, and monitor athlete development over
              time. The Service may in the future integrate with third-party fitness and recovery platforms (such as
              WHOOP) to display additional metrics.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">3. Eligibility &amp; Accounts</h2>
            <p>
              You must be at least 18 years old to create a coach account. An athlete account may be created by a
              coach on behalf of an athlete of any age. If the athlete is under 18, a parent or legal guardian must
              consent to that athlete's use of the Service. If the athlete is under 13, the account must be created
              and controlled by a parent, legal guardian, or coach acting with a parent or guardian's verifiable
              consent, consistent with the Children's Online Privacy Protection Act ("COPPA"); we do not knowingly
              permit a child under 13 to create or directly control their own account. You must provide accurate,
              complete information, and you are responsible for maintaining the confidentiality of your login
              credentials and for all activity under your account. Coaches are responsible for the accuracy of
              information entered on behalf of their athletes and for having the appropriate authority and consent
              to add an athlete to a team.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">4. Electronic Communications</h2>
            <p>
              By using the Service, you consent to receive communications from us electronically, including by email
              and within the Service. You agree that any notices, agreements, disclosures, or other communications we
              provide electronically satisfy any legal requirement that such communications be in writing.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>use the Service for any unlawful purpose;</li>
              <li>attempt to gain unauthorized access to another user's account or data;</li>
              <li>upload or enter false, misleading, or defamatory information;</li>
              <li>interfere with or disrupt the operation of the Service; or</li>
              <li>use the Service to harass, abuse, or harm another person.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">6. User Content</h2>
            <p>
              "User Content" means testing results, workout logs, training programs, notes, and any other data you
              or your coach enter into the Service. You retain all ownership rights in your User Content. By
              submitting User Content, you grant Snowy's Performance a non-exclusive, worldwide, royalty-free license
              to host, store, reproduce, and display it solely as necessary to operate and provide the Service to you
              and your team. You represent that you have the right to submit your User Content and that doing so
              does not violate any law or any third party's rights.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">7. Health, Fitness &amp; Performance Data Disclaimer</h2>
            <p>
              The Service is a tracking and organizational tool. It is not a medical device and does not provide
              medical advice, diagnosis, or treatment. Testing results, workout logs, and any third-party recovery or
              health metrics displayed in the Service (including data from integrations such as WHOOP) are provided
              for informational and training purposes only.
            </p>
            <p className="mt-2">
              THE SERVICE DOES NOT PROVIDE MEDICAL ADVICE. ALWAYS SEEK THE ADVICE OF A PHYSICIAN OR OTHER QUALIFIED
              HEALTH PROVIDER WITH ANY QUESTIONS REGARDING A MEDICAL CONDITION, AND BEFORE BEGINNING OR MODIFYING A
              TRAINING PROGRAM OR MAKING ANY DECISION BASED ON DATA SHOWN IN THE SERVICE, ESPECIALLY REGARDING
              INJURY, ILLNESS, OR OVERTRAINING.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">8. Assumption of Athletic Risk</h2>
            <p>
              Physical training and athletic activity carry an inherent risk of injury. Use of the Service does not
              eliminate that risk, and the Service's tracking, testing, or fatigue-related features (current or
              future) are not a substitute for a coach's or medical professional's judgment. By using the Service,
              you voluntarily assume the risks associated with your (or your athlete's) participation in physical
              training and athletic activity.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">9. Intellectual Property</h2>
            <p>
              The Service, including its design, software, and content (excluding User Content), is owned by Snowy's
              Performance and its licensors and is protected by intellectual property laws. Except as expressly
              permitted, you may not copy, modify, distribute, or create derivative works of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">10. Third-Party Integrations</h2>
            <p>
              The Service may allow you to connect third-party accounts or services (such as WHOOP). Your use of
              those third-party services is subject to their own terms and privacy policies. Snowy's Performance is
              not responsible for the accuracy, availability, or practices of third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">11. Termination</h2>
            <p>
              You may stop using the Service and request deletion of your account at any time by contacting us. We
              may suspend or terminate accounts that violate these Terms or that we reasonably believe pose a risk to
              the Service or other users. Upon termination, your right to use the Service ends immediately; we may
              retain your data for a reasonable period to comply with legal obligations, resolve disputes, and
              enforce our agreements, after which it will be deleted consistent with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">12. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS,
              IMPLIED, OR STATUTORY, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS
              FOR A PARTICULAR PURPOSE, TITLE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
              UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">13. Limitation of Liability</h2>
            <p>
              TO THE FULLEST EXTENT PERMITTED BY LAW, SNOWY'S PERFORMANCE AND ITS OWNERS, OPERATORS, AND AFFILIATES
              WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY
              LOSS OF DATA, PROFITS, OR GOODWILL, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE. OUR TOTAL
              LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE WILL NOT EXCEED THE
              GREATER OF (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM AROSE, OR (B) ONE HUNDRED
              DOLLARS ($100). SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES, SO SOME
              OF THE ABOVE LIMITATIONS MAY NOT APPLY TO YOU.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">14. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Snowy's Performance and its owners and operators from
              any claims, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or
              related to your use of the Service, your User Content, or your violation of these Terms or any
              applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">15. Dispute Resolution &amp; Governing Law</h2>
            <p>
              These Terms are governed by the laws of the state in which Snowy's Performance is organized and
              operated, without regard to conflict-of-law principles. Before filing a claim against us, you agree to
              try to resolve the dispute informally by contacting us first; we will do the same. If a dispute is not
              resolved informally within 30 days, either party may bring a claim in a court of competent jurisdiction
              in that state, and you consent to the personal jurisdiction of those courts, except that either party
              may bring an individual claim in small claims court. To the extent permitted by law, disputes will be
              resolved on an individual basis, and you waive any right to participate in a class, consolidated, or
              representative action.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">16. Severability</h2>
            <p>
              If any provision of these Terms is found unenforceable, that provision will be limited or eliminated
              to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">17. Entire Agreement &amp; Waiver</h2>
            <p>
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and Snowy's
              Performance regarding the Service and supersede any prior agreements. Our failure to enforce any
              provision is not a waiver of that provision.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">18. Assignment</h2>
            <p>
              You may not assign or transfer these Terms without our prior written consent. We may assign these
              Terms without restriction, including in connection with a merger, acquisition, or sale of assets.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">19. Force Majeure</h2>
            <p>
              We will not be liable for any failure or delay in performance resulting from causes beyond our
              reasonable control, including natural disasters, war, labor disputes, or internet or hosting-provider
              outages.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">20. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Service after changes are posted
              constitutes acceptance of the revised Terms. We will update the "Effective date" above when changes are
              made.
            </p>
          </section>

          <section>
            <h2 className="text-primary font-semibold text-base mb-2">21. Contact</h2>
            <p>
              Questions about these Terms can be sent to{" "}
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
