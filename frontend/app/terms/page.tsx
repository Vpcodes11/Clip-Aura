import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Terms & Conditions - ClipAura",
  description: "Terms and conditions governing your use of the ClipAura AI-powered video clipping platform.",
};

export default function TermsPage() {
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
          Terms &amp; Conditions
        </h1>
        <p className="text-zinc-400 text-base mb-10">
          Effective Date: May 23, 2026
        </p>

        <div className="liquid-glass rounded-[22px] p-6 md:p-10 border-white/[0.07]">
          <div className="prose prose-invert prose-zinc max-w-none space-y-8 text-zinc-300 text-sm leading-relaxed">

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">1. Acceptance of Terms</h2>
              <p>
                ClipAura (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is operated by Vaibhav Nareshbhai Pamnani.
                By accessing or using the ClipAura platform at clipaura.com (the &ldquo;Service&rdquo;),
                you agree to be bound by these Terms and Conditions (&ldquo;Terms&rdquo;). If you do not
                agree to these Terms, you may not use the Service.
              </p>
              <p>
                We reserve the right to update these Terms at any time. Continued use after changes are posted
                constitutes acceptance. We will notify users of material changes via email or through the Service.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">2. Eligibility</h2>
              <p>
                You must be at least 13 years of age to use the Service. By creating an account, you represent
                and warrant that you meet this age requirement and that all registration information you submit
                is accurate and truthful. You are responsible for maintaining the confidentiality of your account
                credentials and for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">3. Account Types and Subscriptions</h2>

              <h3 className="font-outfit font-semibold text-zinc-100 text-base mb-2">3.1 Plans</h3>
              <p>
                ClipAura offers multiple subscription tiers: Trial (free, 60 one-time minutes), PRO ($29/month, 240 minutes),
                STUDIO ($69/month, 600 minutes), and AGENCY ($149/month, 1500 minutes). Additional credit packs
                are available for one-time purchase at $15 per 60 minutes.
              </p>

              <h3 className="font-outfit font-semibold text-zinc-100 text-base mb-2">3.2 Trial Period</h3>
              <p>
                Trial accounts are valid for 14 days from creation. Trial exports are watermarked. After the trial
                period expires or the allocated minutes are exhausted, access to rendering features requires a paid
                subscription or credit pack purchase.
              </p>

              <h3 className="font-outfit font-semibold text-zinc-100 text-base mb-2">3.3 Billing</h3>
              <p>
                Paid subscriptions are billed monthly in advance. You authorize us to charge your payment method
                on a recurring basis until you cancel. Prices are subject to change with 30 days notice. Your
                subscription will auto-renew each billing period unless cancelled at least 24 hours before the
                renewal date.
              </p>

              <h3 className="font-outfit font-semibold text-zinc-100 text-base mb-2">3.4 Usage Limits</h3>
              <p>
                Each plan includes a monthly allocation of source video minutes for processing. Unused minutes
                do not roll over to the next billing period. Credit pack minutes do not expire and are consumed
                after your monthly plan minutes are exhausted. Exceeding your allocation will prevent new
                rendering jobs until additional minutes are purchased or your allocation resets.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">4. Acceptable Use</h2>
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Upload, process, or generate content that is illegal, harmful, abusive, defamatory, or violates the rights of others</li>
                <li>Upload or process content depicting child sexual abuse material or any content that exploits minors</li>
                <li>Generate deepfakes, deceptive media, or content intended to impersonate, harass, or defraud individuals</li>
                <li>Violate any applicable local, national, or international laws or regulations</li>
                <li>Infringe upon intellectual property rights of any third party</li>
                <li>Attempt to reverse engineer, decompile, or extract the source code of the Service</li>
                <li>Use automated means (bots, scrapers) to access the Service without prior written permission</li>
                <li>Interfere with or disrupt the Service, servers, or networks connected to the Service</li>
                <li>Upload malicious code, viruses, or any content designed to harm the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">5. AI-Generated Content and Outputs</h2>
              <p>
                ClipAura uses third-party AI models (including Groq) to generate captions, transcriptions, and
                other outputs. AI-generated content may contain errors, inaccuracies, or unintended outputs.
                We do not guarantee the accuracy, completeness, or fitness for purpose of any AI-generated output.
              </p>
              <p>
                You are solely responsible for reviewing and validating all AI-generated outputs before use or
                publication. You acknowledge that AI models may occasionally produce content that requires
                human review. We disclaim all liability for decisions made or actions taken based on
                AI-generated content.
              </p>
              <p>
                You retain all ownership rights to your original uploaded content. You grant ClipAura a limited,
                non-exclusive license to process your content solely for the purpose of providing the Service
                (rendering, captioning, transcription). We do not claim ownership over your outputs.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">6. Intellectual Property</h2>
              <p>
                The ClipAura platform, including its software, design, branding, logos, and documentation, is
                the exclusive intellectual property of ClipAura and its operator. All rights not expressly granted
                in these Terms are reserved. You may not copy, modify, or create derivative works of the Service
                without our prior written consent.
              </p>
              <p>
                You represent that you own or have the necessary rights and permissions to upload any content
                you submit to the Service. ClipAura is not responsible for verifying ownership or licensing of
                user-uploaded content.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">7. Account Suspension and Termination</h2>
              <p>
                We reserve the right to suspend or terminate your account at our sole discretion, with or without
                notice, for any violation of these Terms, including but not limited to: prohibited content uploads,
                abusive behavior, fraudulent activity, non-payment, or actions that may expose ClipAura to legal
                liability. Upon termination, your right to access the Service ceases immediately. We may retain
                certain data as required by law or for legitimate business purposes.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">8. Third-Party Services</h2>
              <p>
                The Service integrates with third-party platforms including Supabase, Razorpay, Groq, and Railway.
                We are not responsible for the availability, accuracy, or practices of these third-party services.
                Your use of third-party services is subject to their respective terms and policies.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">9. Disclaimers and Limitation of Liability</h2>
              <p>
                THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES
                OF ANY KIND, WHETHER EXPRESS OR IMPLIED. CLIPAURA DISCLAIMS ALL WARRANTIES INCLUDING
                MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CLIPAURA AND ITS OPERATOR SHALL NOT
                BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING
                LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING FROM YOUR USE OF THE SERVICE, EVEN IF
                ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>
              <p>
                OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM YOUR USE OF THE SERVICE SHALL NOT EXCEED
                THE AMOUNT YOU HAVE PAID TO US IN THE 12 MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">10. Indemnification</h2>
              <p>
                You agree to indemnify, defend, and hold harmless ClipAura, its operator Vaibhav Nareshbhai Pamnani,
                and its affiliates from any claims, damages, losses, or expenses (including legal fees) arising from
                your use of the Service, your violation of these Terms, or your infringement of any third-party rights.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">11. Governing Law and Disputes</h2>
              <p>
                These Terms are governed by the laws of India. Any disputes arising from these Terms or your use
                of the Service shall be subject to the exclusive jurisdiction of the courts in India. You agree to
                attempt informal resolution by contacting us at support@clipaura.com before initiating any formal
                legal proceedings.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">12. Refunds</h2>
              <p>
                Refund eligibility is governed by our Refund Policy, available at clipaura.com/refund-policy.
                Please review it before making any purchase.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">13. Contact</h2>
              <p>
                For questions about these Terms, contact us at:
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
