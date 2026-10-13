import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { EventoEnVivo } from '../servicios/en-vivo.modelos';
import { EnVivoPlanDespachosService } from './en-vivo-plan-despachos.service';
import { GrupoEditable, OpcionMensajero, PedidoEditable } from './grupo-despacho/grupo-despacho.component';
import { AlertaPlan, ExplicacionPlan, GrupoPlan, PlanDespachos, RespuestaPlan, ResultadoGrupo } from './plan-despachos.modelos';

type Fase = 'cargando' | 'error' | 'listo';

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
  }

  // ── Carga ──────────────────────────────────────────────────────────────────

  cargar(): void {
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
    this.opcionesPorGrupo = new Map(plan.grupos.map((g) => [g.id, opcionesDe(g, plan)]));
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

  otrosGrupos(g: GrupoEditable | null): Array<{ id: string; etiqueta: string }> {
    return this.grupos
      .map((x, i) => ({ x, i }))
      .filter(({ x }) => x !== g && !this.resultados.has(x.id))
      .map(({ x, i }) => ({ id: x.id, etiqueta: `${i + 1}. ${x.zona}` }));
  }

  cambiarMensajero(g: GrupoEditable, id: string): void {
    this.grupos = this.grupos.map((x) => (x === g ? { ...x, mensajeroId: id } : x));
  }

  sacar(g: GrupoEditable, p: PedidoEditable): void {
    this.grupos = this.grupos.map((x) => (x === g ? { ...x, pedidos: x.pedidos.filter((y) => y.id !== p.id) } : x));
    this.sinGrupo = [...this.sinGrupo, p];
  }

  mover(origen: GrupoEditable | null, p: PedidoEditable, destinoId: string): void {
    const destino = this.grupos.find((x) => x.id === destinoId);
    if (!destino) return;
    this.grupos = this.grupos.map((x) => {
      if (x === origen) return { ...x, pedidos: x.pedidos.filter((y) => y.id !== p.id) };
      if (x === destino) return { ...x, pedidos: [...x.pedidos, p] };
      return x;
    });
    if (!origen) this.sinGrupo = this.sinGrupo.filter((y) => y.id !== p.id);
  }

  // ── Aprobar ────────────────────────────────────────────────────────────────

  get aprobables(): GrupoEditable[] {
    return this.grupos.filter((g) => g.mensajeroId && g.pedidos.length && !this.resultados.has(g.id) && !this.aplicando.has(g.id));
  }

  aprobarGrupo(g: GrupoEditable): void {
    this.aprobarVarios([g]);
  }

  aprobarTodo(): void {
    this.aprobarVarios(this.aprobables);
  }

  private aprobarVarios(gs: GrupoEditable[]): void {
    if (!this.plan || !gs.length || this.bloqueado || !this.puedeAprobar) return;
    const huella = this.plan.huella;
    gs.forEach((g) => this.aplicando.add(g.id));
    this.anuncio = gs.length === 1 ? 'Aprobando el grupo…' : `Aprobando ${gs.length} grupos…`;
    this.cd.markForCheck();
    this.api
      .aprobar(gs.map((g) => ({ transportadorId: g.mensajeroId as string, planHuella: huella, pedidos: g.pedidos.map((p) => ({ id: p.id, huella: p.huella })) })))
      .pipe(finalize(() => {
        gs.forEach((g) => this.aplicando.delete(g.id));
        this.cd.markForCheck();
      }))
      .subscribe({
        next: (r) => {
          const resultados = new Map(this.resultados);
          for (const res of r.resultados) {
            const g = gs[res.indice];
            if (g) resultados.set(g.id, res);
          }
          this.resultados = resultados;
          const ok = r.resultados.filter((x) => x.estado === 'despachado' || x.estado === 'reanudado').length;
          this.anuncio = ok === gs.length ? (ok === 1 ? 'Grupo despachado.' : `${ok} grupos despachados.`) : 'Revisa el resultado de cada grupo.';
          this.viejoDesde = this.viejoDesde ?? Date.now();
        },
        error: (e) => {
          const razon = mensajeDe(e, 'No se pudo aprobar. Inténtalo de nuevo.');
          const resultados = new Map(this.resultados);
          gs.forEach((g, i) => resultados.set(g.id, { indice: i, estado: 'no-despachado', razon }));
          this.resultados = resultados;
          this.anuncio = razon;
        },
      });
  }

  abrirPedido(id: string): void {
    this.interaccion.emitir({ tipo: 'abrir-pedido', pedidoId: id });
  }

  // ── Textos ─────────────────────────────────────────────────────────────────

  get titulo(): string {
    const p = this.plan;
    if (!p) return '';
    const n = this.grupos.reduce((s, g) => s + g.pedidos.length, 0);
    if (!n) return 'Nada por despachar con mensajero ahora';
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
    if (modo === 'transportadora') return 'Tu comercio despacha por transportadora. Esa parte del plan llega en la siguiente fase; por ahora despacha desde Despachos.';
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
  return {
    id: g.id,
    zona: g.zona,
    franja: g.franja.etiqueta,
    urgente: g.franja.urgente,
    pedidos: g.pedidos.map((p) => ({ id: p.id, nroPedido: p.nroPedido, porCobrar: p.porCobrar, zona: p.zona, franja: p.franja, huella: g.huellasPedidos[p.id] })),
    mensajeroId: g.sugerido ? g.sugerido.id : null,
    frase: explicacion?.grupos?.[g.id] ?? null,
  };
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

function mensajeDe(e: unknown, defecto: string): string {
  const cuerpo = (e as { error?: { message?: string } } | null)?.error;
  const m = cuerpo && typeof cuerpo.message === 'string' ? cuerpo.message : '';
  return m && m.length < 200 ? m : defecto;
}
