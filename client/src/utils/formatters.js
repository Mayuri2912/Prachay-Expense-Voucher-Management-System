// Turning raw API values into text for the screen.

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// "4850.00" -> "₹4,850.00"
export function formatCurrency(amount) {
  const number = Number(amount);
  return Number.isFinite(number) ? currency.format(number) : '-';
}

// A plain date from the API ("2026-10-09") -> "09 Oct 2026".
// It is split by hand so the browser's time zone can never move it to another day.
export function formatDate(dateString) {
  if (!dateString) return '-';
  const [year, month, day] = String(dateString).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '-';

  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// A moment in time from the API (UTC, "2026-10-09T10:15:00.000Z")
// -> the user's local time, e.g. "09 Oct 2026, 3:45 pm".
export function formatDateTime(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// "3 hours ago", "yesterday" ... used in the activity feed.
export function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const seconds = Math.round((Date.now() - new Date(isoString).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return formatDateTime(isoString);
}

// Today's date in the user's own time zone, in the format <input type="date"> needs.
export function todayInputValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// "Aarav Sharma" -> "AS" (for the avatar circle)
export function initialsOf(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
