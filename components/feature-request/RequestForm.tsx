"use client";

import { useState } from "react";
import { Mail, Clock } from "lucide-react";
import { IoPersonOutline } from "react-icons/io5";

import BackButton from "@/components/back-button";
import { FeedbackMessage } from "@/components/help-and-guidance/FeedbackMessage";
import SuccessModal from "../SuccessModal";
import { isValidEmail } from "@/lib/utils";
import { SUPPORT_EMAIL } from "@/lib/email/config";
import WriteIcon from "../vectors/write-icon";

const RequestForm = ({
  email,
  fullname,
}: {
  email: string;
  fullname: string;
}) => {
  const [message, setMessage] = useState("");
  const [fullName, setFullName] = useState(fullname);
  const [success, setSuccess] = useState(false);

  const canSubmit = fullName.trim() && isValidEmail(email) && message.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setSuccess(false);
      const subject = `New enquiry from ${fullName}`;
      const body = `Name: ${fullName}\nEmail: ${email}\n\n${message}`;

      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
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
              Feature request
            </h1>
          </div>
          <div className="size-10 shrink-0" aria-hidden />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <label className="text-subtle text-sm font-medium">
              Is there a feature you’d like to see?
            </label>
            <FeedbackMessage
              value={message}
              onChange={setMessage}
              placeholder="Tell us what you’d love to see..."
              icon={<WriteIcon />}
            />
          </div>

          <div className="flex flex-col gap-2.25 justify-center mt-4">
            <button
              disabled={!canSubmit}
              type="submit"
              className="py-4 disabled:opacity-50 rounded-full bg-mint-green text-white"
            >
              Submit request
            </button>
          </div>
        </form>
      </main>
      {success && (
        <SuccessModal
          message="Request submitted!"
          subtitle=""
          onClose={() => setSuccess(false)}
        />
      )}
    </div>
  );
};

export default RequestForm;
