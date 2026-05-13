import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

/**
 * Componente AISLADO para mostrar datos exclusivos de la integracion Osmosis (Cereza)
 * dentro del tracking-details-modal:
 *   - Evidencias de entrega (URL o base64)
 *   - Historial de cambios de estado
 *   - Notas recibidas via webhook
 *
 * Reglas:
 *   - Lee EXCLUSIVAMENTE pedido.integraciones.osmosis.* y pedido.notasPedido.notasOsmosis.
 *   - Cero efectos sobre otras integraciones: el modal padre solo lo monta con
 *     *ngIf="trackingData?.provider === 'osmosis'".
 *   - Cada subseccion tiene su propio *ngIf interno: si no hay datos, no renderiza nada.
 */
interface EvidenciaEntrega {
  fecha?:        string;
  statusOsmosis?: string;
  statusKatuq?:   string;
  url?:          string | null;
  base64?:       string | null;
  contentType?:  string | null;
  filename?:     string | null;
  nota?:         string | null;
}

interface StatusHistoryEntry {
  fecha?:           string;
  statusOsmosis?:   string;
  statusKatuq?:     string;
  previousStatus?:  string | null;
  notes?:           string | null;
  source?:          string;
}

interface NotaOsmosis {
  fecha?:         string;
  nota?:          string;
  usuario?:       string;
  descripcion?:   string;
  statusOsmosis?: string;
  statusKatuq?:   string;
}

@Component({
  selector: 'app-osmosis-order-extras',
  templateUrl: './osmosis-order-extras.component.html',
  styleUrls: ['./osmosis-order-extras.component.scss'],
})
export class OsmosisOrderExtrasComponent implements OnChanges {
  @Input() pedido: any;

  evidencias:    EvidenciaEntrega[] = [];
  statusHistory: StatusHistoryEntry[] = [];
  notas:         NotaOsmosis[] = [];

  // Estado de los acordeones
  expanded = { evidencias: true, historial: false, notas: false };

  // Lightbox simple para evidencias
  lightboxOpen = false;
  lightboxSrc:  string | null = null;
  lightboxAlt = '';

  ngOnChanges(_changes: SimpleChanges): void {
    const osm = this.pedido?.integraciones?.osmosis || {};
    this.evidencias    = Array.isArray(osm.evidenciasEntrega) ? [...osm.evidenciasEntrega].reverse() : [];
    this.statusHistory = Array.isArray(osm.statusHistory)     ? [...osm.statusHistory].reverse()     : [];
    this.notas         = Array.isArray(this.pedido?.notasPedido?.notasOsmosis)
      ? [...this.pedido.notasPedido.notasOsmosis].reverse()
      : [];

    // Si no hay evidencias pero si historial, abrir historial por default.
    if (!this.evidencias.length && this.statusHistory.length) {
      this.expanded = { evidencias: false, historial: true, notas: false };
    }
  }

  toggle(section: 'evidencias' | 'historial' | 'notas'): void {
    this.expanded[section] = !this.expanded[section];
  }

  /** Devuelve la fuente de imagen para una evidencia (URL directa o data: base64). */
  resolveImageSrc(ev: EvidenciaEntrega): string | null {
    if (ev?.url) return ev.url;
    if (ev?.base64) {
      const mime = ev.contentType || 'image/jpeg';
      return `data:${mime};base64,${ev.base64}`;
    }
    return null;
  }

  /** True si la evidencia es renderizable como imagen inline. */
  isImage(ev: EvidenciaEntrega): boolean {
    if (!ev) return false;
    if (ev.contentType && ev.contentType.startsWith('image/')) return true;
    if (ev.url && /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(ev.url)) return true;
    if (ev.base64 && (!ev.contentType || ev.contentType.startsWith('image/'))) return true;
    return false;
  }

  openLightbox(ev: EvidenciaEntrega): void {
    const src = this.resolveImageSrc(ev);
    if (!src) return;
    this.lightboxSrc  = src;
    this.lightboxAlt  = ev.filename || ev.nota || 'Evidencia';
    this.lightboxOpen = true;
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
    this.lightboxSrc  = null;
  }

  /** Color CSS por tipo de transicion para el badge del historial. */
  transitionClass(entry: StatusHistoryEntry): string {
    const status = (entry.statusKatuq || '').toLowerCase();
    if (status === 'cancelado')  return 'badge-cancel';
    if (status === 'entregado')  return 'badge-success';
    if (status === 'despachado') return 'badge-progress';
    return 'badge-default';
  }
}
