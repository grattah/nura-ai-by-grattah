"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, CircleAlert } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { scheduleAccountDeletion } from "@/actions/delete-account";
import { DELETION_GRACE_DAYS } from "@/lib/account-deletion";
import { lockAppScroll } from "@/lib/scroll-lock";

function ConfirmModal({
  onConfirm,
  onClose,
  pending,
  error,
}: {
  onConfirm: () => void;
  onClose: () => void;
  pending: boolean;
  error: string | null;
}) {
  useEffect(() => {
    return lockAppScroll();
  }, []);

  return (
    <div
      className="fixed inset-0 h-dvh z-50 flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute h-dvh inset-0 bg-black/20 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative w-full max-w-95.5 px-6 pt-8 pb-8 gap-5 bg-white rounded-2xl flex flex-col items-center text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 size-8 rounded-full bg-grey-c100 flex items-center justify-center hover:opacity-75 transition-opacity"
        >
          <X className="size-4.5 text-base-text" />
        </button>

        <div className="rounded-full size-12 grid place-items-center bg-[#DC23231A] p-2.5">
          <CircleAlert className="size-6 text-[#DC2323]" />
        </div>

        <div className="flex flex-col gap-3">
          <p
            id="delete-account-title"
            className="text-title font-semibold text-base-text leading-tight"
          >
            Delete your account?
          </p>
          <p className="text-base text-subtle">
            Your account will be scheduled for deletion but you have{" "}
            {DELETION_GRACE_DAYS} days to recover it by signing in.
          </p>
          <p className="text-base text-subtle">
            If you don&apos;t, your subscription will be cancelled and your
            account will be permanently deleted.
          </p>
        </div>

        {error && <p className="text-sm text-[#DC2323]">{error}</p>}

        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="flex-1 py-3.75 rounded-full bg-[#DC2323] text-white text-base font-medium disabled:opacity-60 hover:opacity-90 transition-opacity"
          >
            {pending ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex-1 py-3.75 rounded-full border border-[#E2E4E4] bg-white text-base font-medium text-base-text disabled:opacity-60 hover:opacity-75 transition-opacity"
          >
            No, cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (pending) return;
    setPending(true);
    setError(null);

    const result = await scheduleAccountDeletion();

    if ("error" in result) {
      setError(result.error);
      setPending(false);
      return;
    }

    // The action cleared the server session; clear the browser's copy too, the
    // same way LogoutButton does, so no stale token lingers in localStorage.
    try {
      await createClient().auth.signOut();
    } catch {
      // ignore — the server session is already gone
    }

    // Land on home, where the query param raises the "Scheduled for deletion"
    // modal over the now signed-out page.
    router.replace("/?deletion=scheduled");
    router.refresh();
  };

  return (
    <>
      <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="text-base font-semibold text-[#DC2323] hover:opacity-75 transition-opacity"
        >
          Delete account
        </button>
      </div>

      {open && (
        <ConfirmModal
          onConfirm={handleConfirm}
          onClose={() => !pending && setOpen(false)}
          pending={pending}
          error={error}
        />
      )}
    </>
  );
}
