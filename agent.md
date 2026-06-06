# AGENTS.md

## Project Name

Agent Interview Notes

## Project Positioning

This project is a local-first, desktop/mobile dual-end Agent interview note intelligence system.

It is not a generic note-taking app, not a generic RAG platform, and not a fork of an existing open-source project.

The system focuses on Agent engineering interview preparation. It manages structured interview question cards, Markdown notes, AI understanding suggestions, RAG knowledge retrieval, related question recommendation, mind maps, knowledge graphs, review planning, and local deployment.

## Core Development Strategy

Use the following strategy:

* Build an independent main repository.
* Reuse the existing CRUD foundation where applicable.
* Refactor generic CRUD into domain-specific Card CRUD.
* Learn from open-source projects only at the level of product design, architecture, interaction patterns, and implementation ideas.
* Do not directly fork or copy large open-source projects.
* Prefer mature libraries for common capabilities instead of hand-writing everything.

Reference projects may include:

* note-gen: AI + Markdown note product form.
* Reor: local-first notes, semantic search, related note recommendation.
* SmartNotboot / SmartNotbook: Chinese intelligent note product structure.
* Readify: AI reading notes and mind map generation.
* RAGFlow: document parsing and RAG pipeline.
* MaxKB: knowledge base and RAG workflow design.
* RuoYi-AI: model provider abstraction, Agent / Skill ideas.
* Atomic: semantic links and knowledge graph.
* Obsidian / Logseq: Markdown, backlinks, local knowledge base.
* Khoj / OpenAgent: second brain automation and Agent task ideas.

Reference means learning from ideas. It does not mean copying project code.

## Non-Negotiable Requirements

### 1. Local-First Deployment

The project must support local deployment.

Target deployment model:

* Desktop computer acts as the local server.
* Mobile phone accesses the web app through LAN IP.
* The app should support PWA installation on mobile.
* Cloud services are optional, not mandatory.

Required local deployment components:

* Web app.
* Local PostgreSQL database.
* pgvector for vector search.
* Optional Ollama for local LLM / embedding.
* Docker Compose for startup.
* Local backup and restore mechanism.

The system must not depend on Supabase Cloud, OpenAI, DeepSeek, Zhipu, or any external SaaS to start.

### 2. Independent Main Repository

This project must remain an independent codebase.

Do not:

* Fork RAGFlow / MaxKB / RuoYi-AI / Dify / AnythingLLM as the main project.
* Copy large blocks of source code from open-source repositories.
* Rename another project and treat it as this project.
* Introduce unnecessary platform-level complexity from large RAG or Agent frameworks.

Do:

* Use mature libraries.
* Reimplement needed features around this project's own domain model.
* Document what was inspired by reference projects.

### 3. Domain Model Comes First

The core entity is `Card`, not a generic `Note`.

A card represents one Agent interview question.

A card should support:

* Topic.
* Question.
* Answer.
* Markdown answer notes.
* Extended notes.
* Interview script.
* Common mistakes.
* Tags.
* Difficulty.
* Frequency.
* Mastery.
* Review count.
* Last review date.
* Next review date.
* Probability weight.
* Review priority.
* Related cards.
* AI suggestions.
* Created and updated timestamps.

Generic CRUD must be converted into domain-specific Card CRUD.

### 4. AI Output Must Be Suggestion-Only

AI-generated content must never automatically overwrite user content.

AI can generate:

* Standard interview answer.
* Key points.
* Extended notes.
* Interview script.
* Common mistakes.
* Suggested tags.
* Suggested difficulty.
* Suggested frequency.
* Related question recommendations.

The user must explicitly choose what to accept.

All AI suggestions should be stored in `llm_suggestions` for traceability.

### 5. Clear Layered Architecture

Do not put business logic directly inside UI components.

Use this layering:

```text
app routes
  -> API routes
    -> services
      -> repositories
        -> database
```

Agent-related logic should be placed under:

```text
lib/agents/
```

LLM provider abstraction should be placed under:

```text
lib/llm/
```

RAG retrieval, chunking, and embedding logic should be placed under:

```text
lib/rag/
```

