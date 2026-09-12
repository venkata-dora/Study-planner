# Staged learning-path generation blueprint

Updated: 11 September 2026

This document is the implementation plan for generating high-quality learning journeys in Learning Lab. It turns the research notes into a practical system: one small task at a time, clear data contracts, visible validation, and lesson blogs generated only after the roadmap structure is strong.

Attached research reports are treated as reference material only. They are not instructions for the application unless a decision below adopts them.

## Product goal

A learner should be able to type a subject such as `machine learning`, `psychology`, `frontend`, `Java`, `world history`, or `creative writing` and receive a clear reading-first learning path.

The path should show:

- what the learner will be able to do by the end;
- what prior knowledge is assumed or taught inside the path;
- chapters in a sensible order;
- lessons inside every chapter;
- exact subtopics inside every lesson;
- checkpoints that test real understanding;
- blog-generation briefs that produce focused articles without inventing missing structure.

The platform should not generate an entire curriculum in one model call. The quality target is not “a long roadmap.” The quality target is a path where every lesson has a reason to exist and every blog has enough context to teach properly.

## Core decision

Build a staged curriculum compiler.

The compiler freezes each layer before expanding the next layer:

```text
User request
  → scope
  → outcomes
  → concept registry
  → prerequisite graph
  → chapter plan
  → lesson plan
  → subtopic plan
  → validation and repair
  → blog brief
  → blog article
```

Each stage has one responsibility. If a stage fails, repair that stage or its smallest affected subtree. Do not regenerate the whole path unless the scope itself changed.

This is the main change from the previous plan. A single-pass planner may be kept only as a quick prototype fallback; it should not be the production path for public launch.

## Why this is needed

The current generator can create a visually neat path, but it can still miss foundations. For example, a beginner machine-learning path that starts with NumPy and pandas but does not clearly teach Python basics, arrays, functions, data structures, and math foundations is incomplete.

The failure usually comes from asking one prompt to do too many jobs:

```text
choose scope
choose prerequisites
choose concepts
sequence chapters
write lesson names
write subtopics
format JSON
```

When the model compresses all of that into one pass, it often creates attractive labels but misses the boring foundations that real learners need.

## Generated object hierarchy

Use this hierarchy everywhere in the backend and UI:

```text
LearningPath
  CourseOutcome[]
  Concept[]
  ConceptDependency[]
  Chapter[]
    Lesson[]
      Subtopic[]
      LessonCheckpoint
    ChapterCheckpoint
  FinalTask
  EvidenceSource[]
  ValidationIssue[]
  GenerationRun[]
```

Terms:

- **Path**: the bounded learner outcome.
- **Outcome**: what the learner can do after finishing.
- **Concept**: knowledge or skill that must be introduced somewhere.
- **Chapter**: a coherent phase of learning.
- **Lesson**: one teachable objective that can become one blog.
- **Subtopic**: the exact thing the blog must explain, compare, demonstrate, or correct.
- **Checkpoint**: a task proving the learner can use the material.
- **Blog brief**: a structured authoring plan generated from one approved lesson.

## Stage 1: normalize scope

Purpose: turn the user's input into a bounded learning request.

Input:

```json
{
  "raw_subject": "machine learning",
  "starting_level": "Beginner",
  "goal": null,
  "depth": "foundation",
  "weekly_time": null,
  "language": "English"
}
```

Prompt:

```text
You normalize learning requests for a reading-first learning platform.
Return JSON only.

The learner may type a broad field, a narrow concept, a tool, a programming language,
or a practical skill. Create a bounded scope that can become a useful learning path.

Rules:
1. If the request is ambiguous, return needs_clarification with one short question.
2. If the request is broad, choose a foundation scope and name later directions.
3. If the learner is a beginner, include missing prerequisites inside the path unless
   the learner explicitly says they already know them.
4. Do not promise mastery of an entire field.
5. Keep the scope useful for reading-based learning and checkpoints.
```

Output contract:

