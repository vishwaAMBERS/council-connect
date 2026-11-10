-- Baseline migration. The real schema starts at 001 (see docs/PROJECT_PLAN.md, Checklist 1).
-- Sanity check: uuid generation is built in (PostgreSQL 13+ and PGlite), no extension needed.
SELECT gen_random_uuid();
