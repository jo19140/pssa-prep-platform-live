# Unified Dashboard Shell Phase 1

Phase 1a adds the plumbing for a parent-first unified dashboard shell without
wiring the parent page into the new shell yet.

- Product entitlements are derived from linked children for parent dashboards.
- Parent dashboard loading is split into a pure core and a server-only Prisma wrapper.
- The parent dashboard API keeps its existing public State Track fields and adds
  product entitlement metadata.
- Synesis shell/header remain server components. Existing call sites stay in
  legacy navigation mode by default.
- Product navigation is an opt-in client leaf rendered only when explicitly
  passed to the shell/header.
