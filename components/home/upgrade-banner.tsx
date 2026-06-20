import Link from "next/link";
import Image from "next/image";

interface UpgradeBannerProps {
  hasAccess: boolean;
}

export function UpgradeBanner({ hasAccess }: UpgradeBannerProps) {
  if (hasAccess) {
    return;
    // return (
    //   <div className="bg-orange-25 rounded-2xl pr-3 flex gap-4.75 items-center relative h-29">
    //     <div className="shrink-0 flex items-center justify-center bg-no-repeat bg-[url('/shape-set.png')] w-22 h-29 absolute left-0 inset-y-0 rounded-l-2xl">
    //       <Image src="/3davatar.png" alt="3D Avatar" width={64} height={64} />
    //     </div>
    //     <div className="flex-1 space-y-2 ml-25">
    //       <p className="font-semibold text-base-text text-lg">
    //         Unlock every recipe
    //       </p>
    //       <p className="text-base text-grey-c700 leading-snug">
    //         Full methods, ingredients, personalized feedbacks, and daily
    //         reminders. All for{" "}
    //         <span className="text-base-text font-medium">$7 monthly!</span>
    //       </p>
    //     </div>
    //   </div>
    // );
  }

  return (
    <Link href="/checkout" className="block">
      <div className="bg-orange-25 rounded-2xl p-4 flex gap-4 items-center hover:opacity-90 transition-opacity active:scale-[0.98]">
        <div className="w-14 h-14 rounded-full bg-[#E8836A] shrink-0 flex items-center justify-center text-title">
          🧘
        </div>
        <div>
          <p className="font-semibold text-foreground">Unlock every recipe</p>
          <p className="text-sm text-muted-foreground leading-snug mt-0.5">
            Full methods, ingredients, personalized feedbacks, and daily
            reminders. All for{" "}
            <span className="font-bold text-foreground">$7 monthly!</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
