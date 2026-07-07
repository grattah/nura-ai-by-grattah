import { Sparkles } from "lucide-react";

/**
 * Full-screen "Preparing your answer…" loader. Shown over the (blurred) current
 * page while a personalized search is being prepared — during navigation from
 * home and while the result streams in.
 */
export function SearchLoading({
  title = "Preparing your answer...",
  message = "Please hold on while we find the best answer for you",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 h-svh flex items-center justify-center px-8">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        role="status"
        aria-live="polite"
        className="relative w-full max-w-sm rounded-3xl bg-white px-8 py-10 flex flex-col items-center text-center gap-6 shadow-xl"
      >
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg
            className="absolute inset-0 animate-spin"
            viewBox="0 0 100 100"
            style={{ animationDuration: "1.5s" }}
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#227B6F"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="100 283"
            />
          </svg>
          <div className="w-20 h-20 rounded-full bg-linear-to-b from-[#F3EBD3] to-[#F8F5EE] flex items-center justify-center">
            <Sparkles size={28} color="#227B6F" strokeWidth={2} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-[#333333]">{title}</h2>
          <p className="text-subtle max-w-xs text-center">{message}</p>
        </div>
      </div>
    </div>
  );
}
