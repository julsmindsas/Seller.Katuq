import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import {
  DropshippingAjustes,
  DropshippingAjustesEntrada,
  DropshippingSettingsService,
} from '../../../../shared/services/dropshipping-settings.service';

import { TranslateService } from '@ngx-translate/core';
/** Roles que el servidor deja guardar (ONLY_ADMIN de routers/companies.js). */
const ROLES_QUE_GUARDAN = ['Administrador', 'Super Administrador'];

/**
 * Configuración de Dropshipping de la empresa (D-403). Lee y guarda en el servidor
 * (`/v1/companies/dropshipping-settings`); antes vivía solo en el localStorage del
 * navegador. La conexión por API se configura en cada proveedor, no aquí.
 */
@Component({
  selector: 'app-dropshipping-config',
  templateUrl: './dropshipping-config.component.html',
  styleUrls: ['./dropshipping-config.component.scss']
})
export class DropshippingConfigComponent implements OnInit {

  dropshippingConfigForm: FormGroup;
  loading = false;
  saving = false;
  errorCarga = '';
  currentCompany: any;
  readonly puedeGuardar = ROLES_QUE_GUARDAN.includes(JSON.parse(localStorage.getItem('user') || '{}').rol);

  constructor(
    private fb: FormBuilder,
    private settings: DropshippingSettingsService,
    private translate: TranslateService,
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadCurrentCompany();
    this.loadDropshippingConfig();
  }

  initializeForm(): void {
    this.dropshippingConfigForm = this.fb.group({
      habilitado: [false, [Validators.required]],
      proveedoresPermitidos: [[]],
      margenMinimoPermitido: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      automatizacionActivada: [false],
      notificacionesActivadas: [true],
      tiempoLimiteOrden: [7, [Validators.required, Validators.min(1), Validators.max(30)]],
    });
    if (!this.puedeGuardar) {
      this.dropshippingConfigForm.disable();
    }
  }

  loadCurrentCompany(): void {
    const currentCompanyStr = localStorage.getItem('currentCompany');
    if (currentCompanyStr) {
      this.currentCompany = JSON.parse(currentCompanyStr);
    }
  }

  loadDropshippingConfig(): void {
    this.loading = true;
    this.errorCarga = '';
    this.settings.obtener().subscribe({
      next: (ajustes) => {
        this.aplicarAlFormulario(ajustes);
        this.loading = false;
        this.revisarCopiaLocal(ajustes);
      },
      error: () => {
        this.loading = false;
        this.errorCarga = this.translate.instant('empresas.dropshippingConfig.noPudimosCargarConfiguracion');
      }
    });
  }

  private aplicarAlFormulario(ajustes: DropshippingAjustes): void {
    const c = ajustes.configuracion;
    this.dropshippingConfigForm.reset({
      habilitado: ajustes.habilitado,
      proveedoresPermitidos: c.proveedoresPermitidos,
      margenMinimoPermitido: c.margenMinimoPermitido,
      automatizacionActivada: c.automatizacionActivada,
      notificacionesActivadas: c.notificacionesActivadas,
      tiempoLimiteOrden: c.tiempoLimiteOrden,
    });
  }

  // ── Migración de una sola vez: la copia que quedó en este navegador ──────────

  private llavesLocales(): { llave: string; datos: any } | null {
    try {
      const id = this.currentCompany?.id || this.currentCompany?._id || 'default';
      const propia = localStorage.getItem(`dropshippingConfig_${id}`);
      if (propia) return { llave: `dropshippingConfig_${id}`, datos: JSON.parse(propia) };
      const todas = JSON.parse(localStorage.getItem('allDropshippingConfigs') || '{}');
      return todas[id] ? { llave: `dropshippingConfig_${id}`, datos: todas[id] } : null;
    } catch {
      return null;
    }
  }

  private borrarCopiaLocal(): void {
    try {
      const todas = JSON.parse(localStorage.getItem('allDropshippingConfigs') || '{}');
      Object.keys(todas).forEach((id) => localStorage.removeItem(`dropshippingConfig_${id}`));
      Object.keys(localStorage)
        .filter((llave) => llave.startsWith('dropshippingConfig_'))
        .forEach((llave) => localStorage.removeItem(llave));
      localStorage.removeItem('allDropshippingConfigs');
    } catch {
      // Sin almacenamiento no hay copia que borrar.
    }
  }

