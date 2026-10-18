import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { AgendaService } from '../agenda.service';
import { ConfigAgenda, ModoAgenda, PersonaAgenda, ServicioAgenda } from '../agenda.models';
import { NOMBRES_DIAS, minutos } from '../agenda-fechas';

interface DiaEditable {
  clave: string;
  nombre: string;
  abierto: boolean;
  bloques: { desde: string; hasta: string }[];
}

const PASOS = [15, 20, 30, 60];

/**
 * Configuración de la Agenda (D-491): horario por día, por hora o por franjas,
 * personas que atienden (no necesitan usuario en Katuq) y a quién avisar. La
 * guarda un administrador; el servidor la valida antes de escribir.
 */
@Component({
  selector: 'app-agenda-config',
  templateUrl: './agenda-config.component.html',
  styleUrls: ['./agenda-config.component.scss'],
})
export class AgendaConfigComponent implements OnInit {
  readonly PASOS = PASOS;

  cargando = true;
  guardando = false;
  error = '';

  modo: ModoAgenda = 'hourly';
  paso = 30;
  dias: DiaEditable[] = [];
  franjasTexto = '';
  capacidad = 1;
  diasAdelante = 30;
  duracionWeb = 60;
  personas: PersonaAgenda[] = [];
  avisarTexto = '';
  servicios: ServicioAgenda[] = [];

  constructor(
    private readonly agenda: AgendaService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    forkJoin({ cfg: this.agenda.config(), servicios: this.agenda.servicios() }).subscribe({
      next: ({ cfg, servicios }) => {
        this.servicios = servicios;
        this.cargar(cfg.config);
        this.cargando = false;
      },
      error: (e) => {
        this.cargando = false;
        this.error = e?.error?.message || 'No pudimos abrir la configuración de la Agenda.';
      },
    });
  }

  private cargar(c: ConfigAgenda): void {
    this.modo = c.mode;
    this.paso = c.slotMinutes;
    this.dias = NOMBRES_DIAS.map((d) => {
      const bloques = (c.hours?.[d.clave] || []).map(([desde, hasta]) => ({ desde, hasta }));
      return { clave: d.clave, nombre: d.largo, abierto: bloques.length > 0, bloques: bloques.length ? bloques : [{ desde: '08:00', hasta: '18:00' }] };
    });
    this.franjasTexto = (c.windows || []).join('\n');
    this.capacidad = c.capacity || 1;
    this.diasAdelante = c.maxDaysAhead || 30;
    this.duracionWeb = c.webDurationMinutes || 60;
    this.personas = (c.staff || []).map((p) => ({ ...p, serviceIds: [...(p.serviceIds || [])] }));
    this.avisarTexto = (c.notifyEmails || []).join('\n');
  }

  // ── Horario ────────────────────────────────────────────────────────────────

  agregarBloque(d: DiaEditable): void {
    if (d.bloques.length >= 4) return;
    const ultimo = d.bloques[d.bloques.length - 1];
    d.bloques.push({ desde: ultimo?.hasta || '14:00', hasta: '18:00' });
  }

  quitarBloque(d: DiaEditable, i: number): void {
    d.bloques.splice(i, 1);
    if (!d.bloques.length) d.abierto = false;
  }

  copiarALaSemana(d: DiaEditable): void {
    for (const otro of this.dias) {
      if (otro === d || otro.clave === '7') continue;
      otro.abierto = d.abierto;
      otro.bloques = d.bloques.map((b) => ({ ...b }));
    }
    this.toastr.info(`Horario de ${d.nombre.toLowerCase()} copiado de lunes a sábado.`);
  }

  // ── Personas ───────────────────────────────────────────────────────────────

  agregarPersona(): void {
    this.personas.push({ id: `p${Date.now().toString(36)}`, name: '', email: '', userId: null, serviceIds: [], active: true });
  }

  async quitarPersona(i: number): Promise<void> {
    const p = this.personas[i];
    const r = await Swal.fire({
      title: `¿Quitar a ${p.name || 'esta persona'}?`,
      text: 'Sus citas se conservan. Si solo dejó de atender por un tiempo, mejor desactívala.',
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'No',
      confirmButtonColor: '#D64545',
    });
    if (r.isConfirmed) this.personas.splice(i, 1);
  }

  // ── Guardar ────────────────────────────────────────────────────────────────

  private armar(): { config?: ConfigAgenda; problema?: string } {
    const hours: Record<string, string[][]> = {};
    for (const d of this.dias) {
      hours[d.clave] = d.abierto ? d.bloques.map((b) => [b.desde, b.hasta]) : [];
      for (const b of d.abierto ? d.bloques : []) {
        if (isNaN(minutos(b.desde)) || isNaN(minutos(b.hasta)) || minutos(b.desde) >= minutos(b.hasta)) {
          return { problema: `Revisa el horario del ${d.nombre.toLowerCase()}: la hora de inicio debe ser menor que la de cierre.` };
        }
      }
    }
    if (!this.dias.some((d) => d.abierto)) return { problema: 'Abre al menos un día de atención.' };
    const windows = this.franjasTexto.split('\n').map((s) => s.trim()).filter(Boolean);
    if (this.modo === 'window' && !windows.length) return { problema: 'Escribe al menos una franja, por ejemplo 8:00 - 10:00.' };
    if (this.personas.some((p) => !p.name.trim())) return { problema: 'Cada persona que atiende necesita un nombre.' };
    return {
      config: {
        mode: this.modo,
        slotMinutes: this.paso,
        hours,
        windows,
        capacity: this.capacidad,
        maxDaysAhead: this.diasAdelante,
        webDurationMinutes: this.duracionWeb,
        staff: this.personas.map((p) => ({ ...p, name: p.name.trim(), email: (p.email || '').trim() })),
        notifyEmails: this.avisarTexto.split(/[\n,;]/).map((s) => s.trim()).filter(Boolean),
      },
    };
  }

  guardar(): void {
    const { config, problema } = this.armar();
    if (problema || !config) {
      this.error = problema || '';
      return;
    }
    this.guardando = true;
    this.error = '';
    this.agenda.guardarConfig(config).subscribe({
      next: () => {
        this.guardando = false;
        this.toastr.success('Agenda guardada.');
        this.router.navigate(['/agenda']);
      },
      error: (e) => {
        this.guardando = false;
        this.error = e?.error?.message || 'No pudimos guardar la configuración.';
      },
    });
  }

  volver(): void {
    this.router.navigate(['/agenda']);
  }

  trackIndice(i: number): number {
    return i;
  }
}
