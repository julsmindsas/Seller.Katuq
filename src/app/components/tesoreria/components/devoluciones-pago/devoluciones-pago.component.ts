import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, timeout } from 'rxjs/operators';
import {
  DevolucionPagoService,
  FilaDevolucion,
  TableroDevoluciones,
} from '../../../../shared/services/ventas/devolucion-pago.service';
import { abrirMarcarDevuelto } from '../../../../shared/utils/devolucion-pago-dialogo';
import { puedeMarcarDevolucion } from '../../../../shared/utils/devolucion-pago';

/**
 * D-724: tablero de devoluciones de Tesorería. Pagos de pasarela de pedidos cancelados: los que
 * faltan por devolver (los más viejos arriba, «atrasado» desde `diasAviso` días) y los devueltos en
 * un periodo, con el resumen. Se ve con la bandera `paymentRefundTracking`; el servidor exige
 * Administrador o Tesorería (mismos roles que «Marcar como devuelto»).
 */
@Component({
  selector: 'app-devoluciones-pago',
  templateUrl: './devoluciones-pago.component.html',
  styleUrls: ['./devoluciones-pago.component.scss'],
})
export class DevolucionesPagoComponent implements OnChanges, OnDestroy {
  @Input() active = false;
  /** Se marcó una devolución: la pantalla refresca su contador. */
  @Output() changed = new EventEmitter<void>();

  estado: 'por_devolver' | 'devuelto' | 'todos' = 'por_devolver';
  /** Tarjetas «Atrasadas» y «Facturas sin nota crédito»: filtran la tabla sobre lo cargado. */
  foco: 'atrasadas' | 'sinNota' | null = null;
  fechaDesde = '';
  fechaHasta = '';

  cargando = false;
  error = '';
  tablero: TableroDevoluciones | null = null;

  private destroy$ = new Subject<void>();

  constructor(private devoluciones: DevolucionPagoService) {
    // Devueltos: por defecto el mes en curso (hora de Colombia).
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    this.fechaDesde = `${hoy.slice(0, 8)}01`;
    this.fechaHasta = hoy;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['active'] && this.active) this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get puedeMarcar(): boolean {
    try {
      return puedeMarcarDevolucion(JSON.parse(localStorage.getItem('user') || '{}')?.rol);
    } catch {
      return false;
    }
  }

  get filas(): FilaDevolucion[] {
    const filas = this.tablero?.filas || [];
    if (this.foco === 'atrasadas') return filas.filter((f) => f.estado === 'por_devolver' && f.atrasada);
    if (this.foco === 'sinNota') return filas.filter((f) => f.facturaSinNotaCredito);
    return filas;
  }

  /** Atrasadas: solo las por devolver que pasaron los días de aviso. Sin nota: devueltas y por devolver. */
  verFoco(foco: 'atrasadas' | 'sinNota' | null): void {
    this.foco = foco;
    const estado = foco === 'atrasadas' ? 'por_devolver' : foco === 'sinNota' ? 'todos' : this.estado;
    if (estado !== this.estado) {
      this.estado = estado;
      this.cargar();
    }
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.devoluciones
      .listar({ estado: this.estado, desde: this.fechaDesde, hasta: this.fechaHasta })
      .pipe(timeout(20000), takeUntil(this.destroy$))
      .subscribe({
        next: (t) => {
          this.tablero = t;
          this.cargando = false;
        },
        error: (e) => {
          this.cargando = false;
          this.error = e?.status === 403
            ? 'Solo Administración y Tesorería ven las devoluciones.'
            : 'No pudimos cargar las devoluciones. Intenta de nuevo.';
        },
      });
  }

  /** Tarjeta «Por devolver» / «Devueltos»: filtra la tabla. */
  verEstado(estado: 'por_devolver' | 'devuelto'): void {
    this.foco = null;
    this.estado = estado;
    this.cargar();
  }

  async marcar(fila: FilaDevolucion): Promise<void> {
    const registro = await abrirMarcarDevuelto(this.devoluciones, fila);
    if (!registro) return;
    this.changed.emit();
    this.cargar();
  }

  trackFila(_i: number, f: FilaDevolucion): string {
    return f.id;
  }
}
