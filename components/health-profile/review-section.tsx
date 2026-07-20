"use client";

export function ReviewSection({
  title,
  values,
  onEdit,
}: {
  title: string;
  values: string;
  onEdit: () => void;
}) {
  return (
    <div className="py-4 border-b border-[#E3E1D8] last:border-0">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold text-base-text">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-base font-semibold text-mint-green shrink-0 hover:opacity-75 transition-opacity"
        >
          Edit
        </button>
      </div>
      <p className="text-sm text-subtle mt-1 leading-snug">{values}</p>
    </div>
  );
}