```json
{
  "status": "ready | needs_clarification",
  "question": "string | null",
  "normalized_subject": "string",
  "path_title": "string",
  "learner_level": "Beginner | Intermediate | Advanced",
  "target_outcome": "string",
  "include": ["string"],
  "exclude": ["string"],
  "assumed_knowledge": ["string"],
  "must_teach_prerequisites": ["string"],
  "next_directions": ["string"]
}
```

Validation:

- Broad topics must include `exclude` and `next_directions`.
- Beginner technical paths must explicitly state prerequisites to teach.
- Ambiguous topics must not proceed without clarification.

## Stage 2: research or load subject pack

Purpose: gather reliable curriculum structure before planning.

Use this order:

1. reviewed local subject pack;
2. official documentation or standards;
3. university syllabus or reputable course outline;
4. open textbook table of contents;
5. major established learning provider outline;
6. specialist reference.

Do not send full webpages to the planner. Extract only compact headings, prerequisite notes, learning outcomes, and source metadata.

Recommended first integration: Tavily Search + Extract for cache misses. Add Firecrawl later only if documentation-site extraction fails often. OpenAlex is useful later for research-heavy academic paths.

Subject pack shape:

```json
{
  "pack_id": "ml-foundations-v1",
  "subject": "Applied Machine Learning Foundations",
  "level": "Beginner",
  "sources": [
    {
      "id": "src_google_mlcc",
      "title": "Machine Learning Crash Course",
      "publisher": "Google",
      "url": "https://developers.google.com/machine-learning/crash-course",
      "source_type": "official_course",
      "fetched_at": "2026-09-11"
    }
  ],
  "concept_candidates": [
    {
      "name": "Python functions for data workflows",
      "source_ids": ["src_a", "src_b"],
      "notes": "Required before reusable preprocessing examples."
    }
  ],
  "known_prerequisites": [
    ["Python variables", "Python functions"],
    ["NumPy arrays", "feature matrix"]
  ],
  "common_misconceptions": ["Accuracy is always the best classification metric."]
}
```

Validation:

- Every source has publisher, URL, type, and fetched date.
- Required concept candidates should be supported by at least two sources or one authoritative source.
- Unknown or weakly sourced areas are marked as draft, not verified.

## Stage 3: build concept registry

Purpose: create the complete list of concepts before chapters exist.

Prompt:

```text
You create a concept registry for a learning path.
Return JSON only.

Inputs:
- normalized scope
- learner level
- target outcome
- subject pack

Task:
1. List the concepts and component skills needed to reach the target outcome.
2. Include prerequisites that must be taught inside the path.
3. Keep specific concepts separate. Do not collapse them into labels like basics,
   tools, advanced topics, or best practices.
4. Add prerequisite edges only when the later concept is hard to learn without the earlier one.
5. Mark each concept as required, supporting, or optional.
6. Include the source IDs that justify each concept when available.
```

Output contract:

```json
{
  "concepts": [
    {
      "id": "concept_python_functions",
      "name": "Python functions for reusable data logic",
      "description": "Define and call small functions that transform values or collections.",
      "importance": "required | supporting | optional",
      "source_ids": ["string"],
      "introduced_by_default": true
    }
  ],
  "dependencies": [
    {
      "from": "concept_python_variables",
      "to": "concept_python_functions",
      "reason": "Functions use variables, parameters, and return values."
    }
  ],
  "gaps": ["string"]
}
```

Validation:

- IDs are stable and unique.
- Dependencies point to existing concepts.
- Dependency graph has no cycles.
- Required beginner prerequisites are present.

## Stage 4: generate course outcomes

Purpose: define the learner destination before chapters are created.

Prompt:

```text
You define measurable outcomes for a reading-first learning path.
Return JSON only.

Use the normalized scope and concept registry.
Create 3 to 6 outcomes. Each outcome must describe what the learner can do,
not just what they understand.

Use verbs such as explain, compare, calculate, identify, diagnose, design,
interpret, implement, critique, or apply.
Avoid vague outcomes such as “understand machine learning.”
```

Output contract:

```json
{
  "outcomes": [
    {
      "id": "outcome_prepare_tabular_data",
      "text": "Prepare a small tabular dataset by inspecting columns, cleaning missing values, and creating features.",
      "concept_ids": ["concept_pandas_dataframe", "concept_missing_values"]
    }
  ]
}
```

