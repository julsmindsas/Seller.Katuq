import React, { memo, useMemo, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import classNames from 'classnames';
import type { NodeSpec, FlowNode, NodeStatus, NodeState } from '../contracts/types';
import { useFlowStore } from '../store/flowStore';
import { getInputPorts, getOutputPorts } from '../utils/validators';

export interface CustomNodeData {
    flowNode: FlowNode;
    spec: NodeSpec | undefined;
}

/**
 * Renders a single FlowNode in the canvas. Source of truth: store.
 * Reads runContext directly so node states refresh in real-time during a run.
 * `data` carries the spec + flow node so React Flow's diffing stays cheap.
 */
const CustomNodeComponent: React.FC<NodeProps<CustomNodeData>> = ({ id, data, selected }) => {
    const nodeState: NodeState | undefined = useFlowStore(
        (s) => s.runContext?.nodeStates?.[id]
    );
    const runIsActive = useFlowStore((s) => s.runContext?.status === 'running');
    const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
    const setRightView = useFlowStore((s) => s.setRightView);

    const status: NodeStatus = (nodeState?.status || 'pending') as NodeStatus;
    const durationMs = nodeState?.durationMs;
    const attempt = nodeState?.attempt;
    const errorMessage = nodeState?.error?.message;

    const spec = data.spec;
    const node = data.flowNode;

    const color = spec?.color || '#5E72E4';
    const inputs = getInputPorts(spec);
    const outputs = getOutputPorts(spec);

    const headerLabel = spec?.displayName || node.type;
    const summary = useMemo(() => paramSummary(node.params), [node.params]);

    const onLogsClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            setSelectedNodeId(id);
            setRightView('runs');
        },
        [id, setSelectedNodeId, setRightView]
    );

    const isLive = runIsActive && status === 'running';
    const itemsCount =
        nodeState?.output?.main?.reduce((acc, arr) => acc + (arr?.length || 0), 0) ?? 0;

    return (
        <div
            className={classNames('kfc-node', {
                'kfc-node--selected': selected,
                'kfc-node--disabled': node.disabled,
                'kfc-node--live': isLive,
                [`kfc-node--status-${status}`]: true
            })}
            style={{ ['--kfc-node-color' as any]: color }}
        >
            {inputs.map((port, idx) => (
                <Handle
                    key={`in-${port.name}`}
                    id={port.name}
                    type="target"
                    position={Position.Left}
                    className={classNames('kfc-node__handle', {
                        'kfc-node__handle--error': port.isError
                    })}
                    style={{ top: 24 + idx * 18 }}
                />
            ))}

            <div className="kfc-node__header">
                <i className={classNames('kfc-node__icon', spec?.icon || 'pi pi-circle')} />
                <span className="kfc-node__title" title={headerLabel}>
                    {headerLabel}
                </span>
                {nodeState && (status === 'success' || status === 'failed' || status === 'skipped') && (
                    <button
                        type="button"
                        className="kfc-node__info-btn"
                        onClick={onLogsClick}
                        title="Ver logs de este nodo"
                        aria-label="Ver logs"
                    >
                        <i className="pi pi-info-circle" />
                    </button>
                )}
                {spec?.category && (
                    <span className="kfc-node__category-badge">{shortCategory(spec.category)}</span>
                )}
            </div>

            <div className="kfc-node__body">
                {summary.length > 0 ? (
                    <ul className="kfc-node__params">
                        {summary.slice(0, 3).map(([k, v]) => (
                            <li key={k}>
                                <b>{k}:</b> {v}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <em style={{ color: '#9ca3af' }}>Sin parámetros configurados</em>
                )}
                <div className="kfc-node__status-row">
                    <span className={classNames('kfc-node__status', `kfc-node__status--${status}`)}>
                        {isLive && <i className="pi pi-spin pi-spinner kfc-node__status-spinner" />}
                        {!isLive && status === 'success' && <i className="pi pi-check" />}
                        {!isLive && status === 'failed' && <i className="pi pi-times" />}
                        {!isLive && status === 'skipped' && <i className="pi pi-forward" />}
                        {translateStatus(status)}
                    </span>
                    {durationMs != null && status !== 'running' && (
                        <span className="kfc-node__metric" title="Duración">
                            {formatMs(durationMs)}
                        </span>
                    )}
                    {itemsCount > 0 && status === 'success' && (
                        <span className="kfc-node__metric" title="Items procesados">
                            {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                        </span>
                    )}
                    {attempt != null && attempt > 1 && (
                        <span
                            className="kfc-node__metric kfc-node__metric--warn"
                            title="Reintentos"
                        >
                            int. {attempt}
                        </span>
                    )}
                </div>
                {errorMessage && status === 'failed' && (
                    <div className="kfc-node__error" title={errorMessage}>
                        {truncate(errorMessage, 60)}
                    </div>
                )}
            </div>

            {outputs.map((port, idx) => (
                <Handle
                    key={`out-${port.name}`}
                    id={port.name}
                    type="source"
                    position={Position.Right}
                    className={classNames('kfc-node__handle', {
                        'kfc-node__handle--error': port.isError
                    })}
                    style={{ top: 24 + idx * 18 }}
                />
            ))}

            {isLive && <div className="kfc-node__live-pulse" aria-hidden />}
        </div>
    );
};

function paramSummary(params: Record<string, any> | undefined): Array<[string, string]> {
    if (!params) return [];
    return Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => {
            const display =
                typeof v === 'object' ? JSON.stringify(v).slice(0, 40) : String(v).slice(0, 40);
            return [k, display] as [string, string];
        });
}

function shortCategory(c: string): string {
    if (c === 'flow-control') return 'flow';
    return c.slice(0, 6);
}

function translateStatus(s: NodeStatus): string {
    switch (s) {
        case 'running':
            return 'Ejecutando';
        case 'success':
            return 'Éxito';
        case 'failed':
            return 'Falló';
        case 'skipped':
            return 'Saltado';
        default:
            return 'Pendiente';
    }
}

function formatMs(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    const m = Math.floor(ms / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return `${m}m ${s}s`;
}

function truncate(s: string, max: number): string {
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export const CustomNode = memo(CustomNodeComponent);
