const express = require('express');
const sources = require('./services/reports/sources');
const { validateSpec } = require('./services/reports/engine/spec-validator');
const { runQuery } = require('./services/reports/engine/bigquery.engine');
const repo = require('./services/reports/persistence/reports.repository');

const router = express.Router();

// Resuelve companyId del header inyectado por el interceptor del frontend.
function getCompany(req) {
  return req.headers.company || req.headers['x-company'] || req.user?.company || null;
}

router.get('/sources', (_req, res) => {
  res.json(sources.toPublic());
});

router.post('/query', async (req, res) => {
  try {
    const spec = req.body;
    const v = validateSpec(spec);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const company = getCompany(req);
    const result = await runQuery(spec, v.source, v.normalizedLimit, company);
    return res.json(result);
  } catch (err) {
    console.error('reports.query error', err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/list', async (req, res) => {
  try {
    const company = getCompany(req);
    if (!company) return res.status(401).json({ error: 'Missing company header' });
    const items = await repo.list(company);
    res.json(items);
  } catch (err) {
    console.error('reports.list error', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const company = getCompany(req);
    if (!company) return res.status(401).json({ error: 'Missing company header' });
    const item = await repo.get(company, req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const company = getCompany(req);
    if (!company) return res.status(401).json({ error: 'Missing company header' });
    const created = await repo.create(company, req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const company = getCompany(req);
    if (!company) return res.status(401).json({ error: 'Missing company header' });
    const updated = await repo.update(company, req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const company = getCompany(req);
    if (!company) return res.status(401).json({ error: 'Missing company header' });
    await repo.remove(company, req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
