/**
 * Queries shared by the homepage and the section pages, so ordering and
 * draft handling are decided in exactly one place.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { recency } from './dates';

export type Project = CollectionEntry<'projects'>;
export type Research = CollectionEntry<'research'>;
export type Course = CollectionEntry<'courses'>;
export type JournalEntry = CollectionEntry<'journal'>;

const published = <T extends { data: { draft: boolean } }>(e: T) => import.meta.env.DEV || !e.data.draft;

export async function getProjects(): Promise<Project[]> {
  const all = await getCollection('projects', published);
  return all.sort((a, b) => recency(b.data.start, b.data.end) - recency(a.data.start, a.data.end));
}

export async function getResearch(): Promise<Research[]> {
  const all = await getCollection('research', published);
  return all.sort((a, b) => recency(b.data.start, b.data.end) - recency(a.data.start, a.data.end));
}

export async function getJournal(): Promise<JournalEntry[]> {
  const all = await getCollection('journal', published);
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

const TERM_ORDER = { Spring: 0, Summer: 1, Fall: 2 } as const;
export const AREAS = [
  'Engineering',
  'Computing',
  'Mathematics & statistics',
  'Natural sciences',
  'Research',
  'Humanities & social sciences',
  'Business',
] as const;

export interface Semester {
  id: string;
  label: string;
  /** null for courses without a term yet */
  sort: number | null;
  courses: Course[];
  /** sum of the courses' credits, when any are given */
  credits: number;
  /** "First year", "Summer after first year"... counted from the earliest fall */
  stage?: string;
}

/** Courses grouped by semester, newest semester first; unplaced courses last. */
export async function getSemesters(): Promise<Semester[]> {
  const all = await getCollection('courses', published);
  const groups = new Map<string, Semester>();
  for (const c of all) {
    const { term, year } = c.data;
    const id = term && year ? `${year}-${term.toLowerCase()}` : 'unplaced';
    if (!groups.has(id)) {
      groups.set(id, {
        id,
        label: term && year ? `${term} ${year}` : 'Not yet placed in a semester',
        sort: term && year ? year * 3 + TERM_ORDER[term] : null,
        courses: [],
        credits: 0,
      });
    }
    const g = groups.get(id)!;
    g.courses.push(c);
    g.credits += c.data.credits ?? 0;
  }
  // year of study, counted from the first fall semester
  const falls = all.filter((c) => c.data.term === 'Fall' && c.data.year).map((c) => c.data.year!);
  const start = falls.length ? Math.min(...falls) : undefined;
  const ORDINAL = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
  for (const g of groups.values()) {
    const c = g.courses[0].data;
    if (start === undefined || !c.term || !c.year) continue;
    const academic = (c.term === 'Fall' ? c.year : c.year - 1) - start;
    const ord = ORDINAL[academic];
    if (!ord) continue;
    g.stage = c.term === 'Summer' ? `Summer after ${ord.toLowerCase()} year` : `${ord} year`;
  }
  const byArea = (a: Course, b: Course) =>
    AREAS.indexOf(a.data.area) - AREAS.indexOf(b.data.area) || a.data.title.localeCompare(b.data.title);
  const list = [...groups.values()];
  list.forEach((s) => s.courses.sort(byArea));
  return list.sort((a, b) => (b.sort ?? -1) - (a.sort ?? -1));
}

/** Previous / next in a list, for the footer of a detail page. */
export function neighbours<T extends { id: string }>(list: T[], id: string) {
  const i = list.findIndex((e) => e.id === id);
  return { prev: i > 0 ? list[i - 1] : undefined, next: i >= 0 && i < list.length - 1 ? list[i + 1] : undefined };
}

export const url = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`;

/** True when an entry's Markdown has visible text (HTML comments don't count). */
export const hasText = (body?: string) => !!body?.replace(/<!--[\s\S]*?-->/g, '').trim();
