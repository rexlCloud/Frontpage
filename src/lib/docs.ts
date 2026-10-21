import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n';

export type Doc = CollectionEntry<'docs'>;

const GROUPS = ['start', 'operate', 'develop'] as const;

/** The guides of a language in reading order. */
export async function docsOf(lang: Lang): Promise<Doc[]> {
  const docs = await getCollection('docs', ({ id }) => id.startsWith(`${lang}/`));
  return docs.sort((a, b) =>
    GROUPS.indexOf(a.data.group) - GROUPS.indexOf(b.data.group) || a.data.order - b.data.order);
}

/** The slug of a guide without its language, e.g. "installation". */
export function slugOf(doc: Doc): string {
  return doc.id.slice(doc.id.indexOf('/') + 1);
}

export async function docPaths(lang: Lang) {
  const docs = await docsOf(lang);
  return docs.map((doc) => ({ params: { slug: slugOf(doc) }, props: { doc, docs } }));
}
