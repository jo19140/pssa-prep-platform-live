# PSSA DB-5 Approval Write Summary

- Provenance: smoke-test output from local DB target `127.0.0.1:5434/pssa_dev`; purpose is CLI guardrail verification, not canonical item-bank state.
- DB target: postgresql://(user):(redacted)@127.0.0.1:5434/pssa_dev
- Mode: write
- Target: item
- Action: approve
- Eligible/actionable rows: 0
- Already no-op rows: 0
- Refused rows: 1
- Student-ready selector count after run: 4
- Dry-run CSV: /Users/diaz/pssa-prep-platform-live/reports/pssa_db5_approval_dryrun_smoke.csv

## Guardrails

- Any refused row aborts the whole write before mutation.
- Already-ready rows are no-ops and do not receive duplicate review logs.
- Student readiness is computed live by the DB-5 selector.
