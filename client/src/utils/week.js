export function getMondayOf(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function weekOfString(date) {
  const d = getMondayOf(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addWeeks(weekOf, n) {
  // Parse as local date to avoid UTC-midnight timezone shift
  const [y, mo, day] = weekOf.split('-').map(Number);
  const d = new Date(y, mo - 1, day + n * 7);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function formatWeekRange(weekOf) {
  const [y, mo, day] = weekOf.split('-').map(Number);
  const mon = new Date(y, mo - 1, day);
  const sun = new Date(y, mo - 1, day + 6);
  const fmt = d => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  return `${fmt(mon)} – ${fmt(sun)}`;
}
