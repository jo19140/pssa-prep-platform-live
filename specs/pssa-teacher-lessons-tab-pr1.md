# Teacher Lessons Tab PR1

PR1 adds a read-only Teacher Lessons tab inside the State Track teacher workspace. The tab exposes approved prebuilt lessons for teacher browsing and preview only.

## Contract

- The library is read-only: no assignment controls and no assignment writes.
- Teachers and admins may read the list and preview routes.
- Student and parent roles are denied by the shared role gate.
- List responses include metadata only: id, title, grade level, skill, domain, standard codes, placement, category, category label, and approval status.
- Preview responses include lesson content and teacher-only answer fields for approved, visible lessons.
- Approved database rows join to prebuilt seeds by exact grade level and skill.
- Hidden, foundational, unmatched, unapproved, and Grade 3 TDA-by-title lessons do not preview by direct ID.
- Ambiguous seed keys or duplicate approved database keys fail as integrity errors instead of guessing.

## Grade 3 Source Audit

The Grade 3 source audit expects all 27 Grade 3 seeds to have exactly one top-level bridge tag:

- 8 Key Ideas & Evidence
- 5 Craft & Structure
- 5 Vocabulary
- 3 Conventions
- 3 Writing
- 1 Foundational Support
- 2 Explicit Grade 3 bridge exclusions

The maximum visible Grade 3 runtime library is 23 lessons: 21 State Track lessons and 2 supplemental writing lessons. The Grade 3 `TDA Evidence and Explanation` seed stays hidden.

## Teacher UI

`/teacher?tab=lessons` renders inside the State Track tab frame. Available grades, domains, and skills are derived from approved visible data. Filters reset when their selected value no longer exists in the filtered result set. Search matches title, skill, and standards case-insensitively.

Cards are grouped in this order:

1. Key Ideas & Evidence
2. Craft & Structure
3. Vocabulary
4. Conventions
5. Writing & Short Answer or Writing & TDA

Grade 3 writing is labeled as supplemental writing practice and carries the note: "Grade 3 short-response practice; not an official TDA task."
