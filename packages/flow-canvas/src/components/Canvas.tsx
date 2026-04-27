import React, { useCallback, useMemo, useRef } from 'react';
import ReactFlow, {
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    Connection,
    Edge as RFEdge,
    Node as RFNode,
    NodeChange,
    EdgeChange,
    OnConnect,
    ReactFlowInstance
} from 'reactflow';
import classNames from 'classnames';
import { CustomNode, CustomNodeData } from './CustomNode';
import { useFlowStore } from '../store/flowStore';
import { findSpec, arePortsCompatible, detectCycles } from '../utils/validators';
import { shortId } from '../utils/id';
import type { FlowEdge, FlowNode } from '../contracts/types';

const nodeTypes = { katuqNode: CustomNode };

export interface CanvasProps {
    onSelectNode: (nodeId: string | null) => void;
    onIntent?: (intent: string, payload?: any) => void;
}

/**
 * React Flow surface. Owns the drop-target behaviour for the palette and
 * keeps React Flow's internal node/edge format in sync with the FlowGraph
 * stored in Zustand. Emits `onIntent` for cross-cutting events (toast,
 * connection rejection, etc.) so the host (Angular) can show toasts.
 */
export const Canvas: React.FC<CanvasProps> = ({ onSelectNode, onIntent }) => {
    const graph = useFlowStore((s) => s.graph);
    const catalog = useFlowStore((s) => s.catalog);
    const runContext = useFlowStore((s) => s.runContext);
    const readOnly = useFlowStore((s) => s.readOnly);
    const selectedNodeId = useFlowStore((s) => s.selectedNodeId);

    const setGraph = useFlowStore((s) => s.setGraph);
    const addNode = useFlowStore((s) => s.addNode);
    const addEdgeToStore = useFlowStore((s) => s.addEdge);
    const moveNode = useFlowStore((s) => s.moveNode);
    const deleteNode = useFlowStore((s) => s.deleteNode);
    const deleteEdge = useFlowStore((s) => s.deleteEdge);
    const setDrawerNodeId = useFlowStore((s) => s.setDrawerNodeId);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

    // Map FlowGraph → React Flow's expected shape.
    const rfNodes: RFNode<CustomNodeData>[] = useMemo(
        () =>
            graph.nodes.map((n): RFNode<CustomNodeData> => {
                const spec = findSpec(catalog, n.type);
                return {
                    id: n.id,
                    type: 'katuqNode',
                    position: n.position,
                    selected: selectedNodeId === n.id,
                    data: { flowNode: n, spec }
                };
            }),
        [graph.nodes, catalog, selectedNodeId]
    );

    const rfEdges: RFEdge[] = useMemo(
        () =>
            graph.edges.map((e): RFEdge => {
                const srcStatus = runContext?.nodeStates?.[e.source]?.status;
                const tgtStatus = runContext?.nodeStates?.[e.target]?.status;
                const isComplete = srcStatus === 'success';
                const isLive =
                    runContext?.status === 'running' &&
                    isComplete &&
                    (tgtStatus === 'running' || tgtStatus === 'pending');
                const isErrorBranch = e.sourcePort === 'error';

                return {
                    id: e.id,
                    source: e.source,
                    sourcePort: e.sourcePort,
                    target: e.target,
                    sourceHandle: e.sourcePort,
                    targetHandle: e.targetPort,
                    animated: isLive,
                    className: classNames({
                        'kfc-edge--complete': isComplete && !isLive,
                        'kfc-edge--live': isLive,
                        'kfc-edge--error': isErrorBranch
                    })
                };
            }),
        [graph.edges, runContext]
    );

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            // We persist position, remove, and selection back to the store. RF
            // re-renders from the rfNodes memo below.
            for (const c of changes) {
                if (c.type === 'position' && c.position) {
                    moveNode(c.id, { x: c.position.x, y: c.position.y });
                } else if (c.type === 'remove') {
                    deleteNode(c.id);
                } else if (c.type === 'select') {
                    onSelectNode(c.selected ? c.id : null);
                }
            }
        },
        [moveNode, deleteNode, onSelectNode]
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            for (const c of changes) {
                if (c.type === 'remove') deleteEdge(c.id);
            }
        },
        [deleteEdge]
    );

    const onConnect: OnConnect = useCallback(
        (connection: Connection) => {
            if (readOnly) return;
            if (!connection.source || !connection.target) return;

            // Self-loop check
            if (connection.source === connection.target) {
                onIntent?.('connectionRejected', {
                    reason: 'Un nodo no puede conectarse a sí mismo.'
                });
                return;
            }

            const sourceNode = graph.nodes.find((n) => n.id === connection.source);
            const targetNode = graph.nodes.find((n) => n.id === connection.target);
            if (!sourceNode || !targetNode) return;

            const sSpec = findSpec(catalog, sourceNode.type);
            const tSpec = findSpec(catalog, targetNode.type);
            const compat = arePortsCompatible(
                sSpec,
                connection.sourceHandle || 'main',
                tSpec,
                connection.targetHandle || 'main'
            );
            if (!compat.ok) {
                onIntent?.('connectionRejected', {
                    reason: compat.reason || 'Puertos incompatibles.'
                });
                return;
            }

            // Cycle pre-check: simulate adding the edge, if it creates a cycle reject
            const tentative = {
                ...graph,
                edges: [
                    ...graph.edges,
                    {
                        id: '__tentative__',
                        source: connection.source,
                        sourcePort: connection.sourceHandle || 'main',
                        target: connection.target,
                        targetPort: connection.targetHandle || 'main'
                    }
                ]
            };
            if (detectCycles(tentative)) {
                onIntent?.('connectionRejected', {
                    reason: 'Esta conexión crearía un ciclo en el flow.'
                });
                return;
            }

            const edge: FlowEdge = {
                id: shortId('e'),
                source: connection.source,
                sourcePort: connection.sourceHandle || 'main',
                target: connection.target,
                targetPort: connection.targetHandle || 'main'
            };
            addEdgeToStore(edge);
            onIntent?.('connectionCreated', { edgeId: edge.id });
        },
        [readOnly, graph, catalog, addEdgeToStore, onIntent]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            if (readOnly) return;
            const type = event.dataTransfer.getData('application/x-katuq-node-type');
            if (!type) return;
            const spec = findSpec(catalog, type);
            if (!spec) return;
            const reactFlowBounds = wrapperRef.current?.getBoundingClientRect();
            if (!reactFlowBounds) return;
            const inst = rfInstanceRef.current;
            const position =
                inst?.project({
                    x: event.clientX - reactFlowBounds.left,
                    y: event.clientY - reactFlowBounds.top
                }) ?? { x: 100, y: 100 };

            const node: FlowNode = {
                id: shortId('n'),
                type,
                position,
                params: { ...(spec.defaults || {}) }
            };
            addNode(node);
            onSelectNode(node.id);
            onIntent?.('nodeAdded', { nodeId: node.id, type });
        },
        [readOnly, catalog, addNode, onSelectNode, onIntent]
    );

    const onPaneClick = useCallback(() => onSelectNode(null), [onSelectNode]);

    const onNodeClick = useCallback(
        (_event: React.MouseEvent, n: RFNode) => onSelectNode(n.id),
        [onSelectNode]
    );

    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, n: RFNode) => {
            event.preventDefault();
            // Open the logs drawer for this node
            setDrawerNodeId(n.id);
        },
        [setDrawerNodeId]
    );

    return (
        <div ref={wrapperRef} className="kfc-canvas-wrapper" onDragOver={onDragOver} onDrop={onDrop}>
            <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onPaneClick={onPaneClick}
                onNodeClick={onNodeClick}
                onNodeContextMenu={onNodeContextMenu}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                onInit={(inst) => (rfInstanceRef.current = inst)}
                proOptions={{ hideAttribution: true }}
                deleteKeyCode={readOnly ? null : ['Delete', 'Backspace']}
                minZoom={0.2}
                maxZoom={2}
                defaultEdgeOptions={{
                    style: { strokeWidth: 1.5 }
                }}
            >
                <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#d1d5db" />
                <MiniMap
                    pannable
                    zoomable
                    nodeColor={(n) => {
                        const fn = (n.data as CustomNodeData)?.flowNode;
                        const spec = fn ? findSpec(catalog, fn.type) : undefined;
                        return spec?.color || '#94a3b8';
                    }}
                />
                <Controls position="bottom-left" />
            </ReactFlow>
        </div>
    );
};
