# Learning Lab: appearance research and launch plan

Research date: September 11, 2026. Scope: selectable visual styles for a reading-led learning application. This is an evidence-informed product decision, not a clinical claim or a completed launch-readiness audit.

## Decision

Offer three styles, with the same navigation and functionality:

| Style | Visual treatment | Preference it serves (hypothesis to test) |
| --- | --- | --- |
| Paper | White workspace, charcoal text, neutral surfaces, restrained borders, sans-serif titles | People who prefer plain documents and little decorative color |
| Focus | Ivory background, navy accent, white surfaces, structured sans-serif hierarchy | People who prefer an orderly application workspace |
| Reading Room | Warm paper, green accents, editorial headings, book-like collections | People who enjoy a warmer, book-oriented aesthetic |

Paper is added in this change. Existing saved choices and the existing first-visit default are preserved. All three have dark variants. “Paper” names the visual style; its dark variant deliberately uses neutral charcoal rather than a white page. Three is a product-scope choice, not a scientifically established optimal number.

Do not assign themes based on age, gender, profession, disability, or subject. The evidence reviewed does not establish reliable mappings from these categories to our three styles. Describe visible differences and let people choose. Preference and measured reading performance are separate outcomes.

## Evidence and limits

1. **Light backgrounds are a defensible reading option.** Piepenbrock, Mayr, and Buchner (2014) found better proofreading performance and smaller pupils with dark text on light backgrounds. This supports providing a strong light presentation; it does not prove that white is universally most comfortable or that a specific palette improves learning retention. [Original paper abstract](https://www.tandfonline.com/doi/abs/10.1080/00140139.2014.948496).

2. **Simplifying the reading environment has more direct support than decorative theme claims.** A CHI 2019 Reader View study analyzed 391 participants. It found improved perceived readability and classical aesthetics; its filtered desktop reading-speed analysis found a 5% increase, with no difference in comprehension between page conditions. The study changed multiple aspects of webpages together, so it does not isolate a winning color, font, or spacing value. Mobile trials were excluded from the speed analysis. [Original paper](https://www.microsoft.com/en-us/research/wp-content/uploads/2019/01/readerview_chi2019.pdf).

3. **Preferred typography is not necessarily fastest typography.** Wallace et al.'s CHI 2020 study compared typefaces and individual preferences; different people performed best with different fonts, and preference did not predict reading speed. Short controlled reading tasks are not equivalent to an entire course or long-term retention. Keep familiar defaults; investigate reader controls separately instead of promising that a particular font makes users better learners. [Original paper](https://thereadabilityconsortium.org/wp-content/uploads/2023/07/Accelerating_Adult_Readers_with_Typeface_A_Study_of_Individual_Preferences_and_Effectiveness.pdf).

4. **Dark-mode expectations often come from device settings.** NN/g's 2023 survey and usability work reports that users commonly expect apps to follow the operating system setting. It also identifies contrast, font weight, and inconsistent assets as practical dark-mode problems. This is UX evidence, not a medical finding that dark mode prevents eye strain. [Study report](https://www.nngroup.com/articles/dark-mode-users-issues/).

5. **Contrast and resilience are measurable requirements.** WCAG 2.2 AA requires at least 4.5:1 for ordinary text and 3:1 for qualifying large text, with defined exceptions. Text-spacing overrides must not lose content or functionality: 1.5× line height, 2× paragraph spacing, .12em letter spacing, and .16em word spacing. These are override-resilience requirements, not mandatory default typography. [Contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html).

## What to build next, and what to defer

- **Before public launch:** system/light/dark selection that follows the device unless overridden; retain manual choices. Current light/dark preference is manual and browser-local.
- **Reader controls:** text size, a readable column width, and optional serif/sans body text. Prototype in article readers first. Keep code fonts separate. These are not implemented by adding Paper.
- **Accessibility in every theme:** visible focus, meaningful status labels, adequate text/control contrast, keyboard navigation, reduced motion, zoom/reflow, and robust user spacing overrides. A “high contrast” theme must never become an excuse for inaccessible defaults. Test forced-colors mode before deciding whether a separate contrast preset is needed.
- **Defer more decorative themes:** pastel, neon, glass, animated backgrounds, and separate profession-specific themes lack a clear need here and increase the QA combinations.
- **Keep appearance separate from reading state:** theme changes must not modify lesson progress, saved paths, or generated content. Preferences remain local to the browser; account sync is a separate product feature.

## Design constraints

Use shared components and layout rules; use theme tokens for surface, text, accent, border, and hover colors. Paper shares Focus's restrained layout rather than duplicating page markup. Keep familiar placement and wording across all styles. Preview each style with the same content. Cancel restores the previous selection; saving persists the choice. No downloads, custom font dependency, or theme-specific data migrations are required.

Working typography targets for future reader QA: 16–18px body text at default browser size, approximately 60–75 characters per line, and 1.6–1.8 body line height. These are starting design choices to validate, not universal scientifically optimal settings. Use responsive rem units and allow browser zoom. Keep the existing UI scale in this theme-only change.

## Validation before launch

### Theme release checks

- Switch between all three themes; save, reload, reopen, preview another, cancel/Escape, and verify restoration.
- Check light/dark on desktop and phone, including empty and populated data.
- Inspect Discover, roadmap list and topic detail, built-in course/detail, saved blog reader, stats, editor, and practice.
- Measure text/accent tokens against intended backgrounds. This is only a palette check; a full rendered contrast audit must also cover opacity, inherited styles, gradients, generated HTML, syntax colors, and controls.
- Run existing tests/build. Check 320px reflow, 200% zoom, text spacing overrides, keyboard-only interactions, focus return, screen-reader names, and forced colors. Do not mark full WCAG conformance from a screenshot or token calculation.

### User study proposal (not performed)

Recruit an initial 12–18 participants across reading habits, desktop/mobile use, experience levels, and self-described visual/access needs. This is a formative study to find issues, not a representative preference survey. Do not infer population percentages from it.

Counterbalance the theme order; use equivalent short lessons with different content to avoid rereading effects. Ask participants to find a subject, open a lesson, answer comprehension questions, mark progress, and resume learning. Record task success, navigation errors, comprehension, reading time, comfort after a reading session, and preference before/after use. Include daylight and self-reported low-light contexts where practical. Obtain consent before recording or collecting data.

Use comprehension and task success as safeguards. Treat preference as a separate outcome; do not optimize time-on-site or fastest reading alone. Follow with a larger study only if a precise population claim or experimental comparison is needed; determine its sample size from the planned effect and analysis.

### Broader application release gate (still to audit)

Theme work alone does not make the app production-ready. Review authentication and per-user data isolation, progress persistence and recovery, AI generation failures and costs, generated-content safety, HTML sanitization, upload limits, secrets, backups, mobile accessibility, performance, privacy, and operational monitoring. The current build warns about large bundles. Track these as separate launch tasks with verified acceptance criteria, not assumed completion.

## Checks completed for this change

- Existing render/progress tests and production build passed after updating the expected theme count from two to three. Existing bundle-size warning remains.
- Paper: 22 routes at 1440px and 390px, no horizontal page overflow and no uncaught page errors. Nine primary routes also checked in dark mode at both widths.
- Appearance: Paper save/reload, preview of Focus and Reading Room followed by Escape rollback, focus return, and 320px chooser width checked.
- All three themes: primary text, secondary text, and accent against page, surface, and accent-soft backgrounds meet 4.5:1 in both modes. Lowest tested ratios: Paper 5.47 light / 6.25 dark; Focus 4.63 / 5.64; Reading Room 4.66 / 5.48. Ratios are displayed rounded; pass/fail used unrounded values.
- That check found Reading Room's secondary text on its tinted surface at 4.28:1. Slightly darkened the light-mode secondary token to correct it. Visual review also found legacy completion checkboxes relying on near-invisible shadows; gave them explicit boundaries and theme-aware checkmarks.
- This is not a full rendered-page accessibility audit. The broader launch gates and user study above remain pending.
