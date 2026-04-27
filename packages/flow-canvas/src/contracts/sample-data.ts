/**
 * Minimal sample catalog and graph used by the dev harness only. The real
 * catalog ships from the backend at /v1/flows/node-catalog.
 */

import type { NodeSpec, FlowGraph } from './types';

export const SAMPLE_CATALOG: NodeSpec[] = [
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
        outputs: [{ name: 'main', label: 'Producto canónico' }],
        schema: { type: 'object', properties: { nodeSlug: { type: 'string', default: 'cereza' } } },
        defaults: { nodeSlug: 'cereza' },
        tags: ['osmosis']
    },
    {
        type: 'katuq-canonical-mapper',
        category: 'transform',
        group: 'katuq',
        displayName: 'Mapper canónico',
        description: 'Traduce entre canónico y external.',
        icon: 'pi pi-arrow-right-arrow-left',
        color: '#5E72E4',
        version: 1,
        inputs: [{ name: 'main' }],
        outputs: [{ name: 'main' }],
        schema: { type: 'object', properties: { direction: { type: 'string', default: 'external_to_canonical' } } }
    },
    {
        type: 'shopify-product-upsert',
        category: 'action',
        group: 'shopify',
        displayName: 'Shopify: Upsert producto',
        description: 'Crea/actualiza producto en Shopify.',
        icon: 'pi pi-cloud-upload',
        color: '#95BF47',
        version: 1,
        inputs: [{ name: 'main' }],
        outputs: [
            { name: 'main' },
            { name: 'error', isError: true }
        ],
        schema: {
            type: 'object',
            properties: {
                publishToOnlineStore: { type: 'boolean', default: true },
                syncImages: { type: 'boolean', default: true }
            }
        }
    }
];

export const SAMPLE_GRAPH: FlowGraph = {
    nodes: [
        {
            id: 'n1',
            type: 'osmosis-product-changed',
            position: { x: 80, y: 120 },
            params: { nodeSlug: 'cereza' }
        },
        {
            id: 'n2',
            type: 'katuq-canonical-mapper',
            position: { x: 380, y: 120 },
            params: { direction: 'external_to_canonical' }
        },
        {
            id: 'n3',
            type: 'shopify-product-upsert',
            position: { x: 700, y: 120 },
            params: { publishToOnlineStore: true, syncImages: true }
        }
    ],
    edges: [
        { id: 'e1', source: 'n1', sourcePort: 'main', target: 'n2', targetPort: 'main' },
        { id: 'e2', source: 'n2', sourcePort: 'main', target: 'n3', targetPort: 'main' }
    ]
};
