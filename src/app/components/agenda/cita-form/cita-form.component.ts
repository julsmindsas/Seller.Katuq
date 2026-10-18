import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { AgendaService } from '../agenda.service';
import {
  Cita,
  ConfigAgenda,
  Disponibilidad,
  MODALIDADES,
  ModalidadServicio,
  PersonaAgenda,
  ServicioAgenda,
} from '../agenda.models';
import { esFecha, fechaLarga, horaLegible, hoyBogota, minutos, nuevoRequestId } from '../agenda-fechas';

const DURACION_POR_DEFECTO = 60;

/**
 * Agendar una cita en tres datos: cliente, servicio y hora (D-491). La hora sale
 * de la disponibilidad real del servidor; el comercio también puede escribir
 * otra hora fuera de la grilla (el servidor solo impide cruzar a una persona).
 */
@Component({
  selector: 'app-cita-form',
  templateUrl: './cita-form.component.html',
  styleUrls: ['./cita-form.component.scss'],
})
export class CitaFormComponent implements OnInit, OnDestroy {
  @Input() config!: ConfigAgenda;
  @Input() servicios: ServicioAgenda[] = [];
  @Input() preset: { fecha: string; hora?: string; franja?: string; staffId?: string | null } | null = null;
  /** Origen de la cita: la Agenda, la venta asistida o el CRM. */
  @Input() origen: 'agenda' | 'sales' | 'crm' = 'agenda';
  /** Cliente ya elegido (por ejemplo, desde la ficha del CRM). */
  @Input() clienteInicial: { clientId?: string; name: string; phone?: string; email?: string } | null = null;
  @Output() creada = new EventEmitter<Cita>();
  @Output() cerrar = new EventEmitter<void>();

  readonly MODALIDADES = MODALIDADES;
  readonly horaLegible = horaLegible;
  readonly fechaLarga = fechaLarga;
  readonly hoy = hoyBogota();

  visible = true;
  guardando = false;
  error = '';

  // Cliente
  busqueda = '';
  resultados: any[] = [];
  buscando = false;
  cliente = { clientId: '' as string | null, name: '', phone: '', email: '' };

  // Cita
  serviceIds: string[] = [];
  motivo = '';
  staffId: string | null = null;
  fecha = hoyBogota();
  duracion = DURACION_POR_DEFECTO;
  duracionTocada = false;
  hora = '';
  horaManual = '';
  franja = '';
  lugar: { mode: ModalidadServicio; address: string; city: string } = { mode: 'onsite', address: '', city: '' };
  notas = '';

  disponibilidad: Disponibilidad | null = null;
  cargandoHoras = false;

  private readonly requestId = nuevoRequestId();
  private readonly busqueda$ = new Subject<string>();
  private readonly pedirHoras$ = new Subject<void>();
  private readonly destruir$ = new Subject<void>();

  constructor(private readonly agenda: AgendaService) {}

  ngOnInit(): void {
    if (this.preset) {
      if (esFecha(this.preset.fecha) && this.preset.fecha >= this.hoy) this.fecha = this.preset.fecha;
      this.staffId = this.preset.staffId || null;
      if (this.preset.hora) this.horaManual = this.preset.hora;
      if (this.preset.franja) this.franja = this.preset.franja;
    }
    if (this.clienteInicial) {
      this.cliente = {
        clientId: this.clienteInicial.clientId || null,
        name: this.clienteInicial.name || '',
        phone: this.clienteInicial.phone || '',
        email: this.clienteInicial.email || '',
      };
    }

    this.busqueda$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((t) => {
          if (t.trim().length < 2) return of([]);
          this.buscando = true;
          return this.agenda.buscarClientes(t.trim()).pipe(catchError(() => of([])));
        }),
        takeUntil(this.destruir$)
      )
      .subscribe((r) => {
        this.buscando = false;
        this.resultados = Array.isArray(r) ? r : [];
      });

