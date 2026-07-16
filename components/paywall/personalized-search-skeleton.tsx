import Image from "next/image";
import { Info, Heart } from "lucide-react";

/**
 * Blurred placeholder that mirrors a real wellness-support result. Rendered
 * behind the sign-in modal (guests) and the "Upgrade to Nuko+" lock overlay
 * (out-of-uses) so those screens show realistic content rather than a blank page.
 */
export function PersonalizedSearchSkeleton() {
  return (
    <div
      aria-hidden
      className="pointer-events-none select-none blur-[6px] opacity-70"
    >
      <div className="px-6 pt-5 pb-4 text-center space-y-1.75">
        <p className="text-xl font-semibold text-base-text leading-none">
          Wellness support 🌿
        </p>
        <p className="text-sm text-subtle font-medium leading-none">
          Personalized for you
        </p>
      </div>

      <div className="px-6 space-y-10">
        <div className="space-y-4">
          {/* Query row */}
          <div className="bg-white rounded-2xl p-4 border border-[#E3E1D880] flex items-center gap-3">
            <span className="text-xl">🌿</span>
            <div className="space-y-1 flex-1">
              <p className="text-sm text-muted-foreground">You shared:</p>
              <div className="h-3.5 w-3/4 rounded bg-grey-c200" />
            </div>
          </div>

          {/* AI summary */}
          <div className="bg-white rounded-2xl border-[#E3E1D880] p-4 flex gap-3 items-start">
            <div className="size-11 bg-mint-green rounded-full flex items-center justify-center shrink-0">
              <Image
                src="/logo-outlined-nobg.svg"
                alt=""
                width={26}
                height={24}
                className="object-contain size-7"
              />
            </div>
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-full rounded bg-grey-c200" />
              <div className="h-3 w-5/6 rounded bg-grey-c200" />
            </div>
          </div>

          {/* What to try */}
          <div className="bg-success-c100 rounded-2xl border border-[#C4CAC8] p-4 flex flex-col gap-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="h-3.5 w-1/2 rounded bg-black/10" />
              <Info strokeWidth={2} className="size-5 text-mint-green" />
            </div>
            <div className="h-3 w-full rounded bg-black/10" />
          </div>
        </div>

        {/* Recipes list */}
        <section>
          <h2 className="text-xl font-medium text-base-text mb-3">
            Recipes that can help 🌿
          </h2>
          <div className="bg-white border border-grey-c100 rounded-2xl overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                {i > 0 && <div className="h-px bg-black/10 mx-16" />}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="size-9 rounded-full bg-grey-c100 shrink-0" />
                  <div className="h-3.5 w-1/2 rounded bg-grey-c200" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Important note */}
        <div className="bg-success-c100 rounded-2xl border border-[#C4CAC8] p-4 flex items-start gap-x-5">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 rounded bg-black/10" />
            <div className="h-3 w-full rounded bg-black/10" />
          </div>
          <Heart strokeWidth={2.67} className="size-7 text-success-c700" />
        </div>
      </div>
    </div>
  );
}
