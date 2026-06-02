@AGENTS.md

# CLAUDE.md — POC 3 (Firebase Data Connect)

Throwaway POC to evaluate the offline-sync **feel** for Moby. Keep it **minimal**.

**Status:** scaffolded; build pending (POC 1 first).

## Purpose
Same minimal list/add app as POC 1, but the backend is **Firebase Data Connect** (Postgres +
GraphQL). No auth/multi-tenant/camera/GPS. Goal: validate its offline + realtime story.

## Conventions
- pnpm only. Expo SDK 56 (see AGENTS.md — check versioned docs before writing Expo code).
- Minimal deps; nothing beyond the sync demo.
- **Maintain this file and `README.md`** as the POC is built and the structure firms up.
