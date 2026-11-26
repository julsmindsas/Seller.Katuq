import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { EtiquetaChat } from '../../../../shared/services/messaging/messaging.models';
import { MAX_ETIQUETAS_CHAT } from '../../bandeja/bandeja.catalogos';

/** Una casilla del panel: la etiqueta del catálogo y si está marcada. */
export interface CasillaEtiqueta {
  id: string;
  nombre: string;
  color: string;
  marcada: boolean;
}

/**
 * Etiquetas de un chat (D-728): botón «Etiquetas» y un panel en línea con las casillas del catálogo (máximo
 * 5). Copia lo marcado al abrir y avisa con `guardar`; quien lo aloja llama al servidor. Los refrescos de la
 * lista no pisan lo que se está marcando. El host es `display: contents`.
 */
@Component({
  selector: 'app-chat-etiquetas',
  templateUrl: './chat-etiquetas.component.html',
  styleUrls: ['./chat-etiquetas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatEtiquetasComponent implements OnChanges {
  /** Catálogo del comercio: campo estable de quien aloja. */
  @Input() catalogo: EtiquetaChat[] = [];
  /** Ids que lleva el chat hoy: campo estable de quien aloja. */
  @Input() seleccionadas: string[] = [];
  /** Chat al que pertenece el panel: si cambia, se descarta lo marcado sin guardar (D-728). */
  @Input() threadId: string | null = null;
  @Input() ocupado = false;
  @Input() error = '';

  @Output() guardar = new EventEmitter<string[]>();

  readonly max = MAX_ETIQUETAS_CHAT;
  abierto = false;
  casillas: CasillaEtiqueta[] = [];
  /** Cuántas llevaría el chat si se guarda. */
  marcadas = 0;
  /** Cuántas lleva hoy, vigentes en el catálogo (el número del botón). */
  vigentes = 0;
  sucio = false;

  ngOnChanges(cambios: SimpleChanges): void {
    // Cambió de chat: lo marcado en el anterior no se guarda en el nuevo.
    if (cambios['threadId'] && !cambios['threadId'].firstChange) {
      this.abierto = false;
      this.sucio = false;
    }
    // Terminó de guardar sin error: el panel se cierra y vuelve a seguir al servidor.
    if (cambios['ocupado'] && !this.ocupado && this.abierto && this.sucio && !this.error) {
      this.abierto = false;
      this.sucio = false;
    }
    const vigentes = (this.seleccionadas || []).filter((id) => (this.catalogo || []).some((e) => e.id === id));
    this.vigentes = vigentes.length;
    // Abierto y tocado: el refresco de la lista no le pisa lo marcado.
    if (this.abierto && this.sucio) return;
    this.armar(vigentes);
  }

  alternar(): void {
    this.abierto = !this.abierto;
    if (this.abierto) {
      this.sucio = false;
      this.armar((this.seleccionadas || []).filter((id) => this.catalogo.some((e) => e.id === id)));
    }
  }

  alMarcar(c: CasillaEtiqueta, marcada: boolean): void {
    if (marcada && this.marcadas >= this.max) return;
    this.casillas = this.casillas.map((x) => (x.id === c.id ? { ...x, marcada } : x));
    this.marcadas = this.casillas.filter((x) => x.marcada).length;
    this.sucio = true;
  }

  bloqueada(c: CasillaEtiqueta): boolean {
    return !c.marcada && this.marcadas >= this.max;
  }

  enviar(): void {
    if (!this.sucio || this.ocupado) return;
    this.guardar.emit(this.casillas.filter((c) => c.marcada).map((c) => c.id));
  }

  trackCasilla(_: number, c: CasillaEtiqueta): string {
    return c.id;
  }

  private armar(ids: string[]): void {
    const marcadas = new Set(ids);
    this.casillas = (this.catalogo || [])
      .filter((e) => !!e.id)
      .map((e) => ({ id: e.id as string, nombre: e.nombre, color: e.color, marcada: marcadas.has(e.id as string) }));
    this.marcadas = this.casillas.filter((c) => c.marcada).length;
  }
}