Validation:

- Every outcome maps to at least one required concept.
- Outcomes are observable.
- No outcome claims material outside the chosen scope.

## Stage 5: generate chapter architecture

Purpose: group concepts into a small number of coherent learning phases.

Prompt:

```text
You design chapter architecture for a learning path.
Return JSON only.

Inputs:
- normalized scope
- course outcomes
- concept registry
- prerequisite graph

Task:
1. Create chapters in prerequisite order.
2. Each chapter must have one clear role in the learning journey.
3. Assign required concepts to chapters.
4. Do not create lessons yet.
5. Add one chapter checkpoint that tests chapter-level capability.
6. If a chapter would be overloaded, split it.
```

Output contract:

```json
{
  "chapters": [
    {
      "id": "chapter_python_for_ml",
      "number": 1,
      "title": "Python foundations for machine learning",
      "role": "Teach the minimum programming ideas needed before arrays and dataframes.",
      "outcome_ids": ["outcome_read_modify_python"],
      "concept_ids": ["concept_python_variables", "concept_python_functions"],
      "checkpoint": {
        "task": "Read a short Python snippet and explain the values produced by variables, loops, and a function call.",
        "success_criteria": ["Names the value of each variable", "Explains what the function returns"]
      }
    }
  ]
}
```

Validation:

- Every required concept is assigned to exactly one primary chapter.
- Chapter order respects concept dependencies.
- No chapter title is generic.

## Stage 6: generate lessons per chapter

Purpose: break one chapter into teachable lesson objectives.

Call this stage separately for each chapter. Pass the full course summary, but only expand the current chapter.

Prompt:

```text
You design lessons for one chapter of a learning path.
Return JSON only.

Inputs:
- course scope
- outcomes
- full chapter list
- current chapter
- concept registry
- prerequisite graph

Task:
1. Create lessons only for the current chapter.
2. Each lesson gets one observable objective.
3. Assign chapter concepts to lessons.
4. Add prerequisite lesson IDs when needed.
5. Do not create subtopics yet.
6. If a concept is too large for one lesson, split it into multiple lessons.
7. Do not repeat concepts already taught in previous chapters except as brief review.
```

Output contract:

```json
{
  "chapter_id": "chapter_numpy_data_toolkit",
  "lessons": [
    {
      "id": "lesson_numpy_array_shape_dtype",
      "title": "How NumPy arrays store numeric data",
      "objective": "Explain how array shape and dtype describe a numeric dataset.",
      "concept_ids": ["concept_numpy_array", "concept_shape", "concept_dtype"],
      "prerequisite_lesson_ids": ["lesson_python_lists_indexing"],
      "estimated_reading_minutes": 10
    }
  ]
}
```

Validation:

- Every lesson has exactly one objective.
- Every assigned concept belongs to the chapter or is a justified bridge.
- No duplicate lesson objectives.
- Lesson order respects prerequisites.

## Stage 7: expand subtopics per lesson

Purpose: make each lesson blog-ready.

Call this stage separately for each lesson. This is the stage that prevents shallow blogs.

Prompt:

```text
You expand one lesson into precise blog-ready subtopics.
Return JSON only.

Inputs:
- course scope
- chapter role
- lesson objective
- assigned concepts
- prior lesson objectives
- next lesson title
- allowed source IDs

Task:
1. Create 4 to 8 subtopics that together teach the lesson objective.
2. Every subtopic must answer one clear question or teach one small distinction.
3. Include a teaching purpose: explain, demonstrate, compare, practice, or correct_misconception.
4. Include one required example for the lesson.
5. Include one misconception or failure mode.
6. Include one completion check aligned to the objective.
7. Include a scope boundary that says what this lesson intentionally leaves for later.
8. If the lesson is too broad, return needs_split with the suggested smaller lessons.
```

Output contract:

