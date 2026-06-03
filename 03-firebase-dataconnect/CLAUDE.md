@AGENTS.md

# CLAUDE.md — POC 3 (Firebase Data Connect)

Throwaway POC to evaluate the offline-sync **feel** for Moby. Keep it **minimal**.

**Status: evaluated & ruled out for Moby** — Firebase has no single product that is relational *and*
offline *and* realtime. Decision + reasoning: `../POC3_FIREBASE_FINDINGS.md`. This folder is the
RN-viability **spike** (kept as evidence), not a built POC.

## Purpose
Evaluate **Firebase SQL Connect** (renamed from Data Connect) for Moby. Finding: it's a Supabase-peer
backend (Cloud SQL Postgres + GraphQL), **online-only, no realtime**; offline would be a hand-built
bolt-on. The spike proved the `firebase/data-connect` SDK runs in React Native (officially unsupported)
against the local emulator — so RN wasn't the blocker; the missing realtime/offline model is.

## Conventions
- pnpm only. Expo SDK 56 (see AGENTS.md — check versioned docs before writing Expo code).
- Minimal deps; nothing beyond the sync demo.
- **Maintain this file and `README.md`** as the POC is built and the structure firms up.
