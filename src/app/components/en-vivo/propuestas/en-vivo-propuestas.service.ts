import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, combineLatest, from, Observable, of, Subscription } from 'rxjs';
import { catchError, concatMap, distinctUntilChanged, finalize, map, takeWhile, timeout } from 'rxjs/operators';
import { BaseService } from '../../../shared/services/base.service';
import { CompanyFeaturesService } from '../../../shared/services/company-features.service';
import { KatuqCommerceContextService } from '../../../shared/services/security/katuq-commerce-context.service';
import { EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { EnVivoPlanDespachosService } from '../despachos/en-vivo-plan-despachos.service';
import { GrupoEditable, OpcionMensajero, PedidoEditable } from '../despachos/grupo-despacho/grupo-despacho.component';
import { EnvioAutomatico, FueraDelPlan, RespuestaAprobacion, ResultadoGrupo, TipoGrupo } from '../despachos/plan-despachos.modelos';
import { EnVivoFichaService } from '../ficha/ficha.service';
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { EventoEnVivo } from '../servicios/en-vivo.modelos';
import { diaDeColombia } from '../utilidades/formato';
import { EnVivoPropuestaEscenaPuente } from './propuestas-escena.puente';
import { RespuestaProduccion, RespuestaPropuestas, RespuestaWhatsapp } from './propuestas.modelos';
import {
  AL_DIA_MS,
  ajustada,
  Aplazados,
  aplazadosVacios,
  aplazar,
  aprobarTodosDisponible,
  armarCola,
  AVISO_TV_MS,
  avisoEquipo,
  BLOQUEO_AL_PASAR_MS,
  chipsDe,
  coloresPorMensajero,
  conQuien,
  conservarAjustes,
  contar,
  textoIdeas,
  descartarCobroHoy,
  descartarHoy,
  desdeServidor,
  editableDe,
  esEnlaceWhatsapp,
  ESPERA_CAMBIO_MS,
  esperaParaPasar,
  esperaTrasProduccion,
  etiquetaAprobar,
  eventoDeDespacho,
  eyebrow,
  faltaParaAprobar,
  firmaParaPedir,
  incluyeCambio,
  ItemCola,
  itemsDelPedido,
  itemsDeProduccion,
  LecturaFuente,
  lecturasDe,
  leerAplazados,
  lotesDe,
  MAX_PEDIDOS_TRANSPORTADORA,
  mensajeDe,
  MINIMO_ENTRE_PEDIDOS_MS,
  muestraWhatsapp,
  NO_SALIO_TODAVIA,
  nombreDe,
  opcionesDe,
  paraAprobar,
  paraEscena,
  produccionAprobable,
  proximoVencimiento,
  puedePedir,
  razonVisible,
  RESPALDO_MS,
  ResultadoProduccion,
  resultadoProduccion,
  resultadoProduccionDeError,
  resumenDespachos,
  ResumenPlan,
  RETIRAR_SIN_USO_MS,
  senalesDeCobro,
  siguienteTrasDescartar,
  SIN_RESPUESTA,
  sinMontos,
  sinRespuesta,
  sucesorDe,
  textoConfirmar,
  textoAplicando,
  textoConfirmarTodos,
  textoResultado,
  tituloVisible,
  tonoResultado,
  TonoResultado,
  TV_POR_PROPUESTA_MS,
  yaAprobado,
} from './propuestas.reglas';

const RUTA = '/v1/opttia/propuestas';
/**
 * "Opttia propone" se pide si el comercio tiene alguna de sus banderas: el plan de despachos (D-410,
 * fase 1), producción encendida o el cobro con WhatsApp (fase 2). Quien manda es el servidor: con
 * cada bandera decide qué propuestas trae y en qué modo.
 */
const BANDERAS = ['despachosOpttia', 'opttiaProduccion', 'opttiaCobroWhatsapp'] as const;
/** Igual que aprobar despachos: más que el corte del proxy (60 s); si nada llega, es "sin respuesta". */
const ESPERA_PRODUCCION_MS = 75_000;
/** El enlace de WhatsApp se pide al tocar: si tarda más, el navegador ya no deja abrir la pestaña. */
const ESPERA_WHATSAPP_MS = 8000;
const SIN_RESPUESTA_WHATSAPP = 'Katuq no respondió a tiempo. Vuelve a tocar "Abrir WhatsApp" o abre el pedido.';
const NO_WHATSAPP = 'No pude armar el mensaje de WhatsApp. Abre el pedido para revisarlo.';
const PREFIJO_APLAZADOS = 'katuq.enVivo.propuestas.v1';
/** El texto de Opttia del plan (`/explicar`) se pide a lo sumo una vez cada 10 min (el servidor también lo limita). */
const EXPLICAR_CADA_MS = 10 * 60_000;
/** Cuando lo que llegó salió de la memoria del servidor, se vuelve a pedir un poco después de que vence. */
const MARGEN_VENCE_MS = 1000;

/** Lo que deja cada petición de la serie de "Aprobar los N grupos". */
interface PasoAprobacion {
  ok: number;
  error: string | null;
  /** Un grupo de transportadora quedó sin respuesta: no se lanza ninguno más. */
  detener: boolean;
}

interface Aprobando {
  item: ItemCola;
  grupo: GrupoEditable;
  tipo: TipoGrupo;
}

export interface ResultadoVisible {
  texto: string;
  tono: TonoResultado;
  fuera: Array<{ id: string; texto: string }>;
  /** Ya no se aprueba otra vez (la tarjeta quita los botones de aprobar y deja "Siguiente"). */
  final: boolean;
}

/** Lo que pinta la hoja "Ajustar" (el grupo de la propuesta a la vista). */
export interface HojaAjuste {
  item: ItemCola;
  grupo: GrupoEditable;
  opciones: OpcionMensajero[];
  /** "Pasar a…": los otros grupos de mensajero que todavía se pueden aprobar. */
  otros: Array<{ id: string; etiqueta: string }>;
  /** Pedidos sacados del plan, con a qué grupo pueden volver. */
  sacados: Array<{ pedido: PedidoEditable; destinos: Array<{ id: string; etiqueta: string }> }>;
  resultado: ResultadoGrupo | null;
  aplicando: boolean;
  ocupado: boolean;
  puedeAprobar: boolean;
  bloqueado: string | null;
  viejo: string | null;
  /** El grupo cambió mientras la hoja estaba abierta y se actualizó con lo último. */
  actualizada: string | null;
  confirmar: string;
  fuera: ReadonlyArray<FueraDelPlan>;
  automaticos: ReadonlyArray<EnvioAutomatico>;
}

/** Modelo de vista de la tarjeta y de la hoja. */
export interface VistaPropuestas {
  /** El servidor dijo que aplica (y la sesión puede ver propuestas). */
  disponible: boolean;
  /** La tarjeta está a la vista (con una propuesta o con "Todo al día"). */
  visible: boolean;
  alDia: boolean;
  item: ItemCola | null;
  eyebrow: string;
  titulo: string;
  razon: string;
  frase: string | null;
  chips: Array<{ texto: string; efecto: boolean }>;
  indice: number;
  total: number;
  tv: boolean;
  repitiendo: boolean;
  /** Despachos o producción que esta persona puede aprobar (permiso del rol y modo "on"): se ve el botón. */
  aprobable: boolean;
  /** Texto del botón en el primer toque ("Aprobar" o, en producción, el del servidor). */
  etiquetaAprobar: string;
  /** Texto del botón mientras se aprueba ("Despachando…", "Pasando a En producción…"). */
  textoAplicando: string;
  /** Producción encendida: "Avisa a tu equipo, no al cliente". */
  avisoEquipo: string | null;
  /** Despachos que se pueden ajustar en la hoja. */
  ajustable: boolean;
  /** Despachos o producción encendida que esta sesión NO puede aprobar por su rol (se le dice por qué). */
  sinPermiso: boolean;
  sinPermisoTexto: string;
  /** Cobro: existe "Abrir WhatsApp" (cobro encendido; nunca en TV, con "ocultar" ni en la repetición). */
  whatsapp: boolean;
  /** Se está pidiendo el enlace de este pedido. */
  whatsappAbriendo: boolean;
  /** Por qué no se pudo abrir WhatsApp de este pedido (el `message` del servidor). */
  whatsappAviso: string | null;
  /** Lo que le falta al grupo para aprobarlo ("Escoge el mensajero en Ajustar."); Aprobar queda deshabilitado. */
  falta: string | null;
  /** Aprobar está bloqueado un momento tras pasar a esta propuesta. */
  bloqueado: boolean;
  /** "Cambió el #1043, lo actualizo": se bloquea Aprobar hasta refrescar. */
  viejo: string | null;
  aplicando: boolean;
  /** Se están aprobando "los N grupos" juntos. */
  aplicandoTodos: boolean;
  /** Hay alguna aprobación en curso (de esta u otra propuesta). */
  ocupado: boolean;
  resultado: ResultadoVisible | null;
  confirmar: string;
  todos: { grupos: number; pedidos: number; confirmar: string } | null;
  /** Texto para lectores de pantalla (solo cambia cuando llega algo nuevo). */
  anuncio: string;
  hoja: HojaAjuste | null;
  /**
   * Con la tarjeta cerrada y sin botón del orbe a la vista (vista Pedidos o sin WebGL): el botón
   * propio de la tarjeta, "Opttia tiene N ideas", que la abre (D-468). null = no se muestra.
   */
  boton: { texto: string; aria: string } | null;
}

const VISTA_VACIA: VistaPropuestas = {
  disponible: false,
  visible: false,
  alDia: false,
  item: null,
  eyebrow: '',
  titulo: '',
  razon: '',
  frase: null,
  chips: [],
  indice: -1,
  total: 0,
  tv: false,
  repitiendo: false,
  aprobable: false,
  etiquetaAprobar: 'Aprobar',
  textoAplicando: 'Despachando…',
  avisoEquipo: null,
  ajustable: false,
  sinPermiso: false,
  sinPermisoTexto: '',
  whatsapp: false,
  whatsappAbriendo: false,
  whatsappAviso: null,
  falta: null,
  bloqueado: false,
  viejo: null,
  aplicando: false,
  aplicandoTodos: false,
  ocupado: false,
  resultado: null,
  confirmar: '',
  todos: null,
  anuncio: '',
  hoja: null,
  boton: null,
};

/**
 * Opttia propone en la escena (D-422, fase 1). Pide la cola a `GET /v1/opttia/propuestas`, le suma
 * las señales de cobro del radar del canal en vivo (sin backend), guarda qué propuesta está a la
 * vista y aprueba los despachos por la ruta de siempre (`POST /v1/logistica/plan/aprobar`, canal
 * `escena`). Es la ÚNICA pieza de En vivo que escribe, y solo cuando una persona toca Aprobar dos
 * veces: nunca en modo pantalla, nunca durante "Repetir el día" y nunca de forma automática.
 *
 * - La empresa la pone el servidor desde la sesión: aquí nunca se manda. Katuq mirando otro
 *   comercio (`?empresa=`), una sesión de solo lectura y el vendedor D-349 no piden nada.
 * - Pide al abrir, cuando cambian los pedidos listos o el radar (con 25 s de espera), cuando llega
 *   un evento de un pedido propuesto, cada 5 min de respaldo y una vez después de aprobar. Nunca
 *   durante "Repetir el día" ni con la pestaña oculta; en modo pantalla, a lo sumo cada 5 min.
 * - Publica en `EnVivoPropuestaEscenaPuente` la propuesta que la escena ensaya y el contador del
 *   orbe, y escucha los toques de la escena y el botón del orbe.
 * - Sin loader global: En vivo lo tiene suprimido mientras está abierta y aprobar va sin loader.
 * - Fase 2: aprueba producción encendida (`POST /produccion/aprobar`, mismos dos toques y la misma
 *   vejez por pedido) y, en el cobro encendido, pide el enlace de WhatsApp de UN pedido al tocar.
 *   Ese enlace (lleva el teléfono) no se guarda en ningún lado: se abre y se suelta.
 *
 * Uso: la página llama `iniciar()` al crearse y `detener()` al destruirse.
 */
@Injectable({ providedIn: 'root' })
export class EnVivoPropuestasService extends BaseService implements OnDestroy {
  private readonly vistaSub = new BehaviorSubject<VistaPropuestas>(VISTA_VACIA);

  readonly vista$: Observable<VistaPropuestas> = this.vistaSub.asObservable();
  readonly disponible$: Observable<boolean> = this.vistaSub.pipe(map((v) => v.disponible), distinctUntilChanged());
  /** La tarjeta está a la vista (la narración se calla y, en celular, la escena deja espacio abajo). */
  readonly tarjetaVisible$: Observable<boolean> = this.vistaSub.pipe(map((v) => v.disponible && v.visible && !v.repitiendo), distinctUntilChanged());
  /** Para la narración: "Organicé N pedidos en M salidas" (y "apruébalas aquí" solo si esta sesión puede). */
  readonly resumenPlan$: Observable<ResumenPlan>;

  private usos = 0;
  private subs: Subscription | null = null;
  private ajena = false;
  private bandera = false;
  private habilitado = false;

  // Lo que dijo el servidor.
  private respuestaDisponible = false;
  private servidorItems: ItemCola[] = [];
  private despachos: RespuestaPropuestas['despachos'] = null;
  private version: string | null = null;
  /** Fase 2: el cobro con "Abrir WhatsApp" está encendido para esta sesión (raíz de la respuesta, fuera de `version`). */
  private cobroWhatsapp = false;
  private ultimaPedidaMs: number | null = null;
  private enVuelo: Subscription | null = null;
  private pendiente = false;
  private firma: string | null = null;
  /** Por fuente: cuándo se leyó lo último que llegó y cuándo vence en la memoria del servidor (reloj local). */
  private lecturas = new Map<string, LecturaFuente>();
  /** Último cambio de pedidos listos / radar que todavía no se ha visto reflejado en lo leído (reloj local). */
  private cambioDesdeMs: number | null = null;

  // La cola y la tarjeta.
  private cola: ItemCola[] = [];
  private actual: ItemCola | null = null;
  private abierta = false;
  private alDia = false;
  private yaArrancoSola = false;
  private bloqueadoHasta = 0;
  private anuncio = '';
  private aplazados: Aplazados = aplazadosVacios('');
  private tv = false;
  private repitiendo = false;
  private ocultar = false;
  private hojaAbierta = false;
  /** La hoja siguió a su grupo, que cambió mientras estaba abierta: se le avisa a la persona. */
  private hojaActualizada = false;
  private confirmando = false;
  /** Hay botón del orbe a la vista (escena 3D con su orbe): sin él la tarjeta no se retira sola. */
  private conBotonOrbe = false;
  /** El saludo de la narración ya salió (o se descartó) en esta visita. */
  private saludoDado = false;

  // Despachos: lo que la persona ajusta antes de aprobar y lo que pasó al aprobar.
  private editables = new Map<string, GrupoEditable>();
  private opciones = new Map<string, OpcionMensajero[]>();
  private sacados: PedidoEditable[] = [];
  private planHuella: string | null = null;
  private aplicando = new Set<string>();
  private resultados = new Map<string, ResultadoGrupo>();
  /** Cuándo llegó cada resultado (reloj local): un "sin respuesta" se reintenta si lo leído después trae el grupo igual. */
  private resultadosMs = new Map<string, number>();
  /** Propuestas con un pedido que cambió en vivo: el número que se avisa y desde cuándo (reloj local). */
  private viejos = new Map<string, { nro: string; desdeMs: number }>();
  /** En la TV: propuestas que se aprobaron en otro lado (llegó su salida en vivo), hasta cuándo se avisa. */
  private aprobadosFuera = new Map<string, number>();
  private serie: Subscription | null = null;
  /** Producción: lo que pasó al aprobar cada propuesta (ya en palabras). */
  private resultadosProduccion = new Map<string, ResultadoProduccion>();
  /** Cobro: el pedido cuyo enlace de WhatsApp se está pidiendo (solo el id; el enlace nunca se guarda). */
  private whatsappPedido: string | null = null;
  private whatsappSub: Subscription | null = null;
  /** Cobro: por pedido, por qué no se pudo abrir WhatsApp; `reintentar` = fue la red, no el pedido. */
  private avisosWhatsapp = new Map<string, { texto: string; reintentar: boolean }>();
  private aplicandoTodos = false;
  private frases: Record<string, string> = {};
  private planExplicado: string | null = null;
  private ultimaExplicacionMs = 0;

  // Tiempos.
  private temporizadores = new Map<string, number>();
  private pararRespaldo: (() => void) | null = null;
  private pararTv: (() => void) | null = null;
  private quitarOyentes: (() => void) | null = null;

  constructor(
    http: HttpClient,
    private readonly zona: NgZone,
    private readonly estado: EnVivoEstadoService,
    private readonly interaccion: EnVivoInteraccionService,
    private readonly ficha: EnVivoFichaService,
    private readonly puente: EnVivoPropuestaEscenaPuente,
    private readonly plan: EnVivoPlanDespachosService,
    private readonly features: CompanyFeaturesService,
    private readonly contexto: KatuqCommerceContextService
  ) {
    super(http);
    this.resumenPlan$ = this.vistaSub.pipe(
      map(() => resumenDespachos(this.cola, this.puedeAprobarDespachos())),
      distinctUntilChanged((a, b) => a.pedidos === b.pedidos && a.salidas === b.salidas && a.aprobar === b.aprobar)
    );
  }

  ngOnDestroy(): void {
    this.usos = 1;
    this.detener();
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  /** Enciende el servicio (o suma un uso). La página lo llama al crearse. */
  iniciar(): void {
    this.usos++;
    if (this.subs) return;
    const subs = new Subscription();
    this.subs = subs;
    this.aplazados = this.leerGuardados();

    subs.add(
      combineLatest([this.estado.estado$, ...BANDERAS.map((b) => this.features.isEnabled$(b))]).subscribe(([, ...banderas]) => {
        this.bandera = banderas.some((b) => b === true);
        this.alEstado();
      })
    );
    subs.add(this.estado.nuevos$.subscribe((ev) => this.alEvento(ev)));
    subs.add(
      this.estado.preferencias$.pipe(map((p) => p.ocultar), distinctUntilChanged()).subscribe((ocultar) => {
        this.ocultar = ocultar;
        // Con "ocultar" el enlace de WhatsApp no se pide ni se abre (lleva el teléfono).
        if (ocultar) this.soltarWhatsapp();
        this.publicar();
      })
    );
    subs.add(
      this.interaccion.repeticion$.pipe(map((r) => r.activa), distinctUntilChanged()).subscribe((activa) => this.alRepetir(activa))
    );
    subs.add(this.interaccion.modoPantalla$.pipe(distinctUntilChanged()).subscribe((tv) => this.alModoPantalla(tv)));
    subs.add(this.puente.toques$.subscribe((grupoId) => this.zona.run(() => this.alTocarGrupo(grupoId))));
    subs.add(this.puente.abrir$.subscribe(() => this.zona.run(() => this.abrir())));

    this.zona.runOutsideAngular(() => {
      const id = window.setInterval(() => this.zona.run(() => this.pedir('respaldo')), RESPALDO_MS);
      this.pararRespaldo = () => window.clearInterval(id);
    });
    this.quitarOyentes = this.escucharInteraccion();
  }

  /** Quita un uso; al quedar en cero suelta todo y limpia la escena y el contador. */
  detener(): void {
    this.usos = Math.max(0, this.usos - 1);
    if (this.usos > 0) return;
    // Primero se apaga: lo que corra al soltar la serie (su `finalize`) ya no pide ni programa nada.
    this.habilitado = false;
    this.subs?.unsubscribe();
    this.subs = null;
    this.enVuelo?.unsubscribe();
    this.enVuelo = null;
    this.serie?.unsubscribe();
    this.serie = null;
    this.aplicando.clear();
    this.soltarWhatsapp();
    this.pararRespaldo?.();
    this.pararRespaldo = null;
    this.pararTv?.();
    this.pararTv = null;
    this.quitarOyentes?.();
    this.quitarOyentes = null;
    this.temporizadores.forEach((id) => window.clearTimeout(id));
    this.temporizadores.clear();
    this.vaciar();
    this.resultados.clear();
    this.resultadosMs.clear();
    this.resultadosProduccion.clear();
    this.ajena = false;
    this.repitiendo = false;
    this.tv = false;
    this.yaArrancoSola = false;
    this.ultimaPedidaMs = null;
    this.firma = null;
    this.conBotonOrbe = false;
    // La visita terminó (se salió de En vivo): la próxima vuelve a saludar.
    this.saludoDado = false;
    this.vistaSub.next(VISTA_VACIA);
    this.puente.mostrar(null);
    this.puente.contar({ ideas: 0, urgentes: 0 });
  }

  /** La página avisa si se mira un comercio ajeno (`?empresa=`): entonces no se piden propuestas. */
  fijarAjena(ajena: boolean): void {
    if (this.ajena === ajena) return;
    this.ajena = ajena;
    this.alEstado();
  }

  /**
   * La página avisa si hay botón del orbe a la vista (una escena 3D con su orbe). Sin él (vista
   * Pedidos o sin WebGL) la tarjeta pone su propio botón "Opttia tiene N ideas" (`vista.boton`).
   */
  fijarBotonOrbe(hay: boolean): void {
    if (this.conBotonOrbe === hay) return;
    this.conBotonOrbe = hay;
    this.publicar();
  }

  /**
   * El saludo de la narración ("Buenos días: 3 para hoy") sale UNA vez por visita a En vivo: no otra
   * vez al volver de Pedidos. true = le toca a quien pregunta (y ya no le toca a nadie más).
   */
  reclamarSaludo(): boolean {
    if (this.saludoDado) return false;
    this.saludoDado = true;
    return true;
  }

  // ── Lo que llega de la pantalla ───────────────────────────────────────────

  private alEstado(): void {
    const e = this.estado.estado;
    // Con el canal detenido el estado es de la visita anterior: se espera a que el shell lo abra
    // (así, además, el loader global ya está suprimido cuando se pide).
    const habilitado =
      this.usos > 0 &&
      this.bandera &&
      !this.ajena &&
      e.cargado &&
      e.conexion !== 'detenido' &&
      e.conexion !== 'sin-acceso' &&
      e.disponible !== false &&
      e.vista === 'comercio' &&
      !e.soloLectura &&
      !e.soloPropias &&
      e.opttiaActivo !== false;
    if (habilitado !== this.habilitado) {
      this.habilitado = habilitado;
      if (!habilitado) {
        this.enVuelo?.unsubscribe();
        this.enVuelo = null;
        this.vaciar();
        this.publicar();
        return;
      }
      this.firma = firmaParaPedir(e.pedidos, e.radar?.atencion);
      this.cambioDesdeMs = null;
      this.pedir('abrir');
      return;
    }
    if (!habilitado || this.repitiendo) return;
    // Las señales de cobro salen del radar: se rearman sin pedir nada.
    this.recomponer();
    const firma = firmaParaPedir(e.pedidos, e.radar?.atencion);
    if (firma !== this.firma) {
      this.firma = firma;
      // Lo que llegue después tiene que haberse leído DESPUÉS de este cambio (ver `revisarLoVisto`).
      this.cambioDesdeMs = Date.now();
      this.programarCambio();
    }
    this.publicar();
  }

  /**
   * Un evento en vivo de un pedido propuesto: SOLO esa propuesta queda vieja ("Cambió el #1043, lo
   * actualizo", Aprobar bloqueado) y se pide otra vez. La marca se quita cuando llega algo leído
   * DESPUÉS del evento (no basta con cualquier respuesta: puede salir de la memoria del servidor).
   */
  private alEvento(ev: EventoEnVivo): void {
    if (!this.habilitado || this.repitiendo || this.interaccion.repitiendo || !ev) return;
    const afectados = this.itemsDelEvento(ev.pedidoId).filter((it) => !this.aplicando.has(it.id) && !this.resuelto(it.id));
    if (!afectados.length) return;
    // En la TV (que no aprueba): lo aprobaron desde el celular. Se avisa 6 s y la escena anima la salida real.
    if (this.tv && eventoDeDespacho(ev)) {
      const hasta = Date.now() + AVISO_TV_MS;
      afectados.forEach((it) => {
        if (!this.aprobadosFuera.has(it.id)) this.aprobadosFuera.set(it.id, hasta);
      });
      this.programar('aprobadoFuera', AVISO_TV_MS + 50, () => {
        this.recomponer();
        this.publicar();
      });
      this.publicar();
      return;
    }
    const ahora = Date.now();
    afectados.forEach((it) => {
      // La sombra no tiene Aprobar que bloquear: solo se vuelve a pedir.
      if (it.modo !== 'on') return;
      const nro = ev.numero || it.pedidos.find((p) => p.id === ev.pedidoId)?.nroPedido || this.editables.get(it.id)?.pedidos.find((p) => p.id === ev.pedidoId)?.nroPedido || '';
      this.viejos.set(it.id, { nro, desdeMs: ahora });
    });
    this.programarCambio();
    this.publicar();
  }

  /** Las propuestas del servidor con ese pedido: en su grupo original o en el ajustado (lo pasaron ahí). */
  private itemsDelEvento(pedidoId: string | null | undefined): ItemCola[] {
    if (!pedidoId) return [];
    const directos = itemsDelPedido(this.servidorItems, pedidoId);
    const ajustados = this.servidorItems.filter((it) => !directos.includes(it) && !!this.editables.get(it.id)?.pedidos.some((p) => p.id === pedidoId));
    return [...directos, ...ajustados];
  }

  private alRepetir(activa: boolean): void {
    const antes = this.repitiendo;
    this.repitiendo = activa;
    if (activa) {
      this.confirmando = false;
      this.soltarWhatsapp();
      this.cerrarHoja();
      this.cancelar('cambio');
      this.publicar();
      return;
    }
    if (!antes) return;
    // Al volver de la repetición se refresca una vez (lo simulado no cuenta). Lo que cambió de verdad
    // mientras tanto no se marcó: lo que llegue tiene que haberse leído desde ahora.
    this.firma = firmaParaPedir(this.estado.estado.pedidos, this.estado.estado.radar?.atencion);
    this.cambioDesdeMs = Date.now();
    this.recomponer();
    this.publicar();
    this.pedir('repeticion');
  }

  private alModoPantalla(tv: boolean): void {
    this.tv = tv;
    this.pararTv?.();
    this.pararTv = null;
    if (tv) {
      this.confirmando = false;
      this.soltarWhatsapp();
      this.cerrarHoja();
      // En la TV la tarjeta se queda a la vista y recorre la cola (sin botones).
      if (this.cola.length) this.abierta = true;
      this.zona.runOutsideAngular(() => {
        const id = window.setInterval(() => this.zona.run(() => this.rotarTv()), TV_POR_PROPUESTA_MS);
        this.pararTv = () => window.clearInterval(id);
      });
    } else if (this.abierta) {
      this.programarRetiro();
    }
    this.publicar();
  }

  private rotarTv(): void {
    if (!this.tv || this.repitiendo || !this.cola.length) return;
    this.abierta = true;
    if (this.cola.length > 1) this.ir(1, false);
    else this.publicar();
  }

  private alTocarGrupo(grupoId: string): void {
    const it = this.cola.find((x) => x.servidor?.grupo?.id === grupoId || x.id === grupoId);
    this.actividad();
    if (!it || this.aplicando.size || this.repitiendo) return;
    this.abierta = true;
    this.alDia = false;
    this.cambiarActual(it);
    this.publicar();
  }

  // ── Pedir al servidor ─────────────────────────────────────────────────────

  private pedir(motivo: 'abrir' | 'cambio' | 'respaldo' | 'aprobado' | 'repeticion' | 'pendiente'): void {
    if (!this.habilitado) return;
    // Con una aprobación en curso, una cola nueva movería lo que la persona está aprobando. Con la
    // hoja "Ajustar" abierta SÍ se pide: su grupo conserva lo ajustado y la hoja dice si se actualizó.
    if (this.enVuelo || this.aplicando.size) {
      this.pendiente = true;
      return;
    }
    const permitido = puedePedir({
      ahoraMs: Date.now(),
      ultimaMs: motivo === 'abrir' || motivo === 'repeticion' ? null : this.ultimaPedidaMs,
      tv: this.tv,
      repitiendo: this.repitiendo || this.interaccion.repitiendo,
      oculta: typeof document !== 'undefined' && document.hidden,
      trasAprobar: motivo === 'aprobado',
    });
    if (!permitido) {
      // El respaldo lo vuelve a intentar; un cambio se reprograma para cuando se pueda.
      if ((motivo === 'cambio' || motivo === 'pendiente') && !this.tv && !this.repitiendo) this.programarCambio();
      return;
    }
    this.cancelar('cambio');
    this.pendiente = false;
    const enviado = Date.now();
    this.ultimaPedidaMs = enviado;
    this.enVuelo = this.get<RespuestaPropuestas>(RUTA)
      .pipe(finalize(() => {
        this.enVuelo = null;
        if (this.pendiente) this.programar('pendiente', 1000, () => this.pedir('pendiente'));
      }))
      .subscribe({
        next: (r) => this.aplicarRespuesta(r, enviado),
        error: () => {
          // Sin respuesta la tarjeta sigue como estaba; el respaldo lo vuelve a intentar.
        },
      });
  }

  /**
   * Tras un cambio se pide a los 25 s del PRIMER cambio (no del último): con una tienda movida los
   * cambios no paran y la cola igual se pone al día.
   */
  private programarCambio(): void {
    if (this.temporizadores.has('cambio')) return;
    this.programar('cambio', ESPERA_CAMBIO_MS, () => this.pedir('cambio'));
  }

  private aplicarRespuesta(r: RespuestaPropuestas | null, enviadoMs: number): void {
    if (!this.habilitado) return;
    if (!r || r.disponible !== true) {
      this.vaciar();
      this.cobroWhatsapp = r?.cobroWhatsapp === true;
      this.publicar();
      return;
    }
    const mismaVersion = this.respuestaDisponible && typeof r.version === 'string' && r.version === this.version;
    this.respuestaDisponible = true;
    this.version = typeof r.version === 'string' ? r.version : null;
    // No entra en `version`: aunque la cola sea la misma, el botón del cobro puede cambiar (se repinta abajo).
    this.cobroWhatsapp = r.cobroWhatsapp === true;
    // Cuándo se leyó lo que llegó (puede salir de la memoria del servidor, leída antes de pedir).
    this.lecturas = lecturasDe(r, enviadoMs, Date.now());
    if (!mismaVersion) {
      this.servidorItems = (Array.isArray(r.propuestas) ? r.propuestas : [])
        .map((p) => desdeServidor(p))
        .filter((x): x is ItemCola => x !== null);
      this.despachos = r.despachos && typeof r.despachos === 'object' ? r.despachos : null;
      this.armarEditables();
      // Lo que ya no está en el servidor ni a la vista no necesita su resultado.
      const vivos = new Set(this.servidorItems.map((x) => x.id));
      if (this.actual) vivos.add(this.actual.id);
      Array.from(this.resultados.keys()).forEach((id) => {
        if (!vivos.has(id)) this.quitarResultado(id);
      });
      Array.from(this.resultadosProduccion.keys()).forEach((id) => {
        if (!vivos.has(id) && !this.aplicando.has(id)) this.resultadosProduccion.delete(id);
      });
      Array.from(this.aprobadosFuera.keys()).forEach((id) => {
        if (!vivos.has(id)) this.aprobadosFuera.delete(id);
      });
      this.pedirExplicacion();
    }
    this.soltarResultadosEnDuda();
    this.revisarLoVisto();
    this.recomponer();
    this.publicar();
  }

  /**
   * Las marcas de "cambió" se quitan SOLO si la propuesta ya no viene (cambió su huella) o si lo
   * leído es posterior al evento: una respuesta de la memoria del servidor (60 s) leída antes del
   * cambio no las suelta. Lo mismo con un cambio de pedidos listos o del radar. Si queda algo sin
   * reflejar, se vuelve a pedir cuando vence esa memoria (no a los 5 min del respaldo).
   */
  private revisarLoVisto(): void {
    const vencen: number[] = [];
    Array.from(this.viejos.entries()).forEach(([id, v]) => {
      const it = this.servidorItems.find((x) => x.id === id);
      const lectura = it ? this.lecturas.get(it.tipo) : undefined;
      if (!it || incluyeCambio(lectura, v.desdeMs)) {
        this.viejos.delete(id);
        return;
      }
      if (lectura) vencen.push(lectura.venceMs);
    });
    const lecturaDespachos = this.lecturas.get('despachos');
    if (this.cambioDesdeMs !== null) {
      if (!this.despachos || incluyeCambio(lecturaDespachos, this.cambioDesdeMs)) this.cambioDesdeMs = null;
      else if (lecturaDespachos) vencen.push(lecturaDespachos.venceMs);
    }
    // Un grupo "sin respuesta" que el plan sigue trayendo: se vuelve a mirar en cuanto haya algo leído
    // después de ese resultado (y entonces `soltarResultadosEnDuda` lo deja reintentar).
    this.resultados.forEach((r, id) => {
      if (r.estado !== 'en-curso' || !lecturaDespachos || !this.servidorItems.some((x) => x.id === id)) return;
      if (!incluyeCambio(lecturaDespachos, this.resultadosMs.get(id) ?? Number.POSITIVE_INFINITY)) vencen.push(lecturaDespachos.venceMs);
    });
    if (!vencen.length) return;
    const ahora = Date.now();
    const minimo = this.ultimaPedidaMs === null ? 0 : this.ultimaPedidaMs + MINIMO_ENTRE_PEDIDOS_MS - ahora;
    this.programar('cambio', Math.max(Math.min(...vencen) - ahora + MARGEN_VENCE_MS, minimo, 0), () => this.pedir('cambio'));
  }

  /**
   * Un "sin respuesta" (en curso) o "no despachado" de un grupo que el plan SIGUE trayendo igual, en
   * algo leído después de ese resultado: el servidor no lo despachó. Vuelve a la cola para
   * reintentarlo (la idempotencia del servidor evita que salga dos veces). En la tarjeta a la vista
   * se queda como texto, pero ya deja aprobar otra vez.
   */
  private soltarResultadosEnDuda(): void {
    const lectura = this.lecturas.get('despachos');
    Array.from(this.resultados.entries()).forEach(([id, r]) => {
      if (r.estado !== 'en-curso' && r.estado !== 'no-despachado') return;
      if (this.aplicando.has(id) || !this.servidorItems.some((x) => x.id === id)) return;
      if (!incluyeCambio(lectura, this.resultadosMs.get(id) ?? Number.POSITIVE_INFINITY)) return;
      if (this.actual?.id === id) {
        if (r.estado === 'en-curso') this.resultados.set(id, { ...r, estado: 'no-despachado', razon: NO_SALIO_TODAVIA });
        return;
      }
      this.quitarResultado(id);
    });
  }

  private quitarResultado(id: string): void {
    this.resultados.delete(id);
    this.resultadosMs.delete(id);
  }

  private ponerResultado(id: string, r: ResultadoGrupo): void {
    this.resultados.set(id, r);
    this.resultadosMs.set(id, Date.now());
  }

  /**
   * Los grupos que se pueden ajustar. Lo que la persona ajustó se conserva mientras su grupo siga
   * igual (aunque cambien otros grupos del plan), y la hoja abierta sigue a su grupo si este cambió
   * (`conservarAjustes`).
   */
  private armarEditables(): void {
    const d = this.despachos;
    this.planHuella = d?.planHuella ?? null;
    const frescos = new Map<string, GrupoEditable>();
    const opciones = new Map<string, OpcionMensajero[]>();
    const conGrupo: ItemCola[] = [];
    for (const it of this.servidorItems) {
      const g = it.servidor?.grupo;
      if (it.tipo !== 'despachos' || !g) continue;
      conGrupo.push(it);
      frescos.set(it.id, editableDe(g, this.frases[g.id] ?? null));
      if (g.tipo !== 'transportadora') opciones.set(it.id, opcionesDe(g, d?.mensajerosDisponibles ?? []));
    }
    const hoja = this.hojaAbierta && this.actual && this.actual.tipo === 'despachos' ? this.actual : null;
    const sucesor = hoja && !frescos.has(hoja.id) ? sucesorDe(hoja, conGrupo) : null;
    const r = conservarAjustes({
      frescos,
      previos: this.editables,
      sacados: this.sacados,
      opciones,
      seguir: hoja && sucesor ? { de: hoja.id, a: sucesor.id } : null,
    });
    if (r.seguido) this.hojaActualizada = true;
    const editables = r.editables;
    // Lo que se está aprobando o ya tiene resultado deja de venir en el plan nuevo, pero sigue a la
    // vista con su resultado ("salieron 2 con Carlos"): conserva su grupo y sus opciones.
    const conResultado = new Set<string>([...this.aplicando, ...this.resultados.keys()]);
    conResultado.forEach((id) => {
      const previo = this.editables.get(id);
      if (editables.has(id) || !previo) return;
      editables.set(id, previo);
      const o = this.opciones.get(id);
      if (o) opciones.set(id, o);
    });
    this.editables = editables;
    this.opciones = opciones;
    this.sacados = r.sacados;
  }

  /** La frase de Opttia sobre el plan (`/explicar`): una vez por plan y a lo sumo cada 10 min. */
  private pedirExplicacion(): void {
    const huella = this.planHuella;
    const ahora = Date.now();
    if (!huella || huella === this.planExplicado || ahora - this.ultimaExplicacionMs < EXPLICAR_CADA_MS) return;
    if (!this.servidorItems.some((it) => it.tipo === 'despachos' && it.modo === 'on')) return;
    const antes = { plan: this.planExplicado, ms: this.ultimaExplicacionMs };
    this.planExplicado = huella;
    this.ultimaExplicacionMs = ahora;
    this.plan.explicar(huella).subscribe({
      next: (r) => {
        if (this.planHuella !== huella || !r || !r.explicacion || !r.explicacion.grupos) return;
        this.frases = { ...r.explicacion.grupos };
        // La tarjeta del grupo (en "Ajustar") también la muestra.
        this.editables.forEach((g, id) => this.editables.set(id, { ...g, frase: this.frases[g.id] ?? g.frase }));
        this.publicar();
      },
      error: () => {
        // Sin Opttia la propuesta sigue igual: solo no hay frase. Un error (p. ej. el plan cambió,
        // 409) no gasta el cupo de 10 min: se vuelve a intentar con la siguiente huella.
        if (this.planExplicado === huella && this.ultimaExplicacionMs === ahora) {
          this.planExplicado = antes.plan;
          this.ultimaExplicacionMs = antes.ms;
        }
      },
    });
  }

  // ── La cola ───────────────────────────────────────────────────────────────

  private recomponer(): void {
    const ahora = Date.now();
    const e = this.estado.estado;
    this.aplazados = this.aplazados.dia === this.dia() ? this.aplazados : this.leerGuardados();
    const senales = this.respuestaDisponible ? senalesDeCobro(e.radar?.atencion, e.pedidos) : [];
    const resueltos = this.resueltos(ahora);
    this.cola = armarCola(this.servidorItems, senales, this.aplazados, ahora, resueltos);
    this.reubicarActual();
    const vence = proximoVencimiento(this.aplazados, ahora);
    if (vence !== null) this.programar('aplazado', vence - ahora + 500, () => {
      this.recomponer();
      this.publicar();
    });
    if (!this.yaArrancoSola) this.intentarArrancar();
  }

  /** Lo ya aprobado (aquí, o en otro lado mientras la TV miraba y ya se avisó) no vuelve a la cola. */
  private resueltos(ahora: number): Set<string> {
    const out = new Set<string>();
    this.resultados.forEach((r, id) => {
      if (yaAprobado(r)) out.add(id);
    });
    this.resultadosProduccion.forEach((r, id) => {
      if (r.final) out.add(id);
    });
    this.aprobadosFuera.forEach((hasta, id) => {
      if (ahora >= hasta) out.add(id);
    });
    return out;
  }

  /**
   * Lo urgente que llega después entra en la cola, pero no le quita la tarjeta a la persona: si la
   * propuesta a la vista se actualizó (su grupo cambió de huella), se sigue con la que la sucede
   * (`sucesorDe`: la que comparte más pedidos), sin cerrar la hoja "Ajustar".
   */
  private reubicarActual(): void {
    const a = this.actual;
    // Con la tarjeta retirada nadie la está mirando: al volver se abre la más urgente.
    if (!this.abierta && !this.aplicando.size) {
      this.cambiarActual(this.cola[0] ?? null);
      return;
    }
    if (a) {
      const mismo = this.cola.find((x) => x.id === a.id);
      if (mismo) {
        this.actual = mismo;
        return;
      }
      if (this.aplicando.has(a.id) || this.tieneResultado(a.id)) return;
      const sucesor = sucesorDe(a, this.cola);
      if (sucesor) {
        this.seguirCon(sucesor);
        return;
      }
    }
    this.cambiarActual(this.cola[0] ?? null);
    if (!this.actual && this.abierta && a) this.mostrarAlDia();
  }

  /** La misma propuesta, actualizada: se sigue con ella sin cerrar la hoja; Aprobar se bloquea un momento. */
  private seguirCon(it: ItemCola): void {
    this.actual = it;
    this.confirmando = false;
    if (this.hojaAbierta) this.hojaActualizada = true;
    this.alDia = false;
    this.anuncio = `Se actualizó: ${tituloVisible(it, this.ocultar)}`;
    this.bloqueadoHasta = Date.now() + BLOQUEO_AL_PASAR_MS;
    this.programar('desbloqueo', BLOQUEO_AL_PASAR_MS + 50, () => this.publicar());
  }

  private cambiarActual(it: ItemCola | null): void {
    if ((it?.id ?? null) === (this.actual?.id ?? null)) {
      this.actual = it;
      return;
    }
    this.actual = it;
    this.confirmando = false;
    this.cerrarHoja();
    if (!it) return;
    this.alDia = false;
    this.anuncio = `Opttia propone: ${tituloVisible(it, this.ocultar)}`;
    // Tras pasar a otra propuesta, Aprobar queda bloqueado un momento (evita toques accidentales).
    this.bloqueadoHasta = Date.now() + BLOQUEO_AL_PASAR_MS;
    this.programar('desbloqueo', BLOQUEO_AL_PASAR_MS + 50, () => this.publicar());
    this.programarRetiro();
  }

  /**
   * Solo en la TV la tarjeta arranca sola (ahí nadie toca nada). En el computador nada se abre solo
   * (D-468): la tarjeta espera el botón "Opttia tiene N ideas" del orbe o el suyo propio.
   */
  private intentarArrancar(): void {
    if (!this.tv || this.yaArrancoSola || this.abierta || !this.cola.length || !this.respuestaDisponible || this.repitiendo) return;
    this.yaArrancoSola = true;
    this.abierta = true;
  }

  /**
   * Sin tocar nada `RETIRAR_SIN_USO_MS`, la tarjeta se retira; queda el botón "Opttia tiene N ideas"
   * (el del orbe o, sin orbe, el de la tarjeta), que la vuelve a abrir. Nunca en la TV.
   */
  private programarRetiro(): void {
    if (this.tv) {
      this.cancelar('retiro');
      return;
    }
    this.programar('retiro', RETIRAR_SIN_USO_MS, () => {
      if (this.tv || !this.abierta) return;
      if (this.aplicando.size || this.hojaAbierta || this.confirmando) {
        this.programarRetiro();
        return;
      }
      this.abierta = false;
      this.alDia = false;
      this.publicar();
    });
  }

  private mostrarAlDia(): void {
    this.alDia = true;
    this.abierta = true;
    this.programar('alDia', AL_DIA_MS, () => {
      if (!this.alDia) return;
      this.alDia = false;
      if (!this.actual) this.abierta = false;
      this.publicar();
    });
  }

  private vaciar(): void {
    this.respuestaDisponible = false;
    this.servidorItems = [];
    this.despachos = null;
    this.version = null;
    this.cola = [];
    this.actual = null;
    this.abierta = false;
    this.alDia = false;
    this.cerrarHoja();
    this.confirmando = false;
    this.editables = new Map();
    this.opciones = new Map();
    this.sacados = [];
    this.planHuella = null;
    this.viejos.clear();
    this.lecturas.clear();
    this.cambioDesdeMs = null;
    this.aprobadosFuera.clear();
    this.frases = {};
    this.cobroWhatsapp = false;
    this.soltarWhatsapp();
    this.avisosWhatsapp.clear();
    if (!this.aplicando.size) {
      this.resultados.clear();
      this.resultadosMs.clear();
      this.resultadosProduccion.clear();
    }
  }

  /** Cierra la hoja "Ajustar" (sin pedir nada: con la hoja abierta también se pide). */
  private cerrarHoja(): void {
    this.hojaAbierta = false;
    this.hojaActualizada = false;
  }

  // ── Lo que hace la persona en la tarjeta ──────────────────────────────────

  /** Cualquier toque o tecla en la tarjeta: aplaza el retiro por falta de uso. */
  actividad(): void {
    if (this.abierta) this.programarRetiro();
  }

  /** La tarjeta avisa que está esperando la confirmación (no se retira ni rota mientras tanto). */
  fijarConfirmando(si: boolean): void {
    this.confirmando = si;
  }

  /** Botón del orbe ("Opttia tiene N ideas") o un toque en la escena: vuelve a ensayar. */
  abrir(): void {
    if (!this.respuestaDisponible || this.repitiendo) return;
    this.actividad();
    if (!this.cola.length) {
      this.mostrarAlDia();
    } else {
      this.abierta = true;
      this.alDia = false;
      if (!this.actual) this.cambiarActual(this.cola[0]);
      this.programarRetiro();
    }
    this.publicar();
  }

  /** ← → recorren la cola (dando la vuelta). */
  siguiente(): void {
    this.actividad();
    this.ir(1, true);
  }

  anterior(): void {
    this.actividad();
    this.ir(-1, true);
  }

  private ir(paso: 1 | -1, persona: boolean): void {
    if (!this.cola.length || (persona && this.aplicando.size)) return;
    const i = this.actual ? this.cola.findIndex((x) => x.id === this.actual?.id) : -1;
    const n = this.cola.length;
    const siguiente = i < 0 ? this.cola[0] : this.cola[(i + paso + n) % n];
    this.cambiarActual(siguiente);
    this.publicar();
  }

  /** "Después" (y Esc): la propuesta vuelve en 30 min para esta persona. */
  despues(): void {
    const a = this.actual;
    if (!a || this.aplicando.has(a.id)) return;
    this.actividad();
    const siguiente = this.siguienteDe(a);
    this.aplazados = aplazar(this.aplazados, a.id, Date.now());
    this.guardar();
    this.continuarCon(siguiente);
  }

  /** "No hoy": no vuelve hasta que cambie su huella (o mañana). */
  noHoy(): void {
    const a = this.actual;
    if (!a || this.aplicando.has(a.id)) return;
    this.actividad();
    const siguiente = this.siguienteDe(a);
    this.aplazados = descartarHoy(this.aplazados, a.id);
    this.guardar();
    this.continuarCon(siguiente);
  }

  /** Cobro: abre la ficha del pedido (acción que ya existe; no escribe nada). */
  abrirPedido(id?: string | null): void {
    const pedidoId = id ?? this.actual?.pedidoId ?? null;
    if (!pedidoId) return;
    this.actividad();
    this.interaccion.emitir({ tipo: 'abrir-pedido', pedidoId });
  }

  /**
   * Cobro encendido: pide el enlace de WhatsApp de ESE pedido (con la sesión de la persona) y lo abre
   * en otra pestaña. El enlace lleva el teléfono y el recordatorio: no se guarda en el estado, el
   * almacenamiento ni los registros, y un error no lo incluye. Katuq no envía nada: la persona decide.
   * Nunca en modo pantalla, con "ocultar" ni durante "Repetir el día" (ahí el botón no existe).
   */
  abrirWhatsapp(): void {
    const it = this.actual;
    this.actividad();
    const pedidoId = it?.pedidoId ?? null;
    if (!it || !pedidoId || this.whatsappPedido || !muestraWhatsapp(it, this.condicionWhatsapp())) return;
    const aviso = this.avisosWhatsapp.get(pedidoId);
    if (aviso && !aviso.reintentar) return;
    this.avisosWhatsapp.delete(pedidoId);
    this.whatsappPedido = pedidoId;
    this.anuncio = 'Armando el mensaje de WhatsApp…';
    this.publicar();
    let sub: Subscription | null = null;
    sub = this.get<RespuestaWhatsapp>(`${RUTA}/pedido/${encodeURIComponent(pedidoId)}/whatsapp`)
      .pipe(
        timeout(ESPERA_WHATSAPP_MS),
        finalize(() => {
          // Si se soltó (TV, "ocultar", repetición, salir), quien lo soltó ya limpió y repinta.
          if (this.whatsappSub !== sub) return;
          this.whatsappPedido = null;
          this.whatsappSub = null;
          this.publicar();
        })
      )
      .subscribe({
        next: (r) => {
          if (!r || r.success !== true || !esEnlaceWhatsapp(r.url)) {
            const texto = r && typeof r.message === 'string' && r.message && r.message.length < 200 ? r.message : NO_WHATSAPP;
            this.avisosWhatsapp.set(pedidoId, { texto, reintentar: false });
            this.anuncio = texto;
            return;
          }
          // Entretanto pudo pasar a TV, a "ocultar" o a la repetición: entonces no se abre.
          if (!this.habilitado || !muestraWhatsapp(it, this.condicionWhatsapp())) return;
          window.open(r.url, '_blank', 'noopener');
          this.anuncio = 'Abrí WhatsApp con el recordatorio listo: tú decides si lo envías.';
          this.puente.avisar({ tipo: 'whatsapp-abierto', pedidoId });
        },
        error: (e) => {
          const texto = sinRespuesta(e) ? SIN_RESPUESTA_WHATSAPP : mensajeDe(e, NO_WHATSAPP);
          this.avisosWhatsapp.set(pedidoId, { texto, reintentar: true });
          this.anuncio = texto;
        },
      });
    // Una respuesta inmediata ya pasó por `finalize` y limpió: solo se guarda si sigue en curso.
    if (this.whatsappPedido === pedidoId && !sub.closed) this.whatsappSub = sub;
  }

  /**
   * "Ya pagó / no aplica": la señal de cobro de ese pedido no vuelve hoy para esta persona en este
   * navegador (se guarda con lo aplazado; si el almacenamiento falla, vale solo en esta visita).
   */
  yaPago(): void {
    const a = this.actual;
    if (!a || a.tipo !== 'cobro' || !a.pedidoId) return;
    this.actividad();
    if (this.whatsappPedido === a.pedidoId) this.soltarWhatsapp();
    const siguiente = this.siguienteDe(a);
    this.aplazados = descartarCobroHoy(this.aplazados, a.pedidoId);
    this.guardar();
    this.continuarCon(siguiente);
  }

  private condicionWhatsapp(): { cobroWhatsapp: boolean; tv: boolean; ocultar: boolean; repitiendo: boolean } {
    return {
      cobroWhatsapp: this.cobroWhatsapp,
      tv: this.tv || this.interaccion.modoPantalla,
      ocultar: this.ocultar,
      repitiendo: this.repitiendo || this.interaccion.repitiendo,
    };
  }

  /** Suelta el pedido del enlace en curso (si llega, ya no se abre). */
  private soltarWhatsapp(): void {
    this.whatsappSub?.unsubscribe();
    this.whatsappSub = null;
    this.whatsappPedido = null;
  }

  /** Tras "Después" o "No hoy" sigue la más urgente de la cola (una urgente que llegó entra de siguiente). */
  private siguienteDe(a: ItemCola): ItemCola | null {
    return siguienteTrasDescartar(this.cola, a.id);
  }

  private continuarCon(siguiente: ItemCola | null): void {
    this.actual = null;
    this.recomponerSinMover();
    const destino = siguiente && this.cola.find((x) => x.id === siguiente.id) ? siguiente : this.cola[0] ?? null;
    this.cambiarActual(destino);
    if (!destino) this.mostrarAlDia();
    this.publicar();
  }

  /** Rearma la cola sin elegir propuesta (quien llama decide cuál sigue). */
  private recomponerSinMover(): void {
    const ahora = Date.now();
    const e = this.estado.estado;
    const senales = this.respuestaDisponible ? senalesDeCobro(e.radar?.atencion, e.pedidos) : [];
    const resueltos = this.resueltos(ahora);
    this.cola = armarCola(this.servidorItems, senales, this.aplazados, ahora, resueltos);
  }

  // ── Hoja "Ajustar" ────────────────────────────────────────────────────────

  abrirAjuste(): void {
    const a = this.actual;
    if (!a || !this.permisoDe(a) || this.tv || this.repitiendo) return;
    this.actividad();
    this.hojaAbierta = true;
    this.hojaActualizada = false;
    // La ficha y la hoja comparten el costado: se cierra la ficha para no taparla.
    if (this.ficha.abierta) this.ficha.cerrar();
    this.publicar();
  }

  cerrarAjuste(): void {
    if (!this.hojaAbierta) return;
    this.cerrarHoja();
    this.actividad();
    this.publicar();
    if (this.pendiente) this.pedir('pendiente');
  }

  cambiarMensajero(id: string, mensajeroId: string): void {
    const g = this.editables.get(id);
    if (!g || !this.ajustable(id) || g.tipo === 'transportadora') return;
    this.editables.set(id, { ...g, mensajeroId });
    this.actividad();
    this.publicar();
  }

  /** El título sigue a la elegida: "Por <nombre>". */
  cambiarTransportadora(id: string, proveedor: string): void {
    const g = this.editables.get(id);
    const elegida = g?.transportadoras.find((t) => t.proveedor === proveedor);
    if (!g || !elegida || !this.ajustable(id)) return;
    this.editables.set(id, { ...g, proveedor, zona: `Por ${elegida.nombre}` });
    this.actividad();
    this.publicar();
  }

  sacar(id: string, p: PedidoEditable): void {
    const g = this.editables.get(id);
    if (!g || !this.ajustable(id)) return;
    this.editables.set(id, { ...g, pedidos: g.pedidos.filter((y) => y.id !== p.id) });
    this.sacados = [...this.sacados, p];
    this.actividad();
    this.publicar();
  }

  /** Un pedido pasa a otro grupo del mismo tipo (o vuelve desde "sacados" con `origenId` null). */
  mover(origenId: string | null, p: PedidoEditable, destinoId: string): void {
    const destino = this.editables.get(destinoId);
    const origen = origenId ? this.editables.get(origenId) : null;
    if (!destino || destino.tipo !== p.origen || !this.libreComoDestino(destinoId)) return;
    if (origenId && (!origen || !this.ajustable(origenId))) return;
    if (destino.tipo === 'transportadora' && destino.pedidos.length >= MAX_PEDIDOS_TRANSPORTADORA) return;
    if (origen && origenId) this.editables.set(origenId, { ...origen, pedidos: origen.pedidos.filter((y) => y.id !== p.id) });
    this.editables.set(destinoId, { ...destino, pedidos: [...destino.pedidos, p] });
    if (!origenId) this.sacados = this.sacados.filter((y) => y.id !== p.id);
    this.actividad();
    this.publicar();
  }

  private ajustable(id: string): boolean {
    const r = this.resultados.get(id);
    return !this.aplicando.has(id) && (!r || r.estado === 'no-despachado') && !this.tv && !this.repitiendo;
  }

  private libreComoDestino(id: string): boolean {
    return !this.aplicando.has(id) && !this.resultados.has(id) && this.cola.some((x) => x.id === id);
  }

  private destinos(tipo: TipoGrupo, excluir: string | null): Array<{ id: string; etiqueta: string }> {
    const out: Array<{ id: string; etiqueta: string }> = [];
    for (const it of this.cola) {
      const g = this.editables.get(it.id);
      if (!g || it.id === excluir || g.tipo !== tipo || !this.libreComoDestino(it.id)) continue;
      if (tipo === 'transportadora' && g.pedidos.length >= MAX_PEDIDOS_TRANSPORTADORA) continue;
      out.push({ id: it.id, etiqueta: g.franja ? `${g.zona} (${g.franja})` : g.zona });
    }
    return out;
  }

  // ── Aprobar ───────────────────────────────────────────────────────────────

  /** Segundo toque de Aprobar (el primero solo pide confirmar, en la tarjeta). */
  aprobar(id?: string): void {
    const objetivo = id ?? this.actual?.id;
    if (!objetivo) return;
    const it = this.cola.find((x) => x.id === objetivo) ?? (this.actual?.id === objetivo ? this.actual : null);
    if (it?.tipo === 'produccion') this.aprobarProduccion(it);
    else this.aprobarVarios([objetivo], false);
  }

  /** "Aprobar los N grupos": solo cuando todos los que quedan son de mensajero. */
  aprobarTodos(): void {
    const pendientes = this.pendientesDespachos();
    if (!aprobarTodosDisponible(pendientes.map((it) => this.editables.get(it.id) as GrupoEditable))) return;
    this.aprobarVarios(pendientes.map((it) => it.id), true);
  }

  /** El rol de la sesión puede aprobar despachos (lo dice el servidor en la raíz `despachos`). */
  private puedeAprobarDespachos(): boolean {
    return !!this.despachos && this.despachos.puedeAprobar === true;
  }

  /**
   * PERMISO para aprobar (y ajustar) esta propuesta: el rol puede, la propuesta es de despachos en
   * modo "on" y trae su grupo. Que el grupo esté listo (mensajero, pedidos) se mira aparte.
   */
  private permisoDe(it: ItemCola): boolean {
    return this.puedeAprobarDespachos() && it.tipo === 'despachos' && it.modo === 'on' && it.puedeAprobar && this.editables.has(it.id);
  }

  /** Despachos que todavía se pueden aprobar desde la tarjeta. */
  private pendientesDespachos(): ItemCola[] {
    return this.cola.filter((it) => this.aprobableItem(it));
  }

  private aprobableItem(it: ItemCola): boolean {
    const g = this.editables.get(it.id);
    return (
      this.permisoDe(it) &&
      !!g &&
      conQuien(g) &&
      g.pedidos.length > 0 &&
      !this.viejos.has(it.id) &&
      !this.aplicando.has(it.id) &&
      !yaAprobado(this.resultados.get(it.id))
    );
  }

  /**
   * Los grupos de mensajero van juntos en una petición; cada grupo de transportadora va en la suya,
   * uno tras otro y nunca en paralelo (el proxy corta a los 60 s). Un grupo de transportadora sin
   * respuesta detiene la serie.
   */
  private aprobarVarios(ids: string[], todos: boolean): void {
    const huella = this.planHuella;
    if (!huella || !this.puedeAprobarDespachos() || this.tv || this.repitiendo || this.interaccion.repitiendo) return;
    if (this.aplicando.size || Date.now() < this.bloqueadoHasta) return;
    const items = ids
      .map((id) => this.cola.find((x) => x.id === id) ?? (this.actual?.id === id ? this.actual : null))
      .filter((x): x is ItemCola => !!x && this.aprobableItem(x));
    if (!items.length || items.length !== ids.length) return;
    const aprobando: Aprobando[] = items.map((item) => {
      const grupo = this.editables.get(item.id) as GrupoEditable;
      return { item, grupo, tipo: grupo.tipo };
    });
    const lotes = lotesDe(aprobando);
    aprobando.forEach((a) => this.aplicando.add(a.item.id));
    this.aplicandoTodos = todos;
    this.confirmando = false;
    this.anuncio = aprobando.length === 1 ? 'Despachando…' : `Despachando ${aprobando.length} grupos…`;
    this.publicar();
    let ok = 0;
    let detenida = false;
    let ultimoError: string | null = null;
    this.serie = from(lotes)
      .pipe(
        concatMap((lote) =>
          this.plan.aprobar(lote.map((a) => paraAprobar(a.grupo, huella)), 'escena').pipe(
            map((r) => this.alAprobar(lote, r)),
            catchError((e) => of(this.alFallar(lote, e))),
            finalize(() => {
              lote.forEach((a) => this.aplicando.delete(a.item.id));
              this.publicar();
            })
          )
        ),
        takeWhile((paso) => !paso.detener, true),
        finalize(() => {
          aprobando.forEach((a) => this.aplicando.delete(a.item.id));
          this.serie = null;
          this.aplicandoTodos = false;
          this.alTerminarSerie(aprobando, ok, detenida, ultimoError);
        })
      )
      .subscribe({
        next: (paso) => {
          ok += paso.ok;
          if (paso.error) ultimoError = paso.error;
          if (paso.detener) detenida = true;
        },
      });
  }

  private alAprobar(lote: Aprobando[], r: RespuestaAprobacion): PasoAprobacion {
    const resultados = Array.isArray(r?.resultados) ? r.resultados : [];
    for (const res of resultados) {
      const a = lote[res.indice];
      if (a) this.ponerResultado(a.item.id, res);
    }
    // Lo que el servidor no contestó queda como "no despachado" (se puede reintentar tras refrescar).
    lote.forEach((a, i) => {
      if (!this.resultados.has(a.item.id)) this.ponerResultado(a.item.id, { indice: i, estado: 'no-despachado', razon: 'Katuq no devolvió el resultado de este grupo.' });
    });
    return { ok: resultados.filter((x) => x.estado === 'despachado' || x.estado === 'reanudado').length, error: null, detener: false };
  }

  /** Sin respuesta en un grupo de transportadora: "en curso" y la serie se detiene. Lo demás, como siempre. */
  private alFallar(lote: Aprobando[], e: unknown): PasoAprobacion {
    const enDuda = lote.every((a) => a.tipo === 'transportadora') && sinRespuesta(e);
    const razon = enDuda ? SIN_RESPUESTA : mensajeDe(e, 'No se pudo aprobar. Inténtalo de nuevo.');
    lote.forEach((a, i) => this.ponerResultado(a.item.id, { indice: i, estado: enDuda ? 'en-curso' : 'no-despachado', razon }));
    return { ok: 0, error: razon, detener: enDuda };
  }

  private alTerminarSerie(aprobando: Aprobando[], ok: number, detenida: boolean, ultimoError: string | null): void {
    // Se soltó porque la página se fue: no se pide ni se programa nada más.
    if (!this.subs || !this.habilitado) return;
    const a = this.actual;
    const res = a ? this.resultados.get(a.id) : undefined;
    if (detenida) this.anuncio = 'Se detuvo la aprobación: un grupo de transportadora no respondió a tiempo.';
    else if (ok === aprobando.length) this.anuncio = ok === 1 && a && res ? this.textoDe(a, res).texto : `${ok} grupos despachados.`;
    else this.anuncio = aprobando.length === 1 && ultimoError ? ultimoError : 'Revisa el resultado de cada grupo.';
    // La escena celebra lo que el servidor sí hizo (los eventos reales animan la salida).
    if (ok > 0 && !this.repitiendo && !this.interaccion.repitiendo) {
      this.interaccion.emitir({ tipo: 'celebrar', texto: ok === 1 ? 'Despacho aprobado' : `${ok} despachos aprobados` });
    }
    this.recomponer();
    this.publicar();
    this.pedir('aprobado');
    // Pasa sola a la siguiente cuando salió bien (a los 2 s); con un error, la persona lo lee.
    if (a && res) {
      const espera = esperaParaPasar(res);
      if (espera !== null) this.programar('pasar', espera, () => this.pasarTrasResultado(a.id));
    }
  }

  // ── Aprobar producción (fase 2) ───────────────────────────────────────────

  /** Producción encendida que todavía se puede aprobar: permiso, pedidos con huella, sin cambios en vivo ni resultado final. */
  private aprobableProduccion(it: ItemCola): boolean {
    return (
      produccionAprobable(it) &&
      !this.viejos.has(it.id) &&
      !this.aplicando.has(it.id) &&
      this.resultadosProduccion.get(it.id)?.final !== true
    );
  }

  /**
   * Segundo toque de "Pasar a En producción": manda la propuesta y sus pedidos con huella, nada más
   * (la empresa y quien aprueba los pone el servidor desde la sesión). El servidor revisa cada pedido
   * otra vez, no avisa al cliente y responde por pedido; aquí solo se dice en palabras.
   */
  private aprobarProduccion(it: ItemCola): void {
    if (this.tv || this.repitiendo || this.interaccion.repitiendo) return;
    if (this.aplicando.size || Date.now() < this.bloqueadoHasta || !this.aprobableProduccion(it)) return;
    const items = itemsDeProduccion(it);
    const nros = new Map(it.pedidos.map((p) => [p.id, p.nroPedido]));
    this.aplicando.add(it.id);
    // Un reintento tras un error empieza limpio.
    this.resultadosProduccion.delete(it.id);
    this.confirmando = false;
    this.anuncio = textoAplicando(it);
    this.publicar();
    this.serie = this.postSinLoader<RespuestaProduccion>(`${RUTA}/produccion/aprobar`, { propuestaId: it.id, items })
      .pipe(
        timeout(ESPERA_PRODUCCION_MS),
        map((r) => resultadoProduccion(r, nros)),
        catchError((e) => of(resultadoProduccionDeError(e))),
        finalize(() => {
          this.aplicando.delete(it.id);
          this.serie = null;
        })
      )
      .subscribe((res) => {
        this.aplicando.delete(it.id);
        this.resultadosProduccion.set(it.id, res);
        this.alTerminarProduccion(it, res);
      });
  }

  private alTerminarProduccion(it: ItemCola, res: ResultadoProduccion): void {
    // Se soltó porque la página se fue: no se pide ni se programa nada más.
    if (!this.subs || !this.habilitado) return;
    this.anuncio = res.texto;
    // La escena celebra lo que el servidor sí hizo; los eventos reales mueven las cajas.
    const n = res.pasaron.length;
    if (n > 0 && !this.repitiendo && !this.interaccion.repitiendo) {
      this.interaccion.emitir({ tipo: 'celebrar', texto: n === 1 ? '1 pedido a producción' : `${n} pedidos a producción` });
    }
    this.recomponer();
    this.publicar();
    // El servidor ya soltó su memoria de la cola: lo que llegue trae lo de verdad.
    this.pedir('aprobado');
    const espera = esperaTrasProduccion(res);
    if (espera !== null && this.actual?.id === it.id) this.programar('pasar', espera, () => this.pasarTrasResultado(it.id));
  }

  private pasarTrasResultado(id: string): void {
    if (this.actual?.id !== id) return;
    this.actual = null;
    this.recomponerSinMover();
    const siguiente = this.cola[0] ?? null;
    this.cambiarActual(siguiente);
    if (!siguiente) this.mostrarAlDia();
    this.publicar();
  }

  // ── Publicar ──────────────────────────────────────────────────────────────

  private publicar(): void {
    const disponible = this.habilitado && this.respuestaDisponible;
    const base = disponible ? this.actual : null;
    const ahora = Date.now();
    const indice = base ? this.cola.findIndex((x) => x.id === base.id) : -1;
    const visible = disponible && this.abierta && (!!base || this.alDia);
    const g = base ? this.editables.get(base.id) ?? null : null;
    const opciones = base ? this.opciones.get(base.id) ?? [] : [];
    // Lo que se ve es lo que se va a aprobar: la propuesta con lo que la persona ajustó.
    const it = base ? ajustada(base, g, opciones) : null;
    const res = it ? this.resultados.get(it.id) ?? null : null;
    const resProduccion = it ? this.resultadosProduccion.get(it.id) ?? null : null;
    const aplicando = !!it && this.aplicando.has(it.id);
    const aprobadoFuera = !!it && this.aprobadosFuera.has(it.id);
    const permisoDespachos = !!base && this.permisoDe(base);
    const permiso = permisoDespachos || produccionAprobable(base);
    const aprobable = permiso && !this.tv;
    const whatsapp = muestraWhatsapp(it, this.condicionWhatsapp());
    const avisoWa = it?.pedidoId ? this.avisosWhatsapp.get(it.pedidoId) ?? null : null;
    const pendientes = disponible && this.puedeAprobarDespachos() && !this.tv ? this.pendientesDespachos() : [];
    const todos = aprobarTodosDisponible(pendientes.map((x) => this.editables.get(x.id) as GrupoEditable));
    const viejo = it && this.viejos.has(it.id) ? this.viejos.get(it.id)?.nro ?? '' : null;
    const confirmar = it ? textoConfirmar(it, g, g ? nombreDe(g, opciones) : null, this.ocultar) : '';
    const frase = it && g && this.frases[g.id] ? this.frases[g.id] : null;
    const colores = coloresPorMensajero(this.cola.map((x) => (x.id === it?.id ? it : ajustada(x, this.editables.get(x.id), this.opciones.get(x.id) ?? []))));

    const vista: VistaPropuestas = {
      disponible,
      visible,
      alDia: this.alDia && !it,
      item: it,
      eyebrow: it ? eyebrow(it, indice, this.cola.length) : 'Opttia propone',
      titulo: it ? tituloVisible(it, this.ocultar) : '',
      razon: it ? razonVisible(it, this.ocultar) : '',
      frase: frase ? (this.ocultar ? sinMontos(frase) : frase) : null,
      chips: it ? chipsDe(it, this.ocultar) : [],
      indice,
      total: this.cola.length,
      tv: this.tv,
      repitiendo: this.repitiendo,
      aprobable,
      etiquetaAprobar: etiquetaAprobar(it),
      textoAplicando: textoAplicando(it),
      avisoEquipo: avisoEquipo(it),
      ajustable: permisoDespachos && !this.tv && !!it && this.ajustable(it.id) && !yaAprobado(res),
      // El aviso del rol solo cuando de verdad es el rol (no cuando al grupo le falta el mensajero).
      sinPermiso: !!it && it.tipo !== 'cobro' && it.modo === 'on' && !permiso,
      sinPermisoTexto:
        it?.tipo === 'produccion'
          ? 'Puedes ver la propuesta. Pasarla a En producción es para quien tiene Pedidos o Despachos en su rol.'
          : 'Puedes ver la propuesta. Aprobar es para quien tiene Despachos en su rol.',
      // Un pedido que no tiene cómo (sin saldo, sin celular...) deja "Abrir pedido" como principal.
      whatsapp: whatsapp && !(avisoWa && !avisoWa.reintentar),
      whatsappAbriendo: whatsapp && !!it?.pedidoId && this.whatsappPedido === it.pedidoId,
      whatsappAviso: whatsapp && avisoWa ? avisoWa.texto : null,
      falta: aprobable && !yaAprobado(res) ? faltaParaAprobar(g) : null,
      bloqueado: ahora < this.bloqueadoHasta,
      viejo: viejo !== null ? (viejo ? `Cambió el #${viejo}, lo actualizo.` : 'Cambió un pedido de esta propuesta, la actualizo.') : null,
      aplicando,
      aplicandoTodos: this.aplicandoTodos,
      ocupado: this.aplicando.size > 0,
      resultado:
        it && res
          ? this.textoDe(it, res)
          : resProduccion
            ? { texto: resProduccion.texto, tono: resProduccion.tono, fuera: resProduccion.fuera, final: resProduccion.final }
            : aprobadoFuera
              ? { texto: 'Aprobado desde el celular.', tono: 't-ok', fuera: [], final: true }
              : null,
      confirmar,
      todos: todos && pendientes.length >= 2 ? { ...todos, confirmar: textoConfirmarTodos(todos.grupos, todos.pedidos) } : null,
      anuncio: this.anuncio,
      hoja: this.hojaAbierta && it && g ? this.armarHoja(it, g, opciones, res, viejo, confirmar, permisoDespachos) : null,
      boton: this.botonPropio(disponible, visible),
    };
    this.vistaSub.next(vista);

    // La escena ensaya solo la propuesta a la vista (con lo ajustado); al confirmar, los fantasmas se
    // van (los eventos reales animan).
    const ensayar = visible && !!it && !this.repitiendo && !aplicando && !aprobadoFuera && !this.resuelto(it.id);
    this.puente.mostrar(ensayar && it ? paraEscena(it, colores) : null);
    this.puente.contar(disponible && !this.repitiendo ? contar(this.cola) : { ideas: 0, urgentes: 0 });
  }

  private armarHoja(
    it: ItemCola,
    g: GrupoEditable,
    opciones: OpcionMensajero[],
    res: ResultadoGrupo | null,
    viejo: string | null,
    confirmar: string,
    permiso: boolean
  ): HojaAjuste {
    return {
      item: it,
      grupo: g,
      opciones,
      otros: g.tipo === 'transportadora' ? [] : this.destinos('mensajero', it.id),
      sacados: this.sacados.map((pedido) => ({ pedido, destinos: this.destinos(pedido.origen, null) })),
      resultado: res,
      aplicando: this.aplicando.has(it.id),
      ocupado: this.aplicando.size > 0,
      // El permiso del rol: el grupo "escoge mensajero" se puede ajustar y, ya con mensajero, aprobar.
      puedeAprobar: permiso,
      bloqueado: this.tv
        ? 'En modo pantalla no se aprueba.'
        : this.repitiendo
          ? 'Estás repitiendo el día. Vuelve a "en vivo" para aprobar.'
          : viejo !== null
            ? 'Cambió un pedido de este grupo: ya lo estoy actualizando; espera un momento para aprobar.'
            : null,
      viejo,
      actualizada: this.hojaActualizada ? 'El grupo cambió y ya se actualizó con lo último: revísalo antes de aprobar.' : null,
      confirmar,
      fuera: this.despachos?.fueraDelPlan ?? [],
      automaticos: this.despachos?.envioAutomatico ?? [],
    };
  }

  private textoDe(it: ItemCola, r: ResultadoGrupo): ResultadoVisible {
    const g = this.editables.get(it.id);
    const opciones = this.opciones.get(it.id) ?? [];
    const nro = new Map(it.pedidos.map((p) => [p.id, p.nroPedido]));
    return {
      texto: textoResultado(r, { tipo: g?.tipo ?? 'mensajero', nombre: g ? nombreDe(g, opciones) : null, pedidos: g?.pedidos.length ?? it.pedidos.length }),
      tono: tonoResultado(r),
      fuera: (r.fuera || []).map((f) => ({ id: f.id, texto: `Dejé fuera el #${f.nroPedido || nro.get(f.id) || f.id}: ${f.razon}` })),
      final: yaAprobado(r),
    };
  }

  /** Ya se aprobó (despachos o producción) y no vuelve a la cola ni se ensaya. */
  private resuelto(id: string): boolean {
    return yaAprobado(this.resultados.get(id)) || this.resultadosProduccion.get(id)?.final === true;
  }

  private tieneResultado(id: string): boolean {
    return this.resultados.has(id) || this.resultadosProduccion.has(id);
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  /** Temporizador con nombre (uno a la vez por nombre), fuera de la zona; lo que hace corre dentro. */
  private programar(nombre: string, ms: number, tarea: () => void): void {
    this.cancelar(nombre);
    this.zona.runOutsideAngular(() => {
      const id = window.setTimeout(() => {
        this.temporizadores.delete(nombre);
        this.zona.run(tarea);
      }, Math.max(0, ms));
      this.temporizadores.set(nombre, id);
    });
  }

  private cancelar(nombre: string): void {
    const id = this.temporizadores.get(nombre);
    if (id !== undefined) window.clearTimeout(id);
    this.temporizadores.delete(nombre);
  }

  /** Nada se abre solo (D-468): sin orbe a la vista, la tarjeta cerrada deja su botón con el contador. */
  private botonPropio(disponible: boolean, visible: boolean): VistaPropuestas['boton'] {
    if (!disponible || visible || this.conBotonOrbe || this.tv || this.repitiendo) return null;
    const c = contar(this.cola);
    if (!c.ideas) return null;
    const texto = textoIdeas(c);
    return { texto, aria: `${texto.replace(' · ', ', ')}. Ver la propuesta` };
  }

  /** Al volver a la pestaña, si hace rato no se pide, se pide de respaldo. */
  private escucharInteraccion(): () => void {
    if (typeof document === 'undefined') return () => undefined;
    const visible = (): void => {
      if (!document.hidden && this.habilitado && (this.ultimaPedidaMs === null || Date.now() - this.ultimaPedidaMs >= RESPALDO_MS)) {
        this.zona.run(() => this.pedir('respaldo'));
      }
    };
    this.zona.runOutsideAngular(() => {
      document.addEventListener('visibilitychange', visible);
    });
    return () => {
      document.removeEventListener('visibilitychange', visible);
    };
  }

  private dia(): string {
    return diaDeColombia(Date.now());
  }

  private leerGuardados(): Aplazados {
    const dia = this.dia();
    try {
      const crudo = localStorage.getItem(this.claveGuardado());
      return leerAplazados(crudo ? JSON.parse(crudo) : null, dia, Date.now());
    } catch {
      return aplazadosVacios(dia);
    }
  }

  private guardar(): void {
    try {
      localStorage.setItem(this.claveGuardado(), JSON.stringify(this.aplazados));
    } catch {
      // Sin almacenamiento (ventana privada o cuota): "Después" y "No hoy" valen solo en esta visita.
    }
  }

  /** Por sesión (empresa + usuario): dos personas en el mismo navegador no comparten lo aplazado. */
  private claveGuardado(): string {
    const sesion = this.contexto.resolve();
    const alcance = sesion ? [sesion.companyId, sesion.email || sesion.userNit || 'user'].map(encodeURIComponent).join('.') : 'sin-sesion';
    return `${PREFIJO_APLAZADOS}.${alcance}`;
  }
}
