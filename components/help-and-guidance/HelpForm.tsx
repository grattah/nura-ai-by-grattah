"use client";

import { useState } from "react";
import { Mail, Clock } from "lucide-react";
import { IoPersonOutline } from "react-icons/io5";

import BackButton from "@/components/back-button";
import { FeedbackMessage } from "@/components/help-and-guidance/FeedbackMessage";
import SuccessModal from "../SuccessModal";
import { isValidEmail } from "@/lib/utils";

const HelpForm = ({ email, fullname }: { email: string; fullname: string }) => {
  const [message, setMessage] = useState("");
  const [fullName, setFullName] = useState(fullname);
  const [success, setSuccess] = useState(false);

  const CONTACT_EMAIL = process.env.SUPPORT_EMAIL!;

  const canSubmit = fullName.trim() && isValidEmail(email) && message.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setSuccess(false);
      const subject = `New enquiry from ${fullName}`;
      const body = `Name: ${fullName}\nEmail: ${email}\n\n${message}`;

      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
        subject,
      )}&body=${encodeURIComponent(body)}`;
      setSuccess(true);
    } catch (error) {
    } finally {
      setSuccess(false);
    }
  };

  return (
    <div className="bg-background pb-10">
      <main className="px-6">
        <div className="flex items-center pt-5 pb-4 justify-between mb-2.5">
          <BackButton className="p-3 rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity" />
          <div className="flex flex-col gap-1.75 items-center justify-center">
            <h1 className="text-center text-xl font-semibold text-base-text">
              Help and guidance
            </h1>
            <p className="text-subtle text-center text-sm font-medium">
              Submit your feedback
            </p>
          </div>
          <div className="size-10 shrink-0" aria-hidden />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-subtle text-sm font-medium">
                Your email address
              </label>
              <div className="relative w-full">
                <input
                  type="text"
                  className="font-medium text-[13px] bg-[#E8E6DC] pl-9 pr-3 py-3.5 w-full rounded-lg"
                  value={email || ""}
                  readOnly
                />
                <Mail
                  color="#57605E"
                  size={16}
                  className="absolute top-4 left-3"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-subtle text-sm font-medium">
                Your full name
              </label>
              <div className="relative w-full">
                <input
                  type="text"
                  className="text-[#1B1D1D] text-[13px] bg-white pl-9 pr-3 py-3.5 w-full rounded-lg"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <IoPersonOutline
                  color="#57605E"
                  size={16}
                  className="absolute top-4 left-3"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-subtle text-sm font-medium">
                Your message
              </label>
              <FeedbackMessage value={message} onChange={setMessage} />
            </div>
          </div>
          <div className="flex flex-col gap-2.25 justify-center mt-4">
            <button
              type="submit"
              className="py-4 rounded-full bg-mint-green text-white"
            >
              Submit feedback
            </button>
            <p className="text-sm text-subtle flex gap-0.75 items-center justify-center">
              <Clock size={12} color="#82A198" strokeWidth={1.5} />
              <span>Usually responds within 12 hours</span>
            </p>
          </div>
        </form>
      </main>
      {success && (
        <SuccessModal
          message="Feedback submitted!"
          subtitle="We will make sure to respond within 12 hours. Thanks!"
          onClose={() => setSuccess(false)}
        />
      )}
    </div>
  );
};

export default HelpForm;
