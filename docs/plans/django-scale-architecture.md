# Django scale architecture for Learning Lab

Updated: 12 September 2026

## Implementation status

The opt-in Django course backend, staged background generation, legacy roadmap importer, Docker stack, HTTPS overlay, CI and image publication workflow are implemented. See [the operations guide](../production.md) for setup, validation and remaining launch gates. The existing Flask features are not all migrated; production must not expose their anonymous APIs.

## Recommendation

Use Django for the production backend, but keep the current React/Vite frontend.

Django is a better long-term backend foundation for Learning Lab because the product is becoming a real learning platform rather than a small local planner. The platform now needs durable users, generated courses, progress tracking, lesson generation jobs, source evidence, saved libraries, permissions, admin review, and analytics. Django gives more control over these areas than the current Flask + SQLite prototype.

This does not mean Django is automatically more scalable. The scale comes from the architecture around it: PostgreSQL, background workers, cached generation steps, structured schemas, validations, API boundaries, and a clean deployment model.

## Target stack

```text
React / Vite frontend
  ↓ REST or typed JSON API
Django + Django REST Framework
  ↓
PostgreSQL
  ↓
Celery or RQ workers + Redis
  ↓
LLM providers, search/research tools, source extraction tools
```

Recommended production stack:

- **Frontend:** keep React/Vite.
- **Backend:** Django.
- **API layer:** Django REST Framework.
- **Database:** PostgreSQL.
- **Background jobs:** Celery + Redis, or RQ + Redis if we want simpler operations.
- **Async generation status:** polling first, WebSocket/SSE later if needed.
- **Auth:** Django auth initially, optional OAuth later.
- **Admin:** Django admin for reviewing generated paths, failed generations, and user reports.
- **Storage:** local in development, object storage later for exports/assets.
- **Deployment:** one frontend service, one backend API service, one worker service, one Postgres instance, one Redis instance.

## Why Django fits this product

Learning Lab needs backend control in five places.

First, generated roadmaps need strong data models. A roadmap is no longer a single JSON blob; it has chapters, lessons, subtopics, prerequisites, validation issues, source evidence, generation runs, and user progress. Django models and migrations make this much safer than manual SQLite tables.

Second, course generation should become a job system. A learner should submit a topic, see a useful loading/progress experience, and let the backend run stages such as scope normalization, concept registry, prerequisite graph, chapter plan, lesson plan, subtopic expansion, validation, and repair. Django plus a worker queue gives us retries, status, logs, and failure recovery.

Third, the app will need user accounts and permissions. Learners should own their paths, save lessons, delete generated paths, continue progress across devices, and possibly share paths later. Django has mature auth, sessions, permissions, and admin tools.

Fourth, we need observability and moderation of generated content. Django admin can show generation runs, prompts used, validation failures, provider errors, and flagged courses without building a custom internal dashboard first.

Fifth, Django makes it easier to grow carefully. We can add indexes, transactions, constraints, API serializers, rate limits, background tasks, cached subject packs, and production-grade testing without turning the backend into many loose functions.

## What should stay from the current app

Keep:

- the React/Vite frontend;
- the reading-room visual direction;
- the learning path sidebar and split-reader concepts;
- generated roadmap UI components;
- existing static subject data as seed fixtures or built-in templates;
- the current Flask backend only as a temporary compatibility layer during migration.

Move:

- roadmap persistence;
- lesson progress;
- generated course structure;
- generation logs/status;
- subject packs;
- validation issues;
- saved reading/library items;
- user preferences;
- delete actions and ownership checks.

Remove later:

- old planner/routine/week/study/prep APIs and templates if they are no longer part of the learning platform;
- single-blob roadmap storage once Django models are live;
- direct long-running request generation for courses.

## Suggested Django apps

```text
backend/
  config/                 # settings, urls, ASGI/WSGI
  accounts/               # users, profiles, preferences
  curriculum/             # paths, chapters, lessons, subtopics, prerequisites
  generation/             # generation jobs, prompts, source packs, validation issues
  progress/               # lesson progress, streaks, activity
  library/                # saved reads, recent generations, reading history
  interviews/             # optional later if interview practice stays
```

## Core data model

The first production version should model the course structure directly.

```text
User
  └── LearningPath
        ├── CourseOutcome
        ├── Concept
        ├── ConceptDependency
        ├── Chapter
        │     ├── Lesson
        │     │     ├── Subtopic
        │     │     └── LessonCheckpoint
        │     └── ChapterCheckpoint
        ├── FinalTask
        ├── EvidenceSource
        ├── ValidationIssue
        └── GenerationRun
```

