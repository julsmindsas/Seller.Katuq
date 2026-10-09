import React from 'react';

export interface EmptyCanvasProps {
    readOnly: boolean;
    /** Lleva a la galería de plantillas (allí se revisa qué hay que conectar antes de encender). */
    onTemplateClick?: () => void;
}

/**
 * Lienzo vacío (2026-10-07, D-350 parte C). Antes ofrecía tres "plantillas
 * rápidas" con ids que el backend no tiene ('cereza-shopify-sync',
 * 'webhook-notify', 'cron-backup'): siempre terminaban en "Plantilla no
 * disponible". Ahora manda a la galería real.
 */
export const EmptyCanvas: React.FC<EmptyCanvasProps> = ({ readOnly, onTemplateClick }) => {
    if (readOnly) return null;
    return (
        <div className="kfc-canvas-empty" role="status" aria-live="polite">
            <div className="kfc-canvas-empty__inner">
                <span className="kfc-canvas-empty__eyebrow">Modo avanzado</span>
                <h2 className="kfc-canvas-empty__title">Arma tu automatización paso a paso</h2>
                <p className="kfc-canvas-empty__desc">
                    Toca en la lista de la izquierda el paso que la arranca (por ejemplo, «Cuando entra un pedido
                    en Shopify») y luego los que siguen: cada uno queda conectado después del anterior.
                </p>
                <div className="kfc-canvas-empty__acciones">
                    <button type="button" className="kfc-btn kfc-btn--primary" onClick={() => onTemplateClick?.()}>
                        <i className="pi pi-th-large" />
                        Mejor empezar con una plantilla
                    </button>
                </div>
                <div className="kfc-canvas-empty__hint">
                    <i className="pi pi-info-circle" />
                    <span>
                        Toca <kbd>?</kbd> para ver los atajos de teclado.
                    </span>
                </div>
            </div>
        </div>
    );
};
