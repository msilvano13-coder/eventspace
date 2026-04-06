import Link from "next/link";

export const metadata = {
  title: "Terms of Service | SoiréeSpace",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-stone-600 transition-colors mb-8"
        >
          &larr; Back to SoiréeSpace
        </Link>

        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-stone-400 mb-10">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        <div className="prose prose-stone prose-sm max-w-none space-y-8">
          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">1. Acceptance of Terms</h2>
            <p className="text-stone-600 leading-relaxed">
              By creating an account or using SoiréeSpace, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the service. We reserve the right to update these terms at any time. Continued use of the service after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">2. Description of Service</h2>
            <p className="text-stone-600 leading-relaxed">
              SoiréeSpace is a web-based event planning platform that provides tools for managing events, guests, vendors, timelines, floor plans, budgets, contracts, and client communication. The service is offered under multiple plan tiers with varying features and limitations.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">3. Accounts</h2>
            <p className="text-stone-600 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must provide accurate information when creating an account. You must be at least 13 years of age to use SoiréeSpace. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">4. Free Trial</h2>
            <p className="text-stone-600 leading-relaxed">
              New accounts receive a 30-day free trial with access to the platform. At the end of the trial period, you must subscribe to a paid plan to continue using the service. We reserve the right to modify or discontinue the free trial at any time.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">5. Payments & Billing</h2>
            <p className="text-stone-600 leading-relaxed">
              Paid plans are billed through Stripe. Subscription plans (Professional) are billed monthly and automatically renew unless cancelled. One-time purchase plans (DIY) provide lifetime access to the features included at the time of purchase. All fees are non-refundable except where required by law. You are responsible for providing valid payment information.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">6. Cancellation</h2>
            <p className="text-stone-600 leading-relaxed">
              You may cancel your Professional subscription at any time from your account settings. Cancellation takes effect at the end of your current billing period — you retain access until then. DIY plans are one-time purchases and do not require cancellation. You may delete your account at any time, which permanently removes all your data.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">7. Your Content</h2>
            <p className="text-stone-600 leading-relaxed">
              You retain ownership of all content you create or upload to SoiréeSpace, including event data, guest lists, vendor information, files, contracts, and any other materials. We do not claim any intellectual property rights over your content. You grant us a limited license to store, display, and process your content solely for the purpose of providing the service.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">8. Acceptable Use</h2>
            <p className="text-stone-600 leading-relaxed">
              You agree not to use SoiréeSpace to:
            </p>
            <ul className="list-disc pl-5 text-stone-600 space-y-1">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on the rights of others</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to other accounts or systems</li>
              <li>Use the service for any purpose other than event planning and management</li>
              <li>Resell or redistribute the service without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">9. Service Availability</h2>
            <p className="text-stone-600 leading-relaxed">
              We strive to maintain high uptime but do not guarantee uninterrupted access to the service. We may perform maintenance, updates, or modifications that temporarily affect availability. We are not liable for any losses resulting from service interruptions.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">10. Limitation of Liability</h2>
            <p className="text-stone-600 leading-relaxed">
              SoiréeSpace is provided &ldquo;as is&rdquo; without warranties of any kind, express or implied. To the maximum extent permitted by law, SoiréeSpace and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or goodwill arising from your use of the service. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">11. Termination</h2>
            <p className="text-stone-600 leading-relaxed">
              We reserve the right to suspend or terminate your account if you violate these terms or engage in conduct that we determine is harmful to the service or other users. Upon termination, your right to use the service ceases immediately. We may delete your data after termination.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">12. Governing Law</h2>
            <p className="text-stone-600 leading-relaxed">
              These terms are governed by the laws of the United States. Any disputes arising from these terms or your use of the service shall be resolved in accordance with applicable law.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">13. Contact</h2>
            <p className="text-stone-600 leading-relaxed">
              For questions about these terms, please contact us at:
            </p>
            <p className="text-stone-600 leading-relaxed mt-2">
              <a href="mailto:michael@michaelsilvano.com" className="text-rose-500 hover:text-rose-600 font-medium underline">
                michael@michaelsilvano.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-stone-200 text-center">
          <p className="text-xs text-stone-400">
            &copy; {new Date().getFullYear()} SoiréeSpace. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
