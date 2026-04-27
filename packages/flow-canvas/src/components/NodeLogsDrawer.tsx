import React, { useMemo, useState } from 'react';
import classNames from 'classnames';
import { useFlowStore } from '../store/flowStore';
import { findSpec } from '../utils/validators';

export interface NodeLogsDrawerProps {
    nodeId: string;
    onClose: () => void;
}

type Tab = 'output' | 'error' | 'input' | 'meta';

/**
 * Right-side drawer with detailed run information for a single node:
 * tabs for output, input items (paired from previous node), error, and metadata.
 * Triggered by right-click on a node or the info-circle button on the node card.
 */
export const NodeLogsDrawer: React.FC<NodeLogsDrawerProps> = ({ nodeId, onClose }) => {
    const runContext = useFlowStore((s) => s.runContext);
    const graph = useFlowStore((s) => s.graph);
    const catalog = useFlowStore((s) => s.catalog);

    const [tab, setTab] = useState<Tab>('output');

    const node = useMemo(() => graph.nodes.find((n) => n.id === nodeId), [graph.nodes, nodeId]);
    const spec = useMemo(() => (node ? findSpec(catalog, node.type) : undefined), [catalog, node]);
    const state = runContext?.nodeStates?.[nodeId];

    const upstreamItems = useMemo(() => {
        if (!runContext || !node) return [];
        const incomingEdges = graph.edges.filter((e) => e.target === nodeId);
        const items: any[] = [];
        for (const edge of incomingEdges) {
            const srcState = runContext.nodeStates?.[edge.source];
            if (!srcState?.output?.main) continue;
            for (const branch of srcState.output.main) {
                if (Array.isArray(branch)) items.push(...branch);
            }
        }
        return items;
    }, [runContext, node, graph.edges, nodeId]);

    if (!node) {
        return (
            <aside className="kfc-drawer" aria-label="Logs del nodo">
                <div className="kfc-drawer__header">
                    <div>
                        <div className="kfc-drawer__title">Nodo no encontrado</div>
                    </div>
                    <button type="button" className="kfc-btn" onClick={onClose} aria-label="Cerrar">
                        <i className="pi pi-times" />
                    </button>
                </div>
            </aside>
        );
    }

    const statusClass = state?.status || 'pending';
    const outputItems = state?.output?.main?.flat() || [];
    const errorItems = state?.output?.error || [];
    const itemsCount = outputItems.length;

    return (
        <aside className="kfc-drawer" aria-label={`Logs del nodo ${node.id}`}>
            <div className="kfc-drawer__header">
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="kfc-drawer__title" title={spec?.displayName || node.type}>
                        <i
                            className={classNames(spec?.icon || 'pi pi-circle')}
                            style={{ color: spec?.color || '#5E72E4', marginRight: 6 }}
                        />
                        {spec?.displayName || node.type}
                    </div>
                    <div className="kfc-drawer__sub">
                        <span className={classNames('kfc-node__status', `kfc-node__status--${statusClass}`)}>
                            {statusClass}
                        </span>
                        {state?.durationMs != null && <span>· {formatMs(state.durationMs)}</span>}
                        {state?.attempt != null && <span>· intento {state.attempt}</span>}
                    </div>
                </div>
                <button type="button" className="kfc-btn" onClick={onClose} aria-label="Cerrar">
                    <i className="pi pi-times" />
                </button>
            </div>

            <div className="kfc-drawer__tabs" role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'output'}
                    className={classNames('kfc-drawer__tab', { 'is-active': tab === 'output' })}
                    onClick={() => setTab('output')}
                >
                    Salida {itemsCount > 0 && <span className="kfc-drawer__tab-count">{itemsCount}</span>}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'input'}
                    className={classNames('kfc-drawer__tab', { 'is-active': tab === 'input' })}
                    onClick={() => setTab('input')}
                >
                    Entrada {upstreamItems.length > 0 && <span className="kfc-drawer__tab-count">{upstreamItems.length}</span>}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'error'}
                    className={classNames('kfc-drawer__tab', { 'is-active': tab === 'error' })}
                    onClick={() => setTab('error')}
                    disabled={!state?.error && errorItems.length === 0}
                >
                    Error
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'meta'}
                    className={classNames('kfc-drawer__tab', { 'is-active': tab === 'meta' })}
                    onClick={() => setTab('meta')}
                >
                    Detalles
                </button>
            </div>

            <div className="kfc-drawer__body">
                {!state && (
                    <div className="kfc-empty">
                        <div className="kfc-empty__title">Sin datos de ejecución</div>
                        <div className="kfc-empty__desc">
                            Este nodo no se ha ejecutado en el run actual. Probá ejecutar el flow.
                        </div>
                    </div>
                )}

                {state && tab === 'output' && (
                    <>
                        {outputItems.length === 0 ? (
                            <div className="kfc-empty__desc" style={{ padding: 16 }}>
                                Sin items de salida.
                            </div>
                        ) : (
                            outputItems.map((item, idx) => (
                                <ItemPreview key={idx} index={idx} item={item} />
                            ))
                        )}
                    </>
                )}

                {state && tab === 'input' && (
                    <>
                        {upstreamItems.length === 0 ? (
                            <div className="kfc-empty__desc" style={{ padding: 16 }}>
                                Sin items de entrada (probablemente es un trigger).
                            </div>
                        ) : (
                            upstreamItems.map((item, idx) => (
                                <ItemPreview key={idx} index={idx} item={item} />
                            ))
                        )}
                    </>
                )}

                {state && tab === 'error' && (
                    <div style={{ padding: 12 }}>
                        {state.error ? (
                            <pre className="kfc-runlist__pre" style={{ background: '#7f1d1d', color: '#fee2e2' }}>
                                {`${state.error.code || 'ERROR'}: ${state.error.message}\n\n${
                                    state.error.stack || ''
                                }`}
                            </pre>
                        ) : (
                            <div className="kfc-empty__desc">Sin errores.</div>
                        )}
                        {errorItems.length > 0 && (
                            <>
                                <div className="kfc-drawer__section-title">Items en branch de error</div>
                                {errorItems.map((item, idx) => (
                                    <ItemPreview key={idx} index={idx} item={item} />
                                ))}
                            </>
                        )}
                    </div>
                )}

                {state && tab === 'meta' && (
                    <div style={{ padding: 12, fontSize: 12 }}>
                        <KV k="Status" v={state.status} />
                        <KV k="Iniciado" v={state.startedAt || '—'} />
                        <KV k="Finalizado" v={state.finishedAt || '—'} />
                        <KV k="Duración" v={state.durationMs != null ? formatMs(state.durationMs) : '—'} />
                        <KV k="Intento" v={String(state.attempt ?? '—')} />
                        <KV k="Items salida" v={String(itemsCount)} />
                        <KV k="Spec" v={spec?.type || node.type} />
                        <KV k="Versión spec" v={spec ? `v${spec.version}` : '—'} />
                    </div>
                )}
            </div>
        </aside>
    );
};

