import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';

import { AtencionService } from '../../../../shared/services/messaging/atencion.service';
import { AyudaOpttia, ResultadoUsoSugerencia, TipoAyudaOpttia } from '../../../../shared/services/messaging/messaging.models';

/** Lo que el chat abierto contestó al intento de usar la sugerencia (`n` distingue intentos repetidos). */
export interface ResultadoUso {
  estado: ResultadoUsoSugerencia;
  n: number;
}

type Fase = 'reposo' | 'pensando' | 'resumen' | 'respuesta' | 'error';

/**
 * Ayuda de Opttia al asesor (D-730): «Resumir chat» y «Sugerir respuesta». Solo presenta: pide al servidor
 * por `AtencionService.ayuda`, que no envía nada al cliente ni guarda nada en el chat. «Usar» solo avisa
 * (`usar`) y quien lo aloja pone el texto en el cuadro de escribir sin enviar; el resultado vuelve por
 * `resultado`. Si el cuadro está bloqueado se muestra el texto para copiarlo. Se reinicia al cambiar de chat.
 * El host es `display: contents`: sus piezas se acomodan en la barra del chat.
 */
@Component({
  selector: 'app-chat-ayuda',
  templateUrl: './chat-ayuda.component.html',
  styleUrls: ['./chat-ayuda.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatAyudaComponent implements OnChanges, OnDestroy {
  /** Chat al que pertenece la ayuda: si cambia, todo se descarta. */
  @Input() threadId: string | null = null;
  /** Respuesta de quien aloja al «Usar». */
  @Input() resultado: ResultadoUso | null = null;

  /** El texto que el asesor quiere en el cuadro de escribir (nunca se envía desde aquí). */
  @Output() usar = new EventEmitter<string>();

  menu = false;
  fase: Fase = 'reposo';
  resumen = '';
  pendiente = '';
  texto = '';
  /** Mensaje del servidor al fallar (cupo, no disponible); vacío = el general. */
  mensajeError = '';
  /** El cuadro no admite escribir: el texto se muestra para copiar. */
  bloqueado = false;
  copiado = false;

  private sub?: Subscription;
  private seq = 0;

  constructor(private srv: AtencionService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(c: SimpleChanges): void {
    if (c['threadId'] && !c['threadId'].firstChange) this.reiniciar();
    if (c['resultado'] && this.resultado && !c['resultado'].firstChange) this.alResultado(this.resultado);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get ocupado(): boolean {
    return this.fase === 'pensando';
  }

  alternar(): void {
    if (this.ocupado) return;
    this.menu = !this.menu;
  }

  pedir(tipo: TipoAyudaOpttia): void {
    const id = this.threadId;
    if (!id || this.ocupado) return;
    this.menu = false;
    this.fase = 'pensando';
    this.bloqueado = false;
    this.copiado = false;
    this.mensajeError = '';
    const mio = ++this.seq;
    this.sub?.unsubscribe();
    this.sub = this.srv.ayuda(id, tipo).subscribe({
      next: (r: AyudaOpttia) => {
        if (mio !== this.seq || this.threadId !== id) return;
        if (r?.tipo === 'resumen' && tipo === 'resumen') {
          this.resumen = r.resumen || '';
          this.pendiente = r.pendiente || '';
          this.fase = 'resumen';
        } else if (r?.tipo === 'respuesta' && tipo === 'respuesta' && r.texto) {
          this.texto = r.texto;
          this.fase = 'respuesta';
        } else {
          this.fase = 'error';
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (mio !== this.seq || this.threadId !== id) return;
        const m = err?.error?.message;
        this.mensajeError = typeof m === 'string' ? m.trim() : '';
        this.fase = 'error';
        this.cdr.markForCheck();
      },
    });
  }

  usarTexto(): void {
    if (this.fase !== 'respuesta' || !this.texto) return;
    this.usar.emit(this.texto);
  }

  /** Cierra el bloque en línea: nada se guarda. */
  cerrar(): void {
    this.reiniciar();
  }

  async copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.texto);
      this.copiado = true;
    } catch {
      this.copiado = false;
    }
    this.cdr.markForCheck();
  }

  private alResultado(r: ResultadoUso): void {
    if (this.fase !== 'respuesta') return;
    if (r.estado === 'usado') this.reiniciar();
    else if (r.estado === 'bloqueado') this.bloqueado = true;
    this.cdr.markForCheck();
  }

  private reiniciar(): void {
    this.seq++;
    this.sub?.unsubscribe();
    this.menu = false;
    this.fase = 'reposo';
    this.resumen = '';
    this.pendiente = '';
    this.texto = '';
    this.mensajeError = '';
    this.bloqueado = false;
    this.copiado = false;
    this.cdr.markForCheck();
  }
}