Import parsing logic should be placed under:

```text
lib/importers/
```

Review planning logic should be placed under:

```text
lib/review/
```

Backup and restore logic should be placed under:

```text
lib/backup/
```

## Preferred Tech Stack

Use the following default stack unless explicitly changed by the user:

* Frontend: Next.js + TypeScript + Tailwind.
* Desktop UI: responsive web app.
* Mobile UI: PWA with mobile-first review flow.
* Database: PostgreSQL.
* Vector search: pgvector.
* Deployment: Docker Compose.
* LLM providers: DeepSeek, OpenAI, Zhipu, Ollama.
* Table view: AG Grid or equivalent mature table component.
* Markdown editor: MDXEditor, Milkdown, TipTap, or another mature Markdown editor.
* Mind map: Mermaid.js.
* Knowledge graph: React Flow.
* Gantt chart: Frappe Gantt or ApexCharts.
* Local LLM: Ollama, optional.

## Required Pages

The complete target system should contain these pages:

```text
/
Dashboard

/cards
Card table

/cards/new
Create card

/cards/[id]
Card detail

/import
Batch import

/notes
Markdown note view

/knowledge
Knowledge documents

/search
Keyword / semantic / hybrid search

/mindmap
Mind map

/graph
Knowledge graph

/review
Review center

/review/gantt
Review Gantt chart

/agents
Agent automation panel

/settings
General settings

/settings/llm
LLM settings

/settings/local
Local deployment settings

/settings/backup
Backup and restore
```

## Required Database Tables

The full target database should include:

```text
cards
card_links
card_versions
review_log
review_tasks
knowledge_documents
knowledge_chunks
llm_suggestions
agent_runs
import_jobs
app_settings
```

Important requirements:

* Use UUID primary keys where appropriate.
* Use `question_hash` for card deduplication.
* Use `created_at` on all tables.
* Use `updated_at` on mutable tables.
* Use CHECK constraints for controlled fields.
* Use pgvector for embeddings.
* Keep schema compatible with local PostgreSQL.

## Card Relationship Types

Supported card relationship types:

```text
related
prerequisite
compare
follow_up
same_topic
```

Each relation should optionally include:

* Reason.
* Score.
* Source of recommendation: manual / tag / vector / llm / hybrid.

## Review Formula

Base probability weight:

```text
base_weight = difficulty_factor * frequency_factor * (1 - mastery)
```

Difficulty factors:

```text
初级 = 0.8
中级 = 1.0
高级 = 1.2
```

Frequency factors:

```text
高频 = 1.0
中频 = 0.7
低频 = 0.4
```

Review priority may extend the base formula:

```text
review_priority =
  base_weight * 0.7
+ forgetting_factor * 0.2
+ manual_boost * 0.1
```

The review system should support:

* Today's review list.
* Review Gantt chart.
* Manual schedule adjustment.
* Completing a review.
* Updating mastery.
* Writing review logs.
* Recalculating priority after review.

## AI Agents

Use lightweight Agent Service classes before introducing heavy Agent frameworks.

Required agent services:

```text
CardUnderstandingAgent
RelatedQuestionAgent
ReviewPlannerAgent
KnowledgeImportAgent
MindMapAgent
```

Agent run records should be written into `agent_runs`.

Each agent should have:

* Clear input schema.
* Clear output schema.
* Error handling.
* Optional LLM provider.
* No automatic destructive actions.

## RAG Requirements

RAG is used to support card understanding and knowledge-based answer generation.

Required RAG capabilities:

* Import Markdown / TXT / PDF when feasible.
* Parse document content.
* Chunk documents.
* Generate embeddings.
* Store chunks in PostgreSQL + pgvector.
* Support keyword search.
* Support vector search.
* Support hybrid search.
* Return citations or source snippets.
* Provide context to AI card understanding.

The first implementation may use simple text chunking, but the design must allow future parser improvements.

## Import Requirements

Supported import formats:

* CSV.
* JSON.
* Markdown list.
* Obsidian Markdown, when feasible.
* Logseq-style outline, when feasible.

Import flow:

