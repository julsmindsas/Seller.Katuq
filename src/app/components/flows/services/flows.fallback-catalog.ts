/**
 * Fallback NodeSpec catalog usado por el editor cuando el endpoint del
 * backend (GET /v1/flows/nodes/catalog) no está disponible o retorna vacío.
 *
 * AUTO-GENERADO desde el registry VIVO del backend
 * (katuq_admin_back_firebase/functions/services/flows/nodeRegistry.js) con:
 *
 *   cd katuq_admin_back_firebase/functions
 *   npm run generate:node-catalog
 *
 * El script backend escribe services/flows/nodeCatalog.json (única fuente
 * de verdad, poblada por registerAllNodes()); este archivo es una copia
 * tipada de ese JSON para el editor Angular. NO EDITAR A MANO — cualquier
 * cambio manual se pierde en la próxima regeneración. Para agregar/editar
 * un nodo, modificar su spec en el backend
 * (services/flows/nodes/<group>/<type>.<category>.js) y correr el script.
 */
import { NodeSpec } from '../interfaces/flow.interface';

export const FALLBACK_NODE_CATALOG: NodeSpec[] = [
  {
    "type": "aliaddo-fulfillment-create",
    "category": "action",
    "group": "aliaddo",
    "displayName": "Aliaddo · Crear remisión",
    "description": "Genera remisión de venta en Aliaddo para fulfillment de una orden.",
    "icon": "pi-truck",
    "color": "#ff6600",
    "version": 1,
    "inputs": [
      {
        "name": "main"
      }
    ],
    "outputs": [
      {
        "name": "main"
      },
      {
        "name": "error",
        "isError": true
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "orderIdSource": {
          "type": "string",
          "default": "{{ $json.nroPedido }}"
        },
        "terceroInternoId": {
          "type": "string"
        },
        "bodegaCode": {
          "type": "string",
          "description": "Bodega Katuq business code"
        }
      },
      "required": [
        "orderIdSource"
      ]
    }
  },
  {
    "type": "delay",
    "category": "flow-control",
    "group": "flow-control",
    "displayName": "Delay",
    "description": "Espera N ms antes de continuar (fixed o until, max 5 min).",
    "icon": "pi pi-clock",
    "color": "#FFA500",
    "version": 1,
    "inputs": [
      {
        "name": "main"
      }
    ],
    "outputs": [
      {
        "name": "main"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "mode": {
          "type": "string",
          "enum": [
            "fixed",
            "until"
          ],
          "default": "fixed"
        },
        "ms": {
          "type": "integer",
          "minimum": 0,
          "maximum": 300000
        },
        "untilTimestamp": {
          "type": "string"
        }
      }
    },
    "defaults": {
      "mode": "fixed",
      "ms": 1000
    },
    "tags": [
      "flow-control",
      "delay",
      "wait"
    ]
  },
  {
    "type": "enviame-shipment-create",
    "category": "action",
    "group": "enviame",
    "displayName": "Envíame · Crear envío",
    "description": "Genera guía de envío en Envíame para una orden Katuq.",
    "icon": "pi-truck",
    "color": "#5e35b1",
    "version": 1,
    "inputs": [
      {
        "name": "main"
      }
    ],
    "outputs": [
      {
        "name": "main"
      },
      {
        "name": "error",
        "isError": true
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "orderIdSource": {
          "type": "string",
          "default": "{{ $json.nroPedido }}"
        },
        "carrier": {
          "type": "string",
          "description": "Override carrier"
        },
        "warehouseCode": {
          "type": "string"
        }
      },
      "required": [
        "orderIdSource"
      ]
    }
  },
  {
    "type": "error-handler",
    "category": "flow-control",
    "group": "flow-control",
    "displayName": "Error Handler",
    "description": "Captura errores y rutea por la rama de error.",
    "icon": "pi pi-exclamation-triangle",
    "color": "#DC3545",
    "version": 1,
    "inputs": [
      {
        "name": "main"
      },
      {
        "name": "error",
        "isError": true
      }
    ],
    "outputs": [
      {
        "name": "main"
      },
      {
        "name": "error",
        "isError": true
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "continueOnError": {
          "type": "boolean",
          "default": true
        },
        "logToCollection": {
          "type": "string",
          "default": "flow_runs"
        }
      }
    },
    "defaults": {
      "continueOnError": true
    },
    "tags": [
      "flow-control",
      "error"
    ]
  },
  {
    "type": "http-request",
    "category": "flow-control",
    "group": "http",
    "displayName": "HTTP Request",
    "description": "Llamada HTTP genérica vía ResilientHttpClient.",
    "icon": "pi pi-globe",
    "color": "#17A2B8",
    "version": 1,
    "inputs": [
      {
        "name": "main"
      }
    ],
    "outputs": [
      {
        "name": "main"
      },
      {
        "name": "error",
        "isError": true
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "method": {
          "type": "string",
          "enum": [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE"
          ],
          "default": "GET"
        },
        "url": {
          "type": "string"
        },
        "headers": {
          "type": "object"
        },
        "body": {},
        "queryParams": {
          "type": "object"
        },
        "timeout": {
          "type": "integer"
        },
        "retries": {
          "type": "integer"
        },
        "authMode": {
          "type": "string",
          "enum": [
            "none",
            "basic",
            "bearer",
            "header",
            "oauth2-credential"
          ],
          "default": "none"
        }
      },
      "required": [
        "method",
        "url"
      ]
    },
    "defaults": {
      "method": "GET",
      "authMode": "none"
    },
    "tags": [
      "http",
      "request",
      "rest"
    ]
  },
  {
    "type": "if",
    "category": "flow-control",
    "group": "flow-control",
    "displayName": "IF",
    "description": "Bifurca el flujo según una condición booleana.",
    "icon": "pi pi-question-circle",
    "color": "#FFA500",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "true",
        "label": "Verdadero"
      },
      {
        "name": "false",
        "label": "Falso"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "condition": {
          "type": "string"
        }
      },
      "required": [
        "condition"
      ]
    },
    "tags": [
      "flow-control",
      "if",
      "condition"
    ]
  },
  {
    "type": "kai-agent-invoke",
    "category": "ai",
    "group": "kai",
    "displayName": "KAI: Invocar agente",
    "description": "Llama a un agente Genkit/KAI vía A2A Protocol (JSON-RPC 2.0).",
    "icon": "pi pi-sparkles",
    "color": "#9C27B0",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "flowName": {
          "type": "string",
          "title": "Genkit flow name"
        },
        "inputJson": {
          "type": "object"
        },
        "agentName": {
          "type": "string"
        },
        "method": {
          "type": "string"
        },
        "params": {
          "type": "object"
        }
      }
    },
    "tags": [
      "ai",
      "kai",
      "genkit"
    ]
  },
  {
    "type": "katuq-canonical-mapper",
    "category": "transform",
    "group": "katuq",
    "displayName": "Katuq: Mapper canónico",
    "description": "Traduce estructuras externas a CanonicalProduct/Order/Customer/Adjustment.",
    "icon": "pi pi-arrow-right-arrow-left",
    "color": "#5E72E4",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "targetSchema": {
          "type": "string",
          "enum": [
            "product",
            "order",
            "customer",
            "inventory-adjustment"
          ],
          "default": "product",
          "title": "Esquema destino",
          "description": "Tipo de entidad canónica Katuq al que se mapea cada item. Determina qué campos espera el nodo siguiente (upsert)."
        },
        "mapping": {
          "type": "object",
          "title": "Mapping (JSON)",
          "description": "Objeto que define cómo construir el esquema destino desde el item entrante. Las hojas pueden ser literales o expresiones {{ $json.<campo> }}. Si lo dejás vacío, el item pasa tal cual (passthrough). Ejemplo producto Cereza→Katuq: { \"identificacion\": { \"referencia\": \"{{ $json.reference }}\" }, \"titulo\": \"{{ $json.name }}\", ... }"
        }
      },
      "required": [
        "targetSchema"
      ]
    },
    "defaults": {
      "targetSchema": "product",
      "mapping": {}
    },
    "tags": [
      "transform",
      "mapper",
      "canonical"
    ]
  },
  {
    "type": "katuq-customer-upsert",
    "category": "action",
    "group": "katuq",
    "displayName": "Katuq: Upsert cliente",
    "description": "Crea o actualiza un cliente canónico en customers/clients.",
    "icon": "pi pi-user",
    "color": "#5E72E4",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "matchBy": {
          "type": "string",
          "enum": [
            "email",
            "numeroDocumento"
          ],
          "default": "email"
        },
        "collection": {
          "type": "string",
          "enum": [
            "customers",
            "clients"
          ],
          "default": "customers"
        }
      }
    },
    "defaults": {
      "matchBy": "email",
      "collection": "customers"
    },
    "tags": [
      "katuq",
      "customer",
      "upsert"
    ]
  },
  {
    "type": "katuq-inventory-adjust",
    "category": "action",
    "group": "katuq",
    "displayName": "Katuq: Ajustar inventario",
    "description": "Aplica delta/setTo sobre inventory + escribe inventoryMovement.",
    "icon": "pi pi-box",
    "color": "#5E72E4",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {}
    },
    "tags": [
      "katuq",
      "inventory",
      "adjust"
    ]
  },
  {
    "type": "katuq-order-lookup",
    "category": "action",
    "group": "katuq",
    "displayName": "Katuq: Buscar pedido",
    "description": "Lee un pedido de Firestore por Shopify order ID, nroPedido o document ID.",
    "icon": "pi pi-search",
    "color": "#5E72E4",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "lookupBy": {
          "type": "string",
          "enum": [
            "auto",
            "shopifyOrderId",
            "nroPedido",
            "docId"
          ],
          "default": "auto",
          "title": "Buscar por",
          "description": "\"auto\" detecta el campo del input. Alternativas: shopifyOrderId, nroPedido, docId."
        }
      }
    },
    "defaults": {
      "lookupBy": "auto"
    },
    "tags": [
      "katuq",
      "order",
      "lookup",
      "read"
    ]
  },
  {
    "type": "katuq-order-upsert",
    "category": "action",
    "group": "katuq",
    "displayName": "Katuq: Upsert pedido",
    "description": "Crea o actualiza un pedido canónico en la colección orders.",
    "icon": "pi pi-database",
    "color": "#5E72E4",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "matchBy": {
          "type": "string",
          "enum": [
            "nroPedido",
            "externalId"
          ],
          "default": "nroPedido"
        },
        "recalculateTotals": {
          "type": "boolean",
          "default": true
        }
      }
    },
    "defaults": {
      "matchBy": "nroPedido",
      "recalculateTotals": true
    },
    "tags": [
      "katuq",
      "order",
      "upsert"
    ]
  },
  {
    "type": "katuq-product-changed",
    "category": "trigger",
    "group": "internal",
    "displayName": "Katuq: Producto web cambiado",
    "description": "Polling Firestore: emite productos Katuq marcados para web (paginaWeb) creados/modificados. Excluye proveedores con su propio flow (ej. Cereza/osmosis).",
    "icon": "pi pi-database",
    "color": "#5E72E4",
    "version": 1,
    "inputs": [],
    "outputs": [
      {
        "name": "main",
        "label": "Producto Katuq",
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "intervalMinutes": {
          "type": "integer",
          "title": "Intervalo de polling (min)",
          "minimum": 1,
          "maximum": 1440,
          "default": 10
        },
        "maxPerRun": {
          "type": "integer",
          "title": "Máx por corrida",
          "minimum": 1,
          "maximum": 5000,
          "default": 300
        },
        "excludeProviders": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "title": "Proveedores a excluir",
          "description": "Claves de integrations.* a EXCLUIR porque tienen su propio flow (ej. [\"osmosis\"] = Cereza).",
          "default": [
            "osmosis"
          ]
        },
        "onlyWithStock": {
          "type": "boolean",
          "title": "Solo con stock",
          "default": false
        }
      }
    },
    "defaults": {
      "intervalMinutes": 10,
      "maxPerRun": 300,
      "excludeProviders": [
        "osmosis"
      ],
      "onlyWithStock": false
    },
    "tags": [
      "katuq",
      "product",
      "web",
      "polling",
      "trigger"
    ]
  },
  {
    "type": "katuq-product-resolver-by-ref",
    "category": "transform",
    "group": "katuq",
    "displayName": "Katuq: Resolver producto por SKU",
    "description": "Resuelve carrito[*].producto.cd buscando por identificacion.referencia (SKU) en products del tenant.",
    "icon": "pi pi-search",
    "color": "#5E72E4",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "strict": {
          "type": "boolean",
          "default": false,
          "title": "Modo estricto",
          "description": "Si true, mandar al port error cuando alguna linea no encuentra producto. Si false (default), dejar cd vacio y dejar pasar."
        }
      }
    },
    "defaults": {
      "strict": false
    },
    "tags": [
      "katuq",
      "product",
      "resolver",
      "sku"
    ]
  },
  {
    "type": "katuq-product-upsert",
    "category": "action",
    "group": "katuq",
    "displayName": "Katuq: Upsert producto",
    "description": "Crea o actualiza un producto canónico en la colección products.",
    "icon": "pi pi-database",
    "color": "#5E72E4",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "matchBy": {
          "type": "string",
          "enum": [
            "referencia",
            "cd",
            "codigoBarras"
          ],
          "default": "referencia"
        },
        "createIfMissing": {
          "type": "boolean",
          "default": true
        }
      }
    },
    "defaults": {
      "matchBy": "referencia",
      "createIfMissing": true
    },
    "tags": [
      "katuq",
      "product",
      "upsert"
    ]
  },
  {
    "type": "loop",
    "category": "flow-control",
    "group": "flow-control",
    "displayName": "Loop",
    "description": "Itera sobre un array (1 item por elemento, opcional batchSize).",
    "icon": "pi pi-replay",
    "color": "#FFA500",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "label": "Iteración"
      },
      {
        "name": "done",
        "label": "Finalizado"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "arrayPath": {
          "type": "string"
        },
        "batchSize": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 1
        }
      },
      "required": [
        "arrayPath"
      ]
    },
    "defaults": {
      "batchSize": 1
    },
    "tags": [
      "flow-control",
      "loop",
      "iteration"
    ]
  },
  {
    "type": "merge",
    "category": "flow-control",
    "group": "flow-control",
    "displayName": "Merge",
    "description": "Une dos ramas (append, mergeByKey, multiplex).",
    "icon": "pi pi-arrow-right",
    "color": "#FFA500",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "label": "Entrada A"
      },
      {
        "name": "mainB",
        "label": "Entrada B"
      }
    ],
    "outputs": [
      {
        "name": "main"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "mode": {
          "type": "string",
          "enum": [
            "append",
            "mergeByKey",
            "multiplex"
          ],
          "default": "append"
        },
        "keyField": {
          "type": "string"
        }
      }
    },
    "defaults": {
      "mode": "append"
    },
    "tags": [
      "flow-control",
      "merge"
    ]
  },
  {
    "type": "osmosis-order-changed",
    "category": "trigger",
    "group": "osmosis",
    "displayName": "Osmosis: Pedido cambiado",
    "description": "Polling Osmosis: emite order.created u order.status_changed.",
    "icon": "pi pi-shopping-cart",
    "color": "#C8102E",
    "version": 1,
    "inputs": [],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "nodeSlug": {
          "type": "string",
          "default": "cereza"
        },
        "statuses": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Filtrar por estatus específicos"
        },
        "intervalMinutes": {
          "type": "integer",
          "title": "Intervalo de polling (min)",
          "minimum": 1,
          "maximum": 60,
          "default": 5
        }
      },
      "required": [
        "nodeSlug"
      ]
    },
    "defaults": {
      "nodeSlug": "cereza",
      "intervalMinutes": 5
    },
    "tags": [
      "osmosis",
      "order",
      "polling",
      "trigger"
    ]
  },
  {
    "type": "osmosis-order-create",
    "category": "action",
    "group": "osmosis",
    "displayName": "Osmosis: Crear pedido",
    "description": "Crea un pedido en Osmosis desde CanonicalOrder Katuq.",
    "icon": "pi pi-plus-circle",
    "color": "#C8102E",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "nodeSlug": {
          "type": "string",
          "default": "cereza"
        },
        "mapping": {
          "type": "object",
          "title": "Mapping override",
          "description": "Map<campoOsmosis, expression>. Permite sobrescribir el mapeo por defecto Katuq→Osmosis.",
          "additionalProperties": {
            "type": "string"
          }
        },
        "requirePaid": {
          "type": "boolean",
          "default": true,
          "title": "Solo auto-push si pagado"
        }
      }
    },
    "defaults": {
      "nodeSlug": "cereza",
      "requirePaid": true
    },
    "tags": [
      "osmosis",
      "order",
      "create"
    ]
  },
  {
    "type": "osmosis-order-status-update",
    "category": "action",
    "group": "osmosis",
    "displayName": "Osmosis: Actualizar estado de orden",
    "description": "PATCH al estado de una orden en Cereza/Osmosis. Lee osmosisOrderId desde integraciones.osmosis.",
    "icon": "pi pi-sync",
    "color": "#10B981",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "status": {
          "type": "string",
          "enum": [
            "pending",
            "confirmed",
            "processing",
            "shipped",
            "delivered",
            "cancelled"
          ],
          "title": "Estado destino"
        },
        "notes": {
          "type": "string",
          "title": "Nota opcional (ej. guía)"
        },
        "fromOrderField": {
          "type": "string",
          "title": "Campo del item con osmosisOrderId",
          "description": "Path dentro de item.json. Default: integraciones.osmosis.osmosisOrderId",
          "default": "integraciones.osmosis.osmosisOrderId"
        }
      },
      "required": [
        "status"
      ]
    },
    "defaults": {
      "status": "shipped",
      "fromOrderField": "integraciones.osmosis.osmosisOrderId"
    },
    "tags": [
      "osmosis",
      "cereza",
      "order",
      "status"
    ]
  },
  {
    "type": "osmosis-orders-status-pull",
    "category": "action",
    "group": "osmosis",
    "displayName": "Osmosis: Sincronizar estados de órdenes",
    "description": "Pull de estados desde Cereza/Osmosis para todas las órdenes Katuq con osmosisOrderId no terminales. Captura status + lastNote. Pensado para trigger schedule-cron.",
    "icon": "pi pi-sync",
    "color": "#10B981",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {}
    },
    "defaults": {},
    "tags": [
      "osmosis",
      "cereza",
      "order",
      "status",
      "pull",
      "sync"
    ]
  },
  {
    "type": "osmosis-product-changed",
    "category": "trigger",
    "group": "osmosis",
    "displayName": "Osmosis: Producto cambiado",
    "description": "Polling Osmosis: emite product.upserted por cada producto creado o modificado.",
    "icon": "pi pi-shopping-bag",
    "color": "#C8102E",
    "version": 1,
    "inputs": [],
    "outputs": [
      {
        "name": "main",
        "label": "Producto canónico",
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "nodeSlug": {
          "type": "string",
          "title": "Node slug",
          "default": "cereza"
        },
        "events": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "created",
              "updated",
              "deleted"
            ]
          },
          "default": [
            "created",
            "updated"
          ]
        },
        "intervalMinutes": {
          "type": "integer",
          "title": "Intervalo de polling (min)",
          "minimum": 1,
          "maximum": 60,
          "default": 5
        },
        "limit": {
          "type": "integer",
          "title": "Límite por corrida (0 = sin límite)",
          "description": "Cuántos productos como máximo emitir por cada polling. Útil para activación gradual o pruebas controladas.",
          "minimum": 0,
          "maximum": 10000,
          "default": 0
        },
        "onlyWithStock": {
          "type": "boolean",
          "title": "Solo productos con existencias",
          "description": "Si está activo, omite productos cuyo stock_available total sea 0 (no los emite ni los persiste).",
          "default": true
        }
      },
      "required": [
        "nodeSlug"
      ]
    },
    "defaults": {
      "nodeSlug": "cereza",
      "events": [
        "created",
        "updated"
      ],
      "intervalMinutes": 5,
      "limit": 0,
      "onlyWithStock": true
    },
    "tags": [
      "osmosis",
      "cereza",
      "product",
      "polling",
      "trigger"
    ]
  },
  {
    "type": "osmosis-product-fetch",
    "category": "action",
    "group": "osmosis",
    "displayName": "Osmosis: Obtener productos",
    "description": "Lee productos de Osmosis (todos, por ID o por referencia/SKU).",
    "icon": "pi pi-download",
    "color": "#C8102E",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "mode": {
          "type": "string",
          "enum": [
            "all",
            "byId",
            "byReference"
          ],
          "default": "all",
          "title": "Modo"
        },
        "productId": {
          "type": "string",
          "title": "Product ID (Osmosis)"
        },
        "sku": {
          "type": "string",
          "title": "SKU / Referencia"
        }
      }
    },
    "defaults": {
      "mode": "all"
    },
    "tags": [
      "osmosis",
      "product",
      "read",
      "fetch"
    ]
  },
  {
    "type": "osmosis-stock-changed",
    "category": "trigger",
    "group": "osmosis",
    "displayName": "Osmosis: Stock cambiado",
    "description": "Polling Osmosis: emite un InventoryAdjustment por cada combinación size/color/bodega cuyo stock_available cambió.",
    "icon": "pi pi-box",
    "color": "#C8102E",
    "version": 1,
    "inputs": [],
    "outputs": [
      {
        "name": "main",
        "label": "CanonicalInventoryAdjustment",
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "nodeSlug": {
          "type": "string",
          "title": "Node slug"
        },
        "defaultBodegaCode": {
          "type": "string",
          "title": "Bodega Katuq destino",
          "description": "Business code de la bodega Katuq donde aplicar todos los stocks (ej \"BOD-CEREZA-1\"). Recomendado: usar expression {{ $companyConfig.osmosis.bodegaCode }}."
        },
        "reason": {
          "type": "string",
          "title": "Reason del movimiento",
          "description": "Reason para el inventoryMovement. Debe estar en ALLOWED_REASONS del handler.",
          "enum": [
            "osmosis_sync",
            "restock",
            "manual_adjustment"
          ],
          "default": "osmosis_sync"
        },
        "intervalMinutes": {
          "type": "integer",
          "title": "Intervalo de polling (min)",
          "minimum": 1,
          "maximum": 60,
          "default": 15
        },
        "limit": {
          "type": "integer",
          "title": "Límite por corrida (0 = sin límite)",
          "description": "Cuántos ajustes máximo emitir por cada polling.",
          "minimum": 0,
          "maximum": 100000,
          "default": 0
        }
      },
      "required": [
        "nodeSlug",
        "defaultBodegaCode",
        "reason"
      ]
    },
    "defaults": {
      "reason": "osmosis_sync",
      "intervalMinutes": 15,
      "limit": 0
    },
    "tags": [
      "osmosis",
      "cereza",
      "inventory",
      "stock",
      "polling",
      "trigger"
    ]
  },
  {
    "type": "schedule-cron",
    "category": "trigger",
    "group": "internal",
    "displayName": "Schedule (cron)",
    "description": "Dispara el flow según una expresión cron (ej: \"0 9 * * 1\" para todos los lunes a las 9am). Soporta zona horaria configurable.",
    "icon": "pi pi-clock",
    "color": "#5E72E4",
    "version": 1,
    "inputs": [],
    "outputs": [
      {
        "name": "main",
        "label": "Tick",
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "cronExpression": {
          "type": "string",
          "title": "Expresión cron",
          "description": "Formato estándar de 5 campos (min, hora, día-mes, mes, día-semana). Ejemplos: \"0 9 * * 1\" lunes 9am — \"*/15 * * * *\" cada 15min — \"0 0 1 * *\" día 1 del mes.",
          "default": "0 9 * * 1"
        },
        "timezone": {
          "type": "string",
          "title": "Zona horaria",
          "description": "IANA timezone (ej: America/Bogota, Europe/Madrid). Default: America/Bogota.",
          "default": "America/Bogota"
        }
      },
      "required": [
        "cronExpression"
      ]
    },
    "defaults": {
      "cronExpression": "0 9 * * 1",
      "timezone": "America/Bogota"
    },
    "tags": [
      "trigger",
      "cron",
      "schedule",
      "time"
    ]
  },
  {
    "type": "shopify-fulfillment-create",
    "category": "action",
    "group": "shopify",
    "displayName": "Shopify: Crear fulfillment",
    "description": "Crea un fulfillment en Shopify (despacho parcial/total).",
    "icon": "pi pi-truck",
    "color": "#95BF47",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "shopifyOrderId": {
          "type": "string",
          "description": "ID numérico Shopify (resuelto por expresión)."
        },
        "trackingNumber": {
          "type": "string"
        },
        "trackingUrl": {
          "type": "string",
          "format": "uri"
        },
        "trackingCompany": {
          "type": "string"
        },
        "notifyCustomer": {
          "type": "boolean",
          "default": true
        }
      }
    },
    "defaults": {
      "notifyCustomer": true
    },
    "tags": [
      "shopify",
      "fulfillment"
    ]
  },
  {
    "type": "shopify-inventory-adjust",
    "category": "action",
    "group": "shopify",
    "displayName": "Shopify: Ajustar inventario",
    "description": "Aplica delta o setTo en inventario Shopify.",
    "icon": "pi pi-box",
    "color": "#95BF47",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "inventoryItemId": {
          "type": "string"
        },
        "locationId": {
          "type": "string",
          "title": "Shopify Location GID o numérico"
        },
        "mode": {
          "type": "string",
          "enum": [
            "setTo",
            "delta"
          ],
          "default": "setTo"
        },
        "quantity": {
          "type": "number"
        },
        "reason": {
          "type": "string",
          "default": "correction"
        }
      }
    },
    "defaults": {
      "mode": "setTo",
      "reason": "correction"
    },
    "tags": [
      "shopify",
      "inventory",
      "adjust"
    ]
  },
  {
    "type": "shopify-inventory-changed",
    "category": "trigger",
    "group": "shopify",
    "displayName": "Shopify: Inventario cambiado",
    "description": "Webhook inventory_levels/update.",
    "icon": "pi pi-box",
    "color": "#95BF47",
    "version": 1,
    "inputs": [],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {}
    },
    "tags": [
      "shopify",
      "inventory",
      "webhook"
    ]
  },
  {
    "type": "shopify-order-create",
    "category": "action",
    "group": "shopify",
    "displayName": "Shopify: Crear pedido",
    "description": "Crea un pedido en Shopify desde CanonicalOrder.",
    "icon": "pi pi-plus-circle",
    "color": "#95BF47",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "pushAsCompleted": {
          "type": "boolean",
          "default": true
        },
        "paymentPending": {
          "type": "boolean",
          "default": false
        }
      }
    },
    "defaults": {
      "pushAsCompleted": true,
      "paymentPending": false
    },
    "tags": [
      "shopify",
      "order",
      "create"
    ]
  },
  {
    "type": "shopify-order-created",
    "category": "trigger",
    "group": "shopify",
    "displayName": "Shopify: Pedido creado",
    "description": "Webhook orders/create. Reusa shopify_webhook_events.",
    "icon": "pi pi-shopping-cart",
    "color": "#95BF47",
    "version": 1,
    "inputs": [],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {}
    },
    "tags": [
      "shopify",
      "order",
      "webhook"
    ]
  },
  {
    "type": "shopify-order-updated",
    "category": "trigger",
    "group": "shopify",
    "displayName": "Shopify: Pedido actualizado",
    "description": "Webhook orders/updated.",
    "icon": "pi pi-refresh",
    "color": "#95BF47",
    "version": 1,
    "inputs": [],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {}
    },
    "tags": [
      "shopify",
      "order",
      "webhook"
    ]
  },
  {
    "type": "shopify-pricelist-sync",
    "category": "action",
    "group": "shopify",
    "displayName": "Shopify: Sincronizar precios por tipo de cliente",
    "description": "Empuja precios Mayorista/Modelo a las Market Price Lists de Shopify.",
    "icon": "pi pi-dollar",
    "color": "#95BF47",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "tier": {
          "type": "string",
          "title": "Tier (vacío = todos)"
        }
      }
    },
    "defaults": {},
    "tags": [
      "shopify",
      "pricing",
      "b2b",
      "markets"
    ]
  },
  {
    "type": "shopify-product-changed",
    "category": "trigger",
    "group": "shopify",
    "displayName": "Shopify: Producto cambiado",
    "description": "Webhook products/create + products/update.",
    "icon": "pi pi-shopping-bag",
    "color": "#95BF47",
    "version": 1,
    "inputs": [],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "events": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "create",
              "update",
              "delete"
            ]
          },
          "default": [
            "create",
            "update"
          ]
        }
      }
    },
    "defaults": {
      "events": [
        "create",
        "update"
      ]
    },
    "tags": [
      "shopify",
      "product",
      "webhook"
    ]
  },
  {
    "type": "shopify-product-upsert",
    "category": "action",
    "group": "shopify",
    "displayName": "Shopify: Crear/actualizar producto",
    "description": "Upserta producto en Shopify desde CanonicalProduct.",
    "icon": "pi pi-cloud-upload",
    "color": "#95BF47",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "matchBy": {
          "type": "string",
          "enum": [
            "shopifyId",
            "sku",
            "title"
          ],
          "default": "shopifyId"
        },
        "publishStatus": {
          "type": "string",
          "enum": [
            "ACTIVE",
            "DRAFT",
            "ARCHIVED"
          ],
          "default": "ACTIVE"
        },
        "publishToOnlineStore": {
          "type": "boolean",
          "default": true
        },
        "syncImages": {
          "type": "boolean",
          "default": true
        },
        "syncInventory": {
          "type": "boolean",
          "default": false
        }
      }
    },
    "defaults": {
      "matchBy": "shopifyId",
      "publishStatus": "ACTIVE",
      "publishToOnlineStore": true,
      "syncImages": true,
      "syncInventory": false
    },
    "tags": [
      "shopify",
      "product",
      "upsert"
    ]
  },
  {
    "type": "siigo-customer-upsert",
    "category": "action",
    "group": "siigo",
    "displayName": "SIIGO · Crear/actualizar cliente",
    "description": "Sincroniza un cliente canónico Katuq al CRM de SIIGO.",
    "icon": "pi-user",
    "color": "#005689",
    "version": 1,
    "inputs": [
      {
        "name": "main"
      }
    ],
    "outputs": [
      {
        "name": "main"
      },
      {
        "name": "error",
        "isError": true
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "mapping": {
          "type": "object",
          "description": "Custom field mapping"
        }
      }
    }
  },
  {
    "type": "siigo-invoice-create",
    "category": "action",
    "group": "siigo",
    "displayName": "SIIGO · Crear factura electrónica",
    "description": "Genera factura electrónica en SIIGO desde una orden Katuq.",
    "icon": "pi-file",
    "color": "#005689",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "mode": {
          "type": "string",
          "enum": [
            "async",
            "sync"
          ],
          "default": "async"
        },
        "orderIdSource": {
          "type": "string",
          "default": "{{ $json.nroPedido }}"
        },
        "documentType": {
          "type": "number",
          "description": "SIIGO document type id"
        },
        "sellerId": {
          "type": "number",
          "description": "SIIGO seller id"
        }
      },
      "required": [
        "orderIdSource"
      ]
    },
    "defaults": {
      "mode": "async"
    }
  },
  {
    "type": "siigo-job-status",
    "category": "action",
    "group": "siigo",
    "displayName": "SIIGO · Estado de job de facturación",
    "description": "Consulta el estado de un job async de facturación SIIGO.",
    "icon": "pi-search",
    "color": "#005689",
    "version": 1,
    "inputs": [
      {
        "name": "main"
      }
    ],
    "outputs": [
      {
        "name": "main"
      },
      {
        "name": "error",
        "isError": true
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "jobIdSource": {
          "type": "string",
          "default": "{{ $json.jobId }}"
        }
      },
      "required": [
        "jobIdSource"
      ]
    }
  },
  {
    "type": "split-array",
    "category": "flow-control",
    "group": "flow-control",
    "displayName": "Split Array",
    "description": "Convierte un array en N items individuales.",
    "icon": "pi pi-list",
    "color": "#FFA500",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "fieldPath": {
          "type": "string"
        }
      },
      "required": [
        "fieldPath"
      ]
    },
    "tags": [
      "flow-control",
      "split",
      "array"
    ]
  },
  {
    "type": "sub-flow",
    "category": "flow-control",
    "group": "flow-control",
    "displayName": "Sub-flow",
    "description": "Invoca otro flow como subroutine.",
    "icon": "pi pi-sitemap",
    "color": "#6C757D",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      },
      {
        "name": "error",
        "isError": true,
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "flowId": {
          "type": "string"
        },
        "waitForCompletion": {
          "type": "boolean",
          "default": true
        }
      },
      "required": [
        "flowId"
      ]
    },
    "defaults": {
      "waitForCompletion": true
    },
    "tags": [
      "flow-control",
      "sub-flow"
    ]
  },
  {
    "type": "switch",
    "category": "flow-control",
    "group": "flow-control",
    "displayName": "Switch",
    "description": "Rutea según valor de expresión a múltiples ramas.",
    "icon": "pi pi-share-alt",
    "color": "#FFA500",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "0"
      },
      {
        "name": "1"
      },
      {
        "name": "2"
      },
      {
        "name": "3"
      },
      {
        "name": "default"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "expression": {
          "type": "string"
        },
        "cases": {
          "type": "array"
        }
      },
      "required": [
        "expression"
      ]
    },
    "tags": [
      "flow-control",
      "switch"
    ]
  },
  {
    "type": "webhook-listener",
    "category": "trigger",
    "group": "internal",
    "displayName": "Webhook (HTTP)",
    "description": "Recibe POST en una URL pública. Cualquier sistema externo (Zapier, Make, app custom, partner) puede pegarle y dispara el flow con el body como primer item. HMAC opcional via webhookSecret.",
    "icon": "pi pi-link",
    "color": "#5E72E4",
    "version": 1,
    "inputs": [],
    "outputs": [
      {
        "name": "main",
        "label": "Body recibido",
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "method": {
          "type": "string",
          "title": "Método HTTP esperado",
          "enum": [
            "POST"
          ],
          "default": "POST",
          "description": "Hoy el endpoint solo acepta POST. GET reservado para futuras versiones."
        },
        "webhookSecret": {
          "type": "string",
          "title": "Secret HMAC (opcional)",
          "description": "Si se configura, el sistema externo debe enviar el header `x-katuq-signature` con HMAC-SHA256 del body. Si lo dejás vacío, la URL es pública sin verificación. Recomendado para producción."
        },
        "payloadDescription": {
          "type": "string",
          "title": "Descripción del payload esperado",
          "description": "Notas para vos/equipo sobre qué shape de body llega (ej: \"Webhook de Zapier con campos {orderId, total}\"). No se valida — solo documentación."
        }
      }
    },
    "defaults": {
      "method": "POST"
    },
    "tags": [
      "trigger",
      "webhook",
      "http",
      "generic"
    ]
  },
  {
    "type": "wompi-payment-event",
    "category": "trigger",
    "group": "wompi",
    "displayName": "Wompi · Evento de pago",
    "description": "Trigger por webhook de transacciones Wompi.",
    "icon": "pi-bolt",
    "color": "#00b5d8",
    "version": 1,
    "inputs": [],
    "outputs": [
      {
        "name": "main"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "eventTypes": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "default": [
            "transaction.updated"
          ]
        }
      }
    }
  },
  {
    "type": "wompi-payment-status",
    "category": "action",
    "group": "wompi",
    "displayName": "Wompi · Estado de pago",
    "description": "Consulta el status de una transacción Wompi.",
    "icon": "pi-credit-card",
    "color": "#00b5d8",
    "version": 1,
    "inputs": [
      {
        "name": "main"
      }
    ],
    "outputs": [
      {
        "name": "main"
      },
      {
        "name": "error",
        "isError": true
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "transactionIdSource": {
          "type": "string",
          "default": "{{ $json.transactionId }}"
        }
      },
      "required": [
        "transactionIdSource"
      ]
    }
  },
  {
    "type": "woocommerce-fetch-products",
    "category": "action",
    "group": "woocommerce",
    "displayName": "WooCommerce · Traer productos",
    "description": "Pagina /products?modified_after=cursor — emite 1 item por producto.",
    "icon": "pi-download",
    "color": "#7f54b3",
    "version": 1,
    "inputs": [
      {
        "name": "main"
      }
    ],
    "outputs": [
      {
        "name": "main"
      },
      {
        "name": "error",
        "isError": true
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "batchSize": {
          "type": "number",
          "default": 100,
          "minimum": 1,
          "maximum": 100
        },
        "modifiedAfter": {
          "type": "string",
          "description": "ISO timestamp opcional para sync incremental"
        },
        "status": {
          "type": "string",
          "enum": [
            "any",
            "publish",
            "trash",
            "draft"
          ],
          "default": "any"
        }
      }
    },
    "defaults": {
      "batchSize": 100,
      "status": "any"
    }
  },
  {
    "type": "woocommerce-fulfillment-create",
    "category": "action",
    "group": "woocommerce",
    "displayName": "WooCommerce · Crear fulfillment (fase 2)",
    "description": "STUB — pendiente decisión de approach con piloto real.",
    "icon": "pi-truck",
    "color": "#7f54b3",
    "version": 0,
    "inputs": [
      {
        "name": "main"
      }
    ],
    "outputs": [
      {
        "name": "main"
      },
      {
        "name": "error",
        "isError": true
      }
    ],
    "schema": {
      "type": "object",
      "properties": {}
    }
  },
  {
    "type": "woocommerce-inventory-adjust",
    "category": "action",
    "group": "woocommerce",
    "displayName": "WooCommerce · Ajustar inventario",
    "description": "Setea stock absoluto en WC (producto simple o variación).",
    "icon": "pi-database",
    "color": "#7f54b3",
    "version": 1,
    "inputs": [
      {
        "name": "main"
      }
    ],
    "outputs": [
      {
        "name": "main"
      },
      {
        "name": "error",
        "isError": true
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "wooProductId": {
          "type": [
            "string",
            "number"
          ]
        },
        "sku": {
          "type": "string"
        },
        "variationId": {
          "type": [
            "string",
            "number"
          ]
        },
        "quantity": {
          "type": "number"
        }
      }
    }
  },
  {
    "type": "woocommerce-inventory-changed",
    "category": "trigger",
    "group": "woocommerce",
    "displayName": "WooCommerce · Stock cambiado",
    "description": "Detecta cambios de stock_quantity en webhook product.updated.",
    "icon": "pi-database",
    "color": "#7f54b3",
    "version": 1,
    "inputs": [],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {}
    },
    "tags": [
      "woocommerce",
      "inventory",
      "webhook"
    ]
  },
  {
    "type": "woocommerce-order-create",
    "category": "action",
    "group": "woocommerce",
    "displayName": "WooCommerce · Crear pedido",
    "description": "Crea una orden en WC vía POST /orders. Bidireccional Katuq → Woo.",
    "icon": "pi-plus-circle",
    "color": "#7f54b3",
    "version": 1,
    "inputs": [
      {
        "name": "main"
      }
    ],
    "outputs": [
      {
        "name": "main"
      },
      {
        "name": "error",
        "isError": true
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "status": {
          "type": "string",
          "enum": [
            "pending",
            "processing",
            "on-hold",
            "completed"
          ],
          "default": "processing"
        }
      }
    },
    "defaults": {
      "status": "processing"
    }
  },
  {
    "type": "woocommerce-order-created",
    "category": "trigger",
    "group": "woocommerce",
    "displayName": "WooCommerce · Pedido nuevo",
    "description": "Webhook order.created — se dispara cuando llega un pedido nuevo.",
    "icon": "pi-shopping-bag",
    "color": "#7f54b3",
    "version": 1,
    "inputs": [],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {}
    },
    "tags": [
      "woocommerce",
      "order",
      "webhook"
    ]
  },
  {
    "type": "woocommerce-order-event",
    "category": "trigger",
    "group": "woocommerce",
    "displayName": "WooCommerce · Evento de pedido",
    "description": "Trigger por webhook de pedidos WooCommerce.",
    "icon": "pi-bolt",
    "color": "#7f54b3",
    "version": 1,
    "inputs": [],
    "outputs": [
      {
        "name": "main"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "events": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "order.created",
              "order.updated",
              "order.completed"
            ]
          },
          "default": [
            "order.created"
          ]
        }
      }
    }
  },
  {
    "type": "woocommerce-order-map",
    "category": "transform",
    "group": "woocommerce",
    "displayName": "WooCommerce: Mapear pedido",
    "description": "Resuelve productos por SKU y traduce el pedido WooCommerce al formato canónico Katuq.",
    "icon": "pi pi-arrow-right-arrow-left",
    "color": "#7f54b3",
    "version": 1,
    "inputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {}
    },
    "tags": [
      "woocommerce",
      "order",
      "mapper",
      "transform"
    ]
  },
  {
    "type": "woocommerce-order-status-update",
    "category": "action",
    "group": "woocommerce",
    "displayName": "WooCommerce · Cambiar estado de pedido",
    "description": "PUT /orders/{id} con status + nota opcional.",
    "icon": "pi-check-circle",
    "color": "#7f54b3",
    "version": 1,
    "inputs": [
      {
        "name": "main"
      }
    ],
    "outputs": [
      {
        "name": "main"
      },
      {
        "name": "error",
        "isError": true
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "wooOrderId": {
          "type": [
            "string",
            "number"
          ]
        },
        "status": {
          "type": "string",
          "enum": [
            "pending",
            "processing",
            "on-hold",
            "completed",
            "cancelled",
            "refunded",
            "failed"
          ]
        },
        "note": {
          "type": "string"
        },
        "noteVisibleToCustomer": {
          "type": "boolean",
          "default": true
        }
      }
    },
    "defaults": {
      "noteVisibleToCustomer": true
    }
  },
  {
    "type": "woocommerce-order-updated",
    "category": "trigger",
    "group": "woocommerce",
    "displayName": "WooCommerce · Pedido actualizado",
    "description": "Webhook order.updated — cambios de estado o ítems en un pedido existente.",
    "icon": "pi-refresh",
    "color": "#7f54b3",
    "version": 1,
    "inputs": [],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {}
    },
    "tags": [
      "woocommerce",
      "order",
      "webhook"
    ]
  },
  {
    "type": "woocommerce-product-changed",
    "category": "trigger",
    "group": "woocommerce",
    "displayName": "WooCommerce · Producto cambiado",
    "description": "Webhook product.created/updated/deleted — emite canonical.",
    "icon": "pi-box",
    "color": "#7f54b3",
    "version": 1,
    "inputs": [],
    "outputs": [
      {
        "name": "main",
        "dataType": "item[]"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "events": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "created",
              "updated",
              "deleted"
            ]
          },
          "default": [
            "created",
            "updated"
          ]
        }
      }
    },
    "defaults": {
      "events": [
        "created",
        "updated"
      ]
    },
    "tags": [
      "woocommerce",
      "product",
      "webhook"
    ]
  },
  {
    "type": "woocommerce-product-upsert",
    "category": "action",
    "group": "woocommerce",
    "displayName": "WooCommerce · Crear/actualizar producto",
    "description": "Sincroniza un producto canónico a WooCommerce (por SKU o wooId).",
    "icon": "pi-shopping-bag",
    "color": "#7f54b3",
    "version": 1,
    "inputs": [
      {
        "name": "main"
      }
    ],
    "outputs": [
      {
        "name": "main"
      },
      {
        "name": "error",
        "isError": true
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "matchBy": {
          "type": "string",
          "enum": [
            "sku",
            "wooId"
          ],
          "default": "sku"
        },
        "publishStatus": {
          "type": "string",
          "enum": [
            "publish",
            "draft",
            "private"
          ],
          "default": "publish"
        }
      }
    },
    "defaults": {
      "matchBy": "sku",
      "publishStatus": "publish"
    }
  },
  {
    "type": "worldoffice-balances-sync",
    "category": "action",
    "group": "worldoffice",
    "displayName": "World Office · Sincronizar cartera",
    "description": "Sincroniza saldos pendientes (CxC + CxP) por tercero a Firestore. Depende de accounting_documents ya sincronizado.",
    "icon": "pi-money-bill",
    "color": "#0066cc",
    "version": 1,
    "inputs": [
      {
        "name": "main"
      }
    ],
    "outputs": [
      {
        "name": "main"
      },
      {
        "name": "error",
        "isError": true
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "skipZero": {
          "type": "boolean",
          "default": false,
          "description": "Si true, NO persiste terceros con saldoTotal=0 (reduce volumen Firestore)."
        },
        "skipEnrichTercero": {
          "type": "boolean",
          "default": false,
          "description": "Si true, OMITE getCustomer (sin email/teléfono/ciudad). Más rápido pero sin contacto."
        },
        "diasPlazoCR": {
          "type": "number",
          "default": 30,
          "description": "Días asumidos de plazo para forma de pago Crédito (CR) en el cálculo de aging. Default 30."
        },
        "fechaCorte": {
          "type": "string",
          "default": "today",
          "description": "Fecha de corte para aging. YYYY-MM-DD o 'today' / 'firstDayPreviousMonth' / 'firstDayCurrentMonth' / 'lastNDays:N'. Default 'today'."
        },
        "universeSource": {
          "type": "string",
          "enum": [
            "auto",
            "wo",
            "docs"
          ],
          "default": "auto",
          "description": "Fuente del universo de terceros. 'wo'=listCustomers (resuelve bug Harmony), 'docs'=accounting_documents (legacy), 'auto'=wo con fallback a docs si falla."
        }
      }
    }
  },
  {
    "type": "worldoffice-documents-sync",
    "category": "action",
    "group": "worldoffice",
    "displayName": "World Office · Sincronizar documentos",
    "description": "Trae facturas/notas/recibos de WO a Firestore (accounting_documents). Combinar con schedule-cron.",
    "icon": "pi-refresh",
    "color": "#0066cc",
    "version": 1,
    "inputs": [
      {
        "name": "main"
      }
    ],
    "outputs": [
      {
        "name": "main"
      },
      {
        "name": "error",
        "isError": true
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "mode": {
          "type": "string",
          "enum": [
            "incremental",
            "historical"
          ],
          "default": "incremental",
          "description": "incremental = mes anterior + mes en curso (forzado); historical = usa fromDate/toDate literales"
        },
        "fromDate": {
          "type": "string",
          "default": "firstDayPreviousMonth",
          "description": "YYYY-MM-DD o 'firstDayPreviousMonth' / 'firstDayCurrentMonth' / 'lastNDays:N' / 'today'"
        },
        "toDate": {
          "type": "string",
          "default": "today",
          "description": "YYYY-MM-DD o 'today'"
        },
        "codes": {
          "type": "string",
          "description": "CSV opcional de códigos WO. Default: todos. Ej: FV,NCV,NDV"
        },
        "persistLines": {
          "type": "boolean",
          "default": false,
          "description": "Si true, persiste cada renglón individual en accounting_document_lines (habilita reportes por producto). 3-4x más docs en Firestore."
        }
      }
    }
  },
  {
    "type": "worldoffice-invoice-create",
    "category": "action",
    "group": "worldoffice",
    "displayName": "World Office · Crear factura",
    "description": "Genera factura en World Office desde orden Katuq.",
    "icon": "pi-file",
    "color": "#0066cc",
    "version": 1,
    "inputs": [
      {
        "name": "main"
      }
    ],
    "outputs": [
      {
        "name": "main"
      },
      {
        "name": "error",
        "isError": true
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "orderIdSource": {
          "type": "string",
          "default": "{{ $json.nroPedido }}"
        },
        "idTerceroInterno": {
          "type": "string"
        }
      },
      "required": [
        "orderIdSource"
      ]
    }
  }
];
