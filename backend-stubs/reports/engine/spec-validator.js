const sources = require('../sources');

const ALLOWED_OPS = new Set([
  'eq',
  'neq',
  'in',
  'nin',
  'between',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
  'is_null',
  'not_null',
]);
const ALLOWED_AGGS = new Set(['sum', 'avg', 'count', 'count_distinct', 'min', 'max']);
const HARD_LIMIT = 10000;

function validateSpec(spec) {
  if (!spec || typeof spec !== 'object') {
    return { ok: false, error: 'Invalid spec' };
  }
  const source = sources.get(spec.source);
  if (!source) {
    return { ok: false, error: `Unknown source: ${spec.source}` };
  }
  const dimMap = new Map(source.dimensions.map((d) => [d.id, d]));
  const measMap = new Map(source.measures.map((m) => [m.id, m]));

  for (const r of spec.rows || []) {
    const d = dimMap.get(r.id);
    if (!d) return { ok: false, error: `Unknown dimension in rows: ${r.id}` };
    if (r.granularity && !d.granularities?.includes(r.granularity)) {
      return { ok: false, error: `Invalid granularity ${r.granularity} for ${r.id}` };
    }
  }
  for (const c of spec.cols || []) {
    const d = dimMap.get(c.id);
    if (!d) return { ok: false, error: `Unknown dimension in cols: ${c.id}` };
    if (c.granularity && !d.granularities?.includes(c.granularity)) {
      return { ok: false, error: `Invalid granularity ${c.granularity} for ${c.id}` };
    }
  }
  for (const v of spec.values || []) {
    const m = measMap.get(v.id);
    if (!m) return { ok: false, error: `Unknown measure: ${v.id}` };
    if (!ALLOWED_AGGS.has(v.agg) || !m.aggs.includes(v.agg)) {
      return { ok: false, error: `Invalid agg ${v.agg} for ${v.id}` };
    }
  }
  for (const f of spec.filters || []) {
    if (!ALLOWED_OPS.has(f.op)) {
      return { ok: false, error: `Invalid filter op: ${f.op}` };
    }
    if (!dimMap.has(f.field) && !measMap.has(f.field)) {
      return { ok: false, error: `Unknown filter field: ${f.field}` };
    }
  }

  // Limit
  let limit = Number(spec.limit) || 1000;
  if (limit > HARD_LIMIT) limit = HARD_LIMIT;
  if (limit < 1) limit = 1;

  return { ok: true, source, normalizedLimit: limit };
}

module.exports = { validateSpec, HARD_LIMIT };
