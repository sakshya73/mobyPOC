# Moby — Offline-Sync POCs

Three lightweight, **throwaway** Expo apps that each build the *same* tiny offline-first app
with a *different* sync stack — so we can compare the "feel" of each and pick the sync layer
for Moby's MVP. (Requested by the client to evaluate options before committing.)

| # | Folder | Sync approach |
|---|--------|---------------|
| 1 | `01-legend-supabase` | Legend-State `syncedSupabase` — offline + realtime in one wiring |
| 2 | `02-powersync-supabase` | PowerSync — on-device SQLite ↔ Supabase Postgres |
| 3 | `03-firebase-dataconnect` | Firebase SQL Connect — **evaluated & ruled out** (relational, but no offline/realtime) |

> **POC 3 was evaluated, not built.** Firebase has no single product that is relational *and* offline *and* realtime (SQL Connect = relational/online-only; Firestore = offline+realtime/NoSQL), so it doesn't fit Moby. Reasoning + the RN spike: [`POC3_FIREBASE_FINDINGS.md`](POC3_FIREBASE_FINDINGS.md).

**Baseline reference:** the hand-rolled **slice** (Expo + SQLite + NestJS), kept in the parent
Moby workspace — shows what "owning the sync yourself" looks like.

## Scope (intentionally minimal)
One screen: **list + add**. Works offline, syncs when online, realtime across devices.
**No** auth, multi-tenant, camera, or GPS — just the sync feel. Each app is self-contained
(its own deps, its own copy of the UI) so the comparison is clean.

## How to compare
Run each → toggle Airplane Mode → add items → watch them sync → open a 2nd device for realtime.
For each, note: **lines of sync code · setup effort · offline robustness · realtime · DX**.
