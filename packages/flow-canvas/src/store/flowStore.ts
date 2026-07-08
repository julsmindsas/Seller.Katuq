import { create } from 'zustand';
import type {
    FlowGraph,
    FlowNode,
    FlowEdge,
    NodeSpec,
    RunContext
} from '../contracts/types';

export type RightView = 'config' | 'runs' | 'none';

/**
 * Single source of truth for the React tree. The Web Component setters
 * call `setGraph`, `setCatalog`, `setRunContext`. Internal components read
 * via selectors.
 */
export interface FlowStoreState {
    graph: FlowGraph;
    catalog: NodeSpec[];
    selectedNodeId: string | null;
    runContext: RunContext | null;
    readOnly: boolean;
    paletteFilter: string;
    rightView: RightView;
    drawerNodeId: string | null;
    /**
     * Provider keys (e.g. 'shopify', 'osmosis') the company has CONNECTED.
     * `null` = unknown / not loaded yet → never show the "missing integration"
     * warning (fail-safe: don't nag while we can't verify).
     */
    connectedProviders: string[] | null;

    // setters from outside (Web Component → React)
    setGraph: (graph: FlowGraph) => void;
    setCatalog: (catalog: NodeSpec[]) => void;
    setRunContext: (rc: RunContext | null) => void;
    setReadOnly: (ro: boolean) => void;
    setSelectedNodeId: (id: string | null) => void;
    setPaletteFilter: (q: string) => void;
    setRightView: (v: RightView) => void;
    setDrawerNodeId: (id: string | null) => void;
    setConnectedProviders: (providers: string[] | null) => void;

    // graph mutations
    addNode: (node: FlowNode) => void;
    updateNode: (id: string, patch: Partial<FlowNode>) => void;
    updateNodeParams: (id: string, params: Record<string, any>) => void;
    deleteNode: (id: string) => void;
    addEdge: (edge: FlowEdge) => void;
    deleteEdge: (id: string) => void;
    moveNode: (id: string, position: { x: number; y: number }) => void;
    applyAutoLayout: () => void;
}

const emptyGraph: FlowGraph = { nodes: [], edges: [] };

export const useFlowStore = create<FlowStoreState>((set, get) => ({
    graph: emptyGraph,
    catalog: [],
    selectedNodeId: null,
    runContext: null,
    readOnly: false,
    paletteFilter: '',
    rightView: 'none',
    drawerNodeId: null,
    connectedProviders: null,

    setGraph: (graph) => set({ graph: normalizeGraph(graph) }),
    setCatalog: (catalog) => set({ catalog }),
    setRunContext: (rc) => set({ runContext: rc }),
    setReadOnly: (ro) => set({ readOnly: ro }),
    setSelectedNodeId: (id) => set({ selectedNodeId: id }),
    setPaletteFilter: (q) => set({ paletteFilter: q }),
    setRightView: (v) => set({ rightView: v }),
    setDrawerNodeId: (id) => set({ drawerNodeId: id }),
    setConnectedProviders: (providers) =>
        set({ connectedProviders: Array.isArray(providers) ? providers : null }),

    addNode: (node) => {
        const { graph } = get();
        set({ graph: { ...graph, nodes: [...graph.nodes, node] } });
    },

    updateNode: (id, patch) => {
        const { graph } = get();
        set({
            graph: {
                ...graph,
                nodes: graph.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n))
            }
        });
    },

    updateNodeParams: (id, params) => {
        const { graph } = get();
        set({
            graph: {
                ...graph,
                nodes: graph.nodes.map((n) =>
                    n.id === id ? { ...n, params: { ...n.params, ...params } } : n
                )
            }
        });
    },

    deleteNode: (id) => {
        const { graph, selectedNodeId } = get();
        set({
            graph: {
                nodes: graph.nodes.filter((n) => n.id !== id),
                edges: graph.edges.filter((e) => e.source !== id && e.target !== id)
            },
            selectedNodeId: selectedNodeId === id ? null : selectedNodeId
        });
    },

    addEdge: (edge) => {
        const { graph } = get();
        // dedupe: don't allow same edge twice
        const exists = graph.edges.some(
            (e) =>
                e.source === edge.source &&
                e.target === edge.target &&
                e.sourcePort === edge.sourcePort &&
                e.targetPort === edge.targetPort
        );
        if (exists) return;
        set({ graph: { ...graph, edges: [...graph.edges, edge] } });
    },

    deleteEdge: (id) => {
        const { graph } = get();
        set({
            graph: {
                ...graph,
                edges: graph.edges.filter((e) => e.id !== id)
            }
        });
    },

    moveNode: (id, position) => {
        const { graph } = get();
        set({
            graph: {
                ...graph,
                nodes: graph.nodes.map((n) => (n.id === id ? { ...n, position } : n))
            }
        });
    },

    applyAutoLayout: () => {
        const { graph } = get();
        if (!graph.nodes.length) return;
        const positions = computeLayeredLayout(graph);
        set({
            graph: {
                ...graph,
                nodes: graph.nodes.map((n) => ({
                    ...n,
                    position: positions[n.id] || n.position
                }))
            }
        });
    }
}));

