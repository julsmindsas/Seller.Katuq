import React, { useMemo } from 'react';
import { useReactFlow } from 'reactflow';
import classNames from 'classnames';
import { useFlowStore } from '../store/flowStore';
import type { NodeSpec } from '../contracts/types';
import type { FlowNode } from '../contracts/types';
import { NOMBRES_GRUPO, nombrePaso, descripcionPaso } from '../utils/lenguaje';
import { posicionSiguiente } from '../utils/conexiones';
import { shortId } from '../utils/id';
import { findSpec } from '../utils/validators';


export interface NodePaletteProps {
    readOnly: boolean;
    onIntent?: (intent: string, payload?: any) => void;
}

/**
 * Left sidebar listing every NodeSpec in the catalog grouped by NodeSpec.group.
 * Drag-and-drop drops the spec.type into the canvas, which the Canvas handles.
 */
export const NodePalette: React.FC<NodePaletteProps> = ({ readOnly, onIntent }) => {
    const catalog = useFlowStore((s) => s.catalog);
    const filter = useFlowStore((s) => s.paletteFilter);
    const setFilter = useFlowStore((s) => s.setPaletteFilter);

    const groups = useMemo(() => groupCatalog(catalog, filter), [catalog, filter]);
    const addNodeConectado = useFlowStore((s) => s.addNodeConectado);
    const rf = useReactFlow();

    // Un toque agrega el paso a la derecha del último y lo deja conectado (sin arrastrar).
    const agregar = (spec: NodeSpec) => {
        if (readOnly) return;
        const { graph, catalog: cat } = useFlowStore.getState();
        const node: FlowNode = {
            id: shortId('n'),
            type: spec.type,
            position: posicionSiguiente(graph, cat),
            params: { ...(spec.defaults || {}) }
        };
        const habiaOtros = graph.nodes.length > 0;
        const desde = addNodeConectado(node);
        // No abre el panel: así se pueden ir tocando los pasos seguidos y configurarlos después.
        onIntent?.('nodeAdded', {
            nodeId: node.id,
            type: spec.type,
            conectadoDespuesDe: desde ? nombrePaso(desde.type, findSpec(cat, desde.type)?.displayName) : null,
            faltaUnir: !desde && habiaOtros && spec.inputs.length > 0
        });
        requestAnimationFrame(() => rf.setCenter(node.position.x + 125, node.position.y + 60, { zoom: rf.getZoom(), duration: 300 }));
    };

    const onDragStart = (e: React.DragEvent, spec: NodeSpec) => {
        if (readOnly) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('application/x-katuq-node-type', spec.type);
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside className="kfc-sidebar" aria-label="Pasos disponibles">
            <div className="kfc-sidebar__header">
                <h3 className="kfc-sidebar__title">Pasos disponibles</h3>
                <p className="kfc-sidebar__hint">Toca los pasos en orden y quedan conectados uno tras otro. Luego toca cada uno en el lienzo para llenarlo.</p>
                <input
                    type="search"
                    className="kfc-sidebar__search"
                    placeholder="Buscar paso…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>
            <div className="kfc-sidebar__list">
                {catalog.length === 0 && (
                    <div className="kfc-empty">
                        <div className="kfc-empty__title">No pudimos cargar los pasos</div>
                        <div className="kfc-empty__desc">
                            Recarga la página para intentarlo de nuevo.
                        </div>
                    </div>
                )}
                {Object.entries(groups).map(([group, specs]) => (
                    <section key={group} className="kfc-group">
                        <div className="kfc-group__title">
                            {NOMBRES_GRUPO[group] || group} · {specs.length}
                        </div>
                        {specs.map((spec) => (
                            <div
                                key={spec.type}
                                className={classNames('kfc-palette-card')}
                                draggable={!readOnly}
                                onDragStart={(e) => onDragStart(e, spec)}
                                onClick={() => agregar(spec)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter') agregar(spec); }}
                                title={descripcionPaso(spec.type, spec.description)}
                            >
                                <i className={classNames('kfc-palette-card__icon', spec.icon)} style={{ color: spec.color }} />
                                <div className="kfc-palette-card__body">
                                    <div className="kfc-palette-card__title">{nombrePaso(spec.type, spec.displayName)}</div>
                                    <div className="kfc-palette-card__desc">{descripcionPaso(spec.type, spec.description)}</div>
                                </div>
                            </div>
                        ))}
                    </section>
                ))}
            </div>
        </aside>
    );
};

function groupCatalog(catalog: NodeSpec[], q: string): Record<string, NodeSpec[]> {
    const lower = sinTildes((q || '').trim());
    const filtered = lower
        ? catalog.filter((s) => {
              const hay = sinTildes(`${nombrePaso(s.type, s.displayName)} ${descripcionPaso(s.type, s.description)} ${s.displayName} ${s.description} ${s.type} ${(s.tags || []).join(' ')} ${s.group} ${NOMBRES_GRUPO[s.group] || ''}`);
              return hay.includes(lower);
          })
        : catalog;

    const groups: Record<string, NodeSpec[]> = {};
    for (const spec of filtered) {
        if (!groups[spec.group]) groups[spec.group] = [];
        groups[spec.group].push(spec);
    }
    // Stable order per group, alphabetical inside.
    // Guard defensivo: coercionar a String antes de localeCompare — si el
    // catálogo trae un NodeSpec malformado (displayName no-string), el sort
    // no debe crashear el editor completo (ver commit e41486f8).
    for (const k of Object.keys(groups)) {
        groups[k].sort((a, b) => String(a?.displayName ?? '').localeCompare(String(b?.displayName ?? '')));
    }
    return groups;
}

/** Para buscar sin importar mayúsculas ni tildes («envio» encuentra «Envío»). */
function sinTildes(t: string): string {
    return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
