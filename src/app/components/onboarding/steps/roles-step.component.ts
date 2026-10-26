import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { Role, Menu, RECOMMENDED_PERMISSIONS } from '../../../shared/models/roles/roles';

import { TranslateService } from '@ngx-translate/core';
/**
 * Step: Roles Configuration
 * Configuración de roles y permisos de usuario
 */
@Component({
  selector: 'app-roles-step',
  templateUrl: './roles-step.component.html',
  styleUrls: ['./roles-step.component.scss']
})
export class RolesStepComponent implements OnInit, OnDestroy {
  @Input() initialData: any = null;
  @Input() aiSuggestion: any = null;

  @Output() dataChange = new EventEmitter<any>();
  @Output() stepComplete = new EventEmitter<any>();

  private destroy$ = new Subject<void>();

  roleForm!: FormGroup;
  rolesList: Role[] = [];
  isLoading = false;
  isSaving = false;
  editingIndex: number | null = null;

  // Plantillas predefinidas usando RECOMMENDED_PERMISSIONS
  predefinedTemplates = [
    {
      rol: 'Administrador',
      permissions: RECOMMENDED_PERMISSIONS.Administrador
    },
    {
      rol: 'Usuario',
      permissions: RECOMMENDED_PERMISSIONS.Usuario
    },
    {
      rol: 'Invitado',
      permissions: RECOMMENDED_PERMISSIONS.Invitado
    }
  ];

  // Opciones de permisos disponibles
  availablePermissions = [
    { label: 'Ver Dashboard', value: 'ver_dashboard' },
    { label: 'Gestionar Usuarios', value: 'gestionar_usuarios' },
    { label: 'Gestionar Roles', value: 'gestionar_roles' },
    { label: 'Ver Reportes', value: 'ver_reportes' },
    { label: 'Gestionar Configuraciones', value: 'gestionar_configuraciones' },
    { label: 'Gestionar Inventario', value: 'gestionar_inventario' },
    { label: 'Gestionar Pedidos', value: 'gestionar_pedidos' },
    { label: 'Gestionar Productos', value: 'gestionar_productos' },
    { label: 'Gestionar Promociones', value: 'gestionar_promociones' },
    { label: 'Gestionar Notificaciones', value: 'gestionar_notificaciones' },
    { label: 'Ver Inventario', value: 'ver_inventario' },
    { label: 'Ver Pedidos', value: 'ver_pedidos' },
    { label: 'Ver Productos', value: 'ver_productos' }
  ];

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private maestroService: MaestroService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa el formulario reactivo
   */
  private initForm(): void {
    this.roleForm = this.fb.group({
      rol: ['', [Validators.required, Validators.minLength(3)]],
      permissions: [[], [Validators.required]]
    });
  }

  /**
   * Carga datos iniciales si existen
   */
  private loadInitialData(): void {
    if (this.initialData?.data && Array.isArray(this.initialData.data)) {
      this.rolesList = this.initialData.data;

      // Auto-completar si ya hay roles configurados
      if (this.rolesList.length > 0) {
        console.log('👥 Cargando roles existentes:', this.rolesList.length);
        setTimeout(() => {
          this.stepComplete.emit({ data: this.rolesList });
        }, 0);
      }
    }

    // Aplicar sugerencia de IA si existe
    if (this.aiSuggestion && !this.initialData) {
      this.applySuggestion();
    }
  }

  /**
   * Aplica sugerencia de IA
   */
  applySuggestion(): void {
    if (!this.aiSuggestion?.suggestedData) return;

    if (Array.isArray(this.aiSuggestion.suggestedData)) {
      this.rolesList = this.aiSuggestion.suggestedData;
    } else if (this.aiSuggestion.suggestedData.roles) {
      this.rolesList = this.aiSuggestion.suggestedData.roles;
    }
  }

  /**
   * Usa una plantilla predefinida
   */
  useTemplate(template: any): void {
    this.roleForm.patchValue(template);
  }

