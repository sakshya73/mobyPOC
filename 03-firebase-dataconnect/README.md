# POC 3 — Firebase Data Connect

**Status:** scaffolded, build pending (we build POC 1 first).

## Plan
Expo app + **Firebase Data Connect** (Google's Postgres-backed Firebase, with a GraphQL layer).
Same minimal list/add UI as POC 1 — only the data/sync layer differs.

## Stack (planned)
- Expo (React Native) + TypeScript
- Firebase Data Connect (Cloud SQL Postgres + generated GraphQL SDK)

## What it will demonstrate
Whether Firebase Data Connect's relational + offline + realtime story is competitive with the
Supabase options — relevant because the client leans GCP/Firebase (and needs FCM anyway).
This is the newest of the three, so the offline story is the key thing to validate.

> This README + the CLAUDE.md will be expanded when the POC is built.
