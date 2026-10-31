export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function field(body, key, max, required = false) {
  const value = body[key] ?? '';
  if (typeof value !== 'string' || value.length > max || /\u0000/.test(value)) throw new HttpError(400, `Invalid ${key}.`);
  const result = value.trim();
  if (required && !result) throw new HttpError(400, `Please provide ${key}.`);
  return result;
}
export function validateSubmission(body, kind, now = new Date()) {
  const value = {
    id: field(body, 'requestId', 36, true), kind,
    firstName: field(body, 'firstName', 80, true), lastName: field(body, 'lastName', 80, true),
    email: field(body, 'email', 160, true).toLowerCase(), company: field(body, 'company', 120),
    role: field(body, 'role', 80), message: field(body, 'message', 3000, kind === 'message'),
    date: null, time: null, timezone: null
  };
  if (!uuid.test(value.id)) throw new HttpError(400, 'Invalid request reference. Refresh and try again.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) throw new HttpError(400, 'Please provide a valid email address.');
  if (kind === 'message' && !['Bookkeeping support','AP / AR support','Practice operations','Help defining a role'].includes(value.role)) throw new HttpError(400, 'Please choose a support option.');
  if (kind === 'booking') {
    value.date = field(body, 'date', 10, true); value.time = field(body, 'time', 5, true); value.timezone = field(body, 'timezone', 80, true);
    const parsed = new Date(value.date + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value.date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) throw new HttpError(400, 'Please select a valid date and time.');
    let parts;
    try { parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone: value.timezone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p => [p.type,p.value])); }
    catch { throw new HttpError(400, 'Please choose a valid time zone.'); }
    if (`${value.date}T${value.time}` <= `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`) throw new HttpError(400, 'Please choose a future date and time.');
    if (parsed.getTime() > now.getTime() + 366 * 86400000) throw new HttpError(400, 'Please select a date within the next year.');
  }
  return value;
}