const ItemPreview: React.FC<{ item: any; index: number }> = ({ item, index }) => {
    const [open, setOpen] = useState(index < 3);
    return (
        <div className="kfc-drawer__item">
            <button
                type="button"
                className="kfc-drawer__item-head"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
            >
                <i className={`pi ${open ? 'pi-chevron-down' : 'pi-chevron-right'}`} />
                <span>Item #{index + 1}</span>
                {item?.json && typeof item.json === 'object' && (
                    <span className="kfc-drawer__item-summary">
                        {summarizeItem(item.json)}
                    </span>
                )}
            </button>
            {open && (
                <pre className="kfc-runlist__pre">
                    {safeStringify(item, 6000)}
                </pre>
            )}
        </div>
    );
};

const KV: React.FC<{ k: string; v: string }> = ({ k, v }) => (
    <div className="kfc-drawer__kv">
        <span className="kfc-drawer__kv-k">{k}</span>
        <span className="kfc-drawer__kv-v">{v}</span>
    </div>
);

function safeStringify(v: unknown, maxLen: number): string {
    try {
        const s = JSON.stringify(v, null, 2);
        return s.length > maxLen ? s.slice(0, maxLen) + '\n…(truncado)' : s;
    } catch {
        return String(v);
    }
}

function formatMs(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    const m = Math.floor(ms / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return `${m}m ${s}s`;
}

function summarizeItem(json: any): string {
    if (!json) return '';
    const keys = Object.keys(json);
    if (keys.length === 0) return '(vacío)';
    return keys.slice(0, 3).join(', ') + (keys.length > 3 ? `, +${keys.length - 3} más` : '');
}
