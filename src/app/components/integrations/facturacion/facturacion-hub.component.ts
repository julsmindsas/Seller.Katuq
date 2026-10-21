import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { CompanyFeaturesService } from '../../../shared/services/company-features.service';
import {
  CambioHistorial,
  EstadoFacturacion,
  FacturacionIntegracionService,
  ProveedorDelResumen,
  ResumenFacturacion,
} from '../../../shared/services/facturacion/facturacion-integracion.service';
import { ProveedorContableId, TipoDocumentoFactura } from '../../../shared/services/facturacion/facturacion-automatica.util';
import { asistenteDe } from './facturacion-asistentes.registry';

import { TranslateService } from '@ngx-translate/core';
interface Aviso {
  tipo: 'ok' | 'warn' | 'error' | 'info';
  texto: string;
}

const ESTADOS: Record<EstadoFacturacion, { texto: string; clase: string }> = {
  connected: { texto: 'Conectado', clase: 'fh-estado--ok' },
  testing: { texto: 'En pruebas', clase: 'fh-estado--prueba' },
  error: { texto: 'Con error', clase: 'fh-estado--error' },
  unconfigured: { texto: 'Sin configurar', clase: 'fh-estado--sin' },
};

const TIPOS: { id: TipoDocumentoFactura; nombre: string }[] = [
  { id: 'orderInvoice', nombre: 'Facturas de pedidos' },
  { id: 'posInvoice', nombre: 'Ventas POS' },
  { id: 'manualInvoice', nombre: 'Factura libre (Nueva factura)' },
];

const ACCIONES: Record<string, string> = {
  CREATE: 'Configuración creada',
  UPDATE: 'Configuración editada',
  DEACTIVATE: 'Desactivado',
  INVOICING_CHOICE: 'Proveedor elegido',
};

/**
 * D-500 (ticket 1260, FE-01): Facturación electrónica en Integraciones.
 * Elegir con quién factura la empresa, por tipo de documento, ver el estado, probar la conexión y
 * ver el historial. Solo presentación y llamadas a `/v1/accounting/invoicing/*`: el servidor valida
 * roles, bandera, versión y facturas en proceso. Base D-400 (`cfg-*`), sin gradientes.
 */
