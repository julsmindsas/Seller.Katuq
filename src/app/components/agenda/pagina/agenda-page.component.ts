import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { AgendaService } from '../agenda.service';
import {
  Cita,
  ConfigAgenda,
  ESTADOS_CITA,
  PersonaAgenda,
  ServicioAgenda,
} from '../agenda.models';
import {
  diasDeLaSemana,
  esFecha,
  fechaCorta,
  fechaLarga,
  hora,
  horaLegible,
  hoyBogota,
  minutos,
  rangoDelDia,
  sumarDias,
} from '../agenda-fechas';

import { TranslateService } from '@ngx-translate/core';
/** Alto de una fila de 30 minutos en la grilla del día, en px. */
const ALTO_MEDIA_HORA = 44;
const SIN_ASIGNAR = '__sin_asignar__';

interface Columna {
  id: string;
  nombre: string;
  inactiva: boolean;
}

interface PresetCita {
  fecha: string;
  hora?: string;
  franja?: string;
  staffId?: string | null;
}

/**
 * La Agenda (D-491): citas por día (una columna por persona que atiende) y por
 * semana (una columna por día). Crear, abrir, mover y cambiar estado pasan por
 * `/v1/appointments`; el servidor revalida todo.
 */
@Component({
  selector: 'app-agenda-page',
  templateUrl: './agenda-page.component.html',
  styleUrls: ['./agenda-page.component.scss'],
})
export class AgendaPageComponent implements OnInit, OnDestroy {
  readonly ESTADOS = ESTADOS_CITA;
  readonly SIN_ASIGNAR = SIN_ASIGNAR;
  readonly fechaLarga = fechaLarga;
  readonly fechaCorta = fechaCorta;
  readonly horaLegible = horaLegible;

  vista: 'dia' | 'semana' = 'dia';
  fecha = hoyBogota();
  hoy = hoyBogota();

  config: ConfigAgenda | null = null;
  configurada = false;
  servicios: ServicioAgenda[] = [];
  citas: Cita[] = [];
  cargando = true;
  error = '';
  esAdmin = false;

  // Grilla del día
  columnas: Columna[] = [];
  filas: { min: number; etiqueta: string; enPunto: boolean }[] = [];
  inicioDia = 8 * 60;
  finDia = 18 * 60;
  readonly altoMediaHora = ALTO_MEDIA_HORA;

  // Semana
  diasSemana: string[] = [];

  // Formulario y panel
  formAbierto = false;
  preset: PresetCita | null = null;
  citaAbierta: Cita | null = null;

  private readonly destruir$ = new Subject<void>();

  constructor(
    private readonly agenda: AgendaService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.esAdmin = this.leerEsAdmin();
    const q = this.route.snapshot.queryParamMap;
    const fecha = q.get('fecha');
    if (fecha && esFecha(fecha)) this.fecha = fecha;
    const citaId = q.get('cita');
    this.cargarTodo(citaId);
  }

  ngOnDestroy(): void {
    this.destruir$.next();
    this.destruir$.complete();
  }

  // ── Carga ──────────────────────────────────────────────────────────────────

  private cargarTodo(citaId?: string | null): void {
    this.cargando = true;
    this.error = '';
    forkJoin({ cfg: this.agenda.config(), servicios: this.agenda.servicios() })
      .pipe(takeUntil(this.destruir$))
      .subscribe({
        next: ({ cfg, servicios }) => {
          this.config = cfg.config;
          this.configurada = cfg.configurada;
          this.servicios = servicios;
          this.cargarCitas(citaId);
        },
        error: (e) => {
          this.cargando = false;
          this.error = e?.error?.message || this.translate.instant('agenda.agendaPage.noPudimosAbrirLaAgenda');
        },
      });
  }