/**
 * Topological-layered auto-layout. Nodes flow left-to-right by depth,
 * vertically distributed within each layer. No external dep needed.
 */
function computeLayeredLayout(
    graph: FlowGraph
): Record<string, { x: number; y: number }> {
    const COLUMN_WIDTH = 280;
    const ROW_HEIGHT = 160;
    const ORIGIN_X = 80;
    const ORIGIN_Y = 80;

    // Build adj + indegree.
    const adj = new Map<string, string[]>();
    const indeg = new Map<string, number>();
    for (const n of graph.nodes) {
        adj.set(n.id, []);
        indeg.set(n.id, 0);
    }
    for (const e of graph.edges) {
        if (!adj.has(e.source) || !indeg.has(e.target)) continue;
        adj.get(e.source)!.push(e.target);
        indeg.set(e.target, (indeg.get(e.target) || 0) + 1);
    }

    // Layer assignment via BFS from roots.
    const layer = new Map<string, number>();
    const queue: string[] = [];
    for (const n of graph.nodes) {
        if ((indeg.get(n.id) || 0) === 0) {
            layer.set(n.id, 0);
            queue.push(n.id);
        }
    }
    // Fallback: if every node has incoming edges (cycle), seed first node as root.
    if (queue.length === 0 && graph.nodes.length > 0) {
        layer.set(graph.nodes[0].id, 0);
        queue.push(graph.nodes[0].id);
    }
    const visited = new Set<string>(queue);
    while (queue.length > 0) {
        const cur = queue.shift()!;
        const curLayer = layer.get(cur) || 0;
        for (const next of adj.get(cur) || []) {
            const proposed = curLayer + 1;
            if (!layer.has(next) || (layer.get(next) || 0) < proposed) {
                layer.set(next, proposed);
            }
            if (!visited.has(next)) {
                visited.add(next);
                queue.push(next);
            }
        }
    }

    // Group nodes by layer and assign rows. Stable order: original index.
    const layered = new Map<number, string[]>();
    graph.nodes.forEach((n) => {
        const l = layer.get(n.id) ?? 0;
        if (!layered.has(l)) layered.set(l, []);
        layered.get(l)!.push(n.id);
    });

    const positions: Record<string, { x: number; y: number }> = {};
    for (const [l, ids] of Array.from(layered.entries())) {
        const x = ORIGIN_X + l * COLUMN_WIDTH;
        const total = ids.length;
        const startY = ORIGIN_Y + Math.max(0, (3 - total)) * 30; // small centering nudge
        ids.forEach((id, i) => {
            positions[id] = { x, y: startY + i * ROW_HEIGHT };
        });
    }
    return positions;
}

function normalizeGraph(g: FlowGraph | null | undefined): FlowGraph {
    if (!g || !Array.isArray(g.nodes)) return emptyGraph;
    return {
        nodes: g.nodes.map((n) => ({
            ...n,
            params: n.params || {},
            position: n.position || { x: 0, y: 0 }
        })),
        edges: Array.isArray(g.edges) ? g.edges : []
    };
}
