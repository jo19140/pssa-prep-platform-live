# Unified Dashboard Shell Phase 1

Phase 1a adds the plumbing for a parent-first unified dashboard shell without
wiring the parent page into the new shell yet.

- Product entitlements are derived from linked children for parent dashboards.
- State Track is live when a linked child has any enrolled test-prep module.
- Buddy products are keyed exhaustively by `SynesisProgram`: `VENUS` maps to live
  Reading Buddy with Harper, `MERCURY` maps to coming-soon Math Buddy with
  Damien, `MARS` maps to coming-soon Science Buddy, and `EARTH` maps to
  coming-soon History Buddy. Enrolling a child in a non-Reading Buddy program
  must not load or imply Reading Buddy data.
- Product navigation can activate only enrolled live products. Coming-soon
  products render as disabled, honest product cards and never fabricate progress.
- Parent dashboard loading is split into a pure core and a server-only Prisma wrapper.
- The parent dashboard API keeps its existing public State Track fields and adds
  product entitlement metadata.
- Synesis shell/header remain server components. Existing call sites stay in
  legacy navigation mode by default.
- Product navigation is an opt-in client leaf rendered only when explicitly
  passed to the shell/header.
