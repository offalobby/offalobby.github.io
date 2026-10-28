# offalobby.com — an evolving archive

An immersive 3D portfolio: a single procedural growth specimen whose rings,
strata and fields carry the story of an electrical engineering education.
Built with Astro, React Three Fiber, custom GLSL and GSAP; deployed to GitHub
Pages as a fully static site.

The creative concept, architecture and roadmap are in
[docs/CREATIVE-DIRECTION.md](docs/CREATIVE-DIRECTION.md).

## Run it

Requires Node 22.22+.

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run preview    # serve dist/ locally
```

Append `?quality=low` (or `medium`, `high`) to the URL to test the rendering tiers.

## Adding content

Projects, research, courses and journal posts are Markdown files in
`src/content/`. Add a file and push: the list page, the entry's own page
(with a shareable URL) and the homepage all update by themselves. You never
need to touch the 3D code.

| Section | Folder | Page | Ground |
| --- | --- | --- | --- |
| Projects | `src/content/projects/` | `/projects/<name>/` | earthen brown |
| Research | `src/content/research/` | `/research/<name>/` | deep green |
| Coursework | `src/content/courses/` | `/coursework/<name>/` | olive |
| Journal (About page) | `src/content/journal/` | `/about/<name>/` | aged-wood taupe |

### Add a project (research, course and journal work the same way)

1. Copy `src/content/projects/_template.md`. Files starting with `_` are never
   published, so the template stays hidden.
2. Either save it as `src/content/projects/my-project.md`, or make a folder
   `src/content/projects/my-project/index.md` if it will have images. The name
   becomes the URL: `/projects/my-project/`.
3. Fill in the fields between the `---` lines (the template explains each one),
   then write the body in Markdown underneath.
4. `npm run dev` to preview, then commit and push to `main` to publish.

If a field is wrong (a misspelled status, a bad date), the build stops and
names the file and field, so nothing broken goes live.

### Images and figures

Put images in the entry's folder and write:

```markdown
![What the image shows](./schematic.png "Figure 2. Caption shown under the image.")
```

The text in quotes becomes a caption. Images are resized and converted to
WebP automatically. For a large image at the top of the page, set
`cover: "./photo.jpg"` and `coverAlt: "…"` in the frontmatter. PDFs (posters,
papers) go in `public/papers/` and are linked as `/papers/poster.pdf`.

### Common edits

| To… | Do this |
| --- | --- |
| Update a project's status | `status: "in progress"` (or `complete`, `ongoing`, `paused`); leave it out to show none |
| Put a course in a semester | add `term: "Fall"` and `year: 2025` to the course file |
| Show a project on the homepage | `featured: true` (up to four are shown) |
| Hide something until it's ready | `draft: true` (visible in `npm run dev` only) |
| Link a course to projects | `projects: ["fpga-verilog"]` in the course file |
| Write your About text | `bio` in `src/data/about.ts` |
| Change the About facts (honors, languages…) | `src/data/about.ts` |
| Homepage heading and intro | `intro` in `src/data/site.ts` |
| Homepage section text | `acts` in `src/data/site.ts` |
| Menu (index) entries | `nav` in `src/data/site.ts` |
| Resume | put the PDF at `public/resume.pdf`, then in `site.ts` remove `disabled: true` from the Resume link |

Dates are written like on a resume: `"2026"`, `"2026-05"`, `"Fall 2026"`,
or `"present"` for an end date.

## Changing the look

| To change… | Edit |
| --- | --- |
| Colours | `src/experience/core/palette.ts` **and** `src/styles/tokens.css` (keep them matched) |
| Camera position / field look per section | `src/experience/core/acts.ts` |
| The field itself (ring shape, terraces, waves) | `src/experience/shaders/common.ts` and its CPU twin `core/field.ts` |
| Line work, lighting, woodcut print | `src/experience/shaders/specimen.ts` |
| Section page colours (the four grounds) | top of `src/styles/sections.css` |
| Type scale, spacing | `src/styles/tokens.css` |

## Deploying

Pushing to `main` builds and publishes the site via
`.github/workflows/deploy.yml`.

One-time setup on GitHub: **Settings → Pages → Build and deployment → Source:
GitHub Actions**. The custom domain comes from `public/CNAME` (offalobby.com);
keep that file. Because this is a user site (`offalobby.github.io`) served at
the domain root, `base` in `astro.config.mjs` stays `/`.

## Accessibility and fallbacks

- All content is real HTML; the canvas is decorative (`aria-hidden`).
- Keyboard: skip link, visible focus, the index is a focus-trapped dialog that
  closes on Escape and returns focus.
- Motion toggle in the header; the OS reduced-motion setting is respected by
  default. With motion off, the scene renders only when something changes.
- Without WebGL2 (or if the scene fails), a static woodcut of the same specimen
  is shown, drawn at build time from the same field.

## Licences

Fonts: Zen Kaku Gothic New and IBM Plex Mono, SIL Open Font License
(copies in `public/licenses/`). No third-party images or 3D assets are used;
everything visual is generated.