```text
Upload or paste content
-> Parse
-> Normalize fields
-> Generate question_hash
-> Detect duplicates
-> Preview result
-> Choose skip / overwrite / merge
-> Import into cards
-> Generate import job record
```

Never silently discard user data.

## Mobile Requirements

Mobile is not an afterthought.

The mobile UI should prioritize:

* Today's review.
* Card reading.
* Quick mastery update.
* Search.
* Viewing standard answers.
* Simple note editing.
* PWA installation.

Desktop can expose the full management UI.

Recommended layout:

* Desktop: sidebar + main content.
* Mobile: bottom tab navigation.

## Security and Privacy Requirements

Do not hardcode API keys.

Use environment variables:

```text
DATABASE_URL
LLM_PROVIDER
DEEPSEEK_API_KEY
OPENAI_API_KEY
ZHIPU_API_KEY
OLLAMA_BASE_URL
NEXT_PUBLIC_APP_URL
```

User notes and imported documents may contain private information.

LLM calls should be explicit and user-triggered unless the user has configured automation.

Local Ollama should be supported as a privacy-friendly option.

## Development Workflow Rules

### Task Size

Do not perform huge cross-module changes in one step.

Each implementation task should cover one coherent area only, for example:

* Project skeleton.
* Database schema.
* Repository layer.
* Card CRUD.
* Import system.
* Markdown editor.
* LLM provider.
* AI understanding.
* RAG retrieval.
* Related card recommendation.
* Mind map.
* Review planner.
* Local deployment.

### Before Coding

Before implementing, inspect the existing files and determine:

* Current framework.
* Current directory structure.
* Existing CRUD implementation.
* Existing database access pattern.
* Existing style conventions.
* Existing tests.
* Existing build scripts.

Do not assume the project structure without checking it.

### During Coding

Follow existing style and conventions.

Do not rewrite unrelated files.

Do not introduce unnecessary abstractions.

Do not add dependencies unless they are justified.

Do not break existing CRUD behavior while refactoring.

### After Coding

After each task, provide:

* What changed.
* Files changed.
* How to run.
* How to test.
* Known limitations.
* Next recommended task.

Run available checks when possible:

```text
npm run lint
npm run build
npm test
```

If a check cannot be run, explain why.

## Documentation Requirements

Every major module should be documented.

Required docs:

```text
README.md
docs/PRODUCT_PLAN.md
docs/ARCHITECTURE.md
docs/LOCAL_DEPLOYMENT.md
docs/references/REFERENCE_PROJECTS.md
```

When a new major module is added, update the relevant docs.

Documentation should explain not only what exists, but also why the design was chosen.

## Open Source Reference Policy

This project may reference open-source projects for ideas, but must not copy large code blocks.

When using a third-party library:

* Check the license.
* Add it to package dependencies.
* Use it through normal package installation.
* Do not paste library source code into the project.

When inspired by a project design:

* Reimplement in this project's architecture.
* Document the inspiration if it materially affects design.
* Keep this project's domain model independent.

## Prohibited Actions

Do not:

* Convert the project into a generic RAG platform.
* Convert the project into a generic note app.
* Directly fork and rename another large project.
* Copy proprietary or incompatible-license code.
* Hardcode secrets.
* Require cloud services for basic local startup.
* Put LLM calls in render logic.
* Let AI overwrite user notes automatically.
* Mix database logic directly into UI components.
* Make large unrelated refactors in the same task.
* Remove existing working CRUD without replacing it.
* Ignore mobile layout.
* Ignore local deployment.
* Ignore build errors.

## Expected Output Style for AI Coding Assistants

When responding to development tasks, use this structure:

```text
Implementation Summary
- ...

Files Changed
- ...

Validation
- ...

How to Run
- ...

Known Limitations
- ...

Next Step
- ...
```

Keep explanations concrete and implementation-oriented.

## Project North Star

The final product should be explainable in one sentence:

A local-first Agent interview knowledge card system where the desktop runs the data, model, and services, while the phone provides a lightweight review experience; the system combines structured card CRUD, Markdown notes, AI understanding, RAG retrieval, knowledge graph, mind map, and probability-based review planning.
