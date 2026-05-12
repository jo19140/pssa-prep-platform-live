# Security Notes

## npm audit: PostCSS bundled under Next.js

- Package: `next` / transitive `next/node_modules/postcss`
- Severity: moderate
- Advisory: `GHSA-qx2v-qp2m-jg93`
- Status: `npm audit fix` safely upgraded Next from `15.5.15` to `15.5.18`, clearing the high-severity Next advisories. The remaining audit report recommends `npm audit fix --force`, which would install `next@9.3.3` and is a major, breaking downgrade for this Next 15 App Router app.
- Follow-up: Monitor Next.js releases for a non-breaking fix for the bundled PostCSS advisory and upgrade when available.
