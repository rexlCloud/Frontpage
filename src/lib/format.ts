import type { Lang } from '../i18n';

/** Replaces {name} placeholders. */
export function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
}

export function formatDate(iso: string, lang: Lang): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
