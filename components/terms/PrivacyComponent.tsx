import React from "react";

const PrivacyComponent = () => {
  return (
    <div className="flex flex-col gap-6 mt-5">
      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>1.</p>
          <p>Information We Collect</p>
        </div>
        <div className="flex flex-col gap-4">
          <p className="font-medium text-subtle max-[400px]:text-sm">
            <span className="text-[#1B1D1D]">Account Information:</span> Name,
            email address, and profile information.
          </p>

          <p className="font-medium text-subtle max-[400px]:text-sm">
            <span className="text-[#1B1D1D]">
              Health & Preference Information:
            </span>{" "}
            Dietary preferences, recipe preferences, saved recipes and
            favourites, nutrition and wellness preferences, and app settings.
          </p>

          <p className="font-medium text-subtle max-[400px]:text-sm">
            <span className="text-[#1B1D1D]">Usage Information:</span> Searches
            performed, recipes viewed or saved, features used, and website
            interactions.
          </p>

          <p className="font-medium text-subtle max-[400px]:text-sm">
            <span className="text-[#1B1D1D]">
              Subscription & Payment Information:
            </span>{" "}
            Payments are securely handled through Stripe and Square. We do not
            store your card details.
          </p>

          <p className="font-medium text-subtle max-[400px]:text-sm">
            <span className="text-[#1B1D1D]">Technical Information:</span>{" "}
            Browser type, device information, IP address, operating system,
            analytics, and performance logs.
          </p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>2.</p>
          <p>How We Use Your Information</p>
        </div>
        <ul className="list-disc px-6 max-xs:px-4">
          <li className="font-medium max-[400px]:text-sm text-subtle">
            Personalize recipes and recommendations
          </li>
          <li className="font-medium max-[400px]:text-sm text-subtle">
            Improve your experience on Nuko Health
          </li>
          <li className="font-medium max-[400px]:text-sm text-subtle">
            Save preferences and favourites
          </li>
          <li className="font-medium max-[400px]:text-sm text-subtle">
            Provide customer support
          </li>
          <li className="font-medium max-[400px]:text-sm text-subtle">
            Process subscriptions and payments
          </li>
          <li className="font-medium max-[400px]:text-sm text-subtle">
            Improve platform functionality and performance
          </li>
          <li className="font-medium max-[400px]:text-sm text-subtle">
            Send important service-related communications
          </li>
        </ul>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>3.</p>
          <p>Third-Party Services</p>
        </div>
        <div className="font-medium max-[400px]:text-sm text-subtle flex flex-col gap-3">
          <p>
            Supabase for authentication, database management, and secure
            storage.
          </p>
          <p>Stripe & Square for secure payment processing.</p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>4.</p>
          <p>Sharing of Information</p>
        </div>
        <div className="font-medium max-[400px]:text-sm text-subtle flex flex-col gap-3">
          <p>
            We do not sell your personal information. Limited information may be
            shared with trusted providers necessary to operate the platform.
          </p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>5.</p>
          <p>Data Security</p>
        </div>
        <div className="font-medium max-[400px]:text-sm text-subtle flex flex-col gap-3">
          <p>
            We take reasonable measures to protect your information, though no
            online platform can guarantee complete security.
          </p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>6.</p>
          <p>Your Rights</p>
        </div>
        <div className="font-medium max-[400px]:text-sm text-subtle flex flex-col gap-3">
          <p>
            You may update your account, request account or data deletion, and
            contact us regarding privacy concerns at support@nukohealth.app.
          </p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>7.</p>
          <p>Children’s Privacy</p>
        </div>
        <div className="font-medium max-[400px]:text-sm text-subtle flex flex-col gap-3">
          <p>Nuko Health is not intended for children under 13.</p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>8.</p>
          <p>Changes to This Privacy Policy</p>
        </div>
        <div className="font-medium max-[400px]:text-sm text-subtle flex flex-col gap-3">
          <p>We may update this policy and post changes on the platform.</p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>9.</p>
          <p>Contact Us</p>
        </div>
        <div className="font-medium max-[400px]:text-sm text-subtle flex flex-col gap-3">
          <p>support@nukohealth.app</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyComponent;
