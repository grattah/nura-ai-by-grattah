import Image from "next/image";

interface WellnessTipCardProps {
  title: string;
  description: string;
  imageUrl?: string;
}

export function WellnessTipCard({
  title,
  description,
  imageUrl,
}: WellnessTipCardProps) {
  return (
    <div className="bg-white border-grey-c100 rounded-[12px] flex gap-4 items-start">
      <div className="flex-1 min-w-0 p-3">
        <div className="flex items-center gap-1 mb-4">
          <Image
            src="/logo-filled.svg"
            alt="Nura Logo"
            width={21}
            height={20}
            className="shrink-0"
          />
          <p className="text-xs font-semibold text-mint-green uppercase leading-none tracking-wider">
            Daily Wellness Tip
          </p>
        </div>
        <p className="text-base font-medium text-subtle leading-none mb-2">
          {title}
        </p>
        <p className="text-xs text-subtle leading-relaxed">{description}</p>
      </div>
      {imageUrl && (
        <div className="w-30.5 h-34.25 rounded-xl overflow-hidden shrink-0 bg-muted">
          <Image
            src={imageUrl}
            alt={title}
            width={122}
            height={137}
            className="object-cover w-full h-full"
          />
        </div>
      )}
    </div>
  );
}
