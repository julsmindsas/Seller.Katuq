import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, Subject, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { KatuqCommerceContextService } from '../../../shared/services/security/katuq-commerce-context.service';
import {
  AvisoEnVivo,
  EstadoEnVivo,
  EventoEnVivo,
  OpcionesCanal,
  PreferenciasEnVivo,
  SalidaCanal,
} from './en-vivo.modelos';
import { EnVivoCanalService } from './en-vivo-canal.service';
import { diaDeColombia, textoAlDia } from './en-vivo-reglas';
import { esRegistro } from './en-vivo-sse.parser';
import { aplicarCifras, aplicarEvento, aplicarFoto, estadoInicial } from './en-vivo-reductores';

const PREFIJO_PREFERENCIAS = 'katuq.enVivo.prefs.v1';
const PREFIJO_HITOS = 'katuq.enVivo.hitos.v1';

const PREFERENCIAS_POR_DEFECTO: PreferenciasEnVivo = { vista: null, sonido: false, ocultar: false };

/** Hitos celebrados en un día: se guardan por fecha y se reinician solos al cambiar el día. */
interface HitosGuardados {
  fecha: string;
  hitos: string[];
}

// ── localStorage (siempre con try/catch: puede venir vacío, bloqueado o lanzar) ──

function leerAlmacen(clave: string): unknown {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

function escribirAlmacen(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento (ventana privada o cuota): la pantalla sigue, solo no recuerda.
  }
}

/**
 * Estado de la pantalla "En vivo": aplica lo que llega del canal (`foto`, `evento`,
 * `cifras`, `radar`, `opttia`) a un modelo de vista con `BehaviorSubject`, deduplica
 * eventos por id, calcula "Te pusimos al día: N cambios" al reconectar y guarda las
 * preferencias (vista, sonido, "ocultar clientes y montos") y los hitos ya celebrados
 * hoy en `localStorage`.
 *
 * Ciclo de vida: el shell llama `iniciar()` al entrar y `detener()` al salir (cierra el
 * lector del canal). Solo lectura: no cambia pedidos ni escribe en el servidor.
 */
@Injectable({ providedIn: 'root' })
export class EnVivoEstadoService implements OnDestroy {
  private readonly estadoSubject = new BehaviorSubject<EstadoEnVivo>(estadoInicial());
  private readonly nuevosSubject = new Subject<EventoEnVivo>();
  private readonly avisosSubject = new Subject<AvisoEnVivo>();
  private readonly preferenciasSubject = new BehaviorSubject<PreferenciasEnVivo>({ ...PREFERENCIAS_POR_DEFECTO });

  /**
   * Estado SUSTITUTO que "Repetir el día" pone en lugar del real (null = se ve el real). Solo cambia
   * lo que se pinta: el canal sigue aplicando todo al estado real en paralelo.
   */
  private readonly sustitutoSubject = new BehaviorSubject<EstadoEnVivo | null>(null);

  /**
   * Modelo de vista para los componentes (OnPush + `async`): el estado real o, mientras se repite
   * el día, el simulado. Quien necesite SIEMPRE el real (acciones, narración, sincronizar escenas)
   * usa el getter `estado`.
   */
  readonly estado$: Observable<EstadoEnVivo> = combineLatest([this.estadoSubject, this.sustitutoSubject]).pipe(
    map(([real, sustituto]) => sustituto ?? real),
    distinctUntilChanged()
  );
  /**
   * Eventos que llegaron EN VIVO por el canal, sin repetir. No incluye los de la foto
   * (ni al cargar ni al reconectar): de ahí cuelgan las animaciones y los sonidos.
   */
  readonly nuevos$: Observable<EventoEnVivo> = this.nuevosSubject.asObservable();
  /** Avisos pasajeros ("Te pusimos al día: N cambios"). */
  readonly avisos$: Observable<AvisoEnVivo> = this.avisosSubject.asObservable();
  readonly preferencias$: Observable<PreferenciasEnVivo> = this.preferenciasSubject.asObservable();

  private suscripcion: Subscription | null = null;
  private opciones: OpcionesCanal | null = null;

  constructor(
    private readonly canal: EnVivoCanalService,
    private readonly contexto: KatuqCommerceContextService
  ) {}

  /** El estado REAL (el que mantiene el canal), aunque se esté repitiendo el día. */
  get estado(): EstadoEnVivo {
    return this.estadoSubject.value;
  }

