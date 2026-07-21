import React from "react";

const PrivacyComponent = () => {
  return (
    <div className="flex flex-col gap-6 mt-5">
      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>1.</p>
          <p>Information We Collect</p>
        </div>
        <div className="flex flex-col gap-3">
          <p className="font-medium text-subtle text-base leading-5.75">
            <span className="text-[#1B1D1D]">Account Information:</span> Name,
            email address, and profile information.
          </p>

          <p className="font-medium text-subtle text-base leading-5.75">
            <span className="text-[#1B1D1D]">
              Health & Wellness Information:
            </span>{" "}
            To personalize your recipe recommendations and help identify
            ingredients that may not be suitable for you, we collect information
            you choose to provide about your health profile, including: age
            range, biological sex, pregnancy/breastfeeding status, health goals,
            existing health conditions (e.g. diabetes, high blood pressure,
            digestive conditions), food allergies and intolerances, medications
            and supplements you take, and dietary patterns. Providing this
            information is optional, except for basic profile information
            required to use the app.
          </p>

          <p className="font-medium text-subtle text-base leading-5.75">
            <span className="text-[#1B1D1D]">Usage Information:</span> Searches
            performed, recipes viewed or saved, features used, and website
            interactions.
          </p>

          <p className="font-medium text-subtle text-base leading-5.75">
            <span className="text-[#1B1D1D]">
              Subscription & Payment Information:
            </span>{" "}
            Payments are securely handled through Stripe and Square. We do not
            store your card details.
          </p>

          <p className="font-medium text-subtle text-base leading-5.75">
            <span className="text-[#1B1D1D]">Technical Information:</span>{" "}
            Browser type, device information, IP address, operating system,
            analytics, and performance logs.
          </p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>1a.</p>
          <p>Consumer Health Data</p>
        </div>
        <div className="flex flex-col gap-3">
          <p className="font-medium text-base text-subtle leading-5.75">
            Some of the information described above (health conditions,
            allergies, medications) may be considered "consumer health data"
            under applicable state privacy laws (such as Washington's My Health
            My Data Act).
          </p>
          <p className="font-medium text-base text-subtle leading-5.75">
            For this category of information specifically:
          </p>
          <ul className="list-disc px-6 leading-5.75">
            <li className="font-medium text-base text-subtle">
              We collect it only with your explicit, separate consent, obtained
              before you complete your health profile.
            </li>
            <li className="font-medium text-base text-subtle">
              We do not sell this information, and do not share it with third
              parties for advertising purposes.
            </li>
            <li className="font-medium text-base text-subtle">
              You may withdraw your consent and delete this information at any
              time from Settings, separately from deleting your overall account.
            </li>
            <li className="font-medium text-base text-subtle">
              Your health profile remains saved for as long as your account is
              active — you do not need to re-enter it. If you request deletion
              of this information or your account, it is permanently removed
              from our active systems within 30 days.
            </li>
          </ul>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>2.</p>
          <p>How We Use Your Information</p>
        </div>
        <ul className="list-disc px-6 leading-5.75">
          <li className="font-medium text-base text-subtle">
            Personalize recipes and recommendations
          </li>
          <li className="font-medium text-base text-subtle">
            Improve your experience on Nuko Health
          </li>
          <li className="font-medium text-base text-subtle">
            Save preferences and favourites
          </li>
          <li className="font-medium text-base text-subtle">
            Provide customer support
          </li>
          <li className="font-medium text-base text-subtle">
            Process subscriptions and payments
          </li>
          <li className="font-medium text-base text-subtle">
            Improve platform functionality and performance
          </li>
          <li className="font-medium text-base text-subtle">
            Send important service-related communications
          </li>
        </ul>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>3.</p>
          <p>Third-Party Services</p>
        </div>
        <div className="font-medium text-base text-subtle flex flex-col gap-3 leading-5.75">
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
        <div className="font-medium text-base text-subtle flex flex-col gap-3 leading-5.75">
          <p>
            We do not sell your personal information. Limited information may be
            shared with trusted providers necessary to operate the platform.
          </p>
          <p>
            Health profile information (conditions, allergies, medications) is
            used solely to power in-app features such as ingredient warnings and
            score personalization. It is not shared with Stripe, Square, or any
            payment or advertising provider, and is not used for any purpose
            beyond the personalization features described in this policy.
          </p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>5.</p>
          <p>Data Security</p>
        </div>
        <div className="font-medium text-base text-subtle flex flex-col gap-3 leading-5.75">
          <p>
            We take reasonable measures to protect your information, though no
            online platform can guarantee complete security. Health profile
            information specifically is encrypted at rest and stored separately
            from general account and usage data, with access restricted to
            systems necessary to deliver personalization features.
          </p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>6.</p>
          <p>Your Rights</p>
        </div>
        <div className="font-medium text-base text-subtle flex flex-col gap-3 leading-5.75">
          <p>
            You may update your account, request account or data deletion, and
            contact us regarding privacy concerns at support@nukohealth.app.
          </p>
          <p>
            For health profile information specifically, you may withdraw
            consent and delete this data independently of your general account,
            at any time, from Settings. California residents may also have the
            right to limit the use of sensitive personal information under the
            CCPA; contact us at support@nukohealth.app to exercise this right.
          </p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>7.</p>
          <p>Children’s Privacy</p>
        </div>
        <div className="font-medium text-base text-subtle flex flex-col gap-3 leading-5.75">
          <p>Nuko Health is not intended for children under 13.</p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>8.</p>
          <p>Changes to This Privacy Policy</p>
        </div>
        <div className="font-medium text-base text-subtle flex flex-col gap-3 leading-5.75">
          <p>We may update this policy and post changes on the platform.</p>
        </div>
      </div>

      <div>
        <div className="flex gap-1 items-center font-semibold text-xl text-mint-green">
          <p>9.</p>
          <p>Contact Us</p>
        </div>
        <div className="font-medium text-base text-subtle flex flex-col gap-3 leading-5.75">
          <p>support@nukohealth.app</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyComponent;
