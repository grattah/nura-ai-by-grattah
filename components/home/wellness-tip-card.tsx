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
    <div className="bg-white border-grey-c100 rounded-[12px] flex max-xs:gap-2.5 gap-4 items-start">
      <div className="flex-1 min-w-0 p-3 max-xs:gap-1.75">
        <div className="flex items-center gap-1 mb-4 max-xs:mb-2.5">
          <Image
            src="/logo-filled.svg"
            alt="Nuko Logo"
            width={21}
            height={20}
            className="shrink-0"
          />
          <p className="text-xs max-xs:text-[10px] font-semibold text-mint-green uppercase leading-none tracking-wider">
            Daily Wellness Tip
          </p>
        </div>
        <p className="text-base max-xs:text-sm font-medium text-subtle leading-none mb-2">
          {title}
        </p>
        <p className="text-xs max-xs:text-[10px] text-subtle leading-relaxed">
          {description}
        </p>
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
