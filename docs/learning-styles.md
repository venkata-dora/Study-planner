# Selectable learning styles

Reading Room preserves the current Discover design in `src/styles/apple-learning.css`. Focus adds opt-in overrides in `src/styles/focus.css`, scoped to `data-learning-style="focus"`. The chooser's own UI lives separately in `src/styles/learning-styles.css`.

`StylePicker.jsx` registers style IDs, names, descriptions, and previews. Add a scoped stylesheet and a matching entry there for a future style; import the stylesheet after the base design in `main.jsx`.

First visits open a native modal dialog. Choosing a radio previews the style, Use saves it, and Keep current style or Escape restores the previous choice. Appearance reopens the chooser. The `learning_style_v1` browser preference is separate from light/dark mode and all learning progress. No cross-device preference sync is implemented.

Verified first visit, selection, persistence after reload, Escape rollback, returning to Reading Room, mobile layout, dark mode, and the production build.
