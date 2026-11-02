// Add or rename batches here (the dropdown in the forms and filters uses this list).
export const BATCHES = ['Batch 24', 'Batch 25', 'Batch 26', 'Batch 27'];

export const todayLocal = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in the browser's time zone
export const homePath = (role) => (role === 'student' ? '/me' : '/students');
export const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
export const fmtDate = (d) =>
  d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