  cargarCitas(citaId?: string | null): void {
    const [desde, hasta] = this.rango();
    this.cargando = true;
    this.agenda
      .citas(desde, hasta)
      .pipe(takeUntil(this.destruir$))
      .subscribe({
        next: (citas) => {
          this.citas = citas;
          this.cargando = false;
          this.armarVista();
          if (citaId) {
            const c = citas.find((x) => x.id === citaId);
            if (c) this.abrirCita(c);
          }
        },
        error: (e) => {
          this.cargando = false;
          this.error = e?.error?.message || this.translate.instant('agenda.agendaPage.noPudimosTraerLasCitas');
        },
      });
  }

  private rango(): [string, string] {
    if (this.vista === 'semana') {
      const dias = diasDeLaSemana(this.fecha);
      return [dias[0], dias[6]];
    }
    return [this.fecha, this.fecha];
  }

  private armarVista(): void {
    if (!this.config) return;
    if (this.vista === 'semana') {
      this.diasSemana = diasDeLaSemana(this.fecha);
      return;
    }
    // Columnas: personas activas, las inactivas que tienen citas ese día y "Sin asignar" si hace falta.
    const delDia = this.citasDelDia(this.fecha);
    const conCita = new Set(delDia.map((c) => c.staffId).filter(Boolean));
    const personas: PersonaAgenda[] = this.config.staff.filter((p) => p.active || conCita.has(p.id));
    this.columnas = personas.map((p) => ({ id: p.id, nombre: p.name, inactiva: !p.active }));
    if (!this.columnas.length || delDia.some((c) => !c.staffId)) {
      this.columnas.push({ id: SIN_ASIGNAR, nombre: this.config.staff.length ? this.translate.instant('agenda.citaPanel.sinAsignar') : this.translate.instant('agenda.agendaPage.citas2'), inactiva: false });
    }
    // Filas: del primer al último minuto de atención, más las citas que se salgan.
    let [ini, fin] = rangoDelDia(this.config.hours, [this.fecha]);
    for (const c of delDia) {
      const a = minutos(c.startTime);
      const b = minutos(c.endTime);
      if (!isNaN(a)) ini = Math.min(ini, Math.floor(a / 60) * 60);
      if (!isNaN(b)) fin = Math.max(fin, Math.ceil(b / 60) * 60);
    }
    this.inicioDia = ini;
    this.finDia = fin;
    this.filas = [];
    for (let m = ini; m < fin; m += 30) {
      this.filas.push({ min: m, etiqueta: m % 60 === 0 ? horaLegible(hora(m)) : '', enPunto: m % 60 === 0 });
    }
  }

  // ── Navegación ─────────────────────────────────────────────────────────────

  cambiarVista(v: 'dia' | 'semana'): void {
    if (this.vista === v) return;
    this.vista = v;
    this.cargarCitas();
  }

  mover(paso: number): void {
    this.fecha = sumarDias(this.fecha, this.vista === 'semana' ? paso * 7 : paso);
    this.actualizarUrl();
    this.cargarCitas();
  }

  irAHoy(): void {
    this.fecha = hoyBogota();
    this.actualizarUrl();
    this.cargarCitas();
  }

  verDia(fecha: string): void {
    this.fecha = fecha;
    this.vista = 'dia';
    this.actualizarUrl();
    this.cargarCitas();
  }

