# Custom roadmaps and connected learning paths

Gen AI and System Design now use connected chapters, expandable topic-group previews, progress, and a continue action. Lesson groups use quieter surfaces and explicit Blog/Read controls with native keyboard-operable completion checkboxes.

Open **My roadmaps** (`/roadmaps`), enter a subject and starting level, and create a path. Each stage contains topics and subtopics. Selecting a topic opens its preview; generating a lesson creates and saves a Markdown blog. Saved lessons are also linked from the Reading library. Completion can be undone without deleting the blog.

The existing AI provider chain generates both paths and lessons. Prompts adapt to the requested subject and level. Generated paths are validated before saving; incomplete provider responses produce a retryable error. There are no prefilled/fake successful roadmaps when generation fails.

Two additive SQLite tables in the existing database hold roadmap content and lesson progress/blogs. They are created on first roadmap API use. Existing roadmap content and progress storage are unchanged. This follows the application's existing shared-workspace model; it does not introduce accounts. Custom progress is shown on each custom path, in the main Learning library, and in Stats alongside built-in tracks. Generated lessons count as in progress until marked complete. Coding activity remains based on DSA/Python solve records.

## Validation

- `npm run build` passes (existing large bundle warning remains).
- `node tests/run.mjs` passes, including existing roadmap completion checks, the custom form, and escaped generated HTML.
- Python API tests: `python -m unittest discover -s tests -p 'test_roadmaps.py'` in an environment with Flask. Checks saved paths, lesson caching, completion/undo preservation, invalid inputs, missing lessons and invalid/unavailable AI responses, using a temporary database.
- Headless Chrome checks at 1440px and 390px: creation, selection, blog reading, completion, reload, and no horizontal overflow; API responses mocked for deterministic browser checks.
- Gen AI and System Design lesson pages checked at phone width, plus desktop light/dark roadmap screenshots.
- A separate real-provider smoke test created an 8-stage, 36-topic Java path and generated a saved lesson successfully. It used a temporary database, leaving no sample paths in the user's library.