```json
{
  "lesson_id": "lesson_numpy_array_shape_dtype",
  "status": "ready | needs_split",
  "suggested_splits": [],
  "subtopics": [
    {
      "id": "subtopic_array_vs_list",
      "title": "Why arrays are different from Python lists",
      "question_answered": "Why does NumPy use arrays instead of ordinary lists for numeric data?",
      "purpose": "compare",
      "concept_ids": ["concept_numpy_array"],
      "source_ids": ["src_numpy_docs"]
    }
  ],
  "required_example": "Represent five house prices as a one-dimensional array and a small dataset as a two-dimensional array.",
  "misconception": "A NumPy array is just a faster Python list with the same behavior.",
  "completion_check": "Given an array shape of (1000, 5), explain what the rows and columns represent.",
  "scope_boundary": "Broadcasting and vectorized arithmetic are taught in the next lesson."
}
```

Validation:

- Required lesson concepts map to subtopics.
- Subtopics are specific enough for a writer to teach.
- Subtopics are not just keywords.
- The completion check tests the lesson objective.
- `needs_split` is accepted and triggers lesson repair instead of saving a weak lesson.

## Stage 8: validate and repair

Purpose: protect the product from attractive but incomplete paths.

Run deterministic checks first:

```text
schema validity
unique IDs
valid references
no dependency cycles
prerequisites appear before dependents
required concepts mapped to chapters
required concepts mapped to lessons
required lesson concepts mapped to subtopics
outcomes mapped to checkpoints
no vague titles
no duplicate normalized titles
subtopic count inside limits
lesson objective has matching completion check
```

Then use an LLM critic only for semantic review.

Critic prompt:

```text
You are a strict curriculum auditor.
Return JSON only.

You may not rewrite the curriculum. Report defects only.

Check:
1. scope fidelity
2. missing prerequisites
3. prerequisite order
4. required concept coverage
5. chapter coherence
6. lesson atomicity
7. subtopic specificity
8. duplicate content
9. checkpoint alignment
10. beginner friendliness

For every issue, return the smallest safe repair.
Return PASS only if there are no high-severity defects.
```

Output contract:

```json
{
  "status": "PASS | REPAIR_REQUIRED",
  "issues": [
    {
      "id": "issue_missing_python_functions",
      "severity": "high | medium | low",
      "code": "MISSING_PREREQUISITE",
      "affected_ids": ["chapter_python_for_ml"],
      "description": "The path expects Python functions but never teaches parameters or return values.",
      "smallest_safe_repair": "Add one lesson on defining and calling simple functions before NumPy examples."
    }
  ]
}
```

Repair prompt:

```text
Repair exactly the listed curriculum issues.
Return JSON only.

Rules:
1. Change only the affected chapter, lesson, or subtopic subtree.
2. Preserve existing IDs unless an ID belongs to a newly created node.
3. Do not rewrite unrelated chapters.
4. Do not add unsourced claims.
5. Return repaired content and the issue IDs addressed.
```

Validation after repair is mandatory. If the second validation fails, save the path as `needs_review` instead of pretending it is ready.

## Stage 9: generate blog brief

Purpose: convert one approved lesson into a writing plan.

Prompt:

```text
You prepare an instructional writing brief for one lesson.
Return JSON only.

Do not write the final blog.

The final article must:
- achieve the lesson objective;
- assume only the listed prerequisites;
- cover every approved subtopic;
- define terms before using them;
- include the required example;
- address the misconception;
- include a short retrieval checkpoint;
- end with a bridge to the next lesson;
- avoid future-course concepts unless marked as preview.

For each section specify heading, teaching purpose, subtopics covered, example,
misconception handled, and any useful table, diagram, or code snippet.
```

Output contract:

```json
{
  "lesson_id": "lesson_numpy_array_shape_dtype",
  "title": "How NumPy arrays store numeric data",
  "opening_problem": "A CSV has 1,000 rows and 5 numeric columns. How should that become data a model can use?",
  "sections": [
    {
      "heading": "Rows, columns, and array shape",
      "purpose": "explain",
      "subtopic_ids": ["subtopic_array_shape_rows_columns"],
      "must_cover": ["shape tuple", "row count", "column count"],
      "example": "shape (1000, 5)",
      "assets": ["small table"]
    }
  ],
  "knowledge_check": {
    "questions": ["What does shape (20, 3) mean for a dataset?"],
    "answers": ["20 rows/examples and 3 columns/features."]
  },
  "next_lesson_bridge": "Once shape is clear, we can transform entire columns with vectorized operations."
}
```

