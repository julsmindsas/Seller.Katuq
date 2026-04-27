const admin = require('firebase-admin');

const COLLECTION = 'reports';

function db() {
  return admin.firestore();
}

function tenantCollection(companyId) {
  return db().collection(COLLECTION).doc(companyId).collection('items');
}

async function list(companyId) {
  const snap = await tenantCollection(companyId).orderBy('updatedAt', 'desc').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function get(companyId, id) {
  const doc = await tenantCollection(companyId).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function create(companyId, report) {
  const now = new Date().toISOString();
  const data = { ...report, createdAt: now, updatedAt: now, ownerCompany: companyId };
  delete data.id;
  const ref = await tenantCollection(companyId).add(data);
  return { id: ref.id, ...data };
}

async function update(companyId, id, report) {
  const now = new Date().toISOString();
  const data = { ...report, updatedAt: now, ownerCompany: companyId };
  delete data.id;
  delete data.createdAt;
  await tenantCollection(companyId).doc(id).set(data, { merge: true });
  return { id, ...data };
}

async function remove(companyId, id) {
  await tenantCollection(companyId).doc(id).delete();
}

module.exports = { list, get, create, update, remove };
