// app/community/loading.tsx
export default function Loading() {
	return (
	  <div className="bg-background">
		<main className="px-6 pt-3">
		  {/* Page title skeleton */}
		  <div className="h-9 w-48 bg-[#E8E6DC] rounded animate-pulse" />
  
		  {/* Recent activity section */}
		  <div className="mt-12 flex flex-col gap-4">
			<div className="h-5 w-32 bg-[#E8E6DC] rounded animate-pulse" />
  
			<div className="flex flex-col gap-5">
			  {Array.from({ length: 6 }).map((_, i) => (
				<ActivityRowSkeleton key={i} />
			  ))}
			</div>
		  </div>
		</main>
	  </div>
	);
  }
  
  function ActivityRowSkeleton() {
	return (
	  <div className="flex gap-6">
		<div className="flex gap-4 flex-1">
		  {/* Avatar */}
		  <div className="w-12 h-12 rounded-full bg-[#E8E6DC] animate-pulse shrink-0" />
  
		  {/* Text content */}
		  <div className="flex flex-col gap-2.5 flex-1 min-w-0">
			<div className="h-4 w-3/4 bg-[#E8E6DC] rounded animate-pulse" />
			<div className="h-4 w-1/2 bg-[#E8E6DC] rounded animate-pulse" />
			<div className="h-3 w-16 bg-[#E8E6DC] rounded animate-pulse" />
		  </div>
		</div>
  
		{/* Recipe thumbnail */}
		<div className="w-15.5 h-15.5 rounded-lg bg-[#E8E6DC] animate-pulse shrink-0" />
	  </div>
	);
  }