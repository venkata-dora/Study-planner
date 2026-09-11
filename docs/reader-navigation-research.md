# Reading navigation review — September 11, 2026

## Reference patterns

- [React Learn](https://react.dev/learn): learning/documentation context, topic navigation, and a primary reading area. Reviewed as a reference implementation, not evidence that one layout fits every product.
- [Docusaurus sidebar](https://docusaurus.io/docs/sidebar): related documents grouped in a sidebar, the current document represented in navigation, and previous/next navigation.
- [Carbon left panel](https://carbondesignsystem.com/components/UI-shell-left-panel/usage/): distinguishes the global shell header from product navigation in the left panel.

## Decision for Learning Lab

Use global navigation in the top bar while reading and a single course outline at the left edge. Keeping both the full app sidebar and a second course sidebar created excessive lateral navigation and led to repeated positional tweaks. This is a product-specific judgment informed by the references, not a claim that all learning products use the same pattern.

The course outline retains chapter selection, active lessons, and the persistent collapse/expand chevron. The reading column is centered in the remaining space, limited to 840px, and shares one alignment for title, article, and controls. Mobile uses a collapsible in-flow course outline and a compact Explore menu. Leaving the reader restores the normal app navigation.

Remove repeated toolbar metadata and presentation-only duplicate opening article titles. Strip the specific generation preamble observed in the screenshot without editing saved content. No fake progress or generation requests are introduced by navigation.

## Validation

Render tests and production build; browser checks at 1909, 1440, 900, and 390 pixels in light/dark Reading Room, plus Studio/Focus/Paper at 1440 and 320 pixels. Checked overflow, course collapse/reopen while scrolled, platform navigation, a single article heading, and page errors. Visual screenshots reviewed on desktop and mobile. Existing large-bundle warning remains. This is a layout review and functional validation, not a user study or a complete accessibility audit.

## September 11: stable navigation slot

Visual thesis: a quiet reading canvas with theme-native navigation, compact controls, and clear text hierarchy.
Content plan: stable product header; one left navigation slot; lesson title/actions/body; adjacent lessons; a small section index when the viewport has room.
Interaction thesis: keep the global toggle stationary, slide the platform panel into the chapter slot, and preserve article geometry and scroll while switching. Retain modal navigation only on small screens; honor reduced motion.

Reviewed Carbon's UI shell left panel (https://carbondesignsystem.com/components/UI-shell-left-panel/usage/), Docusaurus sidebar (https://docusaurus.io/docs/sidebar), and React Learn (https://react.dev/learn). Carbon places its secondary panel below the global header. Docusaurus documents persistent ordered chapter trees, hideable navigation, and adjacent-document links. These support separating navigation levels; replacing the course panel with the platform panel is our product-specific choice, not a claim of universal preference.

Removed the shifting duplicate menu button and brand from the reader's platform panel. The original navigation links and theme surfaces remain. Desktop switching does not dim or shift the article; the header button switches back to the learning path. On mobile, the original modal behavior remains with a matching close icon. Reduced article gutters, softened utility actions, tightened section spacing, and added an automatically generated section index on wide screens. Saved blog content is unchanged.

Validation: build and existing tests; browser checks for light/dark across all four themes at 1909, 1024, 390, and 320px, stable desktop article position, no horizontal overflow, Escape closing, and panel switching. Article samples in browser checks are mocked, not generated or saved to user data.
