"use client";

import React from "react";
import { SendHorizontal, Loader2 } from "lucide-react";
import { addComment } from "@/actions/add-comment";

interface ReplyTarget {
  parentId: string;
  username: string;
}

interface CommentFormProps {
  recipeId: string;
  variant?: "compact" | "full";
  replyingTo?: ReplyTarget | null;
  onCancelReply?: () => void;
}

const CommentForm = ({
  recipeId,
  variant = "compact",
  replyingTo,
  onCancelReply,
}: CommentFormProps) => {
  const [value, setValue] = React.useState("");
  const formRef = React.useRef<HTMLFormElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [state, submitAction, isPending] = React.useActionState(
    async (prevState: any, formData: FormData) => {
      const result = await addComment(recipeId, formData, replyingTo?.parentId);
      if (result.success && onCancelReply) {
        onCancelReply();
      }
      return result;
    },
    null,
  );

  React.useEffect(() => {
    if (state?.success) {
      setValue("");
    }
  }, [state]);

  React.useEffect(() => {
    if (replyingTo) {
      setValue(`@${replyingTo.username} `);
      inputRef.current?.focus();
    } else {
      setValue("");
    }
  }, [replyingTo]);

  React.useEffect(() => {
    if (!replyingTo) return; // only listen while in reply mode

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-reply-trigger]")) return;

      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        const prefix = `@${replyingTo.username} `;
        const current = value.trim();
        if (current === "" || current === prefix.trim()) {
          onCancelReply?.();
        }
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [replyingTo, onCancelReply, value]);

  const placeholder = replyingTo
    ? `Reply to @${replyingTo.username}`
    : "Add a comment...";

  if (variant === "full") {
    return (
      <form ref={formRef} action={submitAction} className="flex-1">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            name="comment"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            disabled={isPending}
            className="bg-[#FFFFFF] pl-5 pr-14 py-4 text-[#57605E] text-sm rounded-full w-full outline-0 disabled:opacity-50 placeholder:text-subtle placeholder:text-sm"
          />
          <button
            type="submit"
            disabled={isPending}
            className={`bg-mint-green p-2 rounded-full absolute top-1.5 right-2 disabled:opacity-50 ${
 value.trim().length === 0 && "opacity-70"
 }`}
          >
            {isPending ? (
              <Loader2 size={24} color="#FFFFFF" className="animate-spin" />
            ) : (
              <SendHorizontal size={24} color="#FFFFFF" />
            )}
          </button>
        </div>
        {state?.error && (
          <p className="text-sm text-red-500 mt-2">{state.error}</p>
        )}
      </form>
    );
  }

  // Default compact variant (what you had before)
  return (
    <form ref={formRef} action={submitAction}>
      <div className="relative">
        <input
          ref={inputRef}
          name="comment"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a Comment..."
          disabled={isPending}
          className="w-full text-left rounded-full bg-[#F2F3F3] px-5 py-4 text-[#57605E] text-sm outline-0"
        />
        {isPending && (
          <Loader2
            size={20}
            className="animate-spin absolute top-1/2 right-4 -translate-y-1/2 text-[#57605E]"
          />
        )}
      </div>
      {state?.error && (
        <p className="text-sm text-red-500 mt-2">{state.error}</p>
      )}
    </form>
  );
};

export default CommentForm;
