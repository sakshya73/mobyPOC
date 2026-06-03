# POC 3 — Firebase (evaluated, not built)

**Outcome: ruled out for Moby.** Firebase has no single product that is **relational + offline +
realtime**: SQL Connect is relational but **online-only (no realtime)**; Firestore is offline+realtime
but **NoSQL**. Full reasoning: [`../POC3_FIREBASE_FINDINGS.md`](../POC3_FIREBASE_FINDINGS.md).

## What's in this folder
A **viability spike**, kept as evidence. It proves Firebase **SQL Connect** (renamed from Data Connect)
runs in React Native — officially unsupported, but `App.tsx` ran a real query + mutation against the
local Data Connect emulator from Expo Go. The blocker was never RN; it's the missing realtime/offline model.

- `App.tsx` — the spike: `firebase/data-connect` query + mutation, with a live log on screen
- `dataconnect/` — schema (`Note`), connector (`ListNotes` / `CreateNote`), service config
- `firebase.json` / `.firebaserc` — emulator config (PGLite, port 9399; `demo-moby` project)

**Run it:**
```bash
npx firebase-tools emulators:start --only dataconnect --project demo-moby   # emulator on :9399
npx expo start                                                              # then open in Expo Go
```
