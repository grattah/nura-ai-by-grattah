"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import Link from "next/link";

const page = () => {
  const router = useRouter();
  return (
    <div className="bg-background pb-12">
      <main className="px-6 pt-4">
        <div className="flex items-end justify-end">
          <button
            className="bg-[#E8E6DC] rounded-full size-10 flex justify-center items-center"
            onClick={() => router.back()}
          >
            <X size={24} />
          </button>
        </div>

        <p className="font-semibold text-base-text text-xl mt-[22px]">
          Washington Consumer Health Data Privacy Policy
        </p>

        <div className="flex flex-col gap-3 mt-8">
          <p className="font-medium text-sm text-subtle">
            Effective Date: August 5, 2026
          </p>
          <div className="py-4 px-3 rounded-2xl bg-[#E8E6DC] flex flex-col gap-4 font-medium text-base leading-5.75 text-[#333333E5]">
            <p>
              This Washington Consumer Health Data Privacy Policy (“Policy”)
              supplements the information in the{" "}
              <Link
                href="/terms-and-privacy"
                className="text-info-c400 underline"
              >
                Nuko Privacy Policy.
              </Link>
            </p>
            <p>
              It applies solely to Washington consumers who interact with us in
              an individual or household capacity and applies only to personal
              information defined as “consumer health data” under the Washington
              My Health My Data Act. Capitalized terms that are not defined here
              have the same meaning as in the Nuko Privacy Policy.{" "}
            </p>
            <p>
              This Policy describes what consumer health data we collect, how we
              collect and use it, who we disclose it to and why, and the choices
              you may have regarding our use or disclosure of your consumer
              health data.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xl text-mint-green font-semibold leading-[28px]">
                1. Categories of Consumer Health Data We Collect
              </p>
              <p className="text-subtle font-medium text-base leading-5.75">
                We may collect or receive the categories of consumer health data
                listed below.
              </p>
            </div>

            <p className="font-medium text-subtle leading-5.75 text-base">
              <span className="text-base-text font-semibold">
                Health and wellness information submitted as part of your
                account
              </span>{" "}
              , including health goals (e.g., Sleep, Detox, Fitness) and
              personalization preferences.
            </p>

            <p className="font-medium text-subtle leading-5.75 text-base">
              <span className="text-base-text font-semibold">
                Dietary and ingredient data, including:
              </span>{" "}
              Dietary habits and dietary restrictions; Allergen flags and food
              sensitivities you provide; Medications or supplements you disclose
              for the purpose of receiving ingredient- interaction warnings
              (e.g., grapefruit/CYP3A4, warfarin, matcha-atorvastatin
              interactions); Recipes viewed, saved, searched, or rated, and the
              health categories you browse.
            </p>

            <p className="font-medium text-subtle leading-5.75 text-base">
              <span className="text-base-text font-semibold">
                Bioactivity and nutrition scoring data
              </span>{" "}
              , including your Recipe Match Score results, Bioactivity Scoring
              interactions, and Base Nutrition Score (Nutri-Score/NOVA-aligned)
              preferences generated from your activity and stated goals.
            </p>

            <p className="font-medium text-subtle leading-5.75 text-base">
              <span className="text-base-text font-semibold">
                Survey and questionnaire responses
              </span>{" "}
              you submit (if you choose to participate in our research),
              including demographic and health information, if you choose to
              share it.
            </p>

            <p className="font-medium text-subtle leading-5.75 text-base">
              <span className="text-base-text font-semibold">
                Profile information that includes health data
              </span>{" "}
              , such as demographic information, age, gender, image or photo,
              etc. from your Nuko account profile, which we may combinewith any
              personal information or other data we have collected.
            </p>

            <p className="font-medium text-subtle leading-5.75 text-base">
              <span className="text-base-text font-semibold">
                Health data from third-party applications and wearable devices
              </span>{" "}
              you may choose to connect with your Nuko account, subject to the
              permissions you set on those third- party applications and devices
              (“Connected Health Device Data”), if this feature is offered.
            </p>

            <p className="font-medium text-subtle leading-5.75 text-base">
              <span className="text-base-text font-semibold">
                Other similar information, as may be requested
              </span>{" "}
              by us, that is specific to the relevant products or Services you
              engage with.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xl text-mint-green font-semibold leading-[28px]">
                2. Categories of Sources From Which We Collect Consumer Health
                Data
              </p>
              <p className="text-subtle font-medium text-base leading-5.75">
                We may obtain consumer health data from different sources, as
                described in the Information We Collect About You section of the{" "}
                <Link
                  href="/terms-and-privacy"
                  className="text-info-c400 underline"
                >
                  Nuko Privacy Policy.
                </Link>{" "}
                With respect to consumer health data, we collect that from the
                following sources:
              </p>
            </div>
            <ul className="list-disc pl-6 font-medium text-subtle leading-5.75 text-base">
              <li>Provided directly by you;</li>
              <li>
                Collected from a device associated with you or a third-party
                application you have authorized to share information with us;
              </li>
              <li>
                Collected from your interactions with our apps, Services, and
                platforms;
              </li>
              <li>
                Received from third parties such as other Nuko users, business
                partners, analytics providers, operating systems, public
                databases, and service providers.
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xl text-mint-green font-semibold leading-[28px]">
              3. Purposes for Collecting Your Consumer Health Data
            </p>
            <ul className="list-disc pl-6 font-medium text-subtle leading-5.75 text-base">
              <li>
                We may collect and use consumer health data for one or more of
                the following purposes:
              </li>
              <li>
                Provide, administer, personalize, manage, develop, improve,
                repair, and maintain our products and Services, including
                generating your Bioactivity Score, Base Nutrition
              </li>
              <li>Score, and Recipe Match Score;</li>
              <li>
                Deliver ingredient-safety and medication-interaction warnings
                relevant to you;
              </li>
              <li>
                Communicate with you, including to respond to your questions and
                requests, request feedback, and send administrative information
                about your account;
              </li>
              <li>
                Ask you to complete surveys and questionnaires and help us
                understand how Nuko users access and use the Services, for
                research and analytics purposes;Combine the information
                collected, including from third-party applications and services,
                with other information about you or the Nuko community;
              </li>
              <li>
                Where we have your consent, such as pursuant to your
                participation in a study, research, or other program;
              </li>
              <li>
                De-identify, tokenize, or aggregate your information, or create
                or derive datasets, consistent with the purposes for which the
                information was collected and Nuko’s mission;
              </li>
              <li>
                Personalize, advertise, and market our products and Services to
                you;
              </li>
              <li>
                Generate inferences about you, such as your interests or
                preferences; and
              </li>
              <li>Comply with our legal obligations and internal policies.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-xl text-mint-green font-semibold leading-[28px]">
              4. Sharing of Consumer Health Data
            </p>
            <div className="text-base font-medium leading-5.75 text-subtle">
              <p className="font-semibold text-base-text">
                a. Categories of Consumer Health Data That is Shared
              </p>
              <p>
                We may share each of the categories of consumer health data
                described above. In particular, we may share personal data,
                including consumer health data, with your consent, to complete
                transactions or provide products or services you have requested,
                and for the purposes described in this Policy.
              </p>
            </div>
            <div className="text-base font-medium leading-5.75 text-subtle">
              <p className="font-semibold text-base-text">
                b. Categories of Third Parties with Whom Consumer Health Data is
                Shared
              </p>
              <p>
                We may share consumer health data with business partners such as
                those providing hosting, analytics, and technology services,
                governmental agencies and legal bodies where required by law,
                and purchasers of or successors to our business or assets. We do
                not sell consumer health data.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-xl text-mint-green font-semibold leading-[28px]">
              5. Your Washington Consumer Health Data Rights
            </p>
            <p className="text-base font-medium leading-5.75 text-subtle">
              Washington residents have the right to (1) request access to their
              consumer health data; (2) confirm whether we have disclosed or
              sold their consumer health data; (3) delete their consumer health
              data; or (4) withdraw their consent or authorization relating to
              such data. You can submit these requests to{" "}
              <Link href="" className="text-info-c400 underline">
                privacy@nuko.health.
              </Link>
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-xl text-mint-green font-semibold leading-[28px]">
              6. How To Submit an Appeal
            </p>
            <p className="text-base font-medium leading-5.75 text-subtle">
              To appeal our decision on your Washington Consumer Health Data
              Rights request, you may contact us using the contact information
              listed below or by emailing us at{" "}
              <Link href="" className="text-info-c400 underline">
                privacy@nuko.health.
              </Link>{" "}
              In submitting your appeal, please enclose a copy of or otherwise
              specifically reference our decision on your data subject request,
              so that we may adequately review and address it. We will respond
              in accordance with applicable law.
            </p>
          </div>

          <div>
            <p className="text-xl text-mint-green font-semibold leading-[28px]">
              7. Contact Us
            </p>
            <p className="text-base font-medium leading-5.75 text-subtle">
              For any questions, complaints, or inquiries regarding this Policy,
              or our privacy practices, please contact us at:
            </p>
            <p className="text-base font-medium leading-5.75 text-subtle">
              Nuko, LLC
            </p>
            <p className="text-base font-medium leading-5.75 text-subtle">
              ATTN: Nuko, LLC, Privacy/Legal
            </p>
            <p className="text-base font-medium leading-5.75 text-subtle">
              131 Continental Dr, Suite 305
            </p>
            <p className="text-base font-medium leading-5.75 text-subtle">
              Newark, DE 19713
            </p>
            <Link href="" className="text-info-c400 underline">
              privacy@nuko.health.
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default page;
