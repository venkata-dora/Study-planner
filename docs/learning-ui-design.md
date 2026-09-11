# Learning Lab: study-first UI decisions

Research reviewed September 11, 2026. This is a focused design review, not a user study. The choices below are informed starting points; they do not prove what this platform’s students prefer.

## Direction

An Apple-inspired learning workspace: system typography, restrained blue actions, solid reading surfaces, grouped content, and translucent navigation. Preserve the roadmaps and problem editor as the primary workspaces. Make the next useful action obvious without filling the page with competing calls to action.

## Evidence and implementation

| Area | Choice for this platform | Reason and source |
| --- | --- | --- |
| Navigation | 240px sidebar at normal desktop sizes; flexible main area; menu drawer below 761px | Keep destinations recognizable and controls separate from content. [Apple layout](https://developer.apple.com/design/human-interface-guidelines/layout), [NN/g recognition vs. recall](https://www.nngroup.com/articles/recognition-and-recall/) |
| Proportion | Approximately 1:4 navigation-to-workspace around a 1200px viewport; not a fixed ratio | A practical content allocation, not a scientifically optimal ratio. Coding uses the remaining width; reading uses a narrower measure. |
| Reading | 72ch maximum for article/problem text, 16px body text, 1.75 line height; left aligned | W3C’s AAA visual-presentation guidance discusses a maximum 80-character line and generous spacing. Our 72ch is an approximation based on font metrics, not a guaranteed character count. [W3C visual presentation](https://www.w3.org/WAI/WCAG21/Understanding/visual-presentation) |
| Type hierarchy | 16px root; 29–42px page titles; 18px section headings; compact metadata | Hierarchy from size, weight, and spacing. System fonts avoid external font loading. These exact sizes are design choices, not accessibility mandates. |
| Surfaces | Opaque content; blur confined to sidebar/toolbar; solid fallback | Preserve contrast for sustained reading while keeping navigation spatially distinct. [Apple materials](https://developer.apple.com/design/human-interface-guidelines/materials) |
| Contrast | Primary text #1d1d1f and secondary #626269 on light surfaces; #f5f5f7 and #b0b0b8 on dark surfaces; darker blue on light, lighter blue on dark | Target at least 4.5:1 for normal text. This is not a claim of full WCAG compliance for legacy lesson content. [W3C contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) |
| Targets | Primary controls and navigation at least 44px high; sheet controls 32px desktop / 44px mobile | Aim beyond WCAG AA’s 24px minimum for comfortable interaction. [W3C target sizes](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) |
| Roadmaps | Consistent rows with section name, summary, and progress; details open on demand | Reduce complexity while retaining access to depth. [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) |
| Progress | Completed, in-progress, and remaining items; one prominent next-step link | Avoid requiring students to remember their progress; keep existing honest counts. The current suggestion is the first incomplete item in an active track, not a last-visited bookmark. |
| Feedback | Immediate press state; short reversible hover/menu transitions; no decorative looping motion | Apply the installed Apple design skill’s response and restraint principles. Reduced-motion, reduced-transparency, and increased-contrast preferences have fallbacks. |
| Detail | Hairline separators, 4/8px-derived spacing, tabular progress numbers, consistent icon strokes, visible focus rings | Improve scanning and visual consistency without ornamental content. |

## Validate with students next

Ask representative learners to: find a topic, return to an unfinished problem, interpret their progress, read a longer explanation, and move between description and editor. Include keyboard-only, mobile, zoomed-text, light, and dark-mode sessions. Observe task completion, navigation errors, reading comfort, and whether the next-step suggestion matches expectations. Do not use engagement time alone as proof of improved learning.

## Verification scope

Production build and automated rendering/progress tests are run locally. Native Chrome accessibility inspection is available; screenshot capture in this session returns a blank image, limiting visual review. Existing AI generation and code execution integrations require separate end-to-end validation.
