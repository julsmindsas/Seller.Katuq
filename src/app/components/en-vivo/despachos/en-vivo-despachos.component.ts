import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, from, of, Subscription } from 'rxjs';
import { catchError, concatMap, finalize, map, takeWhile } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { EventoEnVivo } from '../servicios/en-vivo.modelos';
import { EnVivoPlanDespachosService } from './en-vivo-plan-despachos.service';
import { GrupoEditable, OpcionMensajero, PedidoEditable } from './grupo-despacho/grupo-despacho.component';
import { AlertaPlan, ExplicacionPlan, GrupoParaAprobar, GrupoPlan, PlanDespachos, RespuestaAprobacion, RespuestaPlan, ResultadoGrupo, TipoGrupo } from './plan-despachos.modelos';

type Fase = 'cargando' | 'error' | 'listo';

/** Lo mismo que el servidor: un grupo de transportadora lleva a lo sumo 5 pedidos (cada uno es una llamada a la integración). */
const MAX_PEDIDOS_TRANSPORTADORA = 5;

/** Un grupo de transportadora que se quedó sin respuesta pudo haber enviado: no se dice que no salió. */
const SIN_RESPUESTA = 'Katuq no respondió a tiempo y no sé si alcanzó a enviar. Actualiza el plan antes de volver a aprobar.';
const COLA_DETENIDA = 'Se detuvo la aprobación: un grupo de transportadora no respondió a tiempo. Actualiza el plan antes de aprobar los que faltan.';

/** Lo que deja cada petición de la serie de "Aprobar todo". */
interface PasoAprobacion {
  ok: number;
  error: string | null;
  /** Un grupo de transportadora quedó sin respuesta: no se lanza ninguno más. */
  detener: boolean;
}

/**
 * Vista "Despachos" de En vivo (D-410): el plan de despachos que arma el servidor, explicado por
 * Opttia, para que una persona lo ajuste y lo apruebe. Aprobar hace lo mismo que "Guardar y
 * despachar" en la pantalla de Despachos; nada sale sin que alguien toque Aprobar.
 *
 * - No aprueba en modo pantalla (TV) ni mientras se repite el día.
 * - Un evento en vivo de un pedido del plan lo marca como viejo y ofrece actualizar; no se aprueba
 *   nada solo.
 * - El servidor revisa otra vez cada pedido al aprobar (huella), así que un plan viejo nunca
 *   despacha algo que cambió.
 */
