// ──────────────────────────────────────────────────────────────────────────────
// POC 3 SPIKE (Step 2) — full proof that Firebase SQL Connect works from React Native:
// run a real MUTATION (CreateNote) and QUERY (ListNotes) against the local Data Connect
// emulator (PGLite-backed) from inside the RN runtime, using the raw firebase/data-connect
// API (queryRef/mutationRef + execute*). connector/service/location match dataconnect.yaml +
// connector.yaml. iOS simulator reaches the host emulator via localhost:9399.
// ──────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import { initializeApp } from 'firebase/app';
import {
  getDataConnect,
  connectDataConnectEmulator,
  queryRef,
  executeQuery,
  mutationRef,
  executeMutation,
} from 'firebase/data-connect';

export default function App() {
  const [log, setLog] = useState<{ ok: boolean; msg: string }[]>([]);
  const ok = (msg: string) => setLog((l) => [...l, { ok: true, msg }]);
  const bad = (msg: string) => setLog((l) => [...l, { ok: false, msg }]);

  useEffect(() => {
    (async () => {
      ok('firebase/data-connect running in RN');
      try {
        const app = initializeApp({ projectId: 'demo-moby', apiKey: 'demo', appId: 'demo' });
        const dc = getDataConnect(app, { connector: 'spike', location: 'us-central1', service: 'moby' });
        connectDataConnectEmulator(dc, 'localhost', 9399);
        ok('connected to emulator localhost:9399');

        const text = 'Hello from RN @ ' + new Date().toISOString().slice(11, 19);
        const created = await executeMutation(mutationRef(dc, 'CreateNote', { text }));
        ok('MUTATION CreateNote → ' + JSON.stringify(created.data));

        const listed = await executeQuery(queryRef(dc, 'ListNotes'));
        const notes = ((listed.data as any)?.notes ?? []) as { id: string; text: string }[];
        ok('QUERY ListNotes → ' + notes.length + ' note(s) in Postgres');
        notes.slice(-6).forEach((n) => ok('   • ' + n.text));
      } catch (e: any) {
        bad((e?.code ? `[${e.code}] ` : '') + (e?.message ?? String(e)));
      }
    })();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b1020' }}>
      <View style={{ padding: 20, paddingBottom: 8 }}>
        <Text style={{ color: '#a5b4fc', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>POC 3 · RN SPIKE</Text>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 4 }}>SQL Connect query + mutation from RN</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 4 }}>
        {log.length === 0 ? (
          <Text style={{ color: '#94a3b8' }}>running…</Text>
        ) : (
          log.map((l, i) => (
            <Text
              key={i}
              style={{ color: l.ok ? '#86efac' : '#fca5a5', fontSize: 13, marginBottom: 10, fontFamily: 'Menlo' }}
            >
              {l.ok ? '✅ ' : '⚠️ '}
              {l.msg}
            </Text>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