Validation:

- Every required subtopic appears in at least one section.
- The brief includes example, misconception, checkpoint, and bridge.
- No section introduces concepts outside the lesson boundary unless marked preview.

## Stage 10: generate blog article

Purpose: write one focused reading lesson.

Prompt:

```text
Write one Markdown lesson from the approved blog brief.
Return JSON only.

Rules:
1. Teach the objective and every required subtopic.
2. Use the required example as the main thread.
3. Explain terms before using them.
4. Keep the article focused on this lesson's scope boundary.
5. Include one practice task and three recall/application questions with answers.
6. Do not include raw HTML or promotional filler.
7. If the brief is insufficient, return blocked with missing fields.
```

Output contract:

```json
{
  "status": "ready | blocked",
  "markdown": "string",
  "covered_subtopic_ids": ["string"],
  "unsupported_subtopic_ids": ["string"],
  "missing_inputs": ["string"]
}
```

Validation:

- Required subtopics are substantively covered, not only mentioned.
- Markdown sanitization passes.
- Practice task tests the completion check.
- Save only `ready` lessons.

## Loading and progress experience

The roadmap generator may take time because it is planning in stages. The UI should make that feel productive.

Use a staged loading screen with visible steps:

```text
Understanding your goal
Finding the right starting point
Building the concept map
Ordering prerequisites
Designing chapters
Expanding lessons
Checking for missing basics
Preparing your learning path
```

Show the active step, a short explanation, and a small preview when available:

- after scope: show the target outcome and assumptions;
- after concept registry: show a few important concepts found;
- after chapter plan: show chapter names as they appear;
- after validation: show “checking for gaps before we save this.”

If generation fails, keep the user's input and show a repairable state. Do not leave the learner on an empty page.

## Delete option for generated patterns

The user should be able to delete generated learnable patterns/roadmaps from `My learning paths`.

Behavior:

- Each saved custom path has a clear `Delete` action in its overflow menu.
- Deleting asks one lightweight confirmation because it removes progress and generated lesson links for that path.
- Built-in paths such as DSA, Python, Generative AI, System Design, and AI Interview are not deleted; they can be hidden only if that feature is added later.
- After deletion, the list updates immediately and the empty state remains polished.
- The backend should delete the path, generated blogs tied only to that path, progress rows, and generation records for that path.

## Beginner ML required foundation pack

For `machine learning`, `ML`, `data science`, and similar beginner requests, the planner must include these foundations unless the user says they already know them.

```text
Python basics for data work
  values, variables, expressions
  strings and numbers
  booleans and comparisons
  lists and dictionaries
  indexing and slicing
  loops and comprehensions
  functions, parameters, return values
  imports and reading simple errors

NumPy
  arrays versus lists
  shape, dimensions, dtype
  indexing and slicing arrays
  Boolean masks
  vectorized arithmetic
  axes and aggregations
  broadcasting intuition
  random data basics

pandas
  DataFrame and Series
  rows, columns, indexes
  reading CSV files
  inspecting shape, dtypes, missing values
  selecting/filtering rows and columns
  cleaning missing/duplicate/type issues
  groupby and aggregation
  merging and joining
  simple plots and exploratory questions

Math for introductory ML
  functions and graphs
  slope and intercept
  vectors as feature collections
  matrices as datasets
  mean, median, variance, standard deviation
  probability and conditional probability intuition
  loss as wrongness
  gradient descent intuition

ML framing
  examples, features, labels
  regression, classification, clustering
  train/validation/test split
  baseline models
  leakage
  evaluation metrics
  overfitting and underfitting
```

A beginner ML path that misses Python basics, NumPy details, pandas basics, or train/test evaluation should fail validation.

## Implementation sequence for this repository

