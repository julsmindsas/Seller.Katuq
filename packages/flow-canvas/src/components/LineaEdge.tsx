import React, { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from 'reactflow';
import { useFlowStore } from '../store/flowStore';

/**
 * Línea entre dos pasos. Al tocarla queda marcada y muestra una ✕ en la mitad
 * para quitarla, sin depender de la tecla Suprimir.
 */
const LineaEdgeComponent: React.FC<EdgeProps> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
    selected,
}) => {
    const deleteEdge = useFlowStore((s) => s.deleteEdge);
    const readOnly = useFlowStore((s) => s.readOnly);
    const [path, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    });

    return (
        <>
            <BaseEdge path={path} markerEnd={markerEnd} style={style} interactionWidth={24} />
            {selected && !readOnly && (
                <EdgeLabelRenderer>
                    <button
                        type="button"
                        className="kfc-edge-quitar nodrag nopan"
                        style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
                        onClick={(e) => {
                            e.stopPropagation();
                            deleteEdge(id);
                        }}
                        title="Quitar esta conexión"
                        aria-label="Quitar esta conexión"
                    >
                        <i className="pi pi-times" />
                    </button>
                </EdgeLabelRenderer>
            )}
        </>
    );
};

export const LineaEdge = memo(LineaEdgeComponent);
