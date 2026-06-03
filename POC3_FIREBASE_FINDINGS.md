# POC 3 — Firebase (SQL Connect) Evaluation & Decision

**Decision: Firebase doesn't fit Moby — we're not building POC 3 on it.**
Moby needs **offline‑first + relational + realtime**. No single Firebase product delivers all three.
**Supabase + a sync engine (POC 1 / POC 2) does.**

## Moby's three hard requirements
1. **Offline‑first** — techs document jobs in the field with no signal.
2. **Relational** — projects → jobs → notes → estimates (Postgres‑shaped data, joins/reporting).
3. **Realtime** — live updates across techs + office working the same job.

## The layers (what provides what)
| Layer | Provides | Examples |
|---|---|---|
| Backend (managed Postgres BaaS) | the relational DB + API + auth | Supabase, **SQL Connect** |
| Offline engine | local store + write queue + sync | Legend‑State, PowerSync |
| Realtime | server pushes changes live (vs polling) | Supabase Realtime, PowerSync stream |

A backend **alone is online‑only**; offline and realtime come from the layers on top of it.

## Scorecard
| Approach | Offline | Relational | Realtime | Fit |
|---|---|---|---|---|
| **POC 1 — Supabase + Legend‑State** | ✅ | ✅ | ✅ | ✅ |
| **POC 2 — Supabase + PowerSync** | ✅ | ✅ | ✅ | ✅ |
| Firebase **SQL Connect** (+ bolt‑on engine) | ⚠️ DIY | ✅ | ❌ | ❌ |
| Firebase **Firestore** | ✅ | ❌ NoSQL | ✅ | ❌ |

## What we found about Firebase
- **SQL Connect** = renamed *Firebase Data Connect*; a managed **Cloud SQL Postgres + GraphQL + typed SDK + Firebase Auth**. It's a **peer/alternative to Supabase** (a backend), **not** a sync engine. By itself: **online‑only, no realtime.**
- **Spike (proven, not assumed):** React Native is officially unsupported, but the `firebase/data-connect` JS SDK **does run in RN** (Expo Go) — we ran a real query **and** mutation against the local emulator. So RN compatibility is *not* the blocker.
- **The blocker is the model:** no realtime, and offline‑first would be a **hand‑built bolt‑on** (a Legend‑State adapter — SQL Connect is *operation‑based*, so RxDB's GraphQL replication doesn't fit). Net result: more work than Supabase, still **no realtime**, and no relational advantage.
- **Firestore** would give offline + realtime, but it's **NoSQL** — it breaks Moby's relational model (no joins/foreign keys; you'd denormalize and fan‑out).

## "But can't Legend‑State handle the offline part?"
Yes — and that was never the problem. Legend‑State + SQL Connect *would* give offline: Legend‑State's
local store + write queue + optimistic writes, wiring `get`→`ListNotes` and `set`→`CreateNote` (the spike
proved those calls run in RN). That's the **⚠️ DIY** in the scorecard, not a ❌.

The wall is **realtime**, and **Legend‑State doesn't create it.** In POC 1 the realtime came from
**Supabase Realtime** — the websocket Legend‑State subscribes to. SQL Connect has **no push channel**, so
there's nothing to subscribe to. The only fallback is **polling** (re‑query on a timer / on foreground),
which means lag (30s+ stale across devices) and battery/network cost — not realtime. So
**Legend‑State + SQL Connect = offline ✅ · relational ✅ · realtime ❌**, which still fails Moby's
requirement.

## Why Firebase can't meet all three
Firebase forces a choice: **Firestore** (offline + realtime, but NoSQL) **or** **SQL Connect** (relational, but online‑only). There is **no Firebase product that is relational *and* offline *and* realtime.** Supabase + a sync engine is all three at once.

## Decision
- ❌ **Drop Firebase / SQL Connect** for Moby — fails the realtime (and offline‑native) requirement.
- ✅ **Use Supabase + a sync engine:**
  - **POC 1 — Legend‑State**: lightest/fastest, fewest moving parts.
  - **POC 2 — PowerSync**: on‑device SQLite, built for large/complex offline datasets.
  - Both deliver offline + relational + realtime.
- The Firebase spike lives in `03-firebase-dataconnect/` as evidence the conclusion was **tested**, not guessed.
