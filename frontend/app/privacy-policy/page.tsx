import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Privacy Policy - ClipAura",
  description: "ClipAura privacy policy. How we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#050505] pt-28 pb-24 md:pb-32">
      <div className="page-container max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-bold mb-8"
        >
          <ArrowLeft weight="bold" /> Back to Home
        </Link>

        <h1 className="section-title-lg text-white mb-3">
          Privacy Policy
        </h1>
        <p className="text-zinc-400 text-base mb-10">
          Effective Date: May 23, 2026
        </p>

        <div className="liquid-glass rounded-[22px] p-6 md:p-10 border-white/[0.07]">
          <div className="prose prose-invert prose-zinc max-w-none space-y-8 text-zinc-300 text-sm leading-relaxed">

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">1. Introduction</h2>
              <p>
                ClipAura (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is operated by Vaibhav Nareshbhai Pamnani.
                We are committed to protecting your privacy. This Privacy Policy explains how we collect, use,
                disclose, and safeguard your information when you use our AI-powered video clipping platform
                accessible at clipaura.com and related services (collectively, the &ldquo;Service&rdquo;).
              </p>
              <p>
                By accessing or using the Service, you agree to the terms of this Privacy Policy. If you do not
                agree, please discontinue use of the Service immediately.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">2. Information We Collect</h2>

              <h3 className="font-outfit font-semibold text-zinc-100 text-base mb-2">2.1 Account Information</h3>
              <p>
                When you create an account, we collect your email address, name, and authentication credentials.
                We use Supabase for authentication and may store profile information including your subscription
                tier, usage limits, and payment status.
              </p>

              <h3 className="font-outfit font-semibold text-zinc-100 text-base mb-2">2.2 User-Generated Content</h3>
              <p>
                We process video files, audio, and captions that you upload or generate through the Service.
                This content is used exclusively to provide clipping, rendering, and captioning functionality
                that you request. We do not use your uploaded media to train AI models or for any purpose
                beyond delivering the Service to you.
              </p>

              <h3 className="font-outfit font-semibold text-zinc-100 text-base mb-2">2.3 AI-Generated Content</h3>
              <p>
                ClipAura uses third-party AI APIs (including Groq) to generate captions, transcriptions, and
                other content. Your uploaded content is transmitted to these APIs solely for processing
                requested by you. We do not retain AI-generated outputs beyond what is necessary to deliver
                results and enable your access to historical jobs.
              </p>

              <h3 className="font-outfit font-semibold text-zinc-100 text-base mb-2">2.4 Payment Information</h3>
              <p>
                Payments are processed by Razorpay, a PCI-DSS compliant payment processor. We do not store
                your full credit card details on our servers. Razorpay may collect payment method information,
                billing address, and transaction data in accordance with its privacy policy.
              </p>

              <h3 className="font-outfit font-semibold text-zinc-100 text-base mb-2">2.5 Automatically Collected Data</h3>
              <p>
                We automatically collect certain information when you access the Service, including your
                IP address, browser type, operating system, referring URLs, pages viewed, and timestamps.
                This data is used for analytics, security monitoring, and service improvement.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">3. Cookies and Tracking Technologies</h2>
              <p>
                We use essential cookies for authentication and session management. We may also use analytics
                cookies to understand how the Service is used and to improve user experience. You can control
                cookie preferences through your browser settings. Disabling cookies may affect Service
                functionality including authentication.
              </p>
              <p>
                We do not use tracking cookies for advertising purposes or sell any user data to third-party
                advertising networks.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">4. How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>To provide, maintain, and improve the Service</li>
                <li>To process video rendering, captioning, and AI generation requests</li>
                <li>To manage your account, subscription, and billing</li>
                <li>To communicate with you about your account, updates, and support inquiries</li>
                <li>To enforce our Terms of Service and prevent abuse</li>
                <li>To comply with legal obligations and respond to lawful requests</li>
                <li>To analyze usage patterns and improve Service performance</li>
              </ul>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">5. Third-Party Services</h2>
              <p>
                ClipAura integrates with the following third-party services to deliver functionality.
                Each service has its own privacy policy governing data handling:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Supabase</strong> - Authentication and database hosting</li>
                <li><strong>Razorpay</strong> - Payment processing and subscription management</li>
                <li><strong>Groq</strong> - AI-powered transcription and language processing</li>
                <li><strong>Redis (Railway)</strong> - Caching and task queue management</li>
              </ul>
              <p>
                We share only the minimum data necessary with each provider to fulfill the specific service.
                We do not sell, rent, or trade your personal information.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">6. Data Retention</h2>
              <p>
                We retain your account information as long as your account is active. Uploaded media and
                rendered outputs are retained for a period necessary to provide the Service and enable
                your access to completed jobs. You may request deletion of your data by contacting us at
                support@clipaura.com. We will process deletion requests within 30 days, subject to any
                legal obligations requiring retention.
              </p>
              <p>
                AI processing data transmitted to third-party APIs is subject to each provider&apos;s
                retention policies. Groq does not retain API inputs or outputs beyond the duration of
                the processing request.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">7. Data Security</h2>
              <p>
                We implement industry-standard security measures including encryption in transit (TLS),
                encrypted data storage, and access controls. Authentication is handled via Supabase with
                secure token-based sessions. However, no method of electronic storage or transmission is
                100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">8. Your Rights</h2>
              <p>
                Depending on your jurisdiction, you may have the right to:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to or restrict certain processing activities</li>
                <li>Data portability where technically feasible</li>
              </ul>
              <p>
                To exercise any of these rights, contact us at support@clipaura.com. We will respond
                within the timeframe required by applicable law.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">9. Children&apos;s Privacy</h2>
              <p>
                The Service is not intended for individuals under the age of 13. We do not knowingly
                collect personal information from children. If we become aware that a child under 13 has
                provided us with personal data, we will take steps to delete such information.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">10. International Data Transfers</h2>
              <p>
                ClipAura is operated from India. Your data may be processed and stored on servers located
                in various regions through our service providers (Supabase, Railway, Razorpay). By using the
                Service, you consent to the transfer of your information to countries outside your country
                of residence.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes
                by posting the updated policy on this page and updating the Effective Date. Continued use
                of the Service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">12. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our data practices, contact us at:
              </p>
              <p>
                <strong>Email:</strong> support@clipaura.com<br />
                <strong>Operated by:</strong> Vaibhav Nareshbhai Pamnani<br />
                <strong>Website:</strong> clipaura.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
