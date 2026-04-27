const orders = require('./orders.source');
const products = require('./products.source');
const inventory = require('./inventory.source');
const clients = require('./clients.source');

const SOURCES = [orders, products, inventory, clients];
const BY_ID = new Map(SOURCES.map((s) => [s.id, s]));

module.exports = {
  list: () => SOURCES,
  get: (id) => BY_ID.get(id) || null,
  // Mismo shape que el catálogo del frontend (sin `column`/`view` internos).
  toPublic: () =>
    SOURCES.map((s) => ({
      id: s.id,
      label: s.label,
      description: s.description,
      dimensions: s.dimensions.map(({ id, label, type, granularities, enumValues, group }) => ({
        id,
        label,
        type,
        granularities,
        enumValues,
        group,
      })),
      measures: s.measures.map(({ id, label, aggs, format, group }) => ({
        id,
        label,
        aggs,
        format,
        group,
      })),
    })),
};
