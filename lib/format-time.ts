interface FormatRelativeTimeShortOptions {
	dateString: string;
}

export function formatRelativeTime(dateString: FormatRelativeTimeShortOptions['dateString']): string {
	const date = new Date(dateString);
	if (isNaN(date.getTime())) {
		throw new Error('Invalid date string');
	}
	const now = new Date();
	
	// Calculate difference in seconds
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
	
	if (diffInSeconds < 60) {
		return 'now'; // Less than a minute
	}
	
	const diffInMinutes = Math.floor(diffInSeconds / 60);
	if (diffInMinutes < 60) {
		return `${diffInMinutes}m`; // Minutes
	}
	
	const diffInHours = Math.floor(diffInMinutes / 60);
	if (diffInHours < 24) {
		return `${diffInHours}h`; // Hours
	}
	
	const diffInDays = Math.floor(diffInHours / 24);
	if (diffInDays < 7) {
		return `${diffInDays}d`; // Days (e.g., 3d)
	}
	
	const diffInWeeks = Math.floor(diffInDays / 7);
	if (diffInWeeks < 4) {
		return `${diffInWeeks}w`; // Weeks (e.g., 2w)
	}
	
	// Fallback for older items (e.g., "Jan 12")
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}