@Component({
  selector: 'app-facturacion-hub',
  templateUrl: './facturacion-hub.component.html',
  styleUrls: ['./facturacion-hub.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacturacionHubComponent implements OnInit, OnDestroy {
  readonly tipos = TIPOS;
  readonly encendida: boolean;

  cargando = true;
  errorCarga = false;
  resumen: ResumenFacturacion | null = null;
  aviso: Aviso | null = null;

  /** Elección en edición. */
  general: ProveedorContableId | null = null;
  porTipo: Partial<Record<TipoDocumentoFactura, ProveedorContableId | ''>> = {};
  guardando = false;

  probando: Partial<Record<ProveedorContableId, boolean>> = {};
  historialDe: ProveedorContableId | 'invoicing' | null = null;
  historial: CambioHistorial[] = [];
  cargandoHistorial = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly servicio: FacturacionIntegracionService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    features: CompanyFeaturesService,
    private translate: TranslateService,
  ) {
    this.encendida = features.isEnabled('invoicingHub');
  }

  ngOnInit(): void {
    if (this.encendida) this.cargar();
    else this.cargando = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.cargando = true;
    this.errorCarga = false;
    this.servicio
      .resumen()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (r) => {
          this.resumen = r;
          this.general = r.choice?.defaultProvider || r.provider;
          this.porTipo = { ...(r.choice?.byDocumentType || {}) };
        },
        error: () => (this.errorCarga = true),
      });
  }

  // ── Lectura para la plantilla ──

  estado(): { texto: string; clase: string } {
    return ESTADOS[this.resumen?.status || 'unconfigured'];
  }

  nombreDe(id: string | null | undefined): string {
    return this.resumen?.providers.find((p) => p.id === id)?.name || '';
  }

  elegibles(tipo?: TipoDocumentoFactura): ProveedorDelResumen[] {
    return (this.resumen?.providers || []).filter((p) => p.selectable && p.configured && (!tipo || p.documentTypes.includes(tipo)));
  }

  /** Los que se pueden configurar todavía (World Office solo si ya existe: no se ofrece desde cero). */
  porConfigurar(): ProveedorDelResumen[] {
    return (this.resumen?.providers || []).filter((p) => !p.configured && p.id !== 'world_office');
  }

  configurados(): ProveedorDelResumen[] {
    return (this.resumen?.providers || []).filter((p) => p.configured);
  }

  hayCambios(): boolean {
    const r = this.resumen;
    if (!r || !this.general) return false;
    const actual = r.choice;
    if (!actual) return true; // primera elección
    if (actual.defaultProvider !== this.general) return true;
    const limpio = (o: Partial<Record<string, string>>) => JSON.stringify(Object.entries(o || {}).filter(([, v]) => !!v).sort());
    return limpio(actual.byDocumentType) !== limpio(this.porTipo);
  }

  puedeVolver(): boolean {
    const previo = this.resumen?.choice?.previousDefaultProvider;
    return !!previo && previo !== this.resumen?.choice?.defaultProvider && this.elegibles().some((p) => p.id === previo);
  }

  textoAccion(a: string | null): string {
    return (a && ACCIONES[a]) || a || '';
  }

  // ── Acciones ──

  async guardar(): Promise<void> {
    const r = this.resumen;
    if (!r || !this.general || this.guardando || !r.canSwitch) return;
    const nuevo = this.nombreDe(this.general);
    const anterior = r.choice ? this.nombreDe(r.choice.defaultProvider) : r.providerName;
    const confirmacion = await Swal.fire({
      title: this.translate.instant('integrations.facturacionHub.guardarConQuienFacturas'),
      text: anterior && anterior !== nuevo
        ? this.translate.instant('integrations.facturacionHub.desdeAhoraNuevasSaldran', { nuevo, anterior })
        : this.translate.instant('integrations.facturacionHub.nuevasSaldranCon', { nuevo }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('comun.guardar'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      confirmButtonColor: '#5F3FE0',
    });
    if (!confirmacion.isConfirmed) return;

    const byDocumentType = Object.fromEntries(Object.entries(this.porTipo).filter(([, v]) => !!v)) as Partial<Record<TipoDocumentoFactura, ProveedorContableId>>;
    this.guardando = true;
    this.aviso = null;
    this.cdr.markForCheck();
    this.servicio
      .elegir({ defaultProvider: this.general, byDocumentType, version: r.version })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.guardando = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.aviso = { tipo: 'ok', texto: `Listo: las facturas nuevas saldrán con ${nuevo}.` };
          this.cargar();
        },
        error: (e) => {
          const cuerpo = e?.error || {};
          this.aviso = { tipo: cuerpo.code === 'VERSION_CONFLICT' ? 'warn' : 'error', texto: cuerpo.message || 'No se pudo guardar. Intenta de nuevo.' };
          if (cuerpo.code === 'VERSION_CONFLICT' || cuerpo.code === 'INVOICING_IN_PROGRESS') this.cargar();
        },
      });
  }

  volverAlAnterior(): void {
    const previo = this.resumen?.choice?.previousDefaultProvider;
    if (!previo) return;
    this.general = previo;
    this.porTipo = {};
    this.guardar();
  }

  probar(id: ProveedorContableId): void {
    if (this.probando[id]) return;
    this.probando = { ...this.probando, [id]: true };
    this.aviso = null;
    this.cdr.markForCheck();
    this.servicio
      .probarConexion(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.probando = { ...this.probando, [id]: false };
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (r) => {
          this.aviso = { tipo: r.ok ? 'ok' : 'error', texto: `${this.nombreDe(id)}: ${r.message}` };
          this.cargar();
        },
        error: (e) => (this.aviso = { tipo: 'error', texto: e?.error?.message || 'No se pudo probar la conexión.' }),
      });
  }

  configurar(id: string): void {
    const asistente = asistenteDe(id);
    if (asistente) this.router.navigateByUrl(asistente.ruta);
  }

  etiquetaConfigurar(id: string): string {
    return asistenteDe(id)?.etiqueta || 'Configurar';
  }

  verHistorial(id: ProveedorContableId | 'invoicing'): void {
    this.historialDe = id;
    this.cargandoHistorial = true;
    this.historial = [];
    this.cdr.markForCheck();
    this.servicio
      .historial(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.cargandoHistorial = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (r) => (this.historial = r.items || []),
        error: () => (this.historial = []),
      });
  }

  irAFacturas(): void {
    this.router.navigateByUrl('/facturacion-electronica');
  }

  trackId(_: number, p: { id: string }): string {
    return p.id;
  }
}
