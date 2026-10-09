import React, { memo, useMemo, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import classNames from 'classnames';
import type { NodeSpec, FlowNode, NodeStatus, NodeState } from '../contracts/types';
import { useFlowStore } from '../store/flowStore';
import { getInputPorts, getOutputPorts } from '../utils/validators';
import { nombrePaso, etiquetaCampo, esAvanzado, textoValorCampo } from '../utils/lenguaje';
import { nombrePuerto } from '../utils/conexiones';

/** Altura del punto de conexión: uno solo va centrado; varios, repartidos. */
function alturaPuerto(idx: number, total: number): string {
    if (total <= 1) return '50%';
    return `${((idx + 1) * 100) / (total + 1)}%`;
}

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

    const headerLabel = nombrePaso(node.type, spec?.displayName);
    const summary = useMemo(() => paramSummary(node.params, spec), [node.params, spec]);

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
                    className={classNames('kfc-node__handle', 'kfc-node__handle--in', {
                        'kfc-node__handle--error': port.isError
                    })}
                    style={{ top: alturaPuerto(idx, inputs.length) }}
                    title="Suelta aquí una línea para que este paso reciba lo del anterior"
                >
                    {nombrePuerto(spec, port, 'in') && (
                        <span className="kfc-node__handle-label kfc-node__handle-label--in">{nombrePuerto(spec, port, 'in')}</span>
                    )}
                </Handle>
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
                        title="Ver qué pasó en este paso"
                        aria-label="Ver qué pasó en este paso"
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
                            <li key={k} title={`${k}: ${v}`}>
                                <b>{k}:</b> {v}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <em style={{ color: '#9ca3af' }}>Sin ajustes</em>
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
                        <span className="kfc-node__metric" title="Registros procesados">
                            {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                        </span>
                    )}
                    {attempt != null && attempt > 1 && (
                        <span
                            className="kfc-node__metric kfc-node__metric--warn"
                            title="Veces que se reintentó"
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
                    className={classNames('kfc-node__handle', 'kfc-node__handle--out', {
                        'kfc-node__handle--error': port.isError
                    })}
                    style={{ top: alturaPuerto(idx, outputs.length) }}
                    title="Arrastra desde aquí hasta el siguiente paso"
                >
                    {nombrePuerto(spec, port, 'out') && (
                        <span className="kfc-node__handle-label kfc-node__handle-label--out">{nombrePuerto(spec, port, 'out')}</span>
                    )}
                </Handle>
            ))}

            {isLive && <div className="kfc-node__live-pulse" aria-hidden />}
        </div>
    );
};

/** Resumen legible: nombre del ajuste como en el panel, sin los técnicos (JSON, rutas internas). */
function paramSummary(params: Record<string, any> | undefined, spec?: NodeSpec): Array<[string, string]> {
    if (!params) return [];
    const props: Record<string, any> = (spec?.schema as any)?.properties || {};
    const requeridos: string[] = (spec?.schema as any)?.required || [];
    const visibles = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .filter(([k, v]) => typeof v !== 'object' && !esAvanzado(k, props[k] || {}, requeridos.includes(k)));
    const lista = visibles.map(([k, v]) => {
        const valor = textoValorCampo(k, v);
        return [etiquetaCampo(k, props[k] || {}), valor.slice(0, 40)] as [string, string];
    });
    // Si todo lo configurado es técnico, al menos se dice que está configurado.
    if (!lista.length && Object.keys(params).some((k) => params[k] !== undefined && params[k] !== '')) {
        return [['Ajustes', 'configurados']];
    }
    return lista;
}

function shortCategory(c: string): string {
    return ({ trigger: 'Inicio', action: 'Acción', transform: 'Datos', 'flow-control': 'Lógica', ai: 'IA' } as Record<string, string>)[c] || c;
}

function translateStatus(s: NodeStatus): string {
    switch (s) {
        case 'running':
            return 'Probando';
        case 'success':
            return 'Bien';
        case 'failed':
            return 'Falló';
        case 'skipped':
            return 'Omitido';
        default:
            return 'Sin probar';
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
