# Selectable learning styles

Reading Room preserves the current Discover design in `src/styles/apple-learning.css`. Focus adds opt-in overrides in `src/styles/focus.css`, scoped to `data-learning-style="focus"`. The chooser's own UI lives separately in `src/styles/learning-styles.css`.

`StylePicker.jsx` registers style IDs, names, descriptions, and previews. Add a scoped stylesheet and a matching entry there for a future style; import the stylesheet after the base design in `main.jsx`.

First visits open a native modal dialog. Choosing a radio previews the style, Use saves it, and Keep current style or Escape restores the previous choice. Appearance reopens the chooser. The `learning_style_v1` browser preference is separate from light/dark mode and all learning progress. No cross-device preference sync is implemented.

Verified first visit, selection, persistence after reload, Escape rollback, returning to Reading Room, mobile layout, dark mode, and the production build.

Reading Room now has a separate `src/styles/reading-room.css` layer covering the shared shell, built-in and personal roadmaps, chapter details, article readers, library shelves, progress, and practice workspaces. Its paper/ink tokens have light and dark variants; editorial type is limited to headings and article prose so code keeps its monospace font. Focus does not inherit these scoped overrides. Article controls use native buttons for keyboard access.

Validated the 15 primary and supporting routes at 1440px and 390px, with no horizontal page overflow or browser errors. Build and existing render/progress checks pass. Visual checks include chapter timelines, the roadmap form, progress, practice, and dark mode.

## Learning Hub UI review — September 2026

Reviewed all active page families: Discover, personal roadmaps, reading library, progress, Gen AI, system design, AI interview, DSA/Python sheets and editors, Python lessons, coding practice, interview practice/history, resume preparation, all three reference guides, and learning notes. Retired planner routes remain redirects.

Changes from the review:
- Named the course and reference pages in the toolbar instead of the generic “Learning” label.
- Aligned roadmap creation fields; gave library/history filters visible control boundaries.
- Unified older practice, resume and notes headings; simplified practice entry surfaces and removed the stretched question panel.
- Made Python lesson actions wrap below their topic on narrow screens.
- Used neutral styling for unstarted AI interview questions; retained the three-state progress behavior.
- Made reference guide links and notes history keyboard-accessible. Reading dialogs now contain Tab focus, close with Escape, lock background scrolling, and restore focus to their opener.
- Preserved Reading Room and Focus as independent selectable appearances.

Validation: existing Node tests and production build; desktop/mobile route checks in light and dark modes (no horizontal overflow or uncaught browser errors); Focus mobile checks; keyboard reader dismissal and focus restoration; custom roadmap topic selection and saved lesson reading with a mocked API. No live generation, recording, uploads, deletion, or progress changes were needed for the review. Vite retains the existing large-bundle warning.

## Paper and launch research

Paper adds a plain-white/charcoal option and a neutral dark variant. It shares the restrained layout in `focus.css` through scoped selectors; `paper.css` supplies its palette. The chooser now has three choices and preserves existing preferences. See [research and launch plan](theme-research-and-launch-plan.md) for sources, rationale, verified checks, and pending launch criteria.
