import Image from "next/image";

interface WellnessTipCardProps {
  title: string;
  description: string;
  imageUrl?: string;
}

// The daily-tip feature is retired: the card renders whatever the server passes
// (an existing stored tip, or the fallback) and no longer self-heals by calling
// /api/daily-tip. Restore the client fetch here if the feature is re-enabled.
export function WellnessTipCard({
  title,
  description,
  imageUrl,
}: WellnessTipCardProps) {
  const tip = { title, description, imageUrl };

  return (
    <div className="bg-white border-grey-c100 rounded-xl flex gap-4">
      <div className="basis-2/3 min-w-0 p-3">
        <div className="flex items-center gap-1 mb-4">
          <Image
            src="/logo-filled.svg"
            alt="Nuko Logo"
            width={21}
            height={20}
            className="shrink-0 size-5"
          />
          <p className="text-xs font-semibold text-mint-green uppercase leading-none tracking-wider">
            Daily Wellness Tip
          </p>
        </div>
        <p className="text-base font-medium text-subtle leading-none mb-2">
          {tip.title}
        </p>
        <p className="text-xs text-subtle leading-relaxed">{tip.description}</p>
      </div>
      {tip.imageUrl && (
        <div className="basis-1/3 relative rounded-r-xl overflow-hidden shrink-0 bg-muted">
          <Image
            src={tip.imageUrl}
            alt={tip.title}
            fill
            sizes="30vw"
            className="object-cover"
          />
        </div>
      )}
    </div>
  );
}
