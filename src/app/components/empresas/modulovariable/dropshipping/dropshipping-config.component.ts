import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DropshippingModule, DropshippingConfig } from '../../../../shared/models/productos/otrosprocesos';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dropshipping-config',
  templateUrl: './dropshipping-config.component.html',
  styleUrls: ['./dropshipping-config.component.scss']
})
export class DropshippingConfigComponent implements OnInit {

  dropshippingConfigForm: FormGroup;
  loading = false;
  saving = false;
  currentCompany: any;

  constructor(
    private fb: FormBuilder
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
      // Configuración avanzada
      proveedoresPermitidos: [[]],
      margenMinimoPermitido: [0, [Validators.min(0), Validators.max(100)]],
      automatizacionActivada: [false],
      notificacionesActivadas: [true],
      tiempoLimiteOrden: [7, [Validators.min(1), Validators.max(30)]]
    });
  }

  loadCurrentCompany(): void {
    const currentCompanyStr = localStorage.getItem('currentCompany');
    if (currentCompanyStr) {
      this.currentCompany = JSON.parse(currentCompanyStr);
    }
  }

  loadDropshippingConfig(): void {
    this.loading = true;
    
    // Aquí implementarías la carga desde Firebase/Backend
    // Por ahora simulamos la carga
    setTimeout(() => {
      // Cargar configuración existente si existe
      const existingConfig = this.getCurrentDropshippingConfig();
      
      if (existingConfig) {
        this.dropshippingConfigForm.patchValue({
          habilitado: existingConfig.habilitado,
          margenMinimoPermitido: existingConfig.configuracion?.margenMinimoPermitido || 0,
          automatizacionActivada: existingConfig.configuracion?.automatizacionActivada || false,
          notificacionesActivadas: existingConfig.configuracion?.notificacionesActivadas || true,
          tiempoLimiteOrden: existingConfig.configuracion?.tiempoLimiteOrden || 7
        });
      }
      
      this.loading = false;
    }, 500);
  }

  getCurrentDropshippingConfig(): DropshippingModule | null {
    try {
      const currentCompany = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      const companyId = currentCompany.id || currentCompany._id || 'default';
      const configKey = `dropshippingConfig_${companyId}`;
      
      const savedConfig = localStorage.getItem(configKey);
      if (savedConfig) {
        return JSON.parse(savedConfig) as DropshippingModule;
      }
      return null;
    } catch (error) {
      console.error('Error loading dropshipping config from localStorage:', error);
      return null;
    }
  }

  onSubmit(): void {
    if (this.dropshippingConfigForm.valid) {
      this.saving = true;

      const dropshippingConfig: DropshippingModule = {
        habilitado: this.dropshippingConfigForm.get('habilitado')?.value,
        fechaActivacion: this.dropshippingConfigForm.get('habilitado')?.value ? new Date().toISOString() : undefined,
        configuracion: {
          margenMinimoPermitido: this.dropshippingConfigForm.get('margenMinimoPermitido')?.value,
          automatizacionActivada: this.dropshippingConfigForm.get('automatizacionActivada')?.value,
          notificacionesActivadas: this.dropshippingConfigForm.get('notificacionesActivadas')?.value,
          tiempoLimiteOrden: this.dropshippingConfigForm.get('tiempoLimiteOrden')?.value,
          proveedoresPermitidos: this.dropshippingConfigForm.get('proveedoresPermitidos')?.value
        }
      };

      // Guardado en localStorage para pruebas
      this.saveDropshippingConfigToLocalStorage(dropshippingConfig);
    } else {
      this.markFormGroupTouched();
    }
  }

  saveDropshippingConfigToLocalStorage(config: DropshippingModule): void {
    try {
      const currentCompany = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      const companyId = currentCompany.id || currentCompany._id || 'default';
      const configKey = `dropshippingConfig_${companyId}`;
      
      // Agregar metadata al guardado
      const configWithMetadata = {
        ...config,
        lastUpdated: new Date().toISOString(),
        companyId: companyId,
        companyName: currentCompany.nomComercial || 'Empresa'
      };
      
      // Guardar en localStorage
      localStorage.setItem(configKey, JSON.stringify(configWithMetadata));
      
      // También guardar en una lista general para fácil acceso
      const allConfigs = JSON.parse(localStorage.getItem('allDropshippingConfigs') || '{}');
      allConfigs[companyId] = configWithMetadata;
      localStorage.setItem('allDropshippingConfigs', JSON.stringify(allConfigs));
      
      this.saving = false;
      
      Swal.fire({
        title: '¡Configuración Guardada en LocalStorage!',
        html: `
          <div style="text-align: left; margin: 20px 0;">
            <p><strong>Estado del Dropshipping:</strong> ${config.habilitado ? '<span class="text-success">Habilitado</span>' : '<span class="text-danger">Deshabilitado</span>'}</p>
            <p><strong>Empresa:</strong> ${this.currentCompany.nomComercial}</p>
            <p><strong>Guardado en:</strong> ${configKey}</p>
            ${config.habilitado ? `
              <hr>
              <p><strong>Configuraciones aplicadas:</strong></p>
              <ul>
                <li>Margen mínimo permitido: ${config.configuracion?.margenMinimoPermitido}%</li>
                <li>Automatización: ${config.configuracion?.automatizacionActivada ? 'Activada' : 'Desactivada'}</li>
                <li>Notificaciones: ${config.configuracion?.notificacionesActivadas ? 'Activadas' : 'Desactivadas'}</li>
                <li>Tiempo límite de orden: ${config.configuracion?.tiempoLimiteOrden} días</li>
              </ul>
            ` : ''}
            <hr>
            <p><small class="text-muted">Nota: Esta configuración se guarda en localStorage para efectos de prueba.</small></p>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Perfecto',
        confirmButtonColor: '#28a745'
      });

      // Si se habilitó dropshipping, actualizar navegación
      if (config.habilitado) {
        this.updateNavigationMenu();
      }

    } catch (error) {
      this.saving = false;
      console.error('Error saving dropshipping config to localStorage:', error);
      
      Swal.fire({
        title: 'Error al Guardar',
        text: 'Ocurrió un error al guardar la configuración en localStorage',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  }

  updateNavigationMenu(): void {
    // Aquí implementarías la actualización de authorizedMenuItems
    // para incluir las rutas de dropshipping
    console.log('Actualizando menú de navegación con rutas de dropshipping...');
  }

  onHabilitadoChange(): void {
    const habilitado = this.dropshippingConfigForm.get('habilitado')?.value;
    
    if (!habilitado) {
      // Si se deshabilita, mostrar advertencia
      Swal.fire({
        title: '¿Deshabilitar Dropshipping?',
        text: 'Al deshabilitar dropshipping, los usuarios no podrán configurar nuevos productos de dropshipping. Los productos ya configurados mantendrán su configuración.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, deshabilitar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545'
      }).then((result) => {
        if (!result.isConfirmed) {
          // Si cancela, volver a habilitar
          this.dropshippingConfigForm.patchValue({ habilitado: true });
        }
      });
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.dropshippingConfigForm.controls).forEach(key => {
      const control = this.dropshippingConfigForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.dropshippingConfigForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.dropshippingConfigForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['min']) return `El valor mínimo es ${field.errors['min'].min}`;
      if (field.errors['max']) return `El valor máximo es ${field.errors['max'].max}`;
    }
    return '';
  }

  resetToDefaults(): void {
    Swal.fire({
      title: '¿Restablecer Configuración?',
      text: 'Se restablecerán todos los valores a su configuración por defecto',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, restablecer',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.dropshippingConfigForm.reset({
          habilitado: false,
          margenMinimoPermitido: 0,
          automatizacionActivada: false,
          notificacionesActivadas: true,
          tiempoLimiteOrden: 7
        });
      }
    });
  }

  /**
   * Método para limpiar todas las configuraciones de dropshipping guardadas en localStorage
   * (útil para pruebas y desarrollo)
   */
  clearAllDropshippingConfigs(): void {
    Swal.fire({
      title: '⚠️ Limpiar Configuraciones de Prueba',
      html: `
        <p>Esta acción eliminará <strong>todas las configuraciones de dropshipping</strong> guardadas en localStorage para todas las empresas.</p>
        <p class="text-danger"><strong>Nota:</strong> Esta opción es solo para efectos de prueba y desarrollo.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar todo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          // Obtener todas las configuraciones existentes
          const allConfigs = JSON.parse(localStorage.getItem('allDropshippingConfigs') || '{}');
          const configKeys = Object.keys(allConfigs);
          
          // Eliminar cada configuración individual
          configKeys.forEach(companyId => {
            localStorage.removeItem(`dropshippingConfig_${companyId}`);
          });
          
          // Eliminar la lista general
          localStorage.removeItem('allDropshippingConfigs');
          
          // Resetear el formulario
          this.dropshippingConfigForm.reset({
            habilitado: false,
            margenMinimoPermitido: 0,
            automatizacionActivada: false,
            notificacionesActivadas: true,
            tiempoLimiteOrden: 7
          });

          Swal.fire({
            title: '🧹 Configuraciones Limpiadas',
            text: `Se eliminaron ${configKeys.length} configuraciones de dropshipping del localStorage`,
            icon: 'success',
            confirmButtonText: 'Entendido'
          });

        } catch (error) {
          console.error('Error clearing dropshipping configs:', error);
          Swal.fire({
            title: 'Error',
            text: 'Ocurrió un error al limpiar las configuraciones',
            icon: 'error',
            confirmButtonText: 'Entendido'
          });
        }
      }
    });
  }

  /**
   * Método para ver todas las configuraciones guardadas en localStorage
   * (útil para debugging y pruebas)
   */
  viewAllConfigs(): void {
    try {
      const allConfigs = JSON.parse(localStorage.getItem('allDropshippingConfigs') || '{}');
      const configCount = Object.keys(allConfigs).length;

      if (configCount === 0) {
        Swal.fire({
          title: 'Sin Configuraciones',
          text: 'No hay configuraciones de dropshipping guardadas en localStorage',
          icon: 'info',
          confirmButtonText: 'Entendido'
        });
        return;
      }

      let configsHtml = '<div style="text-align: left;">';
      Object.keys(allConfigs).forEach(companyId => {
        const config = allConfigs[companyId];
        configsHtml += `
          <div class="mb-3 p-2" style="border: 1px solid #ddd; border-radius: 5px;">
            <strong>Empresa:</strong> ${config.companyName || companyId}<br>
            <strong>Estado:</strong> ${config.habilitado ? '<span class="text-success">Habilitado</span>' : '<span class="text-danger">Deshabilitado</span>'}<br>
            <strong>Última actualización:</strong> ${new Date(config.lastUpdated).toLocaleString()}<br>
            <strong>Key:</strong> <code>dropshippingConfig_${companyId}</code>
          </div>
        `;
      });
      configsHtml += '</div>';

      Swal.fire({
        title: `📋 Configuraciones en localStorage (${configCount})`,
        html: configsHtml,
        icon: 'info',
        confirmButtonText: 'Cerrar',
        width: '600px'
      });

    } catch (error) {
      console.error('Error viewing configs:', error);
      Swal.fire({
        title: 'Error',
        text: 'Ocurrió un error al cargar las configuraciones',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  }

  /**
   * Cuenta las configuraciones de dropshipping en localStorage
   */
  getDropshippingKeysCount(): number {
    try {
      const allKeys = Object.keys(localStorage);
      return allKeys.filter(key => key.includes('dropshipping')).length;
    } catch (error) {
      return 0;
    }
  }
}