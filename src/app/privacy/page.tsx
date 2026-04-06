import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | SoiréeSpace",
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm text-stone-400 mb-10">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        <div className="prose prose-stone prose-sm max-w-none space-y-8">
          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">1. Information We Collect</h2>
            <p className="text-stone-600 leading-relaxed">
              When you create an account, we collect your email address, name, and any business information you provide in your profile settings. When you use SoiréeSpace, we store the event data you create including guest lists, vendor information, timelines, floor plans, contracts, files, and budget details. We also collect payment information through our payment processor, Stripe.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">2. How We Use Your Information</h2>
            <p className="text-stone-600 leading-relaxed">
              We use your information solely to provide and improve the SoiréeSpace service. This includes:
            </p>
            <ul className="list-disc pl-5 text-stone-600 space-y-1">
              <li>Providing access to your event planning tools and data</li>
              <li>Processing payments and managing your subscription</li>
              <li>Sending essential service communications (e.g., billing receipts, security alerts)</li>
              <li>Maintaining and improving the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">3. We Do Not Sell Your Information</h2>
            <p className="text-stone-600 leading-relaxed">
              <strong>SoiréeSpace does not sell, rent, or trade your personal information to third parties.</strong> We do not share your data with advertisers, data brokers, or any other third parties for their marketing purposes. Your event data, client information, and personal details are yours alone.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">4. Third-Party Services</h2>
            <p className="text-stone-600 leading-relaxed">
              We use the following third-party services to operate SoiréeSpace:
            </p>
            <ul className="list-disc pl-5 text-stone-600 space-y-1">
              <li><strong>Supabase</strong> — Database hosting and authentication</li>
              <li><strong>Stripe</strong> — Payment processing</li>
              <li><strong>Vercel</strong> — Application hosting</li>
              <li><strong>Google Places API</strong> — Vendor search functionality</li>
            </ul>
            <p className="text-stone-600 leading-relaxed mt-2">
              These services only receive the minimum data necessary to perform their function and are bound by their own privacy policies.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">5. Cookies</h2>
            <p className="text-stone-600 leading-relaxed">
              SoiréeSpace uses only essential cookies required for the service to function. These include:
            </p>
            <ul className="list-disc pl-5 text-stone-600 space-y-1">
              <li><strong>Authentication cookies</strong> — To keep you signed in and secure your session</li>
              <li><strong>Session cookies</strong> — To maintain your preferences during a browsing session</li>
            </ul>
            <p className="text-stone-600 leading-relaxed mt-2">
              We do not use tracking cookies, advertising cookies, or any third-party analytics cookies. We do not track your activity across other websites.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">6. Data Security</h2>
            <p className="text-stone-600 leading-relaxed">
              Your data is stored securely using Supabase with row-level security policies, ensuring users can only access their own data. All data is transmitted over HTTPS. Payment information is handled entirely by Stripe and never touches our servers.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">7. Your Rights</h2>
            <p className="text-stone-600 leading-relaxed">You have the right to:</p>
            <ul className="list-disc pl-5 text-stone-600 space-y-1">
              <li><strong>Access your data</strong> — All your data is visible within your SoiréeSpace account</li>
              <li><strong>Request data deletion</strong> — You can permanently delete your account and all associated data from the Settings page, or by contacting us</li>
              <li><strong>Opt out of data sales</strong> — We do not sell your data. There is nothing to opt out of.</li>
              <li><strong>Export your data</strong> — Contact us to request an export of your data</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">8. Data Retention</h2>
            <p className="text-stone-600 leading-relaxed">
              Your data is retained as long as your account is active. If you delete your account, all data is permanently removed from our systems including events, guests, vendors, files, contracts, and billing records. Stripe may retain payment records per their own data retention policy.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">9. California Residents (CCPA)</h2>
            <p className="text-stone-600 leading-relaxed">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc pl-5 text-stone-600 space-y-1">
              <li>The right to know what personal information we collect and how it is used</li>
              <li>The right to request deletion of your personal information</li>
              <li>The right to opt out of the sale of personal information — <strong>we do not sell your information</strong></li>
              <li>The right to non-discrimination for exercising your privacy rights</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">10. Age Requirement</h2>
            <p className="text-stone-600 leading-relaxed">
              SoiréeSpace is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected data from a child under 13, we will promptly delete that information.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">11. Changes to This Policy</h2>
            <p className="text-stone-600 leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of any material changes by posting the updated policy on this page with a new &ldquo;Last updated&rdquo; date.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-stone-800">12. Contact</h2>
            <p className="text-stone-600 leading-relaxed">
              For privacy-related requests including data deletion, data export, or questions about this policy, please contact us at:
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
