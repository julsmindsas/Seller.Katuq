import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { EventoEnVivo, PedidoEnVivo } from '../servicios/en-vivo.modelos';
import { ColoresPulso, dibujarPulso, Latido, latidosDeEventos } from '../utilidades/ecg';
import { alCambiarMovimiento, prefiereMenosMovimiento } from '../utilidades/movimiento';

/** Textos de la cabecera del pulso. Los pone quien lo usa: cambian entre el comercio y toda Katuq. */
export interface DatosPulso {
  /** "El pulso de tu tienda · cada pico es un pedido". */
  etiqueta: string;
  /** El número grande ("3" pedidos esta hora, o "1,4" pedidos por minuto). */
  valor: string;
  unidad: string;
  /** Chip de la derecha ("Mejor hora de hoy: 3 p. m. · 12 pedidos"). */
  nota: string;
}

/** Ventana del pulso del comercio (6 min) y de toda Katuq (2 min). */
export const VENTANA_PULSO_COMERCIO_MS = 6 * 60000;
export const VENTANA_PULSO_KATUQ_MS = 2 * 60000;

const CUADRO_MS = 33; // ~30 cuadros por segundo
const MARGEN_LATIDOS_MS = 8000;
const REPINTADO_ESTATICO_MS = 10000;
const REFRESCO_COLORES_MS = 1000;
/** Con "Repetir el día" la ventana del pulso abarca esto de la repetición (no del día real). */
const VENTANA_REPETICION_MS = 6000;
const VENTANA_REPETICION_MINIMA_MS = 4000;

/**
 * Pulso: una línea tipo electrocardiograma en un canvas 2D que late con cada pedido nuevo de los
 * últimos 6 minutos (comercio) o 2 minutos (Katuq). Va a ~30 cuadros por segundo, se PAUSA con la
 * pestaña oculta o fuera de pantalla y queda ESTÁTICO con "reducir movimiento". Los latidos salen
 * de los eventos (`pedido_nuevo`); el canvas es decorativo (`aria-hidden`) y la cabecera lleva el
 * dato en texto.
 */
