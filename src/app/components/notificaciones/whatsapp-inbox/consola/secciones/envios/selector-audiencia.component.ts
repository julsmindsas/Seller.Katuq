import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { Subject, Subscription } from 'rxjs';

import { CrmStage } from '../../../../../crm/models/crm.models';
import { AudienciaWhatsappService } from '../../../../../../shared/services/messaging/audiencia-whatsapp.service';
import { DestinatarioSegmento, Segmento } from '../../../../../../shared/services/messaging/whatsapp-consola.models';

type Grupo = '' | 'clientes' | 'crm';

/** Tope por envío en esta versión: el mismo del asistente de campañas de Marketing. */
export const MAX_DESTINATARIOS_ENVIO = 1000;
/** Personas que se dibujan a la vez; el resto se encuentra con el buscador. */
const FILAS_VISIBLES = 100;

/**
 * Elegir a quién se le escribe (D-707). Usa las mismas fuentes y el mismo formato de destinatario que
 * el asistente de campañas de Marketing: todos los clientes con teléfono o los leads del CRM por
 * etapa. Al elegir un grupo queda seleccionado completo y se puede excluir gente. Emite el
 * `Segmento` que el servidor recibe (`null` si no hay nadie seleccionado).
 */
@Component({
  selector: 'app-selector-audiencia',
  templateUrl: './selector-audiencia.component.html',
  styleUrls: ['./selector-audiencia.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorAudienciaComponent implements OnDestroy {
  @Output() segmentoChange = new EventEmitter<Segmento | null>();

  readonly max = MAX_DESTINATARIOS_ENVIO;

  grupo: Grupo = '';
  etapas: CrmStage[] = [];
  etapa = '';
  cargando = false;
  error = false;
  destinatarios: DestinatarioSegmento[] = [];
  sinTelefono = 0;
  buscar = '';

  /** Teléfonos seleccionados (un número no se cobra dos veces). */
  private seleccion = new Set<string>();
  private lectura?: Subscription;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly audiencia: AudienciaWhatsappService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {
    this.lectura?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  elegir(grupo: 'clientes' | 'crm'): void {
    if (this.cargando) return;
    this.grupo = grupo;
    this.buscar = '';
    if (grupo === 'crm' && this.etapas.length === 0) {
      this.audiencia.etapasCrm().subscribe((e) => {
        this.etapas = e;
        this.cdr.markForCheck();
      });
    }
    this.cargar();
  }

  cambiarEtapa(): void {
    this.cargar();
  }

  private cargar(): void {
    this.lectura?.unsubscribe();
    this.cargando = true;
    this.error = false;
    this.destinatarios = [];
    this.seleccion = new Set<string>();
    this.emitir();
    this.cdr.markForCheck();
    const fuente = this.grupo === 'crm' ? this.audiencia.leadsCrm(this.etapa) : this.audiencia.clientes();
    this.lectura = fuente.subscribe({
      next: (r) => {
        this.destinatarios = this.sinRepetidos(r.destinatarios);
        this.sinTelefono = r.sinTelefono;
        this.seleccionarTodos(true);
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = true;
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  private sinRepetidos(lista: DestinatarioSegmento[]): DestinatarioSegmento[] {
    const vistos = new Set<string>();
    return lista.filter((d) => {
      if (vistos.has(d.phone)) return false;
      vistos.add(d.phone);
      return true;
    });
  }

  // ─── Selección ────────────────────────────────────────────────────────

  get visibles(): DestinatarioSegmento[] {
    const q = this.buscar.trim().toLowerCase();
    const lista = !q
      ? this.destinatarios
      : this.destinatarios.filter((d) => d.nombre.toLowerCase().includes(q) || d.phone.includes(q));
    return lista;
  }

  get filas(): DestinatarioSegmento[] {
    return this.visibles.slice(0, FILAS_VISIBLES);
  }

  get seleccionados(): number {
    return this.seleccion.size;
  }

  get todosSeleccionados(): boolean {
    return this.destinatarios.length > 0 && this.seleccion.size >= Math.min(this.destinatarios.length, this.max);
  }

  /** Hay más personas en el grupo que el tope: solo entran las primeras. */
  get excedeTope(): boolean {
    return this.destinatarios.length > this.max;
  }

  estaSeleccionado(d: DestinatarioSegmento): boolean {
    return this.seleccion.has(d.phone);
  }

  alternar(d: DestinatarioSegmento): void {
    const nueva = new Set(this.seleccion);
    if (nueva.has(d.phone)) nueva.delete(d.phone);
    else if (nueva.size < this.max) nueva.add(d.phone);
    this.seleccion = nueva;
    this.emitir();
  }

  seleccionarTodos(marcar: boolean): void {
    this.seleccion = new Set<string>(marcar ? this.destinatarios.slice(0, this.max).map((d) => d.phone) : []);
    this.emitir();
  }

  private emitir(): void {
    const elegidos = this.destinatarios.filter((d) => this.seleccion.has(d.phone));
    if (elegidos.length === 0 || !this.grupo) {
      this.segmentoChange.emit(null);
      return;
    }
    this.segmentoChange.emit({
      fuente: this.grupo as 'clientes' | 'crm',
      ...(this.grupo === 'crm' && this.etapa ? { etapa: this.etapa } : {}),
      destinatarios: elegidos.map((d) => ({ phone: d.phone, ...(d.nombre ? { nombre: d.nombre } : {}), leadId: d.leadId })),
    });
  }

  trackDestinatario(_: number, d: DestinatarioSegmento): string {
    return d.phone;
  }
}
