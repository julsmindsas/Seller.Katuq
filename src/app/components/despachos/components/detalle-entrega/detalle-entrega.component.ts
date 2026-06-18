import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { PedidoEntrega } from '../../interfaces/pedido-entrega.interface';

@Component({
  selector: 'app-detalle-entrega',
  templateUrl: './detalle-entrega.component.html',
  styleUrls: ['./detalle-entrega.component.scss']
})
export class DetalleEntregaComponent implements OnInit, OnChanges {
  @Input() pedido: PedidoEntrega;
  @Output() onClose = new EventEmitter<void>();
  @Output() onImageClick = new EventEmitter<string>();
  
  // Image viewer properties
  imageViewerVisible = false;
  selectedImageUrl = '';
  
  constructor() { }

  ngOnInit(): void {
    console.log('DetalleEntregaComponent - ngOnInit:', this.pedido);
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    console.log('DetalleEntregaComponent - ngOnChanges:', changes);
    if (changes['pedido']) {
      console.log('Pedido changed:', changes['pedido'].currentValue);
    }
  }
  
  isArray(value: any): boolean {
    return Array.isArray(value);
  }
  
  closeModal(): void {
    this.onClose.emit();
  }
  
  openFullImage(imageUrl: string): void {
    this.onImageClick.emit(imageUrl);
  }
  
  showImageViewer(imageUrl: string): void {
    this.selectedImageUrl = imageUrl;
    this.imageViewerVisible = true;
  }
  
  hideImageViewer(): void {
    this.imageViewerVisible = false;
    this.selectedImageUrl = '';
  }

  // ---------------------------------------------------------------------------
  // Evidencia y notas de Guía Cereza (Osmosis)
  // ---------------------------------------------------------------------------
  // Cuando el fulfillment lo hace Cereza (no el mensajero propio), la evidencia
  // y las notas llegan por webhook y se guardan en campos distintos:
  //   - integrations.osmosis.evidenciasEntrega (canónica EN) / integraciones... (compat ES)
  //   - notasPedido.notasOsmosis
  // Son fuentes independientes de fotosEvidencia/notasEntregaMensajero (mensajero),
  // así que pueden coexistir sin pisarse.

  get cerezaEvidencias(): any[] {
    const o: any = this.pedido || {};
    return (o.integrations?.osmosis?.evidenciasEntrega
         || o.integraciones?.osmosis?.evidenciasEntrega
         || []);
  }

  get cerezaNotas(): any[] {
    const o: any = this.pedido || {};
    return o.notasPedido?.notasOsmosis || [];
  }

  /** ¿La evidencia es imagen? Usa contentType; si viene null, infiere por la extensión de la URL. */
  isImagenEvidencia(ev: any): boolean {
    if (!ev) { return false; }
    const ct = String(ev.contentType || '').toLowerCase();
    if (ct.startsWith('image/')) { return true; }
    if (ct) { return false; } // contentType presente y NO es imagen
    return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(ev.url || '');
  }

  /** ¿La evidencia es un PDF (ej. la guía)? */
  esPdfEvidencia(ev: any): boolean {
    const ct = String(ev?.contentType || '').toLowerCase();
    return ct.includes('pdf') || /\.pdf(\?|$)/i.test(ev?.url || '');
  }

  /** URL utilizable: prefiere url; si solo hay base64, arma un data URI. */
  evidenciaUrl(ev: any): string {
    if (ev?.url) { return ev.url; }
    if (ev?.base64) {
      const ct = ev.contentType || 'application/octet-stream';
      return `data:${ct};base64,${ev.base64}`;
    }
    return '';
  }

  /** Etiqueta para evidencias no-imagen (PDF/otros). */
  nombreEvidencia(ev: any): string {
    return ev?.filename || ev?.nota || (this.esPdfEvidencia(ev) ? 'Guía (PDF)' : 'Archivo');
  }

  /**
   * Todas las imágenes de evidencia en una sola galería: las del mensajero propio
   * (fotosEvidencia/fotoEvidencia) + las de Cereza (evidenciasEntrega que sean imagen).
   * Un pedido normalmente se entrega por un solo canal, pero si tuviera ambos se
   * muestran juntas sin pisarse.
   */
  get imagenesEvidencia(): string[] {
    const o: any = this.pedido || {};
    const urls: string[] = [];
    if (Array.isArray(o.fotosEvidencia)) {
      for (const u of o.fotosEvidencia) { if (u) { urls.push(u); } }
    }
    if (o.fotoEvidencia) { urls.push(o.fotoEvidencia); }
    for (const ev of this.cerezaEvidencias) {
      if (this.isImagenEvidencia(ev)) {
        const u = this.evidenciaUrl(ev);
        if (u) { urls.push(u); }
      }
    }
    return urls;
  }

  /** Evidencias de Cereza que NO son imagen (PDF de la guía, etc.) — se muestran como archivos. */
  get archivosEvidencia(): any[] {
    return this.cerezaEvidencias.filter((ev: any) => !this.isImagenEvidencia(ev));
  }
}