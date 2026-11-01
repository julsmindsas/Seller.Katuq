'use strict';
// Read-only operational probe. Uses the existing server service account in place.
// Never imports the application entrypoint or starts jobs/listeners.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const base = process.argv[2];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const admin = require(path.join(base, 'node_modules/firebase-admin'));
const sa = JSON.parse(fs.readFileSync(path.join(base, 'serviceAccountKey.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const timer = setTimeout(() => process.exit(2), 10000);
(async () => {
  const snap = await admin.firestore().collection('flow_trigger_bindings')
    .where('kind', '==', 'cron').where('status', '==', 'active').get();
  const items = snap.docs.map(doc => {
    const b = doc.data();
    const expr = (b.cronExpression || b.params?.cronExpression || '').trim();
    const fields = expr.split(/\s+/);
    const minute = fields[0];
    // Only require observed ticks for simple frequent schedules we can prove.
    const step = /^\*\/(\d+)$/.exec(minute);
    const minuteList = /^\d+(,\d+)*$/.test(minute) ? minute.split(',').map(Number).sort((a, b) => a - b) : null;
    const gaps = minuteList?.map((v, i) => ((minuteList[(i + 1) % minuteList.length] - v + 60) % 60) || 60);
    const interval = fields.length === 5 && fields.slice(1).every(f => f === '*') ?
      (minute === '*' ? 60000 : step ? Number(step[1]) * 60000 : gaps ? Math.max(...gaps) * 60000 : null) : null;
    const last = b.lastTriggeredAt;
    const lastMs = last?.toMillis ? last.toMillis() : last ? new Date(last).getTime() : null;
    return { idHash: hash(doc.id), lastMs: Number.isFinite(lastMs) ? lastMs : null,
      frequentIntervalMs: interval && interval <= 30 * 60000 ? interval : null };
  }).sort((a, b) => a.idHash.localeCompare(b.idHash));
  process.stdout.write(JSON.stringify({ success: true, checkedAt: Date.now(), items }));
  await admin.app().delete(); clearTimeout(timer); process.exit(0);
})().catch(() => { clearTimeout(timer); process.stderr.write('scheduler_read_failed\n'); process.exit(1); });
