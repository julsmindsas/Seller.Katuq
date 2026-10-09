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
} from '@angular/core';
import { Subscription } from 'rxjs';
import { EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { MensajeroEnVivo, PedidoEnVivo } from '../servicios/en-vivo.modelos';
import { armarFlota, EntradaFlota } from '../utilidades/flota';
import { duracion, iniciales } from '../utilidades/formato';
import { cadaFueraDeZona } from '../utilidades/movimiento';

interface FilaFlota {
  entrada: EntradaFlota;
  iniciales: string;
  subtitulo: string;
  pastilla: string;
  /** Pastilla de la tonalidad "en ruta" (azul) o "en bodega" (pizarra). */
  claseEstado: string;
  claseAvatar: string;
}

/** Lo que sale al tocar un mensajero o una transportadora. */
export interface FlotaAbierta {
  nombre: string;
  pedidoIds: string[];
}

const ACTUALIZAR_MS = 30000;
const COLORES_AVATAR: ReadonlyArray<string> = ['t-accent', 't-info', 't-pack', 't-ok', 't-warn'];

/**
 * Flota: cada mensajero propio (moto) con su estado, "En bodega" o "En ruta · 2 · 25 min" (el
 * tiempo sube mientras siga en la calle), y las transportadoras que llevan pedidos. La lista de
 * mensajeros viene del servidor (solo el nombre y si van en ruta); lo que lleva cada uno se
 * saca de los pedidos "en camino" de la foto. Solo lectura: tocar uno abre su ficha (`abrir`).
 */
@Component({
  selector: 'app-en-vivo-flota',
  templateUrl: './en-vivo-flota.component.html',
  styleUrls: ['./en-vivo-flota.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoFlotaComponent implements OnInit, OnChanges, OnDestroy {
  @Input() flota: ReadonlyArray<MensajeroEnVivo> = [];
  @Input() pedidos: ReadonlyArray<PedidoEnVivo> = [];
  /** Instante (ms) de la última foto: respaldo para el "desde hace" si el pedido no trae su hora de salida. */
  @Input() actualizadoEn: number | null = null;
  @Input() titulo = 'Mensajeros y transportadoras';
  @Output() abrir = new EventEmitter<FlotaAbierta>();

  filas: FilaFlota[] = [];

  private entradas: EntradaFlota[] = [];
  private ahoraMs = Date.now();
  private pararTemporizador: (() => void) | null = null;
  /** Durante "Repetir el día": el instante simulado hace de "ahora" en el tiempo en ruta. */
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
      this.armarFilas();
      this.cambios.markForCheck();
    });
    // El "min" de quien sigue en la calle sube solo, sin esperar un evento.
    this.pararTemporizador = cadaFueraDeZona(this.zona, ACTUALIZAR_MS, () => {
      this.ahoraMs = Date.now();
      this.armarFilas();
      this.cambios.detectChanges();
    });
  }

  ngOnChanges(): void {
    this.ahoraMs = Date.now();
    this.entradas = armarFlota(this.flota, this.pedidos, this.actualizadoEn);
    this.armarFilas();
  }

  ngOnDestroy(): void {
    this.pararTemporizador?.();
    this.suscripcionRepeticion?.unsubscribe();
  }

  alTocar(fila: FilaFlota): void {
    this.abrir.emit({ nombre: fila.entrada.nombre, pedidoIds: fila.entrada.pedidoIds });
  }

  porClave(_: number, fila: FilaFlota): string {
    return fila.entrada.clave;
  }

  private armarFilas(): void {
    this.filas = this.entradas.map((entrada, i) => {
      const moto = entrada.tipo === 'mensajero';
      const ahora = this.instanteSimulado ?? this.ahoraMs;
      const minutos = entrada.salioEn !== null ? duracion(Math.max(0, ahora - entrada.salioEn)) : null;
      const pastilla = entrada.enRuta
        ? `En ruta · ${entrada.pedidos}${minutos ? ` · ${minutos}` : ''}`
        : moto
        ? 'En bodega'
        : 'Disponible';
      return {
        entrada,
        iniciales: moto ? iniciales(entrada.nombre) : 'EN',
        subtitulo: moto ? 'Moto · mensajero propio' : 'Camión · envíos a otras ciudades',
        pastilla,
        claseEstado: entrada.enRuta ? 't-info' : 't-slate',
        claseAvatar: moto ? COLORES_AVATAR[i % COLORES_AVATAR.length] : 't-slate',
      };
    });
  }
}
