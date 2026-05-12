# Product Vision

## Direction

This product is becoming an AI-powered mastery and intervention platform for grades 3-8. Its core job is to diagnose what a student understands, identify priority gaps and misconceptions, generate a personalized standards-based learning path, and help an adult guide the next intervention.

The existing Pennsylvania PSSA work remains valuable. It should be treated as the first state-specific standards and assessment implementation, not as the whole product identity.

## Positioning

The product should be positioned as a standards-based mastery platform for tutors, reading interventionists, learning centers, and families. It uses diagnostics, adaptive practice, AI-generated lessons, progress checks, and clear adult-facing recommendations to move students from gap identification to targeted growth.

Avoid presenting the product as only a Pennsylvania PSSA test-prep tool. PSSA language is appropriate inside the Pennsylvania module, PSSA-aligned assessment experiences, rubric references, and state-specific teacher workflows.

## Core Product Loop

1. A student takes a standards-aligned diagnostic.
2. The system identifies mastery, gaps, misconceptions, and priority standards.
3. AI generates a personalized learning path.
4. The student receives targeted practice, mini-lessons, explanations, and progress checks.
5. A teacher, tutor, interventionist, or parent sees growth, mastery, and recommended next interventions.

## Primary Users

The first commercial focus is tutors, reading interventionists, and small learning centers. These users need fast diagnostics, small-group visibility, assignable intervention lessons, evidence of growth, and parent-friendly reporting.

Parents are the second priority. Parent workflows should make student progress understandable, concrete, and actionable without requiring school-system vocabulary.

Schools and districts are a later expansion path. The current classroom, teacher dashboard, roster, scheduled report, and Google Classroom work can support this path, but district procurement should not drive the near-term product shape.

## Product Principles

- Diagnose first, then teach. The platform should always connect instruction and practice to observed evidence from diagnostic performance.
- Standards are the organizing layer. Assessments, lessons, reports, recommendations, and progress checks should all map back to a standards catalog.
- PSSA is a module. Pennsylvania PSSA ELA remains the first supported implementation and proof point.
- Intervention is the product outcome. Dashboards should answer: what does this student need next, why, and how urgent is it?
- AI should accelerate expert workflows. AI can draft lessons, explanations, practice, and recommendations, but deterministic scoring, answer keys, and audit trails must stay reliable.
- Adult-facing language should be clear. Tutor, interventionist, and parent views should translate standards data into practical next steps.

## Architecture Direction

Generalize from hardcoded PSSA behavior toward explicit standards and assessment modules:

- Standards catalogs: define state, subject, grade, standard code, label, domain/strand, skill, prerequisite links, mastery expectations, and parent-friendly explanations.
- Assessment modules: define blueprint, item types, scoring rules, rubric references, passage rules, timing, style guidance, and released-item references for a specific assessment or state implementation.
- Diagnostic engine: generate or select items from a requested state, subject, grade, assessment module, and purpose.
- Mastery model: track mastery, partial mastery, misconceptions, confidence, recency, growth, and intervention priority per standard.
- Learning path engine: create sequenced lessons, practice, checks, and retests from mastery evidence rather than from a single test identity.
- Role workflows: support tutor/interventionist caseloads first, then parent-pay flows, then district-scale administration.

## Phased Implementation Plan

### Phase 1: Keep PSSA, Rename And Reposition

Rebrand product-level copy away from PSSA-only language while retaining PSSA-specific labels where the user is explicitly creating or taking a Pennsylvania PSSA-aligned assessment. Add neutral product language around standards-based diagnostics, mastery, intervention, learning paths, and growth.

Recommended work:

- Rename global metadata, header copy, login copy, README copy, admin headlines, and generic dashboard language.
- Keep assessment titles like "Grade 6 PSSA ELA Diagnostic" only inside Pennsylvania assessment flows.
- Add a small concept of the active assessment module, initially `PA_PSSA_ELA`.
- Audit prompts so product identity says mastery/intervention platform while module prompts can still say PSSA.

### Phase 2: Generalize Standards And Diagnostics

Move standards and assessment design out of PA/PSSA-specific generator code into registries or database-backed catalogs. The current `Assessment.state`, `Assessment.subject`, grade, question standards, and learning path fields are a useful start, but the system needs first-class module metadata.

Recommended work:

- Introduce `StandardsFramework`, `Standard`, and `AssessmentModule` concepts.
- Replace comma-delimited assignment standards with structured standard references.
- Split generic diagnostic generation from PSSA-specific blueprint and sampler logic.
- Support multiple subjects and state frameworks without duplicating learning path logic.
- Store module provenance on generated assessments, reports, lessons, and rubrics.

### Phase 3: Add Tutor And Interventionist Workflows

Design the primary workflow around small caseloads and targeted intervention rather than traditional whole-class test prep.

Recommended work:

- Add tutor/interventionist caseload views across students, groups, standards, urgency, and next recommended action.
- Add intervention planning tools: assign mini-lessons, regroup students by gap, schedule progress checks, and produce parent updates.
- Add intake diagnostics and retest cycles built for weekly tutoring or intervention sessions.
- Improve adult-facing explanations of misconceptions, readiness, and intervention priority.

### Phase 4: Expand To Parent-Pay And Other States

Use the generalized standards and module architecture to add parent subscriptions and additional state implementations.

Recommended work:

- Add parent onboarding, child setup, payment/subscription gates, and home practice flows.
- Add other state modules by supplying standards catalogs, assessment blueprints, rubric rules, and style references.
- Add cross-state product reporting that still preserves state-specific assessment language.
- Build packaging for tutors, learning centers, and families before district-scale procurement.

## What Should Not Change Yet

Do not delete or flatten PSSA-specific work. Files such as PSSA sampler patterns, PSSA ELA design rules, TDA rubric logic, PA Core standard mappings, and existing PSSA demo data are current assets. They should be renamed or wrapped only when the architecture is ready to support multiple modules cleanly.