1. Add schema v2 models for `CoursePlan`, `Outcome`, `Concept`, `Chapter`, `Lesson`, `Subtopic`, `Checkpoint`, `EvidenceSource`, and `GenerationRun`.
2. Keep current saved roadmaps backward-compatible. Map old `stages/topics/subtopics` into the v2 display model where possible.
3. Implement deterministic validators before changing prompts.
4. Replace the single roadmap prompt with staged prompt functions:
   - `normalize_scope`
   - `build_concept_registry`
   - `generate_outcomes`
   - `generate_chapters`
   - `generate_lessons_for_chapter`
   - `expand_subtopics_for_lesson`
   - `validate_curriculum`
   - `repair_curriculum`
   - `build_blog_brief`
5. Add the staged loading UI to `My learning paths` generation.
6. Add delete support for custom generated paths.
7. Update custom roadmap UI so subtopics are visible in list mode and journey mode.
8. Update blog generation to consume a `blog_brief`, not just a topic title.
9. Add source packs for three pilots before enabling web search:
   - Machine Learning for complete beginners
   - Frontend development foundations
   - Psychology foundations
10. Add Tavily-based source acquisition only after local packs and validators work.
11. Evaluate generated paths before public launch.

## Backend API shape

External user-facing API can remain simple:

```text
POST /api/roadmaps
GET  /api/roadmaps/:id
DELETE /api/roadmaps/:id
POST /api/lessons/:id/generate-blog
```

Internal generation should be staged:

```text
create_generation_run()
normalize_scope()
load_or_create_subject_pack()
build_concept_registry()
generate_outcomes()
generate_chapters()
generate_lessons_for_each_chapter()
expand_subtopics_for_each_lesson()
run_validators()
repair_once_if_needed()
freeze_and_save_path()
```

Store each stage result and status so the UI can show real progress instead of a fake spinner.

## Acceptance checks

A generated path is launch-quality only if:

- every saved path passes schema validation;
- no invalid roadmap is saved as ready;
- required beginner prerequisites are present;
- every required concept maps to a lesson and subtopic;
- every lesson has one objective, 4 to 8 subtopics, a misconception, an example, a completion check, and a scope boundary;
- prerequisite graph has no cycles;
- no lesson depends on a future lesson;
- no vague titles such as `Basics`, `Overview`, `Advanced Topics`, or `Key Concepts` appear alone;
- checkpoints test outcomes instead of asking only for definitions;
- blog briefs cover all required subtopics;
- blog articles report covered subtopic IDs;
- generation usage, latency, model, prompt version, and repair count are recorded;
- repeated cache hits do not call the model again;
- phone, tablet, and desktop views show roadmap, subtopics, loading, delete, and reader navigation without overflow.

## Release evaluation set

Before launch, test at least these requests:

```text
Machine learning, beginner
Machine learning, intermediate, already knows Python
NumPy broadcasting
Frontend development, beginner
React hooks
Java for backend development
World history foundations
French Revolution
Psychology foundations
Creative writing
Academic essay writing
System design interviews
Generative AI applications
Linear algebra for ML
Statistics for data analysis
```

For each request, review:

- scope honesty;
- missing prerequisites;
- sequence quality;
- subtopic specificity;
- checkpoint alignment;
- duplicate lessons;
- blog readiness;
- cost and latency.

If small models fail, improve the subject pack and validator before switching to a bigger model.

## Immediate next build tasks

These are the next concrete repository changes:

1. Replace the current custom roadmap prompt with staged internal prompt functions.
2. Add a `generation_steps` status object so the loading page can show real progress.
3. Add delete support for custom paths.
4. Add a stronger beginner ML subject pack with Python, NumPy, pandas, math, and ML framing.
5. Make blog generation use selected lesson subtopics and reject unsupported/empty lessons.
6. Add tests for:
   - beginner ML includes Python foundations;
   - NumPy lessons include more than one shallow topic;
   - deleting a custom path removes it from saved paths;
   - malformed model output does not save;
   - blog generation fails cleanly when lesson spec is missing.

## Non-goals for v1

Do not add these until the staged system works:

- multi-agent autonomous planning loops;
- fine-tuning;
- vector database;
- automatic paid web research for every request;
- full textbook generation during roadmap creation;
- model self-critique without deterministic validation;
- marketing claims that generated paths are expert verified.
