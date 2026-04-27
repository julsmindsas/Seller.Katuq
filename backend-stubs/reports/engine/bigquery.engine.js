const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT = process.env.BQ_PROJECT || 'katuq-new';
const DATASET = process.env.BQ_DATASET || 'katuq_analytics';

const bq = new BigQuery({ projectId: PROJECT });

function quoteIdent(s) {
  return '`' + String(s).replace(/`/g, '') + '`';
}

function dimExpr(dim, granularity) {
  const col = quoteIdent(dim.column);
  if (dim.type !== 'date' || !granularity) {
    return col;
  }
  const map = {
    day: 'DAY',
    week: 'WEEK',
    month: 'MONTH',
    quarter: 'QUARTER',
    year: 'YEAR',
  };
  const part = map[granularity] || 'DAY';
  return `DATE_TRUNC(${col}, ${part})`;
}

function measureExpr(measure, agg) {
  const col = quoteIdent(measure.column);
  switch (agg) {
    case 'sum':
      return `SUM(${col})`;
    case 'avg':
      return `AVG(${col})`;
    case 'min':
      return `MIN(${col})`;
    case 'max':
      return `MAX(${col})`;
    case 'count':
      return `COUNT(${col})`;
    case 'count_distinct':
      return `COUNT(DISTINCT ${col})`;
    default:
      return `SUM(${col})`;
  }
}

function buildFilterClause(filter, source, paramIdx, params) {
  const allCols = [...source.dimensions, ...source.measures];
  const def = allCols.find((c) => c.id === filter.field);
  if (!def) return null;
  const col = quoteIdent(def.column);
  const param = `p${paramIdx}`;

  switch (filter.op) {
    case 'eq':
      params[param] = filter.value;
      return `${col} = @${param}`;
    case 'neq':
      params[param] = filter.value;
      return `${col} != @${param}`;
    case 'gt':
      params[param] = filter.value;
      return `${col} > @${param}`;
    case 'gte':
      params[param] = filter.value;
      return `${col} >= @${param}`;
    case 'lt':
      params[param] = filter.value;
      return `${col} < @${param}`;
    case 'lte':
      params[param] = filter.value;
      return `${col} <= @${param}`;
    case 'in':
      params[param] = filter.values || [];
      return `${col} IN UNNEST(@${param})`;
    case 'nin':
      params[param] = filter.values || [];
      return `${col} NOT IN UNNEST(@${param})`;
    case 'between':
      params[`${param}_lo`] = (filter.values || [])[0];
      params[`${param}_hi`] = (filter.values || [])[1];
      return `${col} BETWEEN @${param}_lo AND @${param}_hi`;
    case 'contains':
      params[param] = `%${filter.value}%`;
      return `${col} LIKE @${param}`;
    case 'is_null':
      return `${col} IS NULL`;
    case 'not_null':
      return `${col} IS NOT NULL`;
    default:
      return null;
  }
}

function buildSql(spec, source, limit, companyId) {
  const dimMap = new Map(source.dimensions.map((d) => [d.id, d]));
  const measMap = new Map(source.measures.map((m) => [m.id, m]));

  const selectParts = [];
  const groupByParts = [];
  const orderByParts = [];
  const params = {};
  const types = {};

  // Rows + Cols → GROUP BY
  const allDims = [...(spec.rows || []), ...(spec.cols || [])];
  allDims.forEach((d, idx) => {
    const def = dimMap.get(d.id);
    if (!def) return;
    const expr = dimExpr(def, d.granularity);
    const alias = quoteIdent(d.granularity ? `${def.id}_${d.granularity}` : def.id);
    selectParts.push(`${expr} AS ${alias}`);
    groupByParts.push(String(idx + 1));
  });

  // Values → aggregations
  (spec.values || []).forEach((v) => {
    const def = measMap.get(v.id);
    if (!def) return;
    const alias = quoteIdent(v.alias || `${def.id}_${v.agg}`);
    selectParts.push(`${measureExpr(def, v.agg)} AS ${alias}`);
  });

  // FROM
  const fromTable = `\`${PROJECT}.${DATASET}.${source.view}\``;

  // WHERE
  const whereParts = [];
  if (companyId && source.tenantFilter) {
    params.tenant = companyId;
    whereParts.push(`${quoteIdent(source.tenantFilter.column)} = @tenant`);
  }
  (spec.filters || []).forEach((f, idx) => {
    const clause = buildFilterClause(f, source, idx, params);
    if (clause) whereParts.push(clause);
  });

  // ORDER BY
  (spec.orderBy || []).forEach((o) => {
    const measRef = (spec.values || []).find((v) => v.id === o.field || v.alias === o.field);
    if (measRef) {
      const def = measMap.get(measRef.id);
      orderByParts.push(`${measureExpr(def, measRef.agg)} ${o.dir.toUpperCase()}`);
      return;
    }
    const def = dimMap.get(o.field);
    if (def) orderByParts.push(`${quoteIdent(def.column)} ${o.dir.toUpperCase()}`);
  });

  let sql = `SELECT ${selectParts.join(', ') || '1'}\nFROM ${fromTable}`;
  if (whereParts.length) sql += `\nWHERE ${whereParts.join(' AND ')}`;
  if (groupByParts.length) sql += `\nGROUP BY ${groupByParts.join(', ')}`;
  if (orderByParts.length) sql += `\nORDER BY ${orderByParts.join(', ')}`;
  sql += `\nLIMIT ${limit}`;

  return { sql, params, types };
}

async function runQuery(spec, source, limit, companyId) {
  const { sql, params, types } = buildSql(spec, source, limit, companyId);
  const startedAt = Date.now();
  const [job] = await bq.createQueryJob({ query: sql, params, types, location: 'US' });
  const [rows] = await job.getQueryResults({ maxResults: limit });
  const [meta] = await job.getMetadata();

  const columns = inferColumns(spec, source);
  return {
    columns,
    rows: rows.map((r) => ({ ...r })),
    meta: {
      totalRows: rows.length,
      truncated: rows.length === limit,
      sourceUsed: source.id,
      durationMs: Date.now() - startedAt,
      bytesProcessed: Number(meta.statistics?.totalBytesProcessed || 0),
      sql,
    },
  };
}

function inferColumns(spec, source) {
  const dimMap = new Map(source.dimensions.map((d) => [d.id, d]));
  const measMap = new Map(source.measures.map((m) => [m.id, m]));
  const cols = [];
  [...(spec.rows || []), ...(spec.cols || [])].forEach((d) => {
    const def = dimMap.get(d.id);
    if (!def) return;
    cols.push({
      field: d.granularity ? `${def.id}_${d.granularity}` : def.id,
      label: def.label + (d.granularity ? ` (${d.granularity})` : ''),
      type: 'dimension',
      dataType: def.type,
    });
  });
  (spec.values || []).forEach((v) => {
    const def = measMap.get(v.id);
    if (!def) return;
    cols.push({
      field: v.alias || `${def.id}_${v.agg}`,
      label: `${def.label} (${v.agg})`,
      type: 'measure',
      dataType: 'number',
      format: def.format,
    });
  });
  return cols;
}

module.exports = { runQuery, buildSql };
