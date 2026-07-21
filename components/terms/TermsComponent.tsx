import React from "react";

const TermsComponent = () => {
  return (
    <div className="flex flex-col gap-6 mt-5 pb-10">
      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>1.</p>
          <p>Use of Nuko Health</p>
        </div>
        <div className="font-medium text-base text-subtle flex flex-col gap-3 leading-5.75">
          <p>
            Nuko Health provides nutrition, wellness, recipe, and health-related
            tools to support healthier lifestyle choices.
          </p>
          <p>You must be at least 13 years old to use Nuko Health.</p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>2.</p>
          <p>Account Registration</p>
        </div>
        <div className="font-medium text-base text-subtle flex flex-col gap-3 leading-5.75">
          <p>
            Provide accurate information, keep account credentials secure, and
            remain responsible for activity under your account.
          </p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>3.</p>
          <p>Subscriptions & Payments</p>
        </div>
        <div className="font-medium text-base text-subtle flex flex-col gap-3 leading-5.75">
          <p>Payments are securely processed through Stripe and Square.</p>
          <p>
            Subscription fees may recur, pricing may change, and users are
            responsible for managing cancellations.
          </p>
          <p>
            Unless required by law, subscription fees are generally
            non-refundable.
          </p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>4.</p>
          <p>Acceptable Use</p>
        </div>
        <div className="font-medium text-base text-subtle flex flex-col gap-3 leading-5.75">
          <p>
            Do not misuse the platform, gain unauthorized access, copy content
            without permission, upload malicious content, or use the service
            unlawfully.
          </p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>5.</p>
          <p>Health Disclaimer</p>
        </div>
        <div className="font-medium text-base text-subtle flex flex-col gap-3 leading-5.75">
          <p>
            Nuko Health provides informational wellness and nutrition content
            only and does not replace medical advice.
          </p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>6.</p>
          <p>Intellectual Property</p>
        </div>
        <div className="font-medium text-base text-subtle flex flex-col gap-3 leading-5.75">
          <p>
            All branding, content, software, and materials are owned by or
            licensed to Nuko Health.
          </p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>7.</p>
          <p>Service Availability</p>
        </div>
        <div className="font-medium text-base text-subtle flex flex-col gap-3 leading-5.75">
          <p>
            We may update, modify, suspend, or discontinue features at any time.
          </p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>8.</p>
          <p>Limitation of Liability</p>
        </div>
        <div className="font-medium text-base text-subtle flex flex-col gap-3 leading-5.75">
          <p>
            Use of Nuko Health is at your own risk. We are not liable for
            indirect or consequential damages.
          </p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>9.</p>
          <p>Changes to These Terms</p>
        </div>
        <div className="font-medium text-base text-subtle flex flex-col gap-3 leading-5.75">
          <p>We may update these Terms and post updates on the platform.</p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>10.</p>
          <p>Contact Us</p>
        </div>
        <div className="font-medium text-base text-subtle flex flex-col gap-3 leading-5.75">
          <p>support@nukohealth.app</p>
        </div>
      </div>
    </div>
  );
};

export default TermsComponent;
