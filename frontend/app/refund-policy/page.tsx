import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Refund Policy - ClipAura",
  description: "ClipAura refund and cancellation policy. Understand your rights for subscription refunds and billing disputes.",
};

export default function RefundPolicyPage() {
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
          Refund Policy
        </h1>
        <p className="text-zinc-400 text-base mb-10">
          Effective Date: May 23, 2026
        </p>

        <div className="liquid-glass rounded-[22px] p-6 md:p-10 border-white/[0.07]">
          <div className="prose prose-invert prose-zinc max-w-none space-y-8 text-zinc-300 text-sm leading-relaxed">

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">1. Overview</h2>
              <p>
                ClipAura (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is operated by Vaibhav Nareshbhai Pamnani.
                This Refund Policy outlines the conditions under which refunds may be issued for subscriptions
                and credit pack purchases made through the ClipAura platform at clipaura.com.
              </p>
              <p>
                By making a purchase, you acknowledge that you have read and understood this policy.
                If you have questions, contact us at support@clipaura.com before completing any purchase.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">2. Subscription Refunds</h2>

              <h3 className="font-outfit font-semibold text-zinc-100 text-base mb-2">2.1 Monthly Subscriptions</h3>
              <p>
                Monthly subscription payments (PRO at $29/month, STUDIO at $69/month, AGENCY at $149/month)
                are generally <strong>non-refundable</strong>. Once a billing cycle has commenced and minutes
                have been allocated, refunds are not provided for that cycle.
              </p>

              <h3 className="font-outfit font-semibold text-zinc-100 text-base mb-2">2.2 Eligibility for Refund</h3>
              <p>
                We may, at our sole discretion, issue a refund in the following circumstances:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Billing Error:</strong> You were charged an incorrect amount or charged after cancellation</li>
                <li><strong>Service Unavailability:</strong> The Service was unavailable for a significant portion of your billing period due to platform issues on our end</li>
                <li><strong>Duplicate Charge:</strong> You were charged multiple times for the same billing period</li>
                <li><strong>Unauthorized Charge:</strong> A charge was made without your authorization</li>
              </ul>
              <p>
                Refund requests must be submitted within <strong>14 days</strong> of the charge date.
                Requests submitted after this period will not be considered.
              </p>

              <h3 className="font-outfit font-semibold text-zinc-100 text-base mb-2">2.3 What Is Not Refundable</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Subscription charges for billing periods where you actively used the Service</li>
                <li>Partial refunds for unused minutes within a paid billing cycle</li>
                <li>Refunds requested because you forgot to cancel before auto-renewal</li>
                <li>Charges incurred on an account that was shared or used by multiple people in violation of policy</li>
              </ul>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">3. Credit Pack Refunds</h2>
              <p>
                Credit packs ($15 for 60 minutes) are <strong>non-refundable</strong> once purchased, except
                in cases of:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Duplicate or erroneous charges</li>
                <li>Platform malfunction preventing credit pack delivery</li>
                <li>Unauthorized transactions verified through your payment provider</li>
              </ul>
              <p>
                Credit pack minutes do not expire and carry forward indefinitely, so refunds for unused
                credits are not provided.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">4. Failed Renderings and Service Issues</h2>
              <p>
                AI-powered video processing involves computationally intensive operations that may occasionally
                fail due to file format issues, corrupted input, API processing errors, or infrastructure
                disruptions. We do not issue refunds for individual failed rendering jobs. In the event of a
                rendering failure:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Minutes consumed by failed jobs are <strong>automatically credited back</strong> to your account</li>
                <li>You may retry the job at no additional minute cost (minutes already credited)</li>
                <li>If repeated failures occur for the same input, contact support for troubleshooting</li>
              </ul>
              <p>
                Refunds are not issued for dissatisfaction with AI-generated output quality, caption accuracy,
                or creative results. AI outputs are provided as-is, and human review is expected.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">5. Cancellation Policy</h2>
              <p>
                You may cancel your subscription at any time through your account dashboard or by contacting
                support@clipaura.com. Upon cancellation:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Your subscription remains active until the end of the current billing period</li>
                <li>You retain access to paid features including remaining minutes until period end</li>
                <li>No further charges will be made after cancellation</li>
                <li>Your account reverts to Trial-tier access at the start of the next billing period</li>
                <li>Uploaded content and job history are retained per our data retention policy</li>
              </ul>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">6. Billing Disputes and Chargebacks</h2>
              <p>
                If you believe a charge is incorrect, please contact us at support@clipaura.com before
                initiating a chargeback with your bank or payment provider. We will investigate and respond
                within 5 business days. Chargebacks initiated without first contacting us may result in
                immediate account suspension pending resolution.
              </p>
              <p>
                Fraudulent chargeback claims or abuse of the dispute process may result in permanent
                account termination.
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">7. Refund Processing</h2>
              <p>
                Approved refunds are processed through the original payment method (Razorpay) within
                <strong> 5 to 10 business days</strong> of approval. The time for the refund to appear
                in your account depends on your payment provider and may take additional processing time.
                Refunds are issued in the original currency of the transaction (USD).
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-bold text-white text-lg mb-3">8. Contact for Refund Requests</h2>
              <p>
                To request a refund or discuss a billing concern:
              </p>
              <p>
                <strong>Email:</strong> support@clipaura.com<br />
                <strong>Subject line:</strong> Refund Request - [Your Account Email]<br />
                <strong>Include:</strong> Date of charge, amount, last 4 digits of card used, and reason for request
              </p>
              <p>
                <strong>Operated by:</strong> Vaibhav Nareshbhai Pamnani<br />
                <strong>Website:</strong> clipaura.com
              </p>
              <p>
                We aim to respond to all refund inquiries within <strong>2 business days</strong>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
