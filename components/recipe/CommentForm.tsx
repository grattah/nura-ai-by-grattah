"use client";

import React from "react";
import { SendHorizontal } from "lucide-react";
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
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [state, submitAction, isPending] = React.useActionState(
    async (prevState: any, formData: FormData) => {
      const result = await addComment(recipeId, formData, replyingTo?.parentId);
      if (result.success && onCancelReply) {
        onCancelReply();
      }
      return result;
    },
    null
  );

  React.useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.value = `@${replyingTo.username} `;
      // Place cursor at the end
      inputRef.current.setSelectionRange(
        inputRef.current.value.length,
        inputRef.current.value.length
      );
    }
  }, [replyingTo]);

  const placeholder = replyingTo
    ? `Reply to @${replyingTo.username}`
    : "Add a comment...";

  if (variant === "full") {
    return (
      <form action={submitAction} className="flex-1">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            name="comment"
            placeholder={placeholder}
            disabled={isPending}
            className="bg-[#FFFFFF] pl-5 pr-14 py-4 text-[#57605E] text-sm rounded-full w-full outline-0 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isPending}
            className={`bg-mint-green p-2 rounded-full absolute top-1.5 right-2 disabled:opacity-50 ${isPending && "opacity-40"}`}
          >
            <SendHorizontal size={24} color="#FFFFFF" />
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
    <form action={submitAction}>
      <input
        ref={inputRef}
        name="comment"
        placeholder="Add a Comment..."
        disabled={isPending}
        className="w-full text-left rounded-full bg-[#F2F3F3] px-5 py-4 text-[#57605E] text-sm outline-0"
      />
      {state?.error && (
        <p className="text-sm text-red-500 mt-2">{state.error}</p>
      )}
    </form>
  );
};

export default CommentForm;
