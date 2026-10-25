/**
 * The content model. Every project, research entry, course and journal post is
 * one Markdown file; the frontmatter fields below are checked at build time,
 * so a typo fails the build with a clear message instead of a broken page.
 *
 * Either form works for an entry:
 *   src/content/projects/my-project.md
 *   src/content/projects/my-project/index.md   (+ images next to it)
 * The file or folder name becomes the URL: /projects/my-project/
 *
 * How-tos: see README.md, "Adding content".
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** "2026-05", "2026", "Fall 2026" or "present". Shown as "May 2026", "2026", "Fall 2026", "Present". */
const when = z
  .string()
  .regex(/^(\d{4}(-\d{2})?|(Spring|Summer|Fall) \d{4}|present)$/, 'use YYYY, YYYY-MM, "Fall 2026" or "present"');

const link = z.object({ label: z.string(), href: z.string() });

const status = z.enum(['complete', 'in progress', 'ongoing', 'paused']);

const projects = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** one or two sentences; shown in lists and at the top of the page */
      summary: z.string(),
      /** leave out unless you want a status shown */
      status: status.optional(),
      start: when,
      end: when.optional(),
      /** where it happened: "Personal", "Rice University", "Rice Datathon 2026" */
      context: z.string(),
      tools: z.array(z.string()).default([]),
      links: z.array(link).default([]),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      /** shown on the homepage; otherwise newest first */
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

const research = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/research' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      lab: z.string(),
      /** full lab name / focus, e.g. "Graph Signal Processing & Machine Learning Laboratory" */
      group: z.string().optional(),
      institution: z.string(),
      role: z.string(),
      start: when,
      end: when.optional(),
      status: status.optional(),
      topics: z.array(z.string()).default([]),
      methods: z.array(z.string()).default([]),
      links: z.array(link).default([]),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

const courses = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/courses' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** course code if you want it shown, e.g. "ELEC 220" */
      code: z.string().optional(),
      /** leave both out until you know them; the course is then listed as "not yet placed" */
      term: z.enum(['Spring', 'Summer', 'Fall']).optional(),
      year: z.number().int().optional(),
      /** groups courses by colour within a semester */
      area: z.enum(['Circuits & devices', 'Digital & computing', 'Signals & data', 'Mathematics', 'Beyond engineering']),
      institution: z.string().default('Rice University'),
      location: z.string().optional(),
      /** one line for the semester view; the page body holds the rest */
      summary: z.string().optional(),
      /** slugs of related projects, e.g. ["fpga-verilog"] */
      projects: z.array(z.string()).default([]),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

const journal = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/journal' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      summary: z.string().optional(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
    }),
});

export const collections = { projects, research, courses, journal };
