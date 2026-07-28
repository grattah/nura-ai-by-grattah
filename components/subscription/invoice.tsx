import type { InvoiceView } from "@/lib/billing";

// Presentational only — no interactivity, so it renders on the server.
// `downloadUrl` is Stripe's hosted PDF. It's cross-origin, so the anchor opens a
// new tab rather than using the `download` attribute (browsers ignore that
// cross-origin).
function Invoice({ amount, status, date, downloadUrl }: Omit<InvoiceView, "id">) {
  return (
    <div className="flex items-center justify-between gap-3 bg-[#E8E6DC] rounded-2xl pt-3 pr-3 pb-2 pl-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-1">
          <span className="text-black font-medium text-title font-inter">
            {amount}
          </span>
          <span
            className="py-0.5 px-1.75 rounded-sm text-xs font-semibold"
            style={{ color: "#227B6F", backgroundColor: "#33C0AD2B" }}
          >
            {status}
          </span>
        </div>
        <span className="font-medium text-sm text-subtle leading-6">{date}</span>
      </div>
      {downloadUrl ? (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#F0F1EE] rounded-full py-1.5 pr-3 pl-4 block text-sm font-semibold text-subtle hover:opacity-75 transition-opacity"
        >
          Download
        </a>
      ) : (
        <span className="bg-[#F0F1EE] rounded-full py-1.5 pr-3 pl-4 block text-sm font-semibold text-subtle opacity-40">
          Download
        </span>
      )}
    </div>
  );
}

export default Invoice;
