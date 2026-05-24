# Agent Guidance

## Product Strategy

This repository is no longer only a Pennsylvania PSSA test-prep platform. Treat it as an AI-powered standards-based mastery and intervention platform for grades 3-8.

The existing PSSA work is the first supported state-specific implementation: Pennsylvania PSSA ELA. Preserve it, improve it, and keep state-specific behavior available, but avoid making PSSA the global product identity.

## Default Product Language

Use broad product language for shared surfaces:

- standards-aligned diagnostic
- mastery and growth
- gaps and misconceptions
- personalized learning path
- targeted practice
- mini-lessons
- progress checks
- intervention recommendations
- tutor/interventionist/parent workflows

Use PSSA language only when a feature is specifically about the Pennsylvania PSSA module, PSSA-style items, PA Core standards, TDA scoring, or Pennsylvania assessment preparation.

## Primary Users

Prioritize tutors, reading interventionists, and small learning centers first. Parent workflows are second. School and district workflows are later-stage expansion, even though some classroom and roster features already exist.

When making product decisions, prefer small-caseload intervention workflows over district-only assumptions.

## Architecture Guidance

When touching assessment, standards, diagnostic, scoring, reporting, learning path, or lesson-generation code:

- Prefer module-aware design over hardcoded PSSA assumptions.
- Keep `state`, `subject`, `grade`, standards framework, and assessment module explicit.
- Treat standards catalogs as reusable data, not one-off strings.
- Treat assessment blueprints as pluggable modules, not global rules.
- Keep deterministic scoring, answer keys, and audit trails reliable.
- Let AI generate explanations, lessons, recommendations, and practice drafts, but do not let AI silently replace validated scoring logic.

## LLM Instrumentation Guidance

When wrapping any LLM, model, heuristic, or AI-adjacent call for logging, tracing, telemetry, evaluation, or data-flywheel capture:

- Preserve behavior exactly. The wrapped function's returned output must be equal to the unwrapped output for the same input.
- Keep capture best-effort and non-blocking; logging failures must not break user-facing flows.
- Do not store filled prompts or free-text student PII in instrumentation payloads. Use stable prompt keys, IDs, counts, and metadata.
- Add a wrapped-vs-unwrapped equality fixture by default. The fixture should run the wrapped path and equivalent unwrapped path with deterministic/fake model output and assert deep equality, including when capture persistence fails.

## PSSA Handling

Do not delete PSSA-related code, prompts, seed data, samplers, rubrics, or PA Core mappings. Reframe or wrap them as Pennsylvania PSSA ELA module assets.

Acceptable PSSA-specific locations include:

- assessment module definitions
- PSSA diagnostic generators and blueprints
- PA Core standards mappings
- PSSA item sampler/style references
- TDA rubric and scoring support
- UI copy for explicitly PSSA-aligned assessments

Avoid PSSA-specific language in:

- app metadata
- global navigation/header branding
- login and generic onboarding copy
- generic dashboards
- parent-facing summaries unless the assessment is explicitly PSSA-aligned
- README or product-level docs, except as a supported module

## Implementation Phases

Follow this phased strategy unless the user asks for a different scope:

1. Keep PSSA but rename and reposition product-level surfaces.
2. Generalize standards catalogs, assessment modules, diagnostics, scoring metadata, and reporting.
3. Add tutor and interventionist workflows for caseloads, gap groups, progress checks, and intervention recommendations.
4. Expand to parent-pay workflows and additional state modules.

## Current Codebase Notes

The schema already has useful foundations: `Assessment.state`, `Assessment.subject`, grade, standards on questions, mastery reports, learning paths, parent profiles, tutor memory, lessons, and progress checks.

Known areas that still contain PSSA-only assumptions include product copy, demo titles, generated assessment titles, PSSA sampler imports, PSSA ELA design rules, TDA rubric prompts, lesson-generation prompts, tutor-agent guardrails, and default assignment/test names.

When changing these areas, keep behavior stable and make the smallest useful move toward module-aware naming.
