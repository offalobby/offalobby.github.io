/**
 * Markdown images with a title become captioned figures:
 *   ![A block diagram](./diagram.png "Figure 1. The signal chain.")
 * renders as <figure><img alt="A block diagram"><figcaption>Figure 1...</figcaption></figure>.
 * An image alone in its paragraph without a title becomes a plain figure.
 *
 * Written for Sätteri, Astro 7's Markdown processor (a hast plugin).
 */
export const figures = {
  name: 'figures',
  element: {
    filter: ['p'],
    visit(node, ctx) {
      const kids = node.children.filter((c) => !(c.type === 'text' && !c.value.trim()));
      if (kids.length !== 1) return;
      const img = kids[0];
      if (img.type !== 'element' || img.tagName !== 'img') return;
      const { title, ...rest } = img.properties ?? {};
      const image = { ...img, properties: rest };
      const children = [image];
      if (title) {
        children.push({
          type: 'element',
          tagName: 'figcaption',
          properties: {},
          children: [{ type: 'text', value: String(title) }],
        });
      }
      ctx.replaceNode(node, { type: 'element', tagName: 'figure', properties: {}, children });
    },
  },
};