  /**
   * Agrega un rol a la lista
   */
  addRole(): void {
    if (this.roleForm.invalid) {
      this.markFormAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('onboarding.billingZonesStep.formularioIncompleto'),
        detail: this.translate.instant('onboarding.billingZonesStep.porFavorCompletaTodosLos')
      });
      return;
    }

    const roleData: Role = this.roleForm.value;

    // Verificar que tenga al menos un permiso
    if (!roleData.permissions || roleData.permissions.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('onboarding.rolesStep.permisosRequeridos'),
        detail: this.translate.instant('onboarding.rolesStep.debesSeleccionarAlMenosUn')
      });
      return;
    }

    // Verificar que no exista ya un rol con el mismo nombre
    const existsName = this.rolesList.some(
      (r, idx) => r.rol.toLowerCase() === roleData.rol.toLowerCase() && idx !== this.editingIndex
    );

    if (existsName) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('onboarding.billingZonesStep.nombreDuplicado'),
        detail: this.translate.instant('onboarding.rolesStep.yaExisteUnRolCon')
      });
      return;
    }

    if (this.editingIndex !== null) {
      // Editar rol existente
      this.rolesList[this.editingIndex] = roleData;
      this.editingIndex = null;
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('onboarding.billingZonesStep.actualizado'),
        detail: this.translate.instant('onboarding.rolesStep.rolActualizadoCorrectamente')
      });
    } else {
      // Agregar nuevo rol
      this.rolesList.push(roleData);
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('onboarding.billingZonesStep.agregado'),
        detail: this.translate.instant('onboarding.rolesStep.rolAgregadoALaLista')
      });
    }

    this.roleForm.reset({ permissions: [] });
    this.dataChange.emit({ data: this.rolesList });
  }

  /**
   * Edita un rol de la lista
   */
  editRole(index: number): void {
    this.editingIndex = index;
    const role = this.rolesList[index];
    this.roleForm.patchValue(role);

    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Cancela la edición
   */
  cancelEdit(): void {
    this.editingIndex = null;
    this.roleForm.reset({ permissions: [] });
  }

  /**
   * Elimina un rol de la lista
   */
  removeRole(index: number): void {
    const role = this.rolesList[index];
    this.rolesList.splice(index, 1);
    this.dataChange.emit({ data: this.rolesList });

    this.messageService.add({
      severity: 'info',
      summary: this.translate.instant('onboarding.billingZonesStep.eliminado'),
      detail: this.translate.instant('onboarding.rolesStep.rolEliminado', { nombre: role.rol })
    });

    // Si estaba editando este rol, cancelar
    if (this.editingIndex === index) {
      this.cancelEdit();
    }
  }

  /**
   * Completa el paso y guarda los roles
   */
  async onComplete(): Promise<void> {
    if (this.rolesList.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('onboarding.billingZonesStep.configuracionIncompleta'),
        detail: this.translate.instant('onboarding.rolesStep.debesAgregarAlMenosUn')
      });
      return;
    }

    this.isSaving = true;

    try {
      const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');

      // Crear roles en el backend
      for (const role of this.rolesList) {
        const roleData = {
          ...role,
          empresa: company.nomComercial || company.nombre,
          menus: role.menus || [],
          date_edit: new Date(),
          user_edit: 'onboarding'
        };

        // Nota: Si el servicio tiene un método específico para crear roles, úsalo aquí
        // await this.maestroService.createRole(roleData).toPromise();
        // Por ahora guardamos en la data del paso
      }

      console.log('👥 Roles guardados:', this.rolesList.length);
      this.stepComplete.emit({ data: this.rolesList });

      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('onboarding.billingZonesStep.guardado'),
        detail: this.translate.instant('onboarding.rolesStep.rolesConfiguradosDetalle', { cantidad: this.rolesList.length })
      });
    } catch (error) {
      console.error('Error guardando roles:', error);
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('comun.error'),
        detail: this.translate.instant('onboarding.rolesStep.noSePudoGuardarLa')
      });
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Obtiene los nombres de los permisos seleccionados
   */
  getPermissionLabels(permissions: string[]): string[] {
    if (!permissions || permissions.length === 0) return [];
    return permissions.map(p => {
      const found = this.availablePermissions.find(ap => ap.value === p);
      return found ? found.label : p;
    });
  }

  /**
   * Marca todos los campos del formulario como touched
   */
  private markFormAsTouched(): void {
    Object.keys(this.roleForm.controls).forEach(key => {
      this.roleForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Verifica si un campo tiene error
   */
  hasError(field: string, error: string): boolean {
    const control = this.roleForm.get(field);
    return !!(control?.hasError(error) && (control?.dirty || control?.touched));
  }

  /**
   * Obtiene el mensaje de error para un campo
   */
  getErrorMessage(field: string): string {
    const control = this.roleForm.get(field);

    if (control?.hasError('required')) {
      return 'Este campo es requerido';
    }

    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }

    return '';
  }
}
