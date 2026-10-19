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

## Updating content

All visible text on the homepage is in **`src/data/site.ts`**. You never need
to touch `src/experience/` to change content.

| To change… | Edit |
| --- | --- |
| Your name, role, GitHub link | `site` in `src/data/site.ts` |
| Homepage heading and intro paragraph | `intro` in `src/data/site.ts` |
| Coursework / Projects / Research / About sections | `acts` in `src/data/site.ts` |
| Menu (index) entries | `nav` in `src/data/site.ts` |
| Resume | put the PDF at `public/resume.pdf`, then in `site.ts` remove `disabled: true` from the Resume link |
| Email | in `site.ts`, set the Email link's `href` to `mailto:you@example.com` and remove `disabled: true` |
| Images and figures | `public/images/…` and reference them as `/images/…` (Phase 3 adds optimized images per project) |

Anything still marked **Placeholder** on the site comes from a `placeholder`
field in `site.ts`; delete the field once the real text is in.

Coming in Phase 3 (not built yet): one Markdown file per project in
`src/content/projects/`, per research entry in `src/content/research/`, per
semester in `src/content/coursework/`, each with its own page and URL. The
homepage and the 3D scene will pick new entries up automatically.

## Changing the look

| To change… | Edit |
| --- | --- |
| Colours | `src/experience/core/palette.ts` **and** `src/styles/tokens.css` (keep them matched) |
| Camera position / field look per section | `src/experience/core/acts.ts` |
| The field itself (ring shape, terraces, waves) | `src/experience/shaders/common.ts` and its CPU twin `core/field.ts` |
| Line work, lighting, woodcut print | `src/experience/shaders/specimen.ts` |
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

Fonts: Newsreader, Hanken Grotesk and IBM Plex Mono, SIL Open Font License
(copies in `public/licenses/`). No third-party images or 3D assets are used;
everything visual is generated.
