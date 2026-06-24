
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

export function normalizeProspectType(type) {
  if (!type) return 'commercial';
  const lower = String(type).toLowerCase().trim();
  if (lower.startsWith('com')) return 'commercial';
  if (lower.startsWith('res')) return 'residential';
  if (lower === 'bpp') return 'bpp';
  return 'commercial';
}

export function normalizePropertyType(type) {
  if (!type) return 'commercial';
  const lower = String(type).toLowerCase().trim();
  if (lower.startsWith('com')) return 'commercial';
  if (lower.startsWith('res')) return 'residential';
  if (lower === 'bpp') return 'bpp';
  return 'commercial';
}

export function normalizeConversionChannel(value) {
  if (!value) return null;
  const lower = String(value).toLowerCase().trim();
  if (lower.includes('both') || lower.includes('email_phone') || (lower.includes('email') && lower.includes('phone'))) return 'both';
  if (lower.includes('email')) return 'email';
  if (lower.includes('phone')) return 'phone';
  return 'other';
}

export function normalizeSeniorManagerRole(value) {
  if (!value) return null;
  const lower = String(value).toLowerCase().trim();
  if (lower.includes('both') || lower.includes('senior_manager') || (lower.includes('senior') && lower.includes('manager'))) return 'both';
  if (lower.includes('senior')) return 'senior';
  if (lower.includes('manager')) return 'manager';
  return 'other';
}
