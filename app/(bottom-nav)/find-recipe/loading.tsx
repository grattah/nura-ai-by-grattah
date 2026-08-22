export default function FindRecipeLoading() {
  return (
    <div className="bg-background min-h-screen">
      <div className="px-8 py-4.75 mb-5 bg-[#F3F1E8] shadow-[0px_4px_20px_0px_#01261F0A]">
        <p className="text-2xl font-semibold text-[#111312]">Find a recipe</p>
      </div>
      <div className="mt-4 px-6">
        <div className="h-12 rounded-xl bg-muted animate-pulse" />
      </div>
      <div className="mt-8 px-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-6 bg-muted rounded-full animate-pulse w-2/3"
          />
        ))}
      </div>
    </div>
  );
}
