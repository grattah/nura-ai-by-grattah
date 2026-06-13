export default function ChromeLoading() {
  return (
    <div className="bg-background px-4 pt-2 space-y-6">
      <div className="space-y-4">
        <div className="h-7 bg-muted rounded-full animate-pulse w-3/4" />
        <div className="h-14 bg-muted rounded-2xl animate-pulse" />
      </div>

      <div className="space-y-4">
        <div className="h-6 bg-muted rounded-full animate-pulse w-40" />
        <div className="flex gap-x-5 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-50 h-44 rounded-2xl bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>

      <div className="h-24 bg-muted rounded-2xl animate-pulse" />

      <div className="space-y-2">
        <div className="h-6 bg-muted rounded-full animate-pulse w-32" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
