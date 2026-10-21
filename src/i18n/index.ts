import { de } from './de';
import { en } from './en';

export const languages = { en: 'English', de: 'Deutsch' } as const;
export type Lang = keyof typeof languages;
export type Dictionary = typeof en;

const dictionaries: Record<Lang, Dictionary> = { en, de };

export function t(lang: Lang): Dictionary {
  return dictionaries[lang];
}

/**
 * A link to a page in the given language: English at the root, German under /de.
 */
export function href(lang: Lang, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (lang === 'en') {
    return clean;
  }
  return clean === '/' ? '/de/' : `/de${clean}`;
}

/**
 * The language of a URL path and the path without its language prefix.
 */
export function splitPath(pathname: string): { lang: Lang; path: string } {
  if (pathname === '/de' || pathname.startsWith('/de/')) {
    return { lang: 'de', path: pathname.slice(3) || '/' };
  }
  return { lang: 'en', path: pathname };
}
