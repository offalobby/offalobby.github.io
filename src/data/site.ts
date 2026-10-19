/**
 * Everything a visitor reads on the homepage lives here.
 * Edit freely — nothing in src/experience/ depends on this file.
 *
 * Anything marked PLACEHOLDER is not real information yet. Replace it, then
 * set `placeholder: false` (or delete the field) so the "placeholder" tag disappears.
 */

export const site = {
  /** PLACEHOLDER — your full name as it should appear on the site. */
  name: 'Afolabi Durodola',
  wordmark: 'offalobby',
  role: 'Electrical engineering student',
  title: 'offalobby — an evolving archive',
  description:
    'An evolving archive of an electrical engineering student: coursework, projects and research, kept in layers.',
  github: 'https://github.com/offalobby',
};

export const intro = {
  /** Each entry is one line of the display heading. */
  heading: ['A record of growth,', 'kept in layers.'],
  body: 'I study electrical engineering. This site is where my coursework, projects and research accumulate, with the newest work at the outer edge.',
  /** Shown beside the pith of the 3D specimen. */
  originLabel: 'Pith. Where the record starts.',
};

export interface Link {
  label: string;
  href: string;
  /** disabled links render as plain text with a note, never as dead links */
  disabled?: boolean;
  note?: string;
}

export interface ActContent {
  /** anchor id; navigation links point here */
  id: string;
  plate: string;
  heading: string;
  body: string[];
  placeholder?: string;
  links?: Link[];
  /** extra anchors inside this act (e.g. resume, contact inside the archive) */
  subsections?: { id: string; heading: string; body: string[]; placeholder?: string; links?: Link[] }[];
}

/** Acts II–V, in scroll order. Act I is the intro above. */
export const acts: ActContent[] = [
  {
    id: 'coursework',
    plate: 'Plate II. Section through the strata',
    heading: 'Coursework, laid down semester by semester',
    body: [
      'Seen from the side, each terrace of this formation is a layer of time. In the finished archive every layer stands for one semester: the courses taken, the ideas that stuck, and the projects they led to.',
    ],
    placeholder: 'Semester entries are not written yet. They will live in src/content/coursework/ (Phase 3).',
  },
  {
    id: 'projects',
    plate: 'Plate III. Interference of three point sources',
    heading: 'Projects, written up as investigations',
    body: [
      'Each project gets a full case study: the problem, the design decisions, schematics, measurements, code, and what I would change next.',
      'The surface here is the sum of three circular waves, the same superposition that steers a phased antenna array.',
    ],
    placeholder: 'No projects are published yet. Each one will be a Markdown file in src/content/projects/ (Phase 3).',
  },
  {
    id: 'research',
    plate: 'Plate IV. The field, wide view',
    heading: 'Research questions, kept open',
    body: [
      'Research entries will document a question from the start: background, method, setup, the mathematics, figures, results and any papers or posters, with data and code linked.',
    ],
    placeholder: 'No research entries yet. They will live in src/content/research/ (Phase 3).',
  },
  {
    id: 'about',
    plate: 'Plate V. Transverse section, printed',
    heading: 'The archive is still growing',
    body: [
      'Every ring in this print is a layer of work. The outermost one is always the current semester.',
    ],
    placeholder: 'About text goes here: who you are, what draws you to electrical engineering, what you are looking for.',
    subsections: [
      {
        id: 'resume',
        heading: 'Resume',
        body: ['A one-page PDF, kept current.'],
        links: [{ label: 'Resume (PDF)', href: 'resume.pdf', disabled: true, note: 'add public/resume.pdf' }],
      },
      {
        id: 'contact',
        heading: 'Contact',
        body: ['Code, notes and work in progress are on GitHub.'],
        links: [
          { label: 'GitHub', href: 'https://github.com/offalobby' },
          { label: 'Email', href: 'mailto:', disabled: true, note: 'set your address in src/data/site.ts' },
        ],
      },
    ],
  },
];

/** The index (menu). `href` is an in-page anchor until Phase 3 adds pages. */
export const nav: { label: string; href: string; hint: string }[] = [
  { label: 'Home', href: '#top', hint: 'The specimen' },
  { label: 'Projects', href: '#projects', hint: 'Case studies, schematics, code' },
  { label: 'Research', href: '#research', hint: 'Questions, methods, results' },
  { label: 'Coursework', href: '#coursework', hint: 'Semester by semester' },
  { label: 'About', href: '#about', hint: 'Background and interests' },
  { label: 'Resume', href: '#resume', hint: 'One page, PDF' },
  { label: 'Contact', href: '#contact', hint: 'GitHub and email' },
];