Important model rules:

- A path belongs to a user, or to the system if it is a built-in template.
- A chapter belongs to exactly one path.
- A lesson belongs to exactly one chapter.
- A subtopic belongs to exactly one lesson.
- Concepts can map to lessons so we know where each concept is taught.
- Dependencies should be stored separately so the system can validate order.
- Generation runs should preserve prompt version, model/provider, stage, status, error, and output hash.
- Validation issues should be stored even when repaired, so we can improve prompts later.

## Course generation architecture

Do not generate the whole course in one request/response.

Use a job-based staged compiler:

```text
POST /api/learning-paths/generate
  → create GenerationJob(status="queued")
  → worker runs finite stages
  → frontend polls /api/generation-jobs/{id}
  → once complete, redirect to /roadmaps/{path_id}
```

Stages:

1. Normalize topic and level.
2. Load known subject pack or fetch compact source outline.
3. Build concept registry.
4. Build prerequisite graph.
5. Select course outcomes.
6. Create chapter plan.
7. Expand lessons.
8. Expand subtopics.
9. Run deterministic validation.
10. Run critic/repair only for failed sections.
11. Save final path.

The user sees progress messages like:

- Understanding your topic
- Finding the foundations you should not skip
- Building the concept map
- Ordering chapters by prerequisites
- Expanding lessons into subtopics
- Checking for missing basics
- Saving your learning journey

## API shape

Initial APIs:

```text
POST   /api/learning-paths/generate
GET    /api/generation-jobs/{job_id}
GET    /api/learning-paths
GET    /api/learning-paths/{path_id}
DELETE /api/learning-paths/{path_id}
PATCH  /api/learning-paths/{path_id}
PATCH  /api/lessons/{lesson_id}/progress
GET    /api/library/recent
POST   /api/library/save
DELETE /api/library/{item_id}
```

Later APIs:

```text
POST /api/learning-paths/{path_id}/repair
POST /api/learning-paths/{path_id}/regenerate-section
POST /api/lessons/{lesson_id}/generate-reading
GET  /api/search/sources
GET  /api/admin/generation-runs
```

## Migration path from Flask to Django

Do this in phases so the app does not break.

### Phase 1: Django backend skeleton

Create a `backend/` Django project beside the existing app. Add Django REST Framework, CORS handling, environment settings, and PostgreSQL support. Keep Flask running while Django APIs are built.

Success condition: Django server starts, health endpoint works, migrations run.

### Phase 2: Model the learning platform

Add Django models for learning paths, chapters, lessons, subtopics, progress, generation jobs, source packs, and validation issues.

Success condition: admin can inspect a generated path with nested content and progress.

### Phase 3: Port existing roadmap endpoints

Recreate the current Flask roadmap routes in Django using DRF serializers. Keep the response shape compatible with the React app at first.

Success condition: React roadmap pages work against Django without UI rewrites.

### Phase 4: Move generation into background jobs

Replace long-running synchronous generation with generation jobs. The frontend submits a topic, shows progress, polls status, and redirects when complete.

Success condition: no course generation request blocks the browser for a long time.

### Phase 5: Implement staged generation

Replace the single roadmap prompt with the staged curriculum compiler from `low-cost-learning-paths.md`.

Success condition: beginner ML paths reliably include Python basics, NumPy, pandas, math/statistics, ML framing, evaluation, and projects.

### Phase 6: Migrate saved data

Write a one-time migration script from `planner.db` JSON blobs into the Django/Postgres structure.

Success condition: old generated paths still open and show progress.

### Phase 7: Remove old Flask-only features

Delete or archive old planner/routine/week/study/prep backend and templates once the learning-platform routes are stable.

Success condition: the backend only contains product-relevant learning-platform code.

## Risks and how to avoid them

The main risk is a full rewrite that blocks UI progress. Avoid this by keeping React and making Django initially API-compatible with the existing Flask endpoints.

The second risk is overbuilding. Avoid this by starting with simple REST polling instead of WebSockets, simple user auth instead of complicated organizations, and one worker queue before adding advanced orchestration.

The third risk is making the generation system too agentic too early. Keep the agentic flow finite and schema-driven. Each stage should return JSON, each JSON object should be validated, and only failed sections should be repaired.

## Decision

For a serious launch, Django is a good backend choice for Learning Lab.

The best move is not a full-stack rewrite. The best move is a controlled backend migration:

```text
Keep React UI.
Move Flask APIs to Django.
Move SQLite data to PostgreSQL.
Move generation to background jobs.
Move roadmap planning to a staged curriculum compiler.
```

This gives the platform more control without throwing away the UI work already done.
