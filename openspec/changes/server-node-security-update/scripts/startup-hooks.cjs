'use strict';
// In-memory Firebase transport, only for the isolated entrypoint probe.
const fs = require('node:fs'); const Module = require('node:module');
if (!fs.existsSync('/ISOLATED-LAB')) throw new Error('isolated rootfs required');
const state = { subscriptions: 0, reads: 0, writesInMemory: 0, firebaseMocked: true };
const stateFile = process.env.LAB_STATE_FILE;
const persist = () => { if (stateFile) fs.writeFileSync(stateFile, JSON.stringify(state)); };
const snapshot = { exists: false, empty: true, size: 0, docs: [], docChanges: () => [], data: () => undefined, forEach() {} };
const write = async () => { state.writesInMemory++; persist(); return {}; };
function ref() {
  const r = { id: 'isolated', path: 'isolated', parent: { id: 'isolated' }, collection: ref, doc: ref,
    where: ref, orderBy: ref, limit: ref, select: ref, offset: ref, startAfter: ref,
    get: async () => { state.reads++; persist(); return snapshot; },
    count: () => ({ get: async () => ({ data: () => ({ count: 0 }) }) }),
    set: write, update: write, delete: write, add: async () => { await write(); return ref(); },
    onSnapshot(callback) { state.subscriptions++; persist(); queueMicrotask(() => callback(snapshot)); const timer = process.env.LAB_ENTRYPOINT === 'watcher' ? setInterval(() => {}, 1000) : null; return () => { if (timer) clearInterval(timer); }; },
  }; return r;
}
const batch = () => { const b = { set: () => b, update: () => b, delete: () => b, create: () => b, commit: write }; return b; };
const db = { collection: ref, collectionGroup: ref, doc: ref, batch, bulkWriter: batch,
  settings() {}, runTransaction: async cb => cb({ get: async () => snapshot, set: write, update: write, delete: write }) };
const Timestamp = { now: () => ({ toDate: () => new Date(), toMillis: () => Date.now() }), fromDate: d => ({ toDate: () => d, toMillis: () => d.getTime() }) };
const firestore = Object.assign(() => db, { FieldValue: { serverTimestamp: () => new Date(), delete: () => null, increment: n => n, arrayUnion: (...v) => v, arrayRemove: () => [] }, Timestamp, FieldPath: { documentId: () => '__name__' } });
const apps = [];
const storage = () => ({ bucket: () => ({ name: 'demo', getFiles: async () => [[]], file: () => ({ exists: async () => [false] }) }) });
const auth = () => ({ verifyIdToken: async () => { throw new Error('no production session in lab'); } });
const admin = { apps, firestore, storage, auth, credential: { cert: () => ({}), applicationDefault: () => ({}) },
  initializeApp(options) { const app = { name: '[DEFAULT]', options, firestore, storage, auth }; apps.push(app); return app; },
  app: () => apps[0], database: () => ({ ref: () => ({ on() {}, off() {}, once: async () => ({ val: () => null }), set: write }) }) };
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (/service[-_]?account|serviceAccount/i.test(request)) return { project_id: 'demo-katuq-node22', client_email: 'lab@example.invalid', private_key: 'synthetic-not-a-real-key' };
  if (request === 'firebase-admin') return admin;
  if (request === 'firebase-admin/app') return { initializeApp: admin.initializeApp, getApp: admin.app, getApps: () => apps, applicationDefault: () => ({}), cert: () => ({}) };
  if (request === 'firebase-admin/firestore') return { getFirestore: () => db, FieldValue: firestore.FieldValue, Timestamp, FieldPath: firestore.FieldPath };
  if (request === 'firebase-admin/storage') return { getStorage: storage };
  if (request === 'firebase-admin/auth') return { getAuth: auth };
  return originalLoad.call(this, request, parent, isMain);
};
persist();