@Component({
  selector: 'app-en-vivo-pulso',
  templateUrl: './en-vivo-pulso.component.html',
  styleUrls: ['./en-vivo-pulso.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoPulsoComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() datos: DatosPulso | null = null;
  /** Eventos (de cualquier tipo): se dibujan los `pedido_nuevo` de la ventana. */
  @Input() eventos: ReadonlyArray<EventoEnVivo> = [];
  /** Pedidos de la foto: completan el monto de un evento que no lo trae. */
  @Input() pedidos: ReadonlyArray<PedidoEnVivo> = [];
  @Input() ventanaMs = VENTANA_PULSO_COMERCIO_MS;
  /** Con los montos ocultos, todos los picos tienen la misma altura. */
  @Input() ocultar = false;

  @ViewChild('lienzo', { static: true }) lienzo!: ElementRef<HTMLCanvasElement>;

  private latidos: Latido[] = [];
  private cuadro = 0;
  private ultimoCuadroMs = 0;
  private menosMovimiento = false;
  private visible = true;
  private observador: IntersectionObserver | null = null;
  private pararMovimiento: (() => void) | null = null;
  private temporizadorEstatico = 0;
  private colores: ColoresPulso = { linea: '#5F3FE0', rejilla: '#B9AEE8', pico: '#5F3FE0', ia: '#8E27B0' };
  private coloresMs = 0;
  /** Durante "Repetir el día": el instante simulado y cuántos ms reales pasan por cada ms de repetición. */
  private simulado: { instante: number; escala: number } | null = null;
  private readonly suscripcionRepeticion: Subscription;

  constructor(
    private readonly zona: NgZone,
    private readonly anfitrion: ElementRef<HTMLElement>,
    interaccion: EnVivoInteraccionService
  ) {
    this.suscripcionRepeticion = interaccion.repeticion$.subscribe((r) => {
      this.simulado = r.activa && r.instanteMs !== null ? { instante: r.instanteMs, escala: r.escala ?? 1 } : null;
      this.recalcular();
    });
  }

  /** "Ahora" del pulso: el reloj real o, mientras se repite el día, el instante simulado. */
  private ahora(): number {
    return this.simulado ? this.simulado.instante : Date.now();
  }

  /** Ventana que cabe a lo ancho: la normal o, en la repetición, unos segundos de la repetición. */
  private ventana(): number {
    if (!this.simulado) return this.ventanaMs;
    const animada = Math.max(VENTANA_REPETICION_MINIMA_MS, (VENTANA_REPETICION_MS * this.ventanaMs) / VENTANA_PULSO_COMERCIO_MS);
    return animada * Math.max(1, this.simulado.escala);
  }

  ngOnChanges(): void {
    this.recalcular();
  }

  private recalcular(): void {
    const ahora = this.ahora();
    const ventana = this.ventana();
    const escala = this.simulado ? Math.max(1, this.simulado.escala) : 1;
    const porId = new Map<string, PedidoEnVivo>();
    for (const pedido of this.pedidos) porId.set(pedido.id, pedido);
    this.latidos = latidosDeEventos(this.eventos, porId, ahora - ventana - MARGEN_LATIDOS_MS * escala, ahora + 5000 * escala, this.ocultar);
    // Con movimiento reducido no hay bucle: se repinta cuando llegan datos nuevos.
    if (this.menosMovimiento && this.lienzo) this.pintar(ahora, null);
  }

  ngAfterViewInit(): void {
    this.menosMovimiento = prefiereMenosMovimiento();
    this.pararMovimiento = alCambiarMovimiento((menos) => {
      this.menosMovimiento = menos;
      this.arrancar();
    });
    this.zona.runOutsideAngular(() => {
      if (typeof IntersectionObserver !== 'undefined') {
        this.observador = new IntersectionObserver((entradas) => {
          this.visible = entradas.some((e) => e.isIntersecting);
        });
        this.observador.observe(this.anfitrion.nativeElement);
      }
    });
    this.arrancar();
  }

  ngOnDestroy(): void {
    this.detener();
    this.suscripcionRepeticion.unsubscribe();
    this.observador?.disconnect();
    this.pararMovimiento?.();
  }

  private arrancar(): void {
    this.detener();
    this.zona.runOutsideAngular(() => {
      if (this.menosMovimiento) {
        // Estático: una pintada ahora y otra cada 10 s para que la ventana no se quede vieja.
        this.pintar(this.ahora(), null);
        this.temporizadorEstatico = window.setInterval(() => this.pintar(this.ahora(), null), REPINTADO_ESTATICO_MS);
        return;
      }
      this.cuadro = requestAnimationFrame(this.paso);
    });
  }

  private detener(): void {
    if (this.cuadro) cancelAnimationFrame(this.cuadro);
    this.cuadro = 0;
    if (this.temporizadorEstatico) window.clearInterval(this.temporizadorEstatico);
    this.temporizadorEstatico = 0;
  }

  private readonly paso = (ahora: number): void => {
    this.cuadro = requestAnimationFrame(this.paso);
    // Pausa con la pestaña oculta o la tarjeta fuera de pantalla: no se dibuja nada.
    if (document.hidden || !this.visible || ahora - this.ultimoCuadroMs < CUADRO_MS) return;
    this.ultimoCuadroMs = ahora;
    this.pintar(this.ahora(), ahora);
  };

  private pintar(ahoraMs: number, fase: number | null): void {
    const lienzo = this.lienzo?.nativeElement;
    if (!lienzo) return;
    const ancho = lienzo.clientWidth;
    const alto = lienzo.clientHeight;
    if (!ancho || !alto) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const anchoPx = Math.round(ancho * dpr);
    const altoPx = Math.round(alto * dpr);
    if (lienzo.width !== anchoPx || lienzo.height !== altoPx) {
      lienzo.width = anchoPx;
      lienzo.height = altoPx;
    }
    const contexto = lienzo.getContext('2d');
    if (!contexto) return;
    contexto.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.refrescarColores(lienzo, ahoraMs);
    dibujarPulso(contexto, ancho, alto, this.latidos, this.colores, ahoraMs, this.ventana(), this.menosMovimiento ? null : fase);
  }

  /** Lee los colores del tema (cambian con el modo pantalla) a lo sumo una vez por segundo. */
  private refrescarColores(lienzo: HTMLCanvasElement, ahoraMs: number): void {
    if (ahoraMs - this.coloresMs < REFRESCO_COLORES_MS) return;
    this.coloresMs = ahoraMs;
    const estilo = getComputedStyle(lienzo);
    const leer = (variable: string, respaldo: string): string => estilo.getPropertyValue(variable).trim() || respaldo;
    this.colores = {
      linea: leer('--ev-accent', this.colores.linea),
      rejilla: leer('--ev-line', this.colores.rejilla),
      pico: leer('--ev-accent-2', this.colores.pico),
      ia: leer('--ev-pack', this.colores.ia),
    };
  }
}
