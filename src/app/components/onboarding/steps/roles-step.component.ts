import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { Role, Menu, RECOMMENDED_PERMISSIONS } from '../../../shared/models/roles/roles';

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
    private maestroService: MaestroService
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
        summary: 'Formulario Incompleto',
        detail: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    const roleData: Role = this.roleForm.value;

    // Verificar que tenga al menos un permiso
    if (!roleData.permissions || roleData.permissions.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Permisos Requeridos',
        detail: 'Debes seleccionar al menos un permiso para este rol'
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
        summary: 'Nombre Duplicado',
        detail: 'Ya existe un rol con este nombre'
      });
      return;
    }

    if (this.editingIndex !== null) {
      // Editar rol existente
      this.rolesList[this.editingIndex] = roleData;
      this.editingIndex = null;
      this.messageService.add({
        severity: 'success',
        summary: 'Actualizado',
        detail: 'Rol actualizado correctamente'
      });
    } else {
      // Agregar nuevo rol
      this.rolesList.push(roleData);
      this.messageService.add({
        severity: 'success',
        summary: 'Agregado',
        detail: 'Rol agregado a la lista'
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
      summary: 'Eliminado',
      detail: `Rol "${role.rol}" eliminado`
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
        summary: 'Configuración Incompleta',
        detail: 'Debes agregar al menos un rol para continuar'
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
        summary: 'Guardado',
        detail: `${this.rolesList.length} rol(es) configurado(s) correctamente`
      });
    } catch (error) {
      console.error('Error guardando roles:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar la configuración de roles'
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
