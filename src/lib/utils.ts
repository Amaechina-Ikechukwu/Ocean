import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const RESERVED_SLUGS = new Set([
  'app', 'api', 'www', 'admin', 'auth', 'login', 'logout',
  'signup', 'settings', 'p', 'public', 'assets', 'static',
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}
