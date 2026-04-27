import React from 'react';

export interface EmptyCanvasProps {
    readOnly: boolean;
    onTemplateClick?: (slug: string) => void;
}

interface QuickTemplate {
    slug: string;
    icon: string;
    title: string;
    desc: string;
    color: string;
}

const QUICK_TEMPLATES: QuickTemplate[] = [
    {
        slug: 'cereza-shopify-sync',
        icon: 'pi pi-sync',
        title: 'Cereza → Shopify',
        desc: 'Sincronizar productos al detectar cambios en Cereza.',
        color: '#16a34a'
    },
    {
        slug: 'webhook-notify',
        icon: 'pi pi-bell',
        title: 'Webhook → Notificar',
        desc: 'Recibir webhook y disparar notificación interna.',
        color: '#2563eb'
    },
    {
        slug: 'cron-backup',
        icon: 'pi pi-clock',
        title: 'Cron → Backup',
        desc: 'Backup periódico del catálogo a otro destino.',
        color: '#7c3aed'
    }
];

/**
 * Friendly empty-state shown over an empty canvas. Encourages dragging
 * from the palette and offers 1-click template starters.
 */
export const EmptyCanvas: React.FC<EmptyCanvasProps> = ({ readOnly, onTemplateClick }) => {
    if (readOnly) return null;
    return (
        <div className="kfc-canvas-empty" role="status" aria-live="polite">
            <div className="kfc-canvas-empty__inner">
                <div className="kfc-canvas-empty__arrow" aria-hidden>
                    <svg viewBox="0 0 80 60" width="80" height="60">
                        <path
                            d="M70 30 Q50 20, 30 30 Q15 38, 8 30"
                            stroke="#94a3b8"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray="4 4"
                            fill="none"
                        />
                        <polygon points="14,24 6,30 14,36" fill="#94a3b8" />
                    </svg>
                </div>
                <h2 className="kfc-canvas-empty__title">Empezá tu flujo</h2>
                <p className="kfc-canvas-empty__desc">
                    Arrastrá un nodo desde el catálogo de la izquierda hacia este canvas.
                    O empezá con una plantilla rápida.
                </p>

                <div className="kfc-canvas-empty__templates">
                    {QUICK_TEMPLATES.map((t) => (
                        <button
                            key={t.slug}
                            type="button"
                            className="kfc-template-card"
                            onClick={() => onTemplateClick?.(t.slug)}
                            style={{ borderLeftColor: t.color }}
                        >
                            <i className={`kfc-template-card__icon ${t.icon}`} style={{ color: t.color }} />
                            <div className="kfc-template-card__body">
                                <div className="kfc-template-card__title">{t.title}</div>
                                <div className="kfc-template-card__desc">{t.desc}</div>
                            </div>
                            <i className="pi pi-arrow-right kfc-template-card__cta" />
                        </button>
                    ))}
                </div>

                <div className="kfc-canvas-empty__hint">
                    <i className="pi pi-info-circle" />
                    <span>
                        Tip: presioná <kbd>?</kbd> para ver todos los atajos de teclado.
                    </span>
                </div>
            </div>
        </div>
    );
};
