import { NodeSpec } from '../interfaces/flow.interface';

/**
 * Fallback NodeSpec catalog used by the editor when the backend route
 * `/v1/flows/node-catalog` is not yet wired or returns empty. Mirrors the
 * 38 nodes registered in the backend (`services/flows/nodes/<group>/index.js`):
 *   - 5 osmosis, 9 shopify (incl. bulk), 5 internal, 9 flow-control,
 *     1 kai, 3 siigo, 1 worldoffice, 1 aliaddo, 1 enviame,
 *     2 wompi, 2 woocommerce.
 *
 * Keep this list in sync with `node-catalog.ts` in the backend
 * (contracts) and the actual node `spec` exports in
 * `services/flows/nodes/<group>/<file>.action.js`. It's a piloto-friendly
 * safety net, not the source of truth.
 */
export const FALLBACK_NODE_CATALOG: NodeSpec[] = [
  // -------- OSMOSIS --------
  {
    type: 'osmosis-product-changed',
    category: 'trigger',
    group: 'osmosis',
    displayName: 'Osmosis: Producto cambiado',
    description: 'Webhook cuando un producto cambia en Guía Cereza.',
    icon: 'pi pi-shopping-bag',
    color: '#C8102E',
    version: 1,
    inputs: [],
    outputs: [{ name: 'main', label: 'Producto canónico', dataType: 'item[]' }],
    credentials: 'osmosis',
    schema: {
      type: 'object',
      properties: {
        nodeSlug: { type: 'string', title: 'Node slug', default: 'cereza' },
        events: {
          type: 'array',
          items: { type: 'string', enum: ['created', 'updated', 'deleted'] },
          default: ['created', 'updated']
        }
      },
      required: ['nodeSlug']
    },
    defaults: { nodeSlug: 'cereza', events: ['created', 'updated'] },
    tags: ['osmosis', 'cereza', 'product', 'webhook']
  },
  {
    type: 'osmosis-order-changed',
    category: 'trigger',
    group: 'osmosis',
    displayName: 'Osmosis: Pedido cambiado',
    description: 'Se dispara cuando un pedido cambia en Osmosis.',
    icon: 'pi pi-shopping-cart',
    color: '#C8102E',
    version: 1,
    inputs: [],
    outputs: [{ name: 'main', dataType: 'item[]' }],
    credentials: 'osmosis',
    schema: {
      type: 'object',
      properties: {
        nodeSlug: { type: 'string', default: 'cereza' },
        statuses: { type: 'array', items: { type: 'string' } }
      },
      required: ['nodeSlug']
    },
    defaults: { nodeSlug: 'cereza' },
    tags: ['osmosis', 'order', 'webhook']
  },
  {
    type: 'osmosis-stock-changed',
    category: 'trigger',
    group: 'osmosis',
    displayName: 'Osmosis: Stock cambiado',
    description: 'Polling Osmosis: emite un InventoryAdjustment por cada combinación size/color/bodega cuyo stock_available cambió respecto al último poll.',
    icon: 'pi pi-box',
    color: '#C8102E',
    version: 1,
    inputs: [],
    outputs: [{ name: 'main', label: 'CanonicalInventoryAdjustment', dataType: 'item[]' }],
    credentials: 'osmosis',
    schema: {
      type: 'object',
      properties: {
        nodeSlug: { type: 'string', title: 'Node slug', default: 'cereza' },
        defaultBodegaCode: {
          type: 'string',
          title: 'Bodega Katuq destino',
          description: "Business code de la bodega Katuq destino (ej 'BOD-001').",
          default: 'BOD-001'
        },
        reason: {
          type: 'string',
          title: 'Reason del movimiento',
          enum: ['osmosis_sync', 'restock', 'manual_adjustment'],
          default: 'osmosis_sync'
        },
        intervalMinutes: {
          type: 'integer',
          title: 'Intervalo de polling (min)',
          minimum: 1,
          maximum: 60,
          default: 15
        },
        limit: {
          type: 'integer',
          title: 'Límite por corrida (0 = sin límite)',
          minimum: 0,
          maximum: 100000,
          default: 0
        }
      },
      required: ['nodeSlug', 'defaultBodegaCode', 'reason']
    },
    defaults: {
      nodeSlug: 'cereza',
      defaultBodegaCode: 'BOD-001',
      reason: 'osmosis_sync',
      intervalMinutes: 15,
      limit: 0
    },
    tags: ['osmosis', 'cereza', 'inventory', 'stock', 'polling', 'trigger']
  },
  {
    type: 'osmosis-product-fetch',
    category: 'action',
    group: 'osmosis',
    displayName: 'Osmosis: Obtener producto',
    description: 'Lee un producto de Osmosis por ID o SKU.',
    icon: 'pi pi-download',
    color: '#C8102E',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    credentials: 'osmosis',
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'string', title: 'Product ID' },
        sku: { type: 'string', title: 'SKU' }
      }
    }
  },
  {
    type: 'osmosis-order-create',
    category: 'action',
    group: 'osmosis',
    displayName: 'Osmosis: Crear pedido',
    description: 'Crea un pedido en Osmosis.',
    icon: 'pi pi-plus-circle',
    color: '#C8102E',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    credentials: 'osmosis',
    schema: {
      type: 'object',
      properties: { nodeSlug: { type: 'string', default: 'cereza' } }
    }
  },
  {
    type: 'osmosis-order-status-update',
    category: 'action',
    group: 'osmosis',
    displayName: 'Osmosis: Actualizar estado pedido',
    description: 'Cambia el estado de un pedido en Osmosis.',
    icon: 'pi pi-sync',
    color: '#C8102E',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    credentials: 'osmosis',
    schema: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        newStatus: { type: 'string' }
      },
      required: ['orderId', 'newStatus']
    }
  },

  // -------- SHOPIFY --------
  {
    type: 'shopify-order-created',
    category: 'trigger',
    group: 'shopify',
    displayName: 'Shopify: Pedido creado',
    description: 'Webhook orders/create. Reusa shopify_webhook_events.',
    icon: 'pi pi-shopping-cart',
    color: '#95BF47',
    version: 1,
    inputs: [],
    outputs: [{ name: 'main', dataType: 'item[]' }],
    credentials: 'shopify',
    schema: { type: 'object', properties: {} }
  },
  {
    type: 'shopify-order-updated',
    category: 'trigger',
    group: 'shopify',
    displayName: 'Shopify: Pedido actualizado',
    description: 'Webhook orders/updated.',
    icon: 'pi pi-refresh',
    color: '#95BF47',
    version: 1,
    inputs: [],
    outputs: [{ name: 'main', dataType: 'item[]' }],
    credentials: 'shopify',
    schema: { type: 'object', properties: {} }
  },
  {
    type: 'shopify-product-changed',
    category: 'trigger',
    group: 'shopify',
    displayName: 'Shopify: Producto cambiado',
    description: 'Webhook products/create + products/update.',
    icon: 'pi pi-shopping-bag',
    color: '#95BF47',
    version: 1,
    inputs: [],
    outputs: [{ name: 'main', dataType: 'item[]' }],
    credentials: 'shopify',
    schema: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: { type: 'string', enum: ['create', 'update', 'delete'] },
          default: ['create', 'update']
        }
      }
    },
    defaults: { events: ['create', 'update'] }
  },
  {
    type: 'shopify-inventory-changed',
    category: 'trigger',
    group: 'shopify',
    displayName: 'Shopify: Inventario cambiado',
    description: 'Webhook inventory_levels/update.',
    icon: 'pi pi-box',
    color: '#95BF47',
    version: 1,
    inputs: [],
    outputs: [{ name: 'main', dataType: 'item[]' }],
    credentials: 'shopify',
    schema: { type: 'object', properties: {} }
  },
  {
    type: 'shopify-product-upsert',
    category: 'action',
    group: 'shopify',
    displayName: 'Shopify: Crear/actualizar producto',
    description: 'Upserta producto en Shopify desde CanonicalProduct.',
    icon: 'pi pi-cloud-upload',
    color: '#95BF47',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    credentials: 'shopify',
    timeoutMs: 60000,
    rateLimit: { rps: 2 },
    schema: {
      type: 'object',
      properties: {
        publishToOnlineStore: { type: 'boolean', default: true },
        syncImages: { type: 'boolean', default: true },
        syncInventory: { type: 'boolean', default: false }
      }
    },
    defaults: { publishToOnlineStore: true, syncImages: true, syncInventory: false }
  },
  {
    type: 'shopify-order-create',
    category: 'action',
    group: 'shopify',
    displayName: 'Shopify: Crear pedido',
    description: 'Crea un pedido en Shopify desde CanonicalOrder.',
    icon: 'pi pi-plus-circle',
    color: '#95BF47',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    credentials: 'shopify',
    schema: { type: 'object', properties: {} }
  },
  {
    type: 'shopify-fulfillment-create',
    category: 'action',
    group: 'shopify',
    displayName: 'Shopify: Crear fulfillment',
    description: 'Crea un fulfillment en Shopify (despacho parcial/total).',
    icon: 'pi pi-truck',
    color: '#95BF47',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    credentials: 'shopify',
    schema: {
      type: 'object',
      properties: {
        trackingNumber: { type: 'string' },
        trackingUrl: { type: 'string' },
        notifyCustomer: { type: 'boolean', default: true }
      }
    },
    defaults: { notifyCustomer: true }
  },
  {
    type: 'shopify-inventory-adjust',
    category: 'action',
    group: 'shopify',
    displayName: 'Shopify: Ajustar inventario',
    description: 'Aplica delta o setTo en inventario Shopify.',
    icon: 'pi pi-box',
    color: '#95BF47',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    credentials: 'shopify',
    rateLimit: { rps: 2 },
    schema: {
      type: 'object',
      properties: { locationId: { type: 'string', title: 'Shopify Location GID' } }
    }
  },

  // -------- KATUQ INTERNAL --------
  {
    type: 'webhook-listener',
    category: 'trigger',
    group: 'internal',
    displayName: 'Webhook (HTTP)',
    description:
      'Recibe POST en una URL pública. Cualquier sistema externo (Zapier, Make, app custom, partner) puede pegarle y dispara el flow con el body como primer item. HMAC opcional via webhookSecret.',
    icon: 'pi pi-link',
    color: '#5E72E4',
    version: 1,
    inputs: [],
    outputs: [{ name: 'main', label: 'Body recibido', dataType: 'item[]' }],
    schema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          title: 'Método HTTP esperado',
          enum: ['POST'],
          default: 'POST',
          description: 'Hoy el endpoint solo acepta POST. GET reservado para futuras versiones.'
        },
        webhookSecret: {
          type: 'string',
          title: 'Secret HMAC (opcional)',
          description:
            'Si se configura, el sistema externo debe enviar el header x-katuq-signature con HMAC-SHA256 del body. Si lo dejás vacío, la URL es pública sin verificación. Recomendado para producción.'
        },
        payloadDescription: {
          type: 'string',
          title: 'Descripción del payload esperado',
          description: 'Notas para vos/equipo sobre qué shape de body llega. No se valida — solo documentación.'
        }
      }
    },
    defaults: { method: 'POST' },
    tags: ['trigger', 'webhook', 'http', 'generic']
  },
  {
    type: 'schedule-cron',
    category: 'trigger',
    group: 'internal',
    displayName: 'Schedule (cron)',
    description:
      'Dispara el flow según una expresión cron (ej: "0 9 * * 1" para todos los lunes a las 9am). Soporta zona horaria configurable.',
    icon: 'pi pi-clock',
    color: '#5E72E4',
    version: 1,
    inputs: [],
    outputs: [{ name: 'main', label: 'Tick', dataType: 'item[]' }],
    schema: {
      type: 'object',
      properties: {
        cronExpression: {
          type: 'string',
          title: 'Expresión cron',
          description:
            'Formato estándar de 5 campos (min, hora, día-mes, mes, día-semana). Ejemplos: "0 9 * * 1" lunes 9am — "*/15 * * * *" cada 15min — "0 0 1 * *" día 1 del mes.',
          default: '0 9 * * 1'
        },
        timezone: {
          type: 'string',
          title: 'Zona horaria',
          description: 'IANA timezone (ej: America/Bogota, Europe/Madrid). Default: America/Bogota.',
          default: 'America/Bogota'
        }
      },
      required: ['cronExpression']
    },
    defaults: { cronExpression: '0 9 * * 1', timezone: 'America/Bogota' },
    tags: ['trigger', 'cron', 'schedule', 'time']
  },
  {
    type: 'katuq-canonical-mapper',
    category: 'transform',
    group: 'katuq',
    displayName: 'Katuq: Mapper canónico',
    description: 'Traduce entre formatos external y CanonicalProduct/Order.',
    icon: 'pi pi-arrow-right-arrow-left',
    color: '#5E72E4',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [{ name: 'main', dataType: 'item[]' }],
    schema: {
      type: 'object',
      properties: {
        direction: {
          type: 'string',
          enum: ['external_to_canonical', 'canonical_to_external'],
          default: 'external_to_canonical'
        },
        provider: { type: 'string', enum: ['shopify', 'osmosis', 'woocommerce'] },
        entity: { type: 'string', enum: ['product', 'order', 'customer', 'inventory'] }
      },
      required: ['direction', 'provider', 'entity']
    }
  },
  {
    type: 'katuq-product-upsert',
    category: 'action',
    group: 'katuq',
    displayName: 'Katuq: Upsert producto',
    description: 'Crea/actualiza producto en colección products.',
    icon: 'pi pi-database',
    color: '#5E72E4',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    schema: {
      type: 'object',
      properties: {
        matchBy: { type: 'string', enum: ['referencia', 'cd', 'codigoBarras'], default: 'referencia' },
        createIfMissing: { type: 'boolean', default: true }
      }
    },
    defaults: { matchBy: 'referencia', createIfMissing: true }
  },
  {
    type: 'katuq-order-upsert',
    category: 'action',
    group: 'katuq',
    displayName: 'Katuq: Upsert pedido',
    description: 'Crea/actualiza pedido en colección orders.',
    icon: 'pi pi-database',
    color: '#5E72E4',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    schema: {
      type: 'object',
      properties: {
        matchBy: { type: 'string', enum: ['nroPedido', 'externalId'], default: 'nroPedido' },
        recalculateTotals: { type: 'boolean', default: true }
      }
    },
    defaults: { matchBy: 'nroPedido', recalculateTotals: true }
  },
  {
    type: 'katuq-inventory-adjust',
    category: 'action',
    group: 'katuq',
    displayName: 'Katuq: Ajustar inventario',
    description: 'Aplica CanonicalInventoryAdjustment sobre inventory.',
    icon: 'pi pi-box',
    color: '#5E72E4',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    schema: { type: 'object', properties: {} }
  },
  {
    type: 'katuq-customer-upsert',
    category: 'action',
    group: 'katuq',
    displayName: 'Katuq: Upsert cliente',
    description: 'Crea/actualiza cliente en colección customers.',
    icon: 'pi pi-user',
    color: '#5E72E4',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    schema: {
      type: 'object',
      properties: {
        matchBy: { type: 'string', enum: ['email', 'numeroDocumento'], default: 'email' }
      }
    },
    defaults: { matchBy: 'email' }
  },

  // -------- FLOW CONTROL --------
  {
    type: 'if',
    category: 'flow-control',
    group: 'flow-control',
    displayName: 'IF',
    description: 'Bifurca el flujo según una condición booleana.',
    icon: 'pi pi-question-circle',
    color: '#FFA500',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'true', label: 'Verdadero' },
      { name: 'false', label: 'Falso' }
    ],
    schema: {
      type: 'object',
      properties: { condition: { type: 'string', title: 'Expresión booleana' } },
      required: ['condition']
    }
  },
  {
    type: 'switch',
    category: 'flow-control',
    group: 'flow-control',
    displayName: 'Switch',
    description: 'Rutea según valor de una expresión a múltiples ramas.',
    icon: 'pi pi-share-alt',
    color: '#FFA500',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [{ name: '0' }, { name: '1' }, { name: '2' }, { name: '3' }, { name: 'default' }],
    schema: {
      type: 'object',
      properties: { expression: { type: 'string' } },
      required: ['expression']
    }
  },
  {
    type: 'merge',
    category: 'flow-control',
    group: 'flow-control',
    displayName: 'Merge',
    description: 'Une dos ramas en una sola.',
    icon: 'pi pi-arrow-right',
    color: '#FFA500',
    version: 1,
    inputs: [
      { name: 'main', label: 'Entrada A' },
      { name: 'mainB', label: 'Entrada B' }
    ],
    outputs: [{ name: 'main' }],
    schema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['append', 'merge_by_key', 'multiplex'], default: 'append' },
        joinKey: { type: 'string' }
      }
    },
    defaults: { mode: 'append' }
  },
  {
    type: 'split-array',
    category: 'flow-control',
    group: 'flow-control',
    displayName: 'Split Array',
    description: 'Convierte un array en N items individuales.',
    icon: 'pi pi-list',
    color: '#FFA500',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [{ name: 'main', dataType: 'item[]' }],
    schema: {
      type: 'object',
      properties: { fieldPath: { type: 'string', title: 'Path al array' } },
      required: ['fieldPath']
    }
  },
  {
    type: 'delay',
    category: 'flow-control',
    group: 'flow-control',
    displayName: 'Delay',
    description: 'Espera N ms antes de continuar (max 5 min).',
    icon: 'pi pi-clock',
    color: '#FFA500',
    version: 1,
    inputs: [{ name: 'main' }],
    outputs: [{ name: 'main' }],
    schema: {
      type: 'object',
      properties: { ms: { type: 'integer', minimum: 100, maximum: 300000 } },
      required: ['ms']
    },
    defaults: { ms: 1000 }
  },
  {
    type: 'loop',
    category: 'flow-control',
    group: 'flow-control',
    displayName: 'Loop',
    description: 'Itera sobre un array invocando los nodos siguientes por cada item.',
    icon: 'pi pi-replay',
    color: '#FFA500',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', label: 'Iteración' },
      { name: 'done', label: 'Finalizado' }
    ],
    schema: {
      type: 'object',
      properties: {
        arrayPath: { type: 'string' },
        batchSize: { type: 'integer', minimum: 1, maximum: 100, default: 1 }
      },
      required: ['arrayPath']
    },
    defaults: { batchSize: 1 }
  },
  {
    type: 'error-handler',
    category: 'flow-control',
    group: 'flow-control',
    displayName: 'Error Handler',
    description: 'Captura errores de nodos previos y rutea por la rama de error.',
    icon: 'pi pi-exclamation-triangle',
    color: '#DC3545',
    version: 1,
    inputs: [{ name: 'main' }, { name: 'error', isError: true }],
    outputs: [{ name: 'main' }, { name: 'error', isError: true }],
    schema: {
      type: 'object',
      properties: {
        continueOnError: { type: 'boolean', default: true },
        logToCollection: { type: 'string', default: 'flow_runs' }
      }
    },
    defaults: { continueOnError: true }
  },
  {
    type: 'sub-flow',
    category: 'flow-control',
    group: 'flow-control',
    displayName: 'Sub-flow',
    description: 'Invoca otro flow como subroutine.',
    icon: 'pi pi-sitemap',
    color: '#6C757D',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    schema: {
      type: 'object',
      properties: {
        flowId: { type: 'string', title: 'Flow ID a invocar' },
        waitForCompletion: { type: 'boolean', default: true }
      },
      required: ['flowId']
    },
    defaults: { waitForCompletion: true }
  },
  {
    type: 'http-request',
    category: 'flow-control',
    group: 'http',
    displayName: 'HTTP Request',
    description: 'Llamada HTTP genérica.',
    icon: 'pi pi-globe',
    color: '#17A2B8',
    version: 1,
    inputs: [{ name: 'main' }],
    outputs: [{ name: 'main' }, { name: 'error', isError: true }],
    timeoutMs: 30000,
    schema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          default: 'GET'
        },
        url: { type: 'string' },
        headers: { type: 'object' },
        body: { type: 'object' },
        queryParams: { type: 'object' },
        authMode: {
          type: 'string',
          enum: ['none', 'basic', 'bearer', 'header', 'oauth2-credential'],
          default: 'none'
        }
      },
      required: ['method', 'url']
    },
    defaults: { method: 'GET', authMode: 'none' }
  },

  // -------- KAI --------
  {
    type: 'kai-agent-invoke',
    category: 'ai',
    group: 'kai',
    displayName: 'KAI: Invocar agente',
    description: 'Llama a un agente Genkit del backend KAI.',
    icon: 'pi pi-sparkles',
    color: '#9C27B0',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    timeoutMs: 60000,
    schema: {
      type: 'object',
      properties: {
        flowName: { type: 'string', title: 'Genkit flow name' },
        inputJson: { type: 'object' }
      },
      required: ['flowName']
    }
  },

  // -------- SIIGO (3 nodos) --------
  {
    type: 'siigo-invoice-create',
    category: 'action',
    group: 'siigo',
    displayName: 'SIIGO: Crear factura electrónica',
    description: 'Genera factura electrónica en SIIGO desde una orden Katuq.',
    icon: 'pi pi-file',
    color: '#005689',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    credentials: 'siigo',
    timeoutMs: 60000,
    schema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['async', 'sync'], default: 'async' },
        orderIdSource: { type: 'string', default: '{{ $json.nroPedido }}' },
        documentType: { type: 'number', title: 'SIIGO document type id' },
        sellerId: { type: 'number', title: 'SIIGO seller id' }
      },
      required: ['orderIdSource']
    },
    defaults: { mode: 'async' },
    tags: ['siigo', 'invoice', 'accounting']
  },
  {
    type: 'siigo-customer-upsert',
    category: 'action',
    group: 'siigo',
    displayName: 'SIIGO: Crear/actualizar cliente',
    description: 'Sincroniza un cliente canónico Katuq al CRM de SIIGO.',
    icon: 'pi pi-user',
    color: '#005689',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    credentials: 'siigo',
    timeoutMs: 30000,
    schema: {
      type: 'object',
      properties: {
        mapping: { type: 'object', title: 'Custom field mapping' }
      }
    },
    tags: ['siigo', 'customer', 'upsert']
  },
  {
    type: 'siigo-job-status',
    category: 'action',
    group: 'siigo',
    displayName: 'SIIGO: Estado de job de facturación',
    description: 'Consulta el estado de un job async de facturación SIIGO.',
    icon: 'pi pi-search',
    color: '#005689',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    credentials: 'siigo',
    timeoutMs: 15000,
    schema: {
      type: 'object',
      properties: {
        jobIdSource: { type: 'string', default: '{{ $json.jobId }}' }
      },
      required: ['jobIdSource']
    },
    tags: ['siigo', 'job', 'status']
  },

  // -------- WORLD OFFICE (1 nodo) --------
  {
    type: 'worldoffice-invoice-create',
    category: 'action',
    group: 'worldoffice',
    displayName: 'World Office: Crear factura',
    description: 'Genera factura en World Office desde orden Katuq.',
    icon: 'pi pi-file',
    color: '#0066CC',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    credentials: 'worldoffice',
    timeoutMs: 60000,
    schema: {
      type: 'object',
      properties: {
        orderIdSource: { type: 'string', default: '{{ $json.nroPedido }}' },
        idTerceroInterno: { type: 'string' }
      },
      required: ['orderIdSource']
    },
    tags: ['worldoffice', 'invoice', 'accounting']
  },

  // -------- ALIADDO (1 nodo) --------
  {
    type: 'aliaddo-fulfillment-create',
    category: 'action',
    group: 'aliaddo',
    displayName: 'Aliaddo: Crear remisión',
    description: 'Genera remisión de venta en Aliaddo para fulfillment de una orden.',
    icon: 'pi pi-truck',
    color: '#FF6600',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    credentials: 'aliaddo',
    timeoutMs: 45000,
    schema: {
      type: 'object',
      properties: {
        orderIdSource: { type: 'string', default: '{{ $json.nroPedido }}' },
        terceroInternoId: { type: 'string' },
        bodegaCode: { type: 'string', title: 'Bodega Katuq business code' }
      },
      required: ['orderIdSource']
    },
    tags: ['aliaddo', 'fulfillment', 'remision']
  },

  // -------- ENVÍAME (1 nodo) --------
  {
    type: 'enviame-shipment-create',
    category: 'action',
    group: 'enviame',
    displayName: 'Envíame: Crear envío',
    description: 'Genera guía de envío en Envíame para una orden Katuq.',
    icon: 'pi pi-truck',
    color: '#5E35B1',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    credentials: 'enviame',
    timeoutMs: 45000,
    schema: {
      type: 'object',
      properties: {
        orderIdSource: { type: 'string', default: '{{ $json.nroPedido }}' },
        carrier: { type: 'string', title: 'Override carrier' },
        warehouseCode: { type: 'string' }
      },
      required: ['orderIdSource']
    },
    tags: ['enviame', 'shipment', 'logistics']
  },

  // -------- WOMPI (2 nodos) --------
  {
    type: 'wompi-payment-event',
    category: 'trigger',
    group: 'wompi',
    displayName: 'Wompi: Evento de pago',
    description: 'Trigger por webhook de transacciones Wompi (transaction.updated).',
    icon: 'pi pi-bolt',
    color: '#00B5D8',
    version: 1,
    inputs: [],
    outputs: [{ name: 'main', dataType: 'item[]' }],
    credentials: 'wompi',
    schema: {
      type: 'object',
      properties: {
        eventTypes: {
          type: 'array',
          items: { type: 'string' },
          default: ['transaction.updated']
        }
      }
    },
    defaults: { eventTypes: ['transaction.updated'] },
    tags: ['wompi', 'payment', 'webhook']
  },
  {
    type: 'wompi-payment-status',
    category: 'action',
    group: 'wompi',
    displayName: 'Wompi: Estado de pago',
    description: 'Consulta el status de una transacción Wompi.',
    icon: 'pi pi-credit-card',
    color: '#00B5D8',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    credentials: 'wompi',
    timeoutMs: 15000,
    schema: {
      type: 'object',
      properties: {
        transactionIdSource: { type: 'string', default: '{{ $json.transactionId }}' }
      },
      required: ['transactionIdSource']
    },
    tags: ['wompi', 'payment', 'status']
  },

  // -------- WOOCOMMERCE (2 nodos) --------
  {
    type: 'woocommerce-order-event',
    category: 'trigger',
    group: 'woocommerce',
    displayName: 'WooCommerce: Evento de pedido',
    description: 'Trigger por webhook de pedidos WooCommerce.',
    icon: 'pi pi-bolt',
    color: '#7F54B3',
    version: 1,
    inputs: [],
    outputs: [{ name: 'main', dataType: 'item[]' }],
    credentials: 'woocommerce',
    schema: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: { type: 'string', enum: ['order.created', 'order.updated', 'order.completed'] },
          default: ['order.created']
        }
      }
    },
    defaults: { events: ['order.created'] },
    tags: ['woocommerce', 'order', 'webhook']
  },
  {
    type: 'woocommerce-product-upsert',
    category: 'action',
    group: 'woocommerce',
    displayName: 'WooCommerce: Crear/actualizar producto',
    description: 'Sincroniza un producto canónico a WooCommerce.',
    icon: 'pi pi-shopping-bag',
    color: '#7F54B3',
    version: 1,
    inputs: [{ name: 'main', dataType: 'item[]' }],
    outputs: [
      { name: 'main', dataType: 'item[]' },
      { name: 'error', isError: true, dataType: 'item[]' }
    ],
    credentials: 'woocommerce',
    timeoutMs: 30000,
    schema: {
      type: 'object',
      properties: {
        matchBy: { type: 'string', enum: ['sku', 'wooId'], default: 'sku' },
        publishStatus: {
          type: 'string',
          enum: ['publish', 'draft', 'private'],
          default: 'publish'
        }
      }
    },
    defaults: { matchBy: 'sku', publishStatus: 'publish' },
    tags: ['woocommerce', 'product', 'upsert']
  }
];
