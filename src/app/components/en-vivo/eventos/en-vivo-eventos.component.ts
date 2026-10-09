import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { EtapaInfo, EventoEnVivo, PedidoEnVivo, VistaEnVivo } from '../servicios/en-vivo.modelos';
import { describirEvento, DescripcionEvento, instanteDeEvento } from '../utilidades/describir-evento';
import { dinero, horaRelativa } from '../utilidades/formato';
import { cadaFueraDeZona } from '../utilidades/movimiento';
import { claseTono, mapaDeEtapas } from '../utilidades/tonos';

/** Una fila ya armada de la lista. */
interface FilaEvento {
  id: string;
  evento: EventoEnVivo;
  clase: string;
  descripcion: DescripcionEvento;
  ms: number | null;
  /** Los pedidos que resalta en la escena al pasar el puntero (los de este evento). */
  pedidoIds: string[];
  /** Llegó después de abrir la pantalla: entra resaltada un momento. */
  nuevo: boolean;
  montoTexto: string;
}

/** Lo que sale al tocar un evento. */
export interface EventoAbierto {
  evento: EventoEnVivo;
  pedidoId: string;
  empresa: string | null;
}

const ACTUALIZAR_HORAS_MS = 5000;
const DURACION_NUEVO_MS = 1800;

/**
 * Lista "Lo que está pasando": los eventos del más nuevo al más viejo, con su pastilla de color,
 * número de pedido, cliente corto, ciudad, canal, monto y hora relativa ("ahora", "hace 3 min").
 * Sirve al comercio y a toda Katuq (`vista`). Con "ocultar" no muestra clientes ni montos (en
 * toda Katuq, comercios y montos). El puntero sobre un evento avisa qué pedidos resaltar
 * (`resaltar`); tocarlo o pulsar Enter lo abre (`abrir`).
 */
@Component({
  selector: 'app-en-vivo-eventos',
  templateUrl: './en-vivo-eventos.component.html',
  styleUrls: ['./en-vivo-eventos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoEventosComponent implements OnInit, OnChanges, OnDestroy {
  /** Del más nuevo al más viejo. */
  @Input() eventos: ReadonlyArray<EventoEnVivo> = [];
  /** Los pedidos de la foto: completan lo que el evento no trae (cliente, ciudad, monto). */
  @Input() pedidos: ReadonlyArray<PedidoEnVivo> = [];
  @Input() etapas: ReadonlyArray<EtapaInfo> = [];
  @Input() vista: VistaEnVivo = 'comercio';
  @Input() ocultar = false;
  /** Cuántas filas se muestran. */
  @Input() maximo = 40;
  @Input() titulo = 'Eventos de hoy';
  /** false: la lista no se anuncia a lectores de pantalla (útil en toda Katuq, donde son demasiados). */
  @Input() anunciar = true;
  @Output() abrir = new EventEmitter<EventoAbierto>();
  /** Ids de los pedidos del evento bajo el puntero; null al salir. */
  @Output() resaltar = new EventEmitter<string[] | null>();

  filas: FilaEvento[] = [];

  private vistos = new Set<string>();
  private haPintado = false;
  private ahoraMs = Date.now();
  private pararTemporizador: (() => void) | null = null;
  private temporizadores = new Set<number>();
  /** Durante "Repetir el día": el instante simulado que hace de "ahora" en las horas relativas. */
  private instanteSimulado: number | null = null;
  private suscripcionRepeticion: Subscription | null = null;

  constructor(
    private readonly zona: NgZone,
    private readonly cambios: ChangeDetectorRef,
    private readonly interaccion: EnVivoInteraccionService
  ) {}

  ngOnInit(): void {
    this.suscripcionRepeticion = this.interaccion.repeticion$.subscribe((r) => {
      this.instanteSimulado = r.activa ? r.instanteMs : null;
      this.cambios.markForCheck();
    });
    this.pararTemporizador = cadaFueraDeZona(this.zona, ACTUALIZAR_HORAS_MS, () => {
      this.ahoraMs = Date.now();
      this.cambios.detectChanges();
    });
  }

  ngOnChanges(_: SimpleChanges): void {
    const etapas = mapaDeEtapas(this.etapas);
    const pedidosPorId = new Map<string, PedidoEnVivo>();
    for (const pedido of this.pedidos) pedidosPorId.set(pedido.id, pedido);

    const actuales = new Map(this.filas.map((f) => [f.id, f] as const));
    const nuevos: string[] = [];
    this.filas = this.eventos.slice(0, Math.max(1, this.maximo)).map((evento) => {
      const previa = actuales.get(evento.id);
      const esNuevo = this.haPintado && !this.vistos.has(evento.id);
      if (esNuevo) nuevos.push(evento.id);
      this.vistos.add(evento.id);
      const descripcion = describirEvento(evento, {
        vista: this.vista,
        ocultar: this.ocultar,
        etapas,
        pedido: pedidosPorId.get(evento.pedidoId) ?? null,
      });
      return {
        id: evento.id,
        evento,
        clase: claseTono(descripcion.tono),
        descripcion,
        ms: instanteDeEvento(evento),
        pedidoIds: [evento.pedidoId],
        nuevo: esNuevo || (previa?.nuevo ?? false),
        montoTexto: descripcion.monto !== null ? dinero(descripcion.monto) : '',
      };
    });
    if (this.eventos.length > 0) this.haPintado = true;
    if (nuevos.length > 0) this.quitarResaltadoDespues(nuevos);
  }

  ngOnDestroy(): void {
    this.pararTemporizador?.();
    this.suscripcionRepeticion?.unsubscribe();
    this.temporizadores.forEach((id) => window.clearTimeout(id));
    this.temporizadores.clear();
  }

  hace(fila: FilaEvento): string {
    return horaRelativa(fila.ms, this.instanteSimulado ?? this.ahoraMs);
  }

  alTocar(fila: FilaEvento): void {
    this.abrir.emit({ evento: fila.evento, pedidoId: fila.evento.pedidoId, empresa: fila.evento.empresa ?? null });
  }

  alEntrar(fila: FilaEvento): void {
    this.resaltar.emit(fila.pedidoIds);
  }

  alSalir(): void {
    this.resaltar.emit(null);
  }

  porId(_: number, fila: FilaEvento): string {
    return fila.id;
  }

  private quitarResaltadoDespues(ids: string[]): void {
    const temporizador = window.setTimeout(() => {
      this.temporizadores.delete(temporizador);
      this.filas = this.filas.map((f) => (ids.indexOf(f.id) !== -1 ? { ...f, nuevo: false } : f));
      this.cambios.markForCheck();
    }, DURACION_NUEVO_MS);
    this.temporizadores.add(temporizador);
  }
}
