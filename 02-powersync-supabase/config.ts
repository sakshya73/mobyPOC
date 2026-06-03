// Config for POC 2 (PowerSync + Supabase).
//
// Supabase: same project as POC 1 (the "publishable" public key, gated by RLS).
export const SUPABASE_URL = 'https://rjvqkwkamfnlefhofajx.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_jqeMzkdTFnYi4NN1C8GhTw_ZqntYR0X';

// PowerSync Cloud instance.
export const POWERSYNC_URL = 'https://6a2009a1deeddd0df601ca88.powersync.journeyapps.com';

// PowerSync auth: no login → a temporary DEVELOPMENT TOKEN (a JWT from `powersync generate token`).
// This one EXPIRES ~12h after generation — regenerate with the CLI when sync stops:
//   npx powersync@latest generate token --instance-id=6a2009a1deeddd0df601ca88 \
//     --project-id=6a20099f2e82bc0007790c4d --subject=demo-user
// Production would swap this for a Supabase Auth JWT in fetchCredentials (see PowerSyncConnector.ts).
export const POWERSYNC_TOKEN =
  'eyJhbGciOiJSUzI1NiIsImtpZCI6InBvd2Vyc3luYy1kZXYtMzIyM2Q0ZTMifQ.eyJzdWIiOiJkZW1vLXVzZXIiLCJpYXQiOjE3ODA0ODg2MDQsImlzcyI6Imh0dHBzOi8vcG93ZXJzeW5jLWFwaS5qb3VybmV5YXBwcy5jb20iLCJhdWQiOiJodHRwczovLzZhMjAwOWExZGVlZGRkMGRmNjAxY2E4OC5wb3dlcnN5bmMuam91cm5leWFwcHMuY29tIiwiZXhwIjoxNzgwNTMxODA0fQ.cY8q0WErstgBtRQArAEUBxrRc3KCUidN_pQTqObZlfvZyFShQDFrc8ipiITgaSmgtX7wVUQNspHuTWKZ_OmrBeYi0SZvq3f8lsUkrJQV8akw1Nmv20P_UQ_sOQv41wKzVT8DpyUKVXwOooWg9zxNPUbVX7XeLJWhinq5TjAzqBKOvrs0FECqpznOaA4oBA3w36A5K5YD65eMiq5e3WQZ5G0TNi7HpeN_-1bVzyiEFNwoCr2YEZoq43w7OCm-nTY6Abp1529BTPw4M4thkbJyIYJUqJshoib0NRYffu1sIddQzsDwfZlmsBaMsiwktJ2sOqOIe1Nfq3DQY48G6VOoKA';
