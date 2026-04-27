import React, { useState, useMemo } from 'react';
import classNames from 'classnames';
import type { RunContext, NodeStatus, NodeState } from '../contracts/types';

export interface RunHistoryViewerProps {
    runContext: RunContext | null;
    onClose?: () => void;
}

const STATUS_COLORS: Record<NodeStatus, string> = {
    pending: '#9ca3af',
    running: '#2563eb',
    success: '#10b981',
    failed: '#ef4444',
    skipped: '#6b7280'
};

/**
 * Timeline visualization of an executed flow run. Reads RunContext and
 * lists each NodeState with timing, output, and stack on failure.
 */
export const RunHistoryViewer: React.FC<RunHistoryViewerProps> = ({ runContext, onClose }) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const sortedStates = useMemo(() => {
        if (!runContext) return [] as Array<{ nodeId: string; state: NodeState }>;
        const entries = Object.entries(runContext.nodeStates).map(([nodeId, state]) => ({
            nodeId,
            state
        }));
        entries.sort((a, b) => {
            const ta = a.state.startedAt ? Date.parse(a.state.startedAt) : 0;
            const tb = b.state.startedAt ? Date.parse(b.state.startedAt) : 0;
            return ta - tb;
        });
        return entries;
    }, [runContext]);

    if (!runContext) {
        return (
            <div className="kfc-empty">
                <div className="kfc-empty__title">Sin ejecuciones todavía</div>
                <div className="kfc-empty__desc">
                    Ejecutá el flow manualmente o esperá a que un trigger lo dispare.
                </div>
            </div>
        );
    }

    const toggle = (nodeId: string) =>
        setExpanded((m) => ({ ...m, [nodeId]: !m[nodeId] }));

    return (
        <div className="kfc-runlist" aria-label="Historial de ejecución">
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 8,
                    marginBottom: 8
                }}
            >
                <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                        Run · {runContext.runId.slice(0, 12)}…
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                        {runContext.startedAt} · {runContext.totalDurationMs ?? '—'} ms ·{' '}
                        <span
                            style={{
                                fontWeight: 600,
                                color: runContext.status === 'success' ? '#10b981' : runContext.status === 'failed' ? '#ef4444' : '#2563eb'
                            }}
                        >
                            {runContext.status}
                        </span>
                    </div>
                </div>
                {onClose && (
                    <button type="button" className="kfc-btn" onClick={onClose}>
                        Cerrar
                    </button>
                )}
            </div>

            {sortedStates.length === 0 && (
                <div className="kfc-empty">
                    <div className="kfc-empty__desc">No se ejecutó ningún nodo en este run.</div>
                </div>
            )}

            {sortedStates.map(({ nodeId, state }) => {
                const isOpen = !!expanded[nodeId];
                return (
                    <div
                        key={nodeId}
                        className="kfc-runlist__item"
                        style={{ borderLeftColor: STATUS_COLORS[state.status] || '#9ca3af' }}
                        onClick={() => toggle(nodeId)}
                    >
                        <div className="kfc-runlist__head">
                            <span>{nodeId}</span>
                            <span
                                className={classNames(
                                    'kfc-node__status',
                                    `kfc-node__status--${state.status}`
                                )}
                                style={{ marginTop: 0 }}
                            >
                                {state.status}
                            </span>
                        </div>
                        <div className="kfc-runlist__sub">
                            {state.startedAt || '—'} · {state.durationMs ?? '—'} ms · intento{' '}
                            {state.attempt}
                        </div>
                        {isOpen && (
                            <div>
                                {state.error && (
                                    <pre className="kfc-runlist__pre" style={{ background: '#7f1d1d' }}>
                                        {`${state.error.code || 'ERROR'}: ${state.error.message}\n\n${state.error.stack || ''}`}
                                    </pre>
                                )}
                                {state.output && (
                                    <pre className="kfc-runlist__pre">
                                        {safeStringify(state.output, 8000)}
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

function safeStringify(v: unknown, maxLen: number): string {
    try {
        const s = JSON.stringify(v, null, 2);
        return s.length > maxLen ? s.slice(0, maxLen) + '\n…(truncado)' : s;
    } catch {
        return String(v);
    }
}