@Component({
  selector: 'app-en-vivo-despachos',
  templateUrl: './en-vivo-despachos.component.html',
  styleUrls: ['./en-vivo-despachos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoDespachosComponent implements OnInit, OnDestroy {
  fase: Fase = 'cargando';
  mensajeError = '';
  plan: PlanDespachos | null = null;
  puedeAprobar = false;
  explicacion: ExplicacionPlan | null = null;
  explicando = false;
  grupos: GrupoEditable[] = [];
  sinGrupo: PedidoEditable[] = [];
  viejoDesde: number | null = null;
  bloqueado: string | null = null;
  anuncio = '';
  aplicando = new Set<string>();
  resultados = new Map<string, ResultadoGrupo>();

  private opcionesPorGrupo = new Map<string, OpcionMensajero[]>();
  private idsDelPlan = new Set<string>();
  private readonly subs = new Subscription();
  /** La serie de aprobaciones en curso: al salir de la vista se corta para no lanzar las que faltan. */
  private serie: Subscription | null = null;

  constructor(
    private readonly api: EnVivoPlanDespachosService,
    private readonly estadoEnVivo: EnVivoEstadoService,
    private readonly interaccion: EnVivoInteraccionService,
    private readonly cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.subs.add(this.estadoEnVivo.nuevos$.subscribe((ev) => this.alEvento(ev)));
    this.subs.add(
      combineLatest([this.interaccion.modoPantalla$, this.interaccion.repeticion$]).subscribe(([tv, rep]) => {
        this.bloqueado = tv
          ? 'En modo pantalla no se aprueba. Sal del modo pantalla para aprobar.'
          : rep.activa
            ? 'Estás repitiendo el día. Vuelve a "en vivo" para aprobar.'
            : null;
        this.cd.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.serie?.unsubscribe();
  }

  // ── Carga ──────────────────────────────────────────────────────────────────

  cargar(): void {
    // Con aprobaciones en cola, un plan nuevo mostraría como pendientes grupos que todavía se están enviando.
    if (this.aplicando.size) return;
    this.fase = 'cargando';
    this.cd.markForCheck();
    this.api.obtener().subscribe({
      next: (r) => this.aplicarPlan(r),
      error: (e) => {
        this.fase = 'error';
        this.mensajeError = mensajeDe(e, 'No se pudo armar el plan. Inténtalo de nuevo.');
        this.cd.markForCheck();
      },
    });
  }

  private aplicarPlan(r: RespuestaPlan): void {
    const plan = r.plan;
    this.plan = plan;
    this.puedeAprobar = r.puedeAprobar === true;
    this.explicacion = r.explicacion;
    this.resultados = new Map();
    this.sinGrupo = [];
    this.viejoDesde = null;
    this.opcionesPorGrupo = new Map(plan.grupos.filter((g) => g.tipo !== 'transportadora').map((g) => [g.id, opcionesDe(g, plan)]));
    this.grupos = plan.grupos.map((g) => editable(g, this.explicacion));
    this.idsDelPlan = new Set([
      ...plan.grupos.flatMap((g) => g.pedidos.map((p) => p.id)),
      ...plan.fueraDelPlan.map((f) => f.id),
      ...plan.envioAutomatico.map((a) => a.id),
    ]);
    this.fase = 'listo';
    this.anuncio = this.titulo;
    this.cd.markForCheck();
    const opttiaActivo = this.estadoEnVivo.estado.opttiaActivo !== false;
    if (!this.explicacion && opttiaActivo && (plan.grupos.length || plan.fueraDelPlan.length)) this.pedirExplicacion(plan.huella);
  }

  private pedirExplicacion(huella: string): void {
    this.explicando = true;
    this.cd.markForCheck();
    this.api
      .explicar(huella)
      .pipe(finalize(() => {
        this.explicando = false;
        this.cd.markForCheck();
      }))
      .subscribe({
        next: (r) => {
          if (!this.plan || this.plan.huella !== huella || !r.explicacion) return;
          this.explicacion = r.explicacion;
          this.grupos = this.grupos.map((g) => ({ ...g, frase: r.explicacion?.grupos[g.id] ?? g.frase }));
        },
        error: () => {
          // Sin Opttia el plan sigue igual: solo no hay texto.
        },
      });
  }

  private alEvento(ev: EventoEnVivo): void {
    if (this.fase !== 'listo' || !ev || !this.idsDelPlan.has(ev.pedidoId)) return;
    if (this.viejoDesde === null) {
      this.viejoDesde = Date.now();
      this.anuncio = 'Cambió un pedido del plan. Actualiza el plan antes de aprobar.';
      this.cd.markForCheck();
    }
  }

  // ── Ajustes ────────────────────────────────────────────────────────────────

  opciones(g: GrupoEditable): OpcionMensajero[] {
    return this.opcionesPorGrupo.get(g.id) ?? [];
  }

  /** "Pasar a…" desde un grupo: solo entre grupos de mensajero; un grupo de transportadora no pasa ni recibe. */
  otrosGrupos(g: GrupoEditable): Array<{ id: string; etiqueta: string }> {
    return g.tipo === 'transportadora' ? [] : this.destinos('mensajero', g);
  }

  /** Un pedido sacado vuelve solo a un grupo del mismo tipo del que salió. */
  destinosDe(p: PedidoEditable): Array<{ id: string; etiqueta: string }> {
    return this.destinos(p.origen, null);
  }

  private destinos(tipo: TipoGrupo, excluir: GrupoEditable | null): Array<{ id: string; etiqueta: string }> {
    return this.grupos
      .map((x, i) => ({ x, i }))
      .filter(({ x }) => x !== excluir && x.tipo === tipo && this.libreComoDestino(x))
      .filter(({ x }) => tipo !== 'transportadora' || x.pedidos.length < MAX_PEDIDOS_TRANSPORTADORA)
      .map(({ x, i }) => ({ id: x.id, etiqueta: `${i + 1}. ${x.zona}` }));
  }

  /** Destino válido: ni aprobándose, ni en la cola de "Aprobar todo", ni con resultado. */
  private libreComoDestino(g: GrupoEditable): boolean {
    return !this.aplicando.has(g.id) && !this.resultados.has(g.id);
  }

  /** Ajustar el propio grupo: como la tarjeta, se puede mientras no esté en curso ni aprobado ("no despachado" sí). */
  private ajustable(g: GrupoEditable): boolean {
    const r = this.resultados.get(g.id);
    return !this.aplicando.has(g.id) && (!r || r.estado === 'no-despachado');
  }

  cambiarMensajero(g: GrupoEditable, id: string): void {
    if (!this.ajustable(g)) return;
    this.grupos =this.grupos.map((x) => (x === g ? { ...x, mensajeroId: id } : x));
  }

  /** El título sigue a la elegida: "Por <nombre>". La nota y la tarifa salen de la elegida en la tarjeta. */
  cambiarTransportadora(g: GrupoEditable, proveedor: string): void {
    const elegida = g.transportadoras.find((t) => t.proveedor === proveedor);
    if (!elegida || !this.ajustable(g)) return;
    this.grupos = this.grupos.map((x) => (x === g ? { ...x, proveedor, zona: `Por ${elegida.nombre}` } : x));
  }

  sacar(g: GrupoEditable, p: PedidoEditable): void {
    if (!this.ajustable(g)) return;
    this.grupos = this.grupos.map((x) => (x === g ? { ...x, pedidos: x.pedidos.filter((y) => y.id !== p.id) } : x));
    this.sinGrupo = [...this.sinGrupo, p];
  }

  mover(origen: GrupoEditable | null, p: PedidoEditable, destinoId: string): void {
    const destino = this.grupos.find((x) => x.id === destinoId);
    if (!destino || destino.tipo !== p.origen || !this.libreComoDestino(destino) || (origen && !this.ajustable(origen))) return;
    if (destino.tipo === 'transportadora' && destino.pedidos.length >= MAX_PEDIDOS_TRANSPORTADORA) return;
    this.grupos = this.grupos.map((x) => {
      if (x === origen) return { ...x, pedidos: x.pedidos.filter((y) => y.id !== p.id) };
      if (x === destino) return { ...x, pedidos: [...x.pedidos, p] };
      return x;
    });
    if (!origen) this.sinGrupo = this.sinGrupo.filter((y) => y.id !== p.id);
  }

  // ── Aprobar ────────────────────────────────────────────────────────────────

  get aprobables(): GrupoEditable[] {
    return this.grupos.filter((g) => conQuien(g) && g.pedidos.length && !this.resultados.has(g.id) && !this.aplicando.has(g.id));
  }

  aprobarGrupo(g: GrupoEditable): void {
    this.aprobarVarios([g]);
  }

  aprobarTodo(): void {
    this.aprobarVarios(this.aprobables);
  }

  /**
   * Los grupos de mensajero van juntos en una petición; cada grupo de transportadora va en la suya,
   * uno tras otro y nunca en paralelo: cada pedido es una llamada a la integración y el proxy corta
   * a los 60 s.
   */
  private aprobarVarios(gs: GrupoEditable[]): void {
    if (!this.plan || !gs.length || this.bloqueado || !this.puedeAprobar || this.aplicando.size) return;
    const huella = this.plan.huella;
    const mensajeros = gs.filter((g) => g.tipo !== 'transportadora');
    const lotes = [...(mensajeros.length ? [mensajeros] : []), ...gs.filter((g) => g.tipo === 'transportadora').map((g) => [g])];
    gs.forEach((g) => this.aplicando.add(g.id));
    this.anuncio = gs.length === 1 ? 'Aprobando el grupo…' : `Aprobando ${gs.length} grupos…`;
    this.cd.markForCheck();
    let ok = 0;
    let hechos = 0;
    let ultimoError: string | null = null;
    let detenida = false;
    this.serie = from(lotes)
      .pipe(
        concatMap((lote) =>
          this.api.aprobar(lote.map((g) => paraAprobar(g, huella))).pipe(
            map((r) => this.alAprobar(lote, r)),
            catchError((e) => of(this.alFallar(lote, e))),
            finalize(() => {
              lote.forEach((g) => this.aplicando.delete(g.id));
              hechos += lote.length;
              if (hechos < gs.length && !detenida) this.anuncio = `Aprobando… van ${hechos} de ${gs.length} grupos.`;
              this.cd.markForCheck();
            })
          )
        ),
        // Un grupo de transportadora sin respuesta detiene la serie: los que faltan no se lanzan.
        takeWhile((paso) => !paso.detener, true),
        finalize(() => {
          gs.forEach((g) => this.aplicando.delete(g.id));
          this.serie = null;
          this.cd.markForCheck();
        })
      )
      .subscribe({
        next: (paso) => {
          ok += paso.ok;
          if (paso.error) ultimoError = paso.error;
          if (paso.detener) detenida = true;
        },
        complete: () => {
          const faltan = gs.filter((g) => !this.resultados.has(g.id)).length;
          this.anuncio =
            detenida && faltan
              ? COLA_DETENIDA
              : ok === gs.length
                ? ok === 1 ? 'Grupo despachado.' : `${ok} grupos despachados.`
                : gs.length === 1 && ultimoError ? ultimoError : 'Revisa el resultado de cada grupo.';
          this.cd.markForCheck();
        },
      });
  }

  private alAprobar(lote: GrupoEditable[], r: RespuestaAprobacion): PasoAprobacion {
    const resultados = new Map(this.resultados);
    for (const res of r.resultados) {
      const g = lote[res.indice];
      if (g) resultados.set(g.id, res);
    }
    this.resultados = resultados;
    this.viejoDesde = this.viejoDesde ?? Date.now();
    return { ok: r.resultados.filter((x) => x.estado === 'despachado' || x.estado === 'reanudado').length, error: null, detener: false };
  }

  /** Sin respuesta en un grupo de transportadora: "en curso", el plan queda viejo y la serie se detiene. Lo demás, como siempre. */
  private alFallar(lote: GrupoEditable[], e: unknown): PasoAprobacion {
    const enDuda = lote.every((g) => g.tipo === 'transportadora') && sinRespuesta(e);
    const razon = enDuda ? SIN_RESPUESTA : mensajeDe(e, 'No se pudo aprobar. Inténtalo de nuevo.');
    const resultados = new Map(this.resultados);
    lote.forEach((g, i) => resultados.set(g.id, { indice: i, estado: enDuda ? 'en-curso' : 'no-despachado', razon }));
    this.resultados = resultados;
    if (enDuda) this.viejoDesde = this.viejoDesde ?? Date.now();
    return { ok: 0, error: razon, detener: enDuda };
  }

  abrirPedido(id: string): void {
    this.interaccion.emitir({ tipo: 'abrir-pedido', pedidoId: id });
  }

  // ── Textos ─────────────────────────────────────────────────────────────────

  get titulo(): string {
    const p = this.plan;
    if (!p) return '';
    const n = this.grupos.reduce((s, g) => s + g.pedidos.length, 0);
    if (!n) return 'Nada por despachar ahora';
    return `${n} ${n === 1 ? 'pedido listo' : 'pedidos listos'} en ${this.grupos.length} ${this.grupos.length === 1 ? 'grupo' : 'grupos'}`;
  }

  get horaPlan(): string {
    return this.plan ? horaCorta(this.plan.armadoEnMs) : '';
  }

  get horaViejo(): string {
    return this.viejoDesde ? horaCorta(this.viejoDesde) : '';
  }

  get textoVacio(): string {
    const modo = this.plan?.perfil.modo;
    if (modo === 'transportadora') return 'Cuando haya pedidos de hoy que una transportadora conectada pueda llevar, Opttia los arma aquí. Los demás se despachan desde Despachos.';
    if (modo === 'ninguno') return 'Todavía no hay mensajeros ni transportadoras con qué armar despachos.';
    return 'Cuando haya pedidos de hoy listos para salir, Opttia arma aquí los grupos.';
  }

  textoAlerta(a: AlertaPlan): string {
    switch (a.tipo) {
      case 'franja-por-vencer':
        return `La franja de ${a.franja} vence en ${a.minutos} min y quedan ${a.pedidos} ${a.pedidos === 1 ? 'pedido' : 'pedidos'}.`;
      case 'franja-vencida':
        return `La franja de ${a.franja} ya pasó y quedan ${a.pedidos} ${a.pedidos === 1 ? 'pedido' : 'pedidos'}.`;
      case 'mensajero-sin-app':
        return `Sin la app conectada: ${(a.mensajeros || []).join(', ')}.`;
      case 'sin-sugerencia':
        return `${a.grupos} ${a.grupos === 1 ? 'grupo no tiene' : 'grupos no tienen'} mensajero sugerido: escoge uno.`;
      case 'fechas-vencidas':
        return `${a.pedidos} ${a.pedidos === 1 ? 'pedido tiene' : 'pedidos tienen'} la fecha de entrega vencida: revísalos en Despachos.`;
      case 'envio-automatico-fallido':
        return `${a.pedidos} ${a.pedidos === 1 ? 'envío automático falló' : 'envíos automáticos fallaron'}.`;
      default:
        return '';
    }
  }

  tonoAlerta(a: AlertaPlan): string {
    return a.tipo === 'franja-vencida' || a.tipo === 'envio-automatico-fallido' ? 't-bad' : 't-warn';
  }

  trackGrupo(_: number, g: GrupoEditable): string {
    return g.id;
  }

  trackPedido(_: number, p: PedidoEditable): string {
    return p.id;
  }
}

function editable(g: GrupoPlan, explicacion: ExplicacionPlan | null): GrupoEditable {
  const tipo: TipoGrupo = g.tipo === 'transportadora' ? 'transportadora' : 'mensajero';
  const t = tipo === 'transportadora' ? g.transportadora ?? null : null;
  const alternativas = (t?.alternativas || []).filter((a) => a.proveedor !== t?.proveedor);
  return {
    id: g.id,
    tipo,
    zona: g.zona,
    franja: g.franja ? g.franja.etiqueta : null,
    urgente: g.franja?.urgente === true,
    pedidos: g.pedidos.map((p) => ({ id: p.id, nroPedido: p.nroPedido, porCobrar: p.porCobrar, zona: p.zona, franja: p.franja, huella: g.huellasPedidos[p.id], origen: tipo })),
    mensajeroId: tipo === 'mensajero' && g.sugerido ? g.sugerido.id : null,
    proveedor: t ? t.proveedor : null,
    transportadoras: t ? [{ proveedor: t.proveedor, nombre: t.nombre, tarifa: t.tarifa, nota: t.nota ?? null }, ...alternativas] : [],
    frase: explicacion?.grupos?.[g.id] ?? null,
  };
}

/** Mensajero: necesita a quién; transportadora: necesita cuál. */
function conQuien(g: GrupoEditable): boolean {
  return g.tipo === 'transportadora' ? !!g.proveedor : !!g.mensajeroId;
}

/** O BIEN el mensajero (`transportadorId`) O BIEN la transportadora (`proveedor`), nunca los dos. */
function paraAprobar(g: GrupoEditable, planHuella: string): GrupoParaAprobar {
  const pedidos = g.pedidos.map((p) => ({ id: p.id, huella: p.huella }));
  return g.tipo === 'transportadora'
    ? { proveedor: g.proveedor as string, planHuella, pedidos }
    : { transportadorId: g.mensajeroId as string, planHuella, pedidos };
}

/** El sugerido y sus alternativas (con su razón) primero; después los demás mensajeros disponibles. */
function opcionesDe(g: GrupoPlan, plan: PlanDespachos): OpcionMensajero[] {
  const app = new Map(plan.mensajerosDisponibles.map((m) => [m.id, m.app]));
  const out: OpcionMensajero[] = [];
  const vistos = new Set<string>();
  const sumar = (id: string, nombre: string, razon: string | null) => {
    if (vistos.has(id)) return;
    vistos.add(id);
    out.push({ id, nombre, razon, app: app.get(id) ?? 'sin-dato' });
  };
  if (g.sugerido) {
    sumar(g.sugerido.id, g.sugerido.nombre, g.sugerido.razon);
    for (const a of g.sugerido.alternativas || []) sumar(a.id, a.nombre, a.razon);
  }
  for (const m of plan.mensajerosDisponibles) sumar(m.id, m.nombre, null);
  return out;
}

function horaCorta(ms: number): string {
  return new Date(ms).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' });
}

/**
 * Se acabó el tiempo o no hubo respuesta: red caída, el proxy cortó, el servidor no estaba o pasaron
 * los 75 s del cliente. Un error con `code` en el cuerpo (p. ej. un 503 del interruptor) sí es una
 * respuesta del servidor: se trata como un error normal con su `message`.
 */
function sinRespuesta(e: unknown): boolean {
  const err = e as { status?: number; error?: unknown; name?: string } | null;
  if (!err) return false;
  if (err.name === 'TimeoutError' || err.status === 0 || err.error instanceof ProgressEvent) return true;
  const cuerpo = err.error as { code?: unknown } | null | undefined;
  if (cuerpo && typeof cuerpo === 'object' && cuerpo.code !== undefined && cuerpo.code !== null) return false;
  return err.status === 502 || err.status === 503 || err.status === 504;
}

function mensajeDe(e: unknown, defecto: string): string {
  const cuerpo = (e as { error?: { message?: string } } | null)?.error;
  const m = cuerpo && typeof cuerpo.message === 'string' ? cuerpo.message : '';
  return m && m.length < 200 ? m : defecto;
}
