import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { AgendaService } from '../agenda.service';
import {
  Cita,
  ConfigAgenda,
  Disponibilidad,
  ESTADOS_CITA,
  EstadoCita,
  HistorialCita,
  ORIGEN_CITA,
} from '../agenda.models';
import { esFecha, fechaCorta, fechaLarga, horaLegible, hoyBogota, minutos } from '../agenda-fechas';

/**
 * Detalle de una cita (D-488): estado, mover, notas, historial y escribirle al
 * cliente por WhatsApp (abre el chat con el texto escrito; Katuq no envía nada).
 */
@Component({
  selector: 'app-cita-panel',
  templateUrl: './cita-panel.component.html',
  styleUrls: ['./cita-panel.component.scss'],
})
export class CitaPanelComponent implements OnChanges, OnDestroy {
  @Input() cita!: Cita;
  @Input() config!: ConfigAgenda;
  @Output() cambio = new EventEmitter<Cita>();
  @Output() cerrar = new EventEmitter<void>();

  readonly ESTADOS = ESTADOS_CITA;
  readonly ORIGEN = ORIGEN_CITA;
  readonly fechaLarga = fechaLarga;
  readonly horaLegible = horaLegible;
  readonly hoy = hoyBogota();

  visible = true;
  ocupado = false;
  error = '';

  moviendo = false;
  mover = { fecha: '', staffId: null as string | null, hora: '', horaManual: '', franja: '' };
  disponibilidad: Disponibilidad | null = null;
  cargandoHoras = false;

  notas = '';
  notasCambiadas = false;

  private readonly pedirHoras$ = new Subject<void>();
  private readonly destruir$ = new Subject<void>();

  constructor(private readonly agenda: AgendaService, private readonly toastr: ToastrService) {
    this.pedirHoras$
      .pipe(
        debounceTime(150),
        switchMap(() => {
          if (!esFecha(this.mover.fecha)) return of(null);
          this.cargandoHoras = true;
          return this.agenda
            .disponibilidad({
              fecha: this.mover.fecha,
              duracion: this.cita.durationMinutes || undefined,
              servicios: (this.cita.services || []).map((s) => s.productId),
              persona: this.mover.staffId,
            })
            .pipe(catchError(() => of(null)));
        }),
        takeUntil(this.destruir$)
      )
      .subscribe((d) => {
        this.cargandoHoras = false;
        this.disponibilidad = d;
      });
  }

  ngOnChanges(): void {
    this.notas = this.cita?.notes || '';
    this.notasCambiadas = false;
    this.moviendo = false;
    this.error = '';
  }

  ngOnDestroy(): void {
    this.destruir$.next();
    this.destruir$.complete();
  }

  // ── Lectura ────────────────────────────────────────────────────────────────

  get cuando(): string {
    const c = this.cita;
    const horaTxt = c.startTime ? `${horaLegible(c.startTime)}${c.endTime ? ` – ${horaLegible(c.endTime)}` : ''}` : c.window || '';
    return `${fechaLarga(c.date)} · ${horaTxt}`;
  }

  get servicios(): string {
    const s = (this.cita.services || []).map((x) => x.name);
    return s.length ? s.join(', ') : this.cita.reason || 'Sin servicio';
  }

  get total(): number {
    return (this.cita.services || []).reduce((t, s) => t + (Number(s.price) || 0), 0);
  }

  get activa(): boolean {
    return this.cita.status === 'requested' || this.cita.status === 'confirmed';
  }

  get modoFranjas(): boolean {
    return this.config?.mode === 'window';
  }

  get personas() {
    const ids = (this.cita.services || []).map((s) => s.productId);
    return (this.config?.staff || []).filter(
      (p) => p.active && (!p.serviceIds?.length || ids.every((id) => p.serviceIds.includes(id)))
    );
  }

