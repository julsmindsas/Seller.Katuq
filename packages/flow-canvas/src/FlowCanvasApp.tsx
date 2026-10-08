import React, { useCallback, useEffect, useMemo } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { useFlowStore } from './store/flowStore';
import { Canvas } from './components/Canvas';
import { NodePalette } from './components/NodePalette';
import { ConfigPanel } from './components/ConfigPanel';
import { RunHistoryViewer } from './components/RunHistoryViewer';
import { NodeLogsDrawer } from './components/NodeLogsDrawer';
import { EmptyCanvas } from './components/EmptyCanvas';
import type { FlowGraph } from './contracts/types';
import { detectCycles } from './utils/validators';

export interface FlowCanvasAppProps {
    onGraphChange: (graph: FlowGraph) => void;
    onNodeSelected: (nodeId: string | null) => void;
    onRunRequested: (payload?: any) => void;
    onIntent?: (intent: string, payload?: any) => void;
}

/**
 * Top-level React component mounted by the Web Component. Handles Layout,
 * orchestrates events emitted to the host, and decides which right-hand
 * panel is showing (config | runs | none).
 */
export const FlowCanvasApp: React.FC<FlowCanvasAppProps> = ({
    onGraphChange,
    onNodeSelected,
    onRunRequested,
    onIntent
}) => {
    const graph = useFlowStore((s) => s.graph);
    const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
    const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
    const readOnly = useFlowStore((s) => s.readOnly);
    const runContext = useFlowStore((s) => s.runContext);
    const rightView = useFlowStore((s) => s.rightView);
    const setRightView = useFlowStore((s) => s.setRightView);
    const drawerNodeId = useFlowStore((s) => s.drawerNodeId);
    const setDrawerNodeId = useFlowStore((s) => s.setDrawerNodeId);
    const applyAutoLayout = useFlowStore((s) => s.applyAutoLayout);

    const [hasCycle, setHasCycle] = React.useState(false);

    // emit graphChange whenever the graph mutates from inside the canvas
    useEffect(() => {
        onGraphChange(graph);
        setHasCycle(detectCycles(graph));
    }, [graph, onGraphChange]);

    // open config when a node is selected (unless drawer is open with that node)
    useEffect(() => {
        onNodeSelected(selectedNodeId);
        if (selectedNodeId && rightView === 'none') setRightView('config');
        else if (!selectedNodeId && rightView === 'config') setRightView('none');
    }, [selectedNodeId]);

    const handleSelect = useCallback(
        (id: string | null) => {
            setSelectedNodeId(id);
        },
        [setSelectedNodeId]
    );

    const closeRight = useCallback(() => {
        setRightView('none');
        setSelectedNodeId(null);
    }, [setSelectedNodeId, setRightView]);

    const onRunClick = useCallback(() => {
        onRunRequested({ triggerData: [] });
    }, [onRunRequested]);

    const onAutoLayout = useCallback(() => {
        applyAutoLayout();
        if (onIntent) onIntent('autoLayoutApplied');
    }, [applyAutoLayout, onIntent]);

    const onShortcutsClick = useCallback(() => {
        if (onIntent) onIntent('showShortcuts');
    }, [onIntent]);

    const runStatus = runContext?.status;
    const runIsActive = runStatus === 'running';
    const runStats = useMemo(() => {
        if (!runContext) return null;
        const states = Object.values(runContext.nodeStates || {});
        const total = states.length;
        const done = states.filter((s) => s.status === 'success' || s.status === 'failed' || s.status === 'skipped').length;
        const failed = states.filter((s) => s.status === 'failed').length;
        return { total, done, failed };
    }, [runContext]);

    const isEmpty = !graph.nodes || graph.nodes.length === 0;

    const onDrawerClose = useCallback(() => setDrawerNodeId(null), [setDrawerNodeId]);

    // Switch the right side based on rightView state
    const showConfig = rightView === 'config' && selectedNodeId;
    const showRuns = rightView === 'runs';

    return (
        <ReactFlowProvider>
            <div className="kfc-root">
                {!showConfig && <NodePalette readOnly={readOnly} />}

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
                    <div className="kfc-toolbar">
                        <button
                            type="button"
                            className="kfc-btn"
                            onClick={() => setRightView(rightView === 'runs' ? 'none' : 'runs')}
                            title="Ver el resultado de la última prueba"
                        >
                            <i className="pi pi-history" />
                            Última prueba
                        </button>
                        {!readOnly && (
                            <button
                                type="button"
                                className="kfc-btn"
                                onClick={onAutoLayout}
                                title="Ordenar los pasos automáticamente"
                            >
                                <i className="pi pi-sitemap" />
                                Ordenar
                            </button>
                        )}
                        {!readOnly && (
                            <button
                                type="button"
                                className={`kfc-btn kfc-btn--primary ${runIsActive ? 'kfc-btn--running' : ''}`}
                                onClick={onRunClick}
                                disabled={runIsActive}
                                title="Probar ahora (Ctrl+Enter)"
                            >
                                {runIsActive ? (
                                    <>
                                        <i className="pi pi-spin pi-spinner" />
                                        Probando…
                                    </>
                                ) : (
                                    <>
                                        <i className="pi pi-play" />
                                        Probar ahora
                                    </>
                                )}
                            </button>
                        )}

                        {/* Run progress badge */}
                        {runStats && runStats.total > 0 && (
                            <span
                                className={`kfc-run-badge kfc-run-badge--${
                                    runStatus === 'success' ? 'success' :
                                    runStatus === 'failed' ? 'failed' :
                                    runIsActive ? 'running' : 'neutral'
                                }`}
                                title="Resultado de la prueba"
                            >
                                {runIsActive && <i className="pi pi-spin pi-spinner" />}
                                {!runIsActive && runStatus === 'success' && <i className="pi pi-check-circle" />}
                                {!runIsActive && runStatus === 'failed' && <i className="pi pi-times-circle" />}
                                {runStats.done}/{runStats.total} pasos
                                {runStats.failed > 0 && (
                                    <span className="kfc-run-badge__failed">· {runStats.failed} con error</span>
                                )}
                            </span>
                        )}

                        {hasCycle && (
                            <span className="kfc-pill kfc-pill--danger" title="Hay conexiones en círculo">
                                <i className="pi pi-exclamation-triangle" />
                                Hay conexiones en círculo: revísalas
                            </span>
                        )}

                        <span style={{ flex: 1 }} />

                        <button
                            type="button"
                            className="kfc-btn kfc-btn--ghost"
                            onClick={onShortcutsClick}
                            title="Atajos de teclado (?)"
                            aria-label="Atajos de teclado"
                        >
                            <i className="pi pi-question-circle" />
                        </button>

                        {readOnly && (
                            <span className="kfc-pill kfc-pill--neutral">
                                <i className="pi pi-lock" />
                                Solo lectura
                            </span>
                        )}
                    </div>

                    <div style={{ flex: 1, position: 'relative' }}>
                        <Canvas onSelectNode={handleSelect} onIntent={onIntent} />
                        {isEmpty && (
                            <EmptyCanvas
                                readOnly={readOnly}
                                onTemplateClick={() => onIntent?.('openTemplates')}
                            />
                        )}
                    </div>
                </div>

                {showConfig && (
                    <ConfigPanel
                        onClose={closeRight}
                        onOpenIntegrations={(provider) =>
                            onIntent?.('openIntegrations', { provider })
                        }
                    />
                )}
                {showRuns && (
                    <aside className="kfc-config" aria-label="Resultado de la prueba">
                        <div className="kfc-config__header">
                            <div>
                                <div className="kfc-config__title">Resultado de la prueba</div>
                                {runContext && (
                                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                                        {({ success: 'Bien', failed: 'Falló', partial: 'Con pendientes', running: 'Probando', cancelled: 'Cancelada' } as Record<string, string>)[runStatus || ''] || ''}{runContext.totalDurationMs != null ? ` · ${(runContext.totalDurationMs / 1000).toFixed(1).replace('.', ',')} s` : ''}
                                    </div>
                                )}
                            </div>
                            <button type="button" className="kfc-btn" onClick={() => setRightView('none')} aria-label="Cerrar">
                                <i className="pi pi-times" />
                            </button>
                        </div>
                        <div className="kfc-config__body" style={{ padding: 0 }}>
                            <RunHistoryViewer runContext={runContext} />
                        </div>
                    </aside>
                )}

                {drawerNodeId && (
                    <NodeLogsDrawer nodeId={drawerNodeId} onClose={onDrawerClose} />
                )}
            </div>
        </ReactFlowProvider>
    );
};
