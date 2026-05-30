# Sýnesis Learning · Content Intake

This folder is where you drop teacher-curated content (passages, work examples, decodable texts, word lists) that the Reading Buddy and lesson generators will eventually consume.

## How to use this folder

**Don't worry about organization at first.** Drop raw uploads into `raw/`. Once we see what's there, we'll move things into the structured folders below and write the seeding scripts.

```
content/
├── raw/                ← drop new files here; format doesn't matter (PDF, DOCX, TXT, image, audio)
├── passages/           ← cleaned, structured reading passages (markdown + frontmatter)
│   └── grade-3/
│   └── grade-4/
│   └── ...
├── work-examples/      ← teacher exemplars showing what good practice looks like
└── word-lists/         ← curated phonics word lists (when teacher-curated is preferred over auto-generated)
```

## What kinds of content the Buddy/platform can use

### Reading passages (highest value)
* Short texts (50–500 words) that target a specific phonogram, syllable type, or grade band.
* Source matters: original works, teacher-written, or content with verified open licensing (Creative Commons, public domain, etc.). Avoid copying from copyrighted basal readers without permission.
* For each passage, useful to know: grade level, target phonogram(s), syllable types featured, total word count, and (optionally) a few comprehension questions.

### Decodable texts
* Passages specifically designed for early/striving readers — built almost entirely from words containing already-taught patterns plus a small number of high-frequency irregulars.
* These are the gold standard for Buddy practice with younger or below-grade-level kids.

### Work examples (next most useful)
* Sample student responses: what a strong reading sounds like, what common errors look like, exemplars of good/needs-improvement responses.
* Audio recordings of fluent reading at different grade levels are extremely valuable if you have them — they let the Buddy's calibration model anchor what "good" sounds like.

### Word lists (already partly automated)
* The v2 phonogram pipeline auto-generates word lists by phonogram from CMUdict. Teacher-curated lists are higher quality (better word choice, fewer obscure words) — use these when you have them, especially for speed-drill mode.

### Teacher notes / pedagogy references
* Lesson plans, scope-and-sequence documents, Blevins routines you want the platform to default to — these go in `work-examples/` and inform how the lesson generator writes new content.

## What to do after uploading

After you drop new files in `raw/`, tell me. I'll:
1. Read what's there.
2. Suggest a structure for organizing it into `passages/`, `work-examples/`, etc.
3. Write a seeding script (or Codex spec) to ingest the structured content into the database so the Buddy can use it.

## What NOT to upload here

* Copyrighted material from commercial publishers (basal readers, test-prep workbooks) without explicit permission.
* Student work samples that contain personally identifiable information (PII) — redact names, photos, anything identifying first.
* Audio recordings of identifiable minors without parental consent.

## File naming suggestion (for when you start organizing)

When ready to move from `raw/` to structured folders:

```
passages/grade-4/decodable_sh_digraph_001.md
passages/grade-6/fluency_r-controlled_001.md
work-examples/grade-3_good_reading_excerpt_001.mp3
work-examples/grade-5_teacher_annotations_001.pdf
```

Not strict — just consistent enough to query.