  /** wa.me con el número del cliente (Colombia por defecto) y un saludo con la cita. */
  get enlaceWhatsapp(): string | null {
    const digitos = String(this.cita.customer?.phone || '').replace(/\D/g, '');
    if (digitos.length < 10) return null;
    const numero = digitos.length === 10 && digitos.startsWith('3') ? `57${digitos}` : digitos;
    const nombre = String(this.cita.customer?.name || '').trim().split(/\s+/)[0] || '';
    const texto = `Hola ${nombre}, te escribimos por tu cita de ${this.servicios} el ${this.cuando}.`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  textoHistorial(h: HistorialCita): string {
    const estado = (v: string) => ESTADOS_CITA[v as EstadoCita]?.texto || v;
    if (h.what === 'created') return `Creada (${estado(h.to)})`;
    if (h.what === 'status') return `${estado(h.from)} → ${estado(h.to)}${h.reason ? ` · ${h.reason}` : ''}`;
    if (h.what === 'moved') {
      const a = h.from || {};
      const b = h.to || {};
      return `Movida de ${fechaCorta(a.date)} ${a.startTime || a.window || ''} a ${fechaCorta(b.date)} ${b.startTime || b.window || ''}`;
    }
    if (h.what === 'order') return 'Cobrada';
    if (h.what === 'edited') return 'Datos editados';
    return h.what;
  }

  fechaHistorial(h: HistorialCita): string {
    const d = new Date(h.at);
    return isNaN(d.getTime()) ? '' : d.toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' });
  }

  // ── Estados ────────────────────────────────────────────────────────────────

  async cambiarEstado(status: EstadoCita): Promise<void> {
    let reason: string | undefined;
    if (status === 'cancelled') {
      const r = await Swal.fire({
        title: '¿Cancelar la cita?',
        text: 'El espacio queda libre para otra cita. Puedes reabrirla si sigue libre.',
        input: 'text',
        inputPlaceholder: 'Motivo (opcional)',
        showCancelButton: true,
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'No',
        confirmButtonColor: '#D64545',
      });
      if (!r.isConfirmed) return;
      reason = String(r.value || '').trim() || undefined;
    }
    this.ocupado = true;
    this.error = '';
    this.agenda.cambiarEstado(this.cita.id, status, reason).subscribe({
      next: (c) => {
        this.ocupado = false;
        this.toastr.success(`Cita ${ESTADOS_CITA[c.status].texto.toLowerCase()}.`);
        this.cambio.emit(c);
      },
      error: (e) => {
        this.ocupado = false;
        this.error = e?.error?.message || 'No pudimos cambiar la cita.';
      },
    });
  }

  // ── Mover ──────────────────────────────────────────────────────────────────

  empezarAMover(): void {
    this.moviendo = true;
    this.mover = {
      fecha: this.cita.date >= this.hoy ? this.cita.date : this.hoy,
      staffId: this.cita.staffId,
      hora: '',
      horaManual: '',
      franja: this.cita.window || '',
    };
    this.pedirHoras$.next();
  }

  alCambiarCriterio(): void {
    this.mover.hora = '';
    this.pedirHoras$.next();
  }

  get puedeMover(): boolean {
    const cuando = this.modoFranjas ? !!this.mover.franja : !isNaN(minutos(this.mover.horaManual || this.mover.hora));
    return !this.ocupado && esFecha(this.mover.fecha) && cuando;
  }

  confirmarMovida(): void {
    if (!this.puedeMover) return;
    this.ocupado = true;
    this.error = '';
    const cambios = this.modoFranjas
      ? { date: this.mover.fecha, window: this.mover.franja, staffId: this.mover.staffId }
      : { date: this.mover.fecha, startTime: this.mover.horaManual || this.mover.hora, staffId: this.mover.staffId };
    this.agenda.mover(this.cita.id, cambios).subscribe({
      next: (c) => {
        this.ocupado = false;
        this.moviendo = false;
        this.toastr.success(`Cita movida al ${fechaCorta(c.date)} · ${c.startTime ? horaLegible(c.startTime) : c.window}.`);
        this.cambio.emit(c);
      },
      error: (e) => {
        this.ocupado = false;
        this.error = e?.error?.message || 'No pudimos mover la cita.';
        if (e?.error?.code === 'OCUPADO') this.pedirHoras$.next();
      },
    });
  }

  // ── Notas ──────────────────────────────────────────────────────────────────

  guardarNotas(): void {
    this.ocupado = true;
    this.agenda.editar(this.cita.id, { notes: this.notas }).subscribe({
      next: (c) => {
        this.ocupado = false;
        this.notasCambiadas = false;
        this.toastr.success('Notas guardadas.');
        this.cambio.emit(c);
      },
      error: (e) => {
        this.ocupado = false;
        this.error = e?.error?.message || 'No pudimos guardar las notas.';
      },
    });
  }

  cerrarPanel(): void {
    this.visible = false;
    this.cerrar.emit();
  }
}