  /** Lo que se está pintando: el sustituto de "Repetir el día" o, si no hay, el real. */
  get estadoVisible(): EstadoEnVivo {
    return this.sustitutoSubject.value ?? this.estadoSubject.value;
  }

  /** true mientras "Repetir el día" tiene un estado sustituto puesto. */
  get enSustituto(): boolean {
    return this.sustitutoSubject.value !== null;
  }

  get preferencias(): PreferenciasEnVivo {
    return this.preferenciasSubject.value;
  }

  ngOnDestroy(): void {
    this.detener();
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  /** Abre el canal de esa vista. Si ya está abierto el mismo, no hace nada. */
  iniciar(opciones: OpcionesCanal): void {
    if (this.suscripcion && this.opciones && this.mismasOpciones(this.opciones, opciones)) return;
    this.detener();

    this.opciones = opciones;
    this.estadoSubject.next({
      ...estadoInicial(opciones.vista, opciones.vista === 'comercio' ? opciones.empresa ?? null : null),
      conexion: 'conectando',
    });
    this.preferenciasSubject.next(this.leerPreferencias());

    this.suscripcion = this.canal.abrir(opciones).subscribe({
      next: (salida) => this.aplicar(salida),
      // El canal no emite errores (los absorbe y reconecta); por si acaso, la pantalla queda en reconectando.
      error: () => this.publicar({ ...this.estado, conexion: 'reconectando' }),
    });
  }

  /** Cierra el canal (y su lector). El modelo queda como estaba, con la conexión en `detenido`. */
  detener(): void {
    // Un estado simulado no sobrevive al canal que lo originó.
    if (this.sustitutoSubject.value !== null) this.sustitutoSubject.next(null);
    if (this.suscripcion) {
      this.suscripcion.unsubscribe();
      this.suscripcion = null;
    }
    this.opciones = null;
    if (this.estado.conexion !== 'detenido') this.publicar({ ...this.estado, conexion: 'detenido' });
  }

  // ── Aplicar lo que llega ──────────────────────────────────────────────────

  private aplicar(salida: SalidaCanal): void {
    switch (salida.tipo) {
      case 'estado':
        this.publicar({
          ...this.estado,
          conexion: salida.estado,
          motivoSinAcceso: salida.estado === 'sin-acceso' ? salida.motivo ?? null : null,
          disponible: salida.estado === 'sin-acceso' && salida.motivo === 'rol' ? false : this.estado.disponible,
        });
        break;
      case 'foto': {
        const resultado = aplicarFoto(this.estado, salida.foto, { trasCorte: salida.trasCorte, ahoraMs: Date.now() });
        this.publicar(resultado.estado);
        if (resultado.cambios > 0) {
          this.avisosSubject.next({ tipo: 'al-dia', cambios: resultado.cambios, texto: textoAlDia(resultado.cambios) });
        }
        break;
      }
      case 'evento': {
        const resultado = aplicarEvento(this.estado, salida.evento);
        if (resultado.nuevo) {
          this.publicar(resultado.estado);
          this.nuevosSubject.next(salida.evento);
        }
        break;
      }
      case 'cifras':
        this.publicar(aplicarCifras(this.estado, salida.cifras));
        break;
      case 'radar':
        this.publicar({ ...this.estado, radar: salida.radar });
        break;
      case 'opttia':
        this.publicar({ ...this.estado, opttia: salida.resumen });
        break;
      default:
        break;
    }
  }

  private publicar(estado: EstadoEnVivo): void {
    this.estadoSubject.next(estado);
  }

  // ── "Repetir el día" (tarea 5.7) ──────────────────────────────────────────

  /**
   * Pone (o quita, con null) el estado que se pinta en lugar del real. Lo usa SOLO la repetición
   * del día: el estado real no se toca y el canal sigue aplicándole fotos y eventos, así que al
   * quitar el sustituto la pantalla vuelve al real sin perder nada de lo que llegó mientras tanto.
   */
  fijarSustituto(estado: EstadoEnVivo | null): void {
    this.sustitutoSubject.next(estado);
  }

  /**
   * Anuncia por `nuevos$` un evento SIMULADO (el de la repetición) por la misma ruta que los reales.
   * No toca ningún estado. Quien escucha `nuevos$` ya se calla durante la repetición (sonidos,
   * narración, escena 3D); lo ven las piezas que solo iluminan (el muro).
   */
  anunciarSimulado(evento: EventoEnVivo): void {
    this.nuevosSubject.next(evento);
  }

  /** Aviso pasajero con un texto libre (el shell lo muestra igual que "Te pusimos al día"). */
  avisar(texto: string): void {
    this.avisosSubject.next({ tipo: 'info', texto });
  }

  private mismasOpciones(a: OpcionesCanal, b: OpcionesCanal): boolean {
    return a.vista === b.vista && (a.empresa ?? null) === (b.empresa ?? null);
  }

  // ── Preferencias (localStorage) ───────────────────────────────────────────

  /** Cambia una o varias preferencias y las guarda. */
  fijarPreferencias(cambios: Partial<PreferenciasEnVivo>): void {
    const siguiente: PreferenciasEnVivo = { ...this.preferencias, ...cambios };
    this.preferenciasSubject.next(siguiente);
    escribirAlmacen(this.claveDe(PREFIJO_PREFERENCIAS), siguiente);
  }

  fijarVista(vista: string | null): void {
    this.fijarPreferencias({ vista });
  }

  alternarSonido(): void {
    this.fijarPreferencias({ sonido: !this.preferencias.sonido });
  }

  alternarOcultar(): void {
    this.fijarPreferencias({ ocultar: !this.preferencias.ocultar });
  }

  // ── Hitos del día ─────────────────────────────────────────────────────────

  /** ¿Ya se celebró este hito hoy (en este navegador, para esta vista)? */
  yaCelebrado(hito: string): boolean {
    const guardado = this.leerHitos();
    return guardado.fecha === this.diaActual() && guardado.hitos.indexOf(hito) !== -1;
  }

  /** Marca el hito como celebrado hoy. Devuelve false si ya lo estaba (no hay que celebrarlo otra vez). */
  marcarCelebrado(hito: string): boolean {
    const hoy = this.diaActual();
    const guardado = this.leerHitos();
    const hitos = guardado.fecha === hoy ? guardado.hitos : [];
    if (hitos.indexOf(hito) !== -1) return false;
    escribirAlmacen(this.claveDe(PREFIJO_HITOS, this.vistaDeHitos()), { fecha: hoy, hitos: [...hitos, hito] });
    return true;
  }

  /** El día lo dice el servidor (`cifras.dia`, hora de Colombia); sin él, se calcula igual. */
  private diaActual(): string {
    const estado = this.estado;
    const dia = estado.vista === 'katuq' ? estado.cifrasGlobal?.dia : estado.cifras?.dia;
    return dia || diaDeColombia(Date.now());
  }

  private leerHitos(): HitosGuardados {
    const crudo = leerAlmacen(this.claveDe(PREFIJO_HITOS, this.vistaDeHitos()));
    if (esRegistro(crudo) && typeof crudo['fecha'] === 'string' && Array.isArray(crudo['hitos'])) {
      return { fecha: crudo['fecha'], hitos: (crudo['hitos'] as unknown[]).filter((h): h is string => typeof h === 'string') };
    }
    return { fecha: '', hitos: [] };
  }

  private leerPreferencias(): PreferenciasEnVivo {
    const crudo = leerAlmacen(this.claveDe(PREFIJO_PREFERENCIAS));
    if (!esRegistro(crudo)) return { ...PREFERENCIAS_POR_DEFECTO };
    return {
      vista: typeof crudo['vista'] === 'string' && crudo['vista'].length <= 40 ? crudo['vista'] : null,
      sonido: crudo['sonido'] === true,
      ocultar: crudo['ocultar'] === true,
    };
  }

  /** Quién y qué se mira: las celebraciones de FLORECER y las de toda Katuq no se mezclan. */
  private vistaDeHitos(): string {
    const opciones = this.opciones;
    if (!opciones) return 'propia';
    if (opciones.vista === 'katuq') return 'katuq';
    return opciones.empresa ? `empresa.${opciones.empresa}` : 'propia';
  }

  /** Clave por sesión (empresa + usuario) para que dos personas en el mismo navegador no compartan preferencias. */
  private claveDe(prefijo: string, vista?: string): string {
    const sesion = this.contexto.resolve();
    const alcance = sesion
      ? [sesion.companyId, sesion.email || sesion.userNit || 'user'].map(encodeURIComponent).join('.')
      : 'sin-sesion';
    return vista ? `${prefijo}.${alcance}.${encodeURIComponent(vista)}` : `${prefijo}.${alcance}`;
  }
}
