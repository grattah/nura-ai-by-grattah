export default function BookmarksLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="px-8 py-4.75 mb-5 bg-[#F3F1E8] shadow-[0px_4px_20px_0px_#01261F0A]">
        <h1 className="text-2xl font-semibold text-[#111312]">Saved Recipes</h1>
      </div>

      <main className="px-4 pb-10 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 border-b border-[#E2E4E4] pb-4"
          >
            <div className="w-20 h-20 rounded-2xl bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-muted rounded-full animate-pulse w-3/4" />
              <div className="h-3 bg-muted rounded-full animate-pulse w-full" />
              <div className="h-3 bg-muted rounded-full animate-pulse w-1/3" />
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