  private actualizarUrl(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { fecha: this.fecha }, replaceUrl: true });
  }

  get tituloFecha(): string {
    if (this.vista === 'dia') return fechaLarga(this.fecha);
    const dias = diasDeLaSemana(this.fecha);
    return `${fechaCorta(dias[0])} – ${fechaCorta(dias[6])}`;
  }

  // ── Datos para la plantilla ───────────────────────────────────────────────

  citasDelDia(fecha: string): Cita[] {
    return this.citas.filter((c) => c.date === fecha);
  }

  citasDeColumna(col: Columna): Cita[] {
    return this.citasDelDia(this.fecha).filter((c) =>
      col.id === SIN_ASIGNAR ? !c.staffId || !this.columnas.some((x) => x.id === c.staffId) : c.staffId === col.id
    );
  }

  /** Citas por franja (modo por franjas) en el día. */
  citasDeFranja(col: Columna, franja: string): Cita[] {
    return this.citasDeColumna(col).filter((c) => c.window === franja);
  }

  /** Citas sin hora (modo franja) o fuera de la grilla, para listarlas aparte. */
  citasSinHora(col: Columna): Cita[] {
    return this.citasDeColumna(col).filter((c) => isNaN(minutos(c.startTime)));
  }

  posicion(c: Cita): { top: number; height: number } {
    const a = minutos(c.startTime);
    const b = isNaN(minutos(c.endTime)) ? a + 30 : minutos(c.endTime);
    const top = ((a - this.inicioDia) / 30) * ALTO_MEDIA_HORA;
    const height = Math.max(((b - a) / 30) * ALTO_MEDIA_HORA - 4, 30);
    return { top, height };
  }

  get altoGrilla(): number {
    return this.filas.length * ALTO_MEDIA_HORA;
  }

  /** Línea de "ahora" en la vista del día de hoy. */
  get lineaAhora(): number | null {
    if (this.vista !== 'dia' || this.fecha !== hoyBogota()) return null;
    const d = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const m = d.getUTCHours() * 60 + d.getUTCMinutes();
    if (m < this.inicioDia || m > this.finDia) return null;
    return ((m - this.inicioDia) / 30) * ALTO_MEDIA_HORA;
  }

  get modoFranjas(): boolean {
    return this.config?.mode === 'window';
  }

  get totalDelDia(): number {
    return this.citasDelDia(this.fecha).filter((c) => c.status !== 'cancelled').length;
  }

  get porConfirmar(): number {
    return this.citas.filter((c) => c.status === 'requested').length;
  }

  textoServicios(c: Cita): string {
    const s = (c.services || []).map((x) => x.name).filter(Boolean);
    return s.length ? s.join(', ') : c.reason || 'Cita';
  }

  cuando(c: Cita): string {
    if (c.startTime) return `${horaLegible(c.startTime)}${c.endTime ? ` – ${horaLegible(c.endTime)}` : ''}`;
    return c.window || '';
  }

  trackCita(_: number, c: Cita): string {
    return c.id;
  }

  // ── Acciones ───────────────────────────────────────────────────────────────

  nuevaCita(preset?: Partial<PresetCita>): void {
    if (!this.configurada) {
      this.toastr.info(this.translate.instant('agenda.agendaPage.primeroConfiguraTuHorarioY'));
      return;
    }
    this.preset = { fecha: this.fecha, ...(preset || {}) };
    this.formAbierto = true;
  }

  /** Clic en un espacio vacío de la grilla del día. */
  agendarEn(col: Columna, min: number): void {
    this.nuevaCita({ fecha: this.fecha, hora: hora(min), staffId: col.id === SIN_ASIGNAR ? null : col.id });
  }

  agendarEnFranja(col: Columna, franja: string): void {
    this.nuevaCita({ fecha: this.fecha, franja, staffId: col.id === SIN_ASIGNAR ? null : col.id });
  }

  abrirCita(c: Cita): void {
    this.citaAbierta = c;
  }

  alCrear(c: Cita): void {
    this.formAbierto = false;
    this.toastr.success(this.translate.instant('agenda.agendaPage.citaAgendada', { fecha: fechaCorta(c.date), hora: c.startTime ? horaLegible(c.startTime) : c.window }));
    if (this.rango()[0] <= c.date && c.date <= this.rango()[1]) {
      this.citas = [...this.citas, c];
      this.armarVista();
    } else {
      this.fecha = c.date;
      this.actualizarUrl();
      this.cargarCitas();
    }
  }

  alCambiar(c: Cita): void {
    const dentro = this.rango()[0] <= c.date && c.date <= this.rango()[1];
    this.citas = dentro ? this.citas.map((x) => (x.id === c.id ? c : x)) : this.citas.filter((x) => x.id !== c.id);
    this.citaAbierta = dentro ? c : null;
    this.armarVista();
  }

  irAConfigurar(): void {
    this.router.navigate(['/agenda/configuracion']);
  }

  private leerEsAdmin(): boolean {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return /administrador/i.test(String(u?.rol || ''));
    } catch {
      return false;
    }
  }
}