    this.pedirHoras$
      .pipe(
        debounceTime(150),
        switchMap(() => {
          if (!esFecha(this.fecha)) return of(null);
          this.cargandoHoras = true;
          return this.agenda
            .disponibilidad({ fecha: this.fecha, duracion: this.duracion, servicios: this.serviceIds, persona: this.staffId })
            .pipe(catchError(() => of(null)));
        }),
        takeUntil(this.destruir$)
      )
      .subscribe((d) => {
        this.cargandoHoras = false;
        this.disponibilidad = d;
        // La hora del clic en la grilla queda elegida si sigue libre.
        if (this.horaManual && d?.horas?.some((h) => h.hora === this.horaManual)) {
          this.hora = this.horaManual;
          this.horaManual = '';
        }
      });
    this.pedirHoras$.next();
  }

  ngOnDestroy(): void {
    this.destruir$.next();
    this.destruir$.complete();
  }

  // ── Cliente ────────────────────────────────────────────────────────────────

  alBuscar(): void {
    this.busqueda$.next(this.busqueda);
  }

  elegirCliente(c: any): void {
    this.cliente = {
      clientId: c.cd || null,
      name: c.nombres_completos || c.displayLabel || '',
      phone: c.numero_celular_comprador || c.numero_celular_whatsapp || '',
      email: c.correo_electronico_comprador || c.email || '',
    };
    this.resultados = [];
    this.busqueda = '';
  }

  quitarCliente(): void {
    this.cliente = { clientId: null, name: '', phone: '', email: '' };
  }

  // ── Servicio, persona y hora ───────────────────────────────────────────────

  get serviciosActivos(): ServicioAgenda[] {
    return this.servicios.filter((s) => s.active || this.serviceIds.includes(s.productId));
  }

  get personas(): PersonaAgenda[] {
    return (this.config?.staff || []).filter(
      (p) => p.active && (!p.serviceIds?.length || this.serviceIds.every((id) => p.serviceIds.includes(id)))
    );
  }

  get aDomicilio(): boolean {
    return this.servicios.some((s) => this.serviceIds.includes(s.productId) && s.mode === 'home');
  }

  get modoFranjas(): boolean {
    return this.config?.mode === 'window';
  }

  alCambiarServicios(): void {
    if (!this.duracionTocada) {
      const suma = this.servicios
        .filter((s) => this.serviceIds.includes(s.productId))
        .reduce((t, s) => t + (s.durationMinutes || 0), 0);
      this.duracion = suma > 0 ? suma : DURACION_POR_DEFECTO;
    }
    if (this.staffId && !this.personas.some((p) => p.id === this.staffId)) this.staffId = null;
    this.lugar.mode = this.aDomicilio ? 'home' : 'onsite';
    this.alCambiarCriterio();
  }

  alCambiarDuracion(): void {
    this.duracionTocada = true;
    this.alCambiarCriterio();
  }

  alCambiarCriterio(): void {
    this.hora = '';
    this.pedirHoras$.next();
  }

  elegirHora(h: string): void {
    this.hora = h;
    this.horaManual = '';
  }

  elegirFranja(f: string): void {
    this.franja = f;
  }

  /** Hora escrita a mano: manda sobre los botones. */
  alEscribirHora(): void {
    if (this.horaManual) this.hora = '';
  }

  get horaElegida(): string {
    return this.horaManual || this.hora;
  }

  get puedeGuardar(): boolean {
    const cuando = this.modoFranjas ? !!this.franja : !isNaN(minutos(this.horaElegida));
    return !this.guardando && !!this.cliente.name.trim() && esFecha(this.fecha) && cuando;
  }

  guardar(): void {
    if (!this.puedeGuardar) return;
    this.guardando = true;
    this.error = '';
    this.agenda
      .crear({
        date: this.fecha,
        ...(this.modoFranjas ? { window: this.franja } : { startTime: this.horaElegida, durationMinutes: this.duracion }),
        serviceIds: this.serviceIds,
        staffId: this.staffId,
        customer: {
          clientId: this.cliente.clientId || null,
          name: this.cliente.name.trim(),
          phone: this.cliente.phone.trim(),
          email: this.cliente.email.trim() || null,
        },
        location: this.aDomicilio ? { mode: 'home', address: this.lugar.address, city: this.lugar.city } : undefined,
        reason: this.serviceIds.length ? undefined : this.motivo.trim() || undefined,
        notes: this.notas.trim() || undefined,
        source: this.origen,
        requestId: this.requestId,
      })
      .subscribe({
        next: (c) => {
          this.guardando = false;
          this.creada.emit(c);
        },
        error: (e) => {
          this.guardando = false;
          this.error = e?.error?.message || 'No pudimos agendar la cita. Intenta de nuevo.';
          // Si la hora se acaba de ocupar, se refrescan las libres.
          if (e?.error?.code === 'OCUPADO') this.alCambiarCriterio();
        },
      });
  }

  cerrarDialogo(): void {
    this.visible = false;
    this.cerrar.emit();
  }
}
