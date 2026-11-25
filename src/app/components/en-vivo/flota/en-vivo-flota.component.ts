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
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { MensajeroEnVivo, PedidoEnVivo } from '../servicios/en-vivo.modelos';
import { armarFlota, EntradaFlota } from '../utilidades/flota';
import { duracion, iniciales } from '../utilidades/formato';
import { cadaFueraDeZona } from '../utilidades/movimiento';
import { Traductor } from '../utilidades/traductor';

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
  /** Título de la tarjeta; sin él, "Mensajeros y transportadoras" en el idioma activo. */
  @Input() titulo = '';
  @Output() abrir = new EventEmitter<FlotaAbierta>();

  filas: FilaFlota[] = [];

  private entradas: EntradaFlota[] = [];
  private ahoraMs = Date.now();
  private pararTemporizador: (() => void) | null = null;
  /** Durante "Repetir el día": el instante simulado hace de "ahora" en el tiempo en ruta. */
  private instanteSimulado: number | null = null;
  private suscripcionRepeticion: Subscription | null = null;
  private suscripcionIdioma: Subscription | null = null;
  private readonly t: Traductor = (clave, params) => this.translate.instant(clave, params);

  constructor(
    private readonly zona: NgZone,
    private readonly cambios: ChangeDetectorRef,
    private readonly interaccion: EnVivoInteraccionService,
    private readonly translate: TranslateService
  ) {}

  /** Título para mostrar: el que pasa quien lo usa o el de siempre en el idioma activo. */
  get tituloVisible(): string {
    return this.titulo || this.translate.instant('enVivo.flota.mensajerosYTransportadoras');
  }

  ngOnInit(): void {
    // Con otro idioma los estados y subtítulos se vuelven a escribir.
    this.suscripcionIdioma = this.translate.onLangChange.subscribe(() => {
      this.armarFilas();
      this.cambios.markForCheck();
    });
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
    this.suscripcionIdioma?.unsubscribe();
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
      const minutos = entrada.salioEn !== null ? duracion(Math.max(0, ahora - entrada.salioEn), this.t) : null;
      const pastilla = entrada.enRuta
        ? minutos
          ? this.t('enVivo.flota.enRutaTiempo', { pedidos: entrada.pedidos, tiempo: minutos })
          : this.t('enVivo.flota.enRuta', { pedidos: entrada.pedidos })
        : moto
        ? this.t('enVivo.flota.enBodega')
        : this.t('enVivo.flota.disponible');
      return {
        entrada,
        iniciales: moto ? iniciales(entrada.nombre) : 'EN',
        subtitulo: this.t(moto ? 'enVivo.flota.subtituloMoto' : 'enVivo.flota.subtituloCamion'),
        pastilla,
        claseEstado: entrada.enRuta ? 't-info' : 't-slate',
        claseAvatar: moto ? COLORES_AVATAR[i % COLORES_AVATAR.length] : 't-slate',
      };
    });
  }
}
