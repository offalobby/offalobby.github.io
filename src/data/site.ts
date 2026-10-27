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
  heading: ['ECE Portfolio', '\u00A0'],
  body: 'I study how to power and program technology. This site is where my coursework, projects and research accumulate, with the newest work at the outer edge.',
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
  /** list entries from this collection on the homepage */
  entries?: 'courses' | 'projects' | 'research';
  /** link to the full section page */
  more?: Link;
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
      '',
    ],
    entries: 'courses',
    more: { label: 'All coursework', href: '/coursework/' },
  },
  {
    id: 'projects',
    plate: 'Plate III. Interference of three point sources',
    heading: 'Projects, written up as investigations',
    body: [
      'The surface here is the sum of three circular waves, the same superposition that steers a phased antenna array.',
    ],
    entries: 'projects',
    more: { label: 'All projects', href: '/projects/' },
  },
  {
    id: 'research',
    plate: 'Plate IV. The field, wide view',
    heading: 'Research questions, kept open',
    body: [
      'From gene therapy at the bench to graph learning on genomes.',
    ],
    entries: 'research',
    more: { label: 'All research', href: '/research/' },
  },
  {
    id: 'about',
    plate: 'Plate V. Transverse section, printed',
    heading: 'The archive is still growing',
    body: [
      'Thank you so much for checking out my website!! And a special thanks the creators of this website (https://www.junkbranding.com/) for my design inspiration.',
    ],
    more: { label: 'About me, and a journal', href: '/about/' },
    subsections: [
      {
        id: 'resume',
        heading: 'Resume',
        body: ['A one-page PDF, kept current.'],
        links: [{ label: 'Resume (PDF)', href: '/resume.pdf' }],
      },
      {
        id: 'contact',
        heading: 'Contact',
        body: ['Code, notes and work in progress are on GitHub.'],
        links: [
          { label: 'GitHub', href: 'https://github.com/offalobby' },
          { label: 'LinkedIn', href: 'https://www.linkedin.com/in/hirokidurodola' },
          { label: 'Email', href: 'mailto:ad207@rice.edu' },
        ],
      },
    ],
  },
];

/** The index (menu). Paths are site-relative; "/#x" scrolls to a homepage section. */
export const nav: { label: string; href: string; hint: string }[] = [
  { label: 'Home', href: '/', hint: 'The specimen' },
  { label: 'Projects', href: '/projects/', hint: 'Case studies, schematics, code' },
  { label: 'Research', href: '/research/', hint: 'Questions, methods, results' },
  { label: 'Coursework', href: '/coursework/', hint: 'Semester by semester' },
  { label: 'About', href: '/about/', hint: 'Background, interests, journal' },
  { label: 'Resume', href: '/#resume', hint: 'One page, PDF' },
  { label: 'Contact', href: '/#contact', hint: 'GitHub, LinkedIn and email' },
];
