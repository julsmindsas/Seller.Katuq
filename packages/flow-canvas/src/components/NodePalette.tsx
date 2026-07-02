import React, { useMemo } from 'react';
import classNames from 'classnames';
import { useFlowStore } from '../store/flowStore';
import type { NodeSpec, NodeGroup } from '../contracts/types';

const GROUP_LABELS: Record<NodeGroup, string> = {
    osmosis: 'Osmosis (Guía Cereza)',
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
    katuq: 'Katuq Internal',
    'flow-control': 'Control de Flujo',
    http: 'HTTP',
    kai: 'KAI (AI)'
};

export interface NodePaletteProps {
    readOnly: boolean;
}

/**
 * Left sidebar listing every NodeSpec in the catalog grouped by NodeSpec.group.
 * Drag-and-drop drops the spec.type into the canvas, which the Canvas handles.
 */
export const NodePalette: React.FC<NodePaletteProps> = ({ readOnly }) => {
    const catalog = useFlowStore((s) => s.catalog);
    const filter = useFlowStore((s) => s.paletteFilter);
    const setFilter = useFlowStore((s) => s.setPaletteFilter);

    const groups = useMemo(() => groupCatalog(catalog, filter), [catalog, filter]);

    const onDragStart = (e: React.DragEvent, spec: NodeSpec) => {
        if (readOnly) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('application/x-katuq-node-type', spec.type);
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside className="kfc-sidebar" aria-label="Catálogo de nodos">
            <div className="kfc-sidebar__header">
                <h3 className="kfc-sidebar__title">Catálogo de nodos</h3>
                <input
                    type="search"
                    className="kfc-sidebar__search"
                    placeholder="Buscar nodo (nombre, tag, grupo)..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>
            <div className="kfc-sidebar__list">
                {catalog.length === 0 && (
                    <div className="kfc-empty">
                        <div className="kfc-empty__title">Sin catálogo cargado</div>
                        <div className="kfc-empty__desc">
                            El backend debe enviar el array de NodeSpec[].
                        </div>
                    </div>
                )}
                {Object.entries(groups).map(([group, specs]) => (
                    <section key={group} className="kfc-group">
                        <div className="kfc-group__title">
                            {GROUP_LABELS[group as NodeGroup] || group} ({specs.length})
                        </div>
                        {specs.map((spec) => (
                            <div
                                key={spec.type}
                                className={classNames('kfc-palette-card')}
                                draggable={!readOnly}
                                onDragStart={(e) => onDragStart(e, spec)}
                                style={{ borderLeftColor: spec.color }}
                                title={spec.description}
                            >
                                <i className={classNames('kfc-palette-card__icon', spec.icon)} />
                                <div className="kfc-palette-card__body">
                                    <div className="kfc-palette-card__title">{spec.displayName}</div>
                                    <div className="kfc-palette-card__desc">{spec.description}</div>
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
    const lower = (q || '').trim().toLowerCase();
    const filtered = lower
        ? catalog.filter((s) => {
              const hay = `${s.displayName} ${s.description} ${s.type} ${(s.tags || []).join(' ')} ${s.group}`.toLowerCase();
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