  private revisarCopiaLocal(ajustes: DropshippingAjustes): void {
    const local = this.llavesLocales();
    if (!local) return;

    // El servidor ya tiene configuración: manda la del servidor y la copia sobra.
    if (ajustes.configurado) {
      this.borrarCopiaLocal();
      return;
    }
    // Solo quien puede guardar decide si la sube.
    if (!this.puedeGuardar) return;

    Swal.fire({
      title: this.translate.instant('empresas.dropshippingConfig.encontramosUnaConfiguracionEnEste'),
      text: this.translate.instant('empresas.dropshippingConfig.quieresGuardarlaParaTodaLa'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('empresas.dropshippingConfig.siGuardarla'),
      cancelButtonText: this.translate.instant('empresas.dropshippingConfig.noDescartarla'),
      confirmButtonColor: '#5F3FE0',
    }).then((r) => {
      if (!r.isConfirmed) {
        this.borrarCopiaLocal();
        return;
      }
      const c = local.datos?.configuracion || {};
      this.guardar({
        habilitado: local.datos?.habilitado === true,
        configuracion: {
          margenMinimoPermitido: Number(c.margenMinimoPermitido ?? 0),
          tiempoLimiteOrden: Math.round(Number(c.tiempoLimiteOrden ?? 7)),
          automatizacionActivada: c.automatizacionActivada === true,
          notificacionesActivadas: c.notificacionesActivadas !== false,
          proveedoresPermitidos: Array.isArray(c.proveedoresPermitidos) ? c.proveedoresPermitidos : [],
        },
      }, () => this.borrarCopiaLocal());
    });
  }

  // ── Guardar ─────────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (!this.puedeGuardar) return;
    if (this.dropshippingConfigForm.invalid) {
      this.markFormGroupTouched();
      return;
    }
    const v = this.dropshippingConfigForm.getRawValue();
    this.guardar({
      habilitado: v.habilitado === true,
      configuracion: {
        margenMinimoPermitido: Number(v.margenMinimoPermitido),
        tiempoLimiteOrden: Number(v.tiempoLimiteOrden),
        automatizacionActivada: v.automatizacionActivada === true,
        notificacionesActivadas: v.notificacionesActivadas === true,
        proveedoresPermitidos: v.proveedoresPermitidos || [],
      },
    });
  }

  private guardar(entrada: DropshippingAjustesEntrada, alGuardar?: () => void): void {
    this.saving = true;
    this.settings.guardar(entrada).subscribe({
      next: (ajustes) => {
        this.saving = false;
        this.aplicarAlFormulario(ajustes);
        alGuardar?.();
        Swal.fire({
          title: this.translate.instant('empresas.dropshippingConfig.configuracionGuardada'),
          text: ajustes.habilitado
            ? this.translate.instant('empresas.dropshippingConfig.dropshippingQuedoHabilitadoParaToda')
            : this.translate.instant('empresas.dropshippingConfig.dropshippingQuedoDeshabilitadoParaToda'),
          icon: 'success',
          confirmButtonText: this.translate.instant('comun.entendido'),
          confirmButtonColor: '#5F3FE0'
        });
      },
      error: (err) => {
        this.saving = false;
        // Un 403 (rol o plan) ya lo explica el interceptor con su aviso.
        if (err?.status === 403) return;
        Swal.fire({
          title: this.translate.instant('empresas.crearEmpresa.noSePudoGuardar'),
          text: err?.error?.error || err?.error?.message || this.translate.instant('empresas.dropshippingConfig.ocurrioUnErrorAlGuardar'),
          icon: 'error',
          confirmButtonText: this.translate.instant('comun.entendido'),
          confirmButtonColor: '#5F3FE0'
        });
      }
    });
  }

  onHabilitadoChange(): void {
    const habilitado = this.dropshippingConfigForm.get('habilitado')?.value;

    if (!habilitado) {
      Swal.fire({
        title: this.translate.instant('empresas.dropshippingConfig.deshabilitarDropshipping'),
        text: this.translate.instant('empresas.dropshippingConfig.alDeshabilitarDropshippingLosUsuarios'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: this.translate.instant('empresas.dropshippingConfig.siDeshabilitar'),
        cancelButtonText: this.translate.instant('comun.cancelar'),
        confirmButtonColor: '#D64545'
      }).then((result) => {
        if (!result.isConfirmed) {
          this.dropshippingConfigForm.patchValue({ habilitado: true });
        }
      });
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.dropshippingConfigForm.controls).forEach(key => {
      this.dropshippingConfigForm.get(key)?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.dropshippingConfigForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.dropshippingConfigForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return this.translate.instant('empresas.dropshippingConfig.esteCampoEsRequerido');
      if (field.errors['min']) return this.translate.instant('empresas.dropshippingConfig.valorMinimo', {min: field.errors['min'].min});
      if (field.errors['max']) return this.translate.instant('empresas.dropshippingConfig.valorMaximo', {max: field.errors['max'].max});
    }
    return '';
  }

  resetToDefaults(): void {
    Swal.fire({
      title: this.translate.instant('empresas.dropshippingConfig.restablecerConfiguracion'),
      text: this.translate.instant('empresas.dropshippingConfig.seRestableceranTodosLosValores'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('empresas.dropshippingConfig.siRestablecer'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      confirmButtonColor: '#5F3FE0'
    }).then((result) => {
      if (result.isConfirmed) {
        this.dropshippingConfigForm.reset({
          habilitado: false,
          proveedoresPermitidos: [],
          margenMinimoPermitido: 0,
          automatizacionActivada: false,
          notificacionesActivadas: true,
          tiempoLimiteOrden: 7,
        });
      }
    });
  }
}
