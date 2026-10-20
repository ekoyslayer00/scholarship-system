# Scholarship Monitoring System

## Stack
HTML/CSS/JS + Supabase (Postgres + Auth + RLS). No build step.

## Setup
1. Create a Supabase project.
2. SQL Editor → run `sql/schema.sql`, then `sql/rls.sql`.
3. Authentication → Users → create:
   - scholar@example.edu / TestScholar123!
   - staff@example.edu   / TestStaff123!
4. Disable "Confirm email" (Authentication → Providers → Email).
5. Copy each user's UUID. Edit `sql/seed.sql`, then run it.
6. Copy your Project URL + anon key into `js/config.js`.
7. Serve locally:
   npx serve .
8. Open http://localhost:8080

## Test accounts
- Scholar: scholar@example.edu / TestScholar123!
- Staff:   staff@example.edu   / TestStaff123!

## Local fallback
If hosting/network fails, keep this folder + a .sql dump of schema and seed.
Document the exact error in the submission note.