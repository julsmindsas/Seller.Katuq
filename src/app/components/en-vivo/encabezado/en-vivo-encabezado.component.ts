import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { OpcionVista } from '../compartido/en-vivo-interaccion.service';
import { EstadoConexion } from '../servicios/en-vivo.modelos';

/** Cómo se ve la conexión: texto, tono del par fuerte / suave y si el punto late. */
interface AspectoConexion {
  texto: string;
  clase: string;
  late: boolean;
}

const ASPECTO_CONEXION: Readonly<Record<EstadoConexion, AspectoConexion>> = {
  'en-vivo': { texto: 'En vivo', clase: 'is-vivo', late: true },
  conectando: { texto: 'Conectando…', clase: 'is-aviso', late: false },
  reconectando: { texto: 'Reconectando…', clase: 'is-aviso', late: false },
  sondeo: { texto: 'Actualiza cada 30 s', clase: 'is-aviso', late: false },
  pausado: { texto: 'En pausa', clase: 'is-neutro', late: false },
  'sin-acceso': { texto: 'Sin acceso', clase: 'is-neutro', late: false },
  detenido: { texto: 'Sin conexión', clase: 'is-neutro', late: false },
};

/**
 * Encabezado de "En vivo": marca, estado de la conexión ("En vivo", "Reconectando…", "Actualiza
 * cada 30 s"), reloj de Colombia, selector de vista (botones con `aria-pressed`) y las acciones:
 * sonido, ocultar clientes y montos, Repetir el día y Modo pantalla. Solo presenta y avisa: la
 * lógica de cada acción es del shell. Las acciones extra de quien se enchufe van en el slot
 * `[slot=acciones]`.
 */
@Component({
  selector: 'app-en-vivo-encabezado',
  templateUrl: './en-vivo-encabezado.component.html',
  styleUrls: ['./en-vivo-encabezado.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoEncabezadoComponent {
  /** Nombre del comercio (o "Katuq en vivo"). */
  @Input() marca = 'En vivo';
  @Input() subtitulo = 'Katuq · En vivo';
  /** Iniciales para el logo. */
  @Input() logo = 'K';
  /** Logo de toda Katuq: relleno de acento. */
  @Input() logoKatuq = false;
  @Input() conexion: EstadoConexion = 'detenido';
  @Input() opciones: ReadonlyArray<OpcionVista> = [];
  @Input() opcionActiva: string | null = null;
  @Input() sonido = false;
  @Input() ocultar = false;
  /** "Ocultar clientes y montos" en el comercio; "Ocultar comercios y montos" en toda Katuq. */
  @Input() etiquetaOcultar = 'Ocultar clientes y montos';
  @Input() modoPantalla = false;
  @Input() repitiendo = false;
  /** Hora fija del reloj (ms) mientras se repite el día. */
  @Input() instante: number | null = null;
  /** Sin acceso no hay acciones: solo la marca y el estado. */
  @Input() sinAcceso = false;

  @Output() elegirOpcion = new EventEmitter<string>();
  @Output() alternarSonido = new EventEmitter<void>();
  @Output() alternarOcultar = new EventEmitter<void>();
  @Output() repetirDia = new EventEmitter<void>();
  @Output() alternarModoPantalla = new EventEmitter<void>();

  get aspecto(): AspectoConexion {
    return ASPECTO_CONEXION[this.conexion] ?? ASPECTO_CONEXION.detenido;
  }

  porOpcion(_: number, opcion: OpcionVista): string {
    return opcion.id;
  }
}
