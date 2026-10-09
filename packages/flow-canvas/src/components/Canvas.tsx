import React, { useCallback, useMemo, useRef, useState } from 'react';
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
    OnConnectStartParams,
    MarkerType,
    ReactFlowInstance
} from 'reactflow';
import classNames from 'classnames';
import { CustomNode, CustomNodeData } from './CustomNode';
import { useFlowStore } from '../store/flowStore';
import { LineaEdge } from './LineaEdge';
import { findSpec } from '../utils/validators';
import { shortId } from '../utils/id';
import { nombrePaso } from '../utils/lenguaje';
import { validarConexion, nuevaLinea, entradaPrincipal, salidaPrincipal } from '../utils/conexiones';
import type { FlowNode } from '../contracts/types';

const nodeTypes = { katuqNode: CustomNode };
const edgeTypes = { linea: LineaEdge };

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
    const addNodeConectado = useFlowStore((s) => s.addNodeConectado);
    const addEdgeToStore = useFlowStore((s) => s.addEdge);
    const moveNode = useFlowStore((s) => s.moveNode);
    const deleteNode = useFlowStore((s) => s.deleteNode);
    const deleteEdge = useFlowStore((s) => s.deleteEdge);
    const setDrawerNodeId = useFlowStore((s) => s.setDrawerNodeId);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
    // Línea marcada (al tocarla aparece la ✕ para quitarla).
    const [lineaMarcada, setLineaMarcada] = useState<string | null>(null);
    const [conectando, setConectando] = useState(false);
    // Desde dónde se empezó a arrastrar una línea, para poder soltarla encima de un paso.
    const arrastre = useRef<{ start: OnConnectStartParams | null; conecto: boolean }>({ start: null, conecto: false });

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
                    type: 'linea',
                    selected: lineaMarcada === e.id,
                    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: isErrorBranch ? '#dc2626' : '#94a3b8' },
                    source: e.source,
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
        [graph.edges, runContext, lineaMarcada]
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
                }
                // La selección NO se toma de aquí: React Flow la emite al PRESIONAR el
                // mouse; abrir el panel en ese instante esconde la lista de pasos, el
                // lienzo se corre y el clic termina en el fondo (onPaneClick) → el panel
                // se cerraba solo. El paso se abre en onNodeClick, al soltar.
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

    const conectar = useCallback(
        (c: { source: string; sourcePort: string; target: string; targetPort: string }) => {
            if (readOnly) return;
            const v = validarConexion(graph, catalog, c);
            if (!v.ok) {
                if (v.reason) onIntent?.('connectionRejected', { reason: v.reason });
                return;
            }
            const edge = nuevaLinea(c);
            addEdgeToStore(edge);
            onIntent?.('connectionCreated', { edgeId: edge.id });
        },
        [readOnly, graph, catalog, addEdgeToStore, onIntent]
    );

    const onConnect: OnConnect = useCallback(
        (connection: Connection) => {
            arrastre.current.conecto = true;
            if (!connection.source || !connection.target) return;
            conectar({
                source: connection.source,
                sourcePort: connection.sourceHandle || 'main',
                target: connection.target,
                targetPort: connection.targetHandle || 'main'
            });
        },
        [conectar]
    );

    const onConnectStart = useCallback((_e: any, params: OnConnectStartParams) => {
        arrastre.current = { start: params, conecto: false };
        setConectando(true);
    }, []);

    // Soltar la línea encima de cualquier parte de un paso (no solo en el puntico).
    const onConnectEnd = useCallback(
        (event: MouseEvent | TouchEvent) => {
            const { start, conecto } = arrastre.current;
            arrastre.current = { start: null, conecto: false };
            setConectando(false);
            if (conecto || !start?.nodeId) return;
            const punto = 'changedTouches' in event ? event.changedTouches[0] : (event as MouseEvent);
            if (!punto) return;
            const raiz = (wrapperRef.current?.getRootNode() as Document | ShadowRoot | undefined) || document;
            const el = raiz.elementFromPoint(punto.clientX, punto.clientY);
            const otroId = (el as HTMLElement | null)?.closest('.react-flow__node')?.getAttribute('data-id');
            if (!otroId || otroId === start.nodeId) return;
            const otro = graph.nodes.find((n) => n.id === otroId);
            const inicio = graph.nodes.find((n) => n.id === start.nodeId);
            if (!otro || !inicio) return;
            if (start.handleType === 'target') {
                const salida = salidaPrincipal(findSpec(catalog, otro.type));
                if (!salida) return;
                conectar({ source: otro.id, sourcePort: salida, target: inicio.id, targetPort: start.handleId || 'main' });
            } else {
                const entrada = entradaPrincipal(findSpec(catalog, otro.type));
                if (!entrada) {
                    const v = validarConexion(graph, catalog, { source: inicio.id, sourcePort: start.handleId || 'main', target: otro.id, targetPort: 'main' });
                    if (v.reason) onIntent?.('connectionRejected', { reason: v.reason });
                    return;
                }
                conectar({ source: inicio.id, sourcePort: start.handleId || 'main', target: otro.id, targetPort: entrada });
            }
        },
        [graph, catalog, conectar, onIntent]
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
            const habiaOtros = graph.nodes.length > 0;
            const desde = addNodeConectado(node);
            onSelectNode(node.id);
            onIntent?.('nodeAdded', {
                nodeId: node.id,
                type,
                conectadoDespuesDe: desde ? nombrePaso(desde.type, findSpec(catalog, desde.type)?.displayName) : null,
                faltaUnir: !desde && habiaOtros && spec.inputs.length > 0
            });
        },
        [readOnly, graph, catalog, addNodeConectado, onSelectNode, onIntent]
    );

    const onPaneClick = useCallback(() => {
        setLineaMarcada(null);
        onSelectNode(null);
    }, [onSelectNode]);

    const onEdgeClick = useCallback((_e: React.MouseEvent, edge: RFEdge) => setLineaMarcada(edge.id), []);

    const onNodeClick = useCallback(
        (_event: React.MouseEvent, n: RFNode) => {
            setLineaMarcada(null);
            onSelectNode(n.id);
        },
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
                className={conectando ? 'kfc-conectando' : undefined}
                nodes={rfNodes}
                edges={rfEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                connectionRadius={36}
                onEdgeClick={onEdgeClick}
                onPaneClick={onPaneClick}
                onNodeClick={onNodeClick}
                onNodeContextMenu={onNodeContextMenu}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                onInit={(inst) => (rfInstanceRef.current = inst)}
                proOptions={{ hideAttribution: true }}
                deleteKeyCode={readOnly ? null : ['Delete', 'Backspace']}
                minZoom={0.2}
                maxZoom={2}
                defaultEdgeOptions={{
                    style: { strokeWidth: 2 }
                }}
                connectionLineStyle={{ stroke: '#5F3FE0', strokeWidth: 2 }}
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
