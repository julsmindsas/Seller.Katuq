# Remaining Onboarding Step Components - Complete Code

This document contains the complete implementation code for the remaining 3 onboarding step components.

## 7. ROLES-STEP COMPONENT

### roles-step.component.ts
```typescript
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { Role, RECOMMENDED_PERMISSIONS } from '../../../shared/models/roles/roles';

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
  rolesList: Partial<Role>[] = [];
  isLoading = false;
  isSaving = false;
  editingIndex: number | null = null;

  // Permisos disponibles
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
    { label: 'Gestionar Notificaciones', value: 'gestionar_notificaciones' }
  ];

  // Plantillas predefinidas
  predefinedTemplates = [
    { rol: 'Administrador', permissions: RECOMMENDED_PERMISSIONS.Administrador },
    { rol: 'Vendedor', permissions: ['ver_dashboard', 'gestionar_pedidos', 'ver_productos', 'ver_inventario'] },
    { rol: 'Bodeguero', permissions: ['ver_dashboard', 'gestionar_inventario', 'ver_productos'] },
    { rol: 'Visualizador', permissions: RECOMMENDED_PERMISSIONS.Invitado }
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

  private initForm(): void {
    this.roleForm = this.fb.group({
      rol: ['', [Validators.required, Validators.minLength(3)]],
      permissions: [[], Validators.required]
    });
  }

  private loadInitialData(): void {
    if (this.initialData?.data && Array.isArray(this.initialData.data)) {
      this.rolesList = this.initialData.data;
      if (this.rolesList.length > 0) {
        setTimeout(() => {
          this.stepComplete.emit({ data: this.rolesList });
        }, 0);
      }
    }
  }

  applySuggestion(): void {
    if (!this.aiSuggestion?.suggestedData) return;
    if (Array.isArray(this.aiSuggestion.suggestedData)) {
      this.rolesList = this.aiSuggestion.suggestedData;
    }
  }

  useTemplate(template: any): void {
    this.roleForm.patchValue(template);
  }

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

    const roleData: Partial<Role> = this.roleForm.value;
    const existsName = this.rolesList.some(
      (r, idx) => r.rol?.toLowerCase() === roleData.rol?.toLowerCase() && idx !== this.editingIndex
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
      this.rolesList[this.editingIndex] = roleData;
      this.editingIndex = null;
      this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Rol actualizado correctamente' });
    } else {
      this.rolesList.push(roleData);
      this.messageService.add({ severity: 'success', summary: 'Agregado', detail: 'Rol agregado a la lista' });
    }

    this.roleForm.reset({ permissions: [] });
    this.dataChange.emit({ data: this.rolesList });
  }

  editRole(index: number): void {
    this.editingIndex = index;
    this.roleForm.patchValue(this.rolesList[index]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingIndex = null;
    this.roleForm.reset({ permissions: [] });
  }

  removeRole(index: number): void {
    const role = this.rolesList[index];
    this.rolesList.splice(index, 1);
    this.dataChange.emit({ data: this.rolesList });
    this.messageService.add({ severity: 'info', summary: 'Eliminado', detail: `Rol "${role.rol}" eliminado` });
    if (this.editingIndex === index) {
      this.cancelEdit();
    }
  }

  async onComplete(): Promise<void> {
    if (this.rolesList.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Configuración Incompleta',
        detail: 'Debes agregar al menos un rol (recomendado: Administrador)'
      });
      return;
    }

    const hasAdmin = this.rolesList.some(r => r.rol?.toLowerCase() === 'administrador');
    if (!hasAdmin) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Rol Administrador Requerido',
        detail: 'Se recomienda crear un rol de Administrador'
      });
    }

    this.isSaving = true;
    try {
      const company = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
      for (const role of this.rolesList) {
        const roleData = {
          ...role,
          empresa: company.nomComercial || company.nombre,
          menus: []
        };
        await this.maestroService.createRol(roleData).toPromise();
      }
      this.stepComplete.emit({ data: this.rolesList });
      this.messageService.add({
        severity: 'success',
        summary: 'Guardado',
        detail: `${this.rolesList.length} rol(es) configurado(s) correctamente`
      });
    } catch (error) {
      console.error('Error guardando roles:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la configuración' });
    } finally {
      this.isSaving = false;
    }
  }

  private markFormAsTouched(): void {
    Object.keys(this.roleForm.controls).forEach(key => {
      this.roleForm.get(key)?.markAsTouched();
    });
  }

  hasError(field: string, error: string): boolean {
    const control = this.roleForm.get(field);
    return !!(control?.hasError(error) && (control?.dirty || control?.touched));
  }

  getErrorMessage(field: string): string {
    const control = this.roleForm.get(field);
    if (control?.hasError('required')) return 'Este campo es requerido';
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }
    return '';
  }
}
```

### roles-step.component.html
```html
<div class="step-container">
  <div class="step-intro">
    <p class="intro-text">
      Define los roles de usuario y sus permisos. Esto controla qué pueden hacer tus usuarios en el sistema.
    </p>
  </div>

  <p-card class="templates-card">
    <ng-template pTemplate="header">
      <div class="card-header"><i class="pi pi-th-large"></i><span>Plantillas de Roles Comunes</span></div>
    </ng-template>
    <div class="templates-grid">
      <button *ngFor="let template of predefinedTemplates" pButton type="button" [label]="template.rol"
              icon="pi pi-users" class="p-button-outlined template-button" (click)="useTemplate(template)"></button>
    </div>
    <small class="field-help">Haz clic en una plantilla para cargar sus permisos predefinidos</small>
  </p-card>

  <p-card class="mt-3">
    <ng-template pTemplate="header">
      <div class="card-header"><i class="pi pi-users"></i>
        <span>{{ editingIndex !== null ? 'Editar Rol' : 'Agregar Rol' }}</span></div>
    </ng-template>
    <form [formGroup]="roleForm">
      <div class="form-grid">
        <div class="form-field col-12">
          <label for="rol" class="required">Nombre del Rol *</label>
          <input id="rol" type="text" pInputText formControlName="rol" placeholder="Ej: Administrador, Vendedor"
                 [class.p-invalid]="hasError('rol', 'required') || hasError('rol', 'minlength')" />
          <small class="p-error" *ngIf="hasError('rol', 'required') || hasError('rol', 'minlength')">
            {{ getErrorMessage('rol') }}</small>
        </div>
        <div class="form-field col-12">
          <label class="required">Permisos del Rol *</label>
          <p-multiSelect
            formControlName="permissions"
            [options]="availablePermissions"
            optionLabel="label"
            optionValue="value"
            placeholder="Selecciona los permisos"
            [filter]="true"
            [showHeader]="false"
            styleClass="w-100">
          </p-multiSelect>
          <small class="field-help">Selecciona los permisos que tendrá este rol</small>
          <small class="p-error" *ngIf="hasError('permissions', 'required')">
            Debes seleccionar al menos un permiso</small>
        </div>
      </div>
      <div class="form-actions">
        <button *ngIf="editingIndex !== null" pButton type="button" label="Cancelar" icon="pi pi-times"
                class="p-button-secondary p-button-outlined" (click)="cancelEdit()"></button>
        <button pButton type="button" [label]="editingIndex !== null ? 'Actualizar Rol' : 'Agregar a Lista'"
                [icon]="editingIndex !== null ? 'pi pi-check' : 'pi pi-plus'" class="p-button-success"
                [disabled]="roleForm.invalid" (click)="addRole()"></button>
      </div>
    </form>
  </p-card>

  <p-card *ngIf="rolesList.length > 0" class="mt-3">
    <ng-template pTemplate="header">
      <div class="card-header"><i class="pi pi-list"></i>
        <span>Roles Configurados ({{ rolesList.length }})</span></div>
    </ng-template>
    <p-table [value]="rolesList" styleClass="p-datatable-sm" responsiveLayout="scroll">
      <ng-template pTemplate="header">
        <tr><th>Rol</th><th>Permisos</th><th style="width: 140px">Acciones</th></tr>
      </ng-template>
      <ng-template pTemplate="body" let-role let-i="rowIndex">
        <tr>
          <td><strong>{{ role.rol }}</strong></td>
          <td>
            <p-tag *ngFor="let perm of role.permissions?.slice(0, 3)" [value]="perm" styleClass="mr-1 mb-1"></p-tag>
            <span *ngIf="role.permissions && role.permissions.length > 3" class="more-badge">
              +{{ role.permissions.length - 3 }} más
            </span>
          </td>
          <td>
            <div class="action-buttons">
              <button pButton type="button" icon="pi pi-pencil" class="p-button-text p-button-sm p-button-info"
                      pTooltip="Editar" (click)="editRole(i)"></button>
              <button pButton type="button" icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger"
                      pTooltip="Eliminar" (click)="removeRole(i)"></button>
            </div>
          </td>
        </tr>
      </ng-template>
    </p-table>
  </p-card>

  <div class="step-actions mt-4">
    <button pButton type="button" label="Guardar y Continuar" icon="pi pi-check" iconPos="right"
            class="p-button-success p-button-lg" [disabled]="rolesList.length === 0 || isSaving"
            [loading]="isSaving" (click)="onComplete()"></button>
    <p class="form-status" *ngIf="rolesList.length === 0">
      <i class="pi pi-info-circle"></i>Agrega al menos un rol (recomendado: Administrador)</p>
    <p class="form-status success" *ngIf="rolesList.length > 0">
      <i class="pi pi-check-circle"></i>{{ rolesList.length }} rol(es) configurado(s) - ¡Listo!</p>
  </div>
</div>
```

### roles-step.component.scss
```scss
@import './payment-methods-step.component.scss';

.more-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: var(--surface-100);
  color: var(--text-color-secondary);
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
}

::ng-deep {
  .p-multiselect {
    width: 100%;
  }

  .p-tag {
    font-size: 0.8rem;
  }
}
```

## 8. BILLING-ZONES-STEP COMPONENT

### billing-zones-step.component.ts
```typescript
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';

interface ZonaCobro {
  nombre: string;
  costoEnvio: number;
  descripcion?: string;
  activo: boolean;
}

@Component({
  selector: 'app-billing-zones-step',
  templateUrl: './billing-zones-step.component.html',
  styleUrls: ['./billing-zones-step.component.scss']
})
export class BillingZonesStepComponent implements OnInit, OnDestroy {
  @Input() initialData: any = null;
  @Input() aiSuggestion: any = null;
  @Output() dataChange = new EventEmitter<any>();
  @Output() stepComplete = new EventEmitter<any>();

  private destroy$ = new Subject<void>();
  billingZoneForm!: FormGroup;
  billingZonesList: ZonaCobro[] = [];
  isLoading = false;
  isSaving = false;
  editingIndex: number | null = null;

  // Plantillas predefinidas para Colombia
  predefinedTemplates = [
    { nombre: 'Zona 1 - Metropolitana', costoEnvio: 5000, descripcion: 'Bogotá y alrededores', activo: true },
    { nombre: 'Zona 2 - Principales Ciudades', costoEnvio: 8000, descripcion: 'Medellín, Cali, Barranquilla', activo: true },
    { nombre: 'Zona 3 - Ciudades Intermedias', costoEnvio: 10000, descripcion: 'Ciudades intermedias', activo: true },
    { nombre: 'Zona 4 - Nacional', costoEnvio: 15000, descripcion: 'Resto del país', activo: true },
    { nombre: 'Envío Gratis', costoEnvio: 0, descripcion: 'Sin costo de envío', activo: true }
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

  private initForm(): void {
    this.billingZoneForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      costoEnvio: [0, [Validators.required, Validators.min(0)]],
      descripcion: [''],
      activo: [true]
    });
  }

  private loadInitialData(): void {
    if (this.initialData?.data && Array.isArray(this.initialData.data)) {
      this.billingZonesList = this.initialData.data;
      if (this.billingZonesList.length > 0) {
        setTimeout(() => {
          this.stepComplete.emit({ data: this.billingZonesList });
        }, 0);
      }
    }
  }

  applySuggestion(): void {
    if (!this.aiSuggestion?.suggestedData) return;
    if (Array.isArray(this.aiSuggestion.suggestedData)) {
      this.billingZonesList = this.aiSuggestion.suggestedData;
    }
  }

  useTemplate(template: any): void {
    this.billingZoneForm.patchValue(template);
  }

  addBillingZone(): void {
    if (this.billingZoneForm.invalid) {
      this.markFormAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Incompleto',
        detail: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    const zoneData: ZonaCobro = this.billingZoneForm.value;
    const existsName = this.billingZonesList.some(
      (z, idx) => z.nombre.toLowerCase() === zoneData.nombre.toLowerCase() && idx !== this.editingIndex
    );

    if (existsName) {
      this.messageService.add({
        severity: 'error',
        summary: 'Nombre Duplicado',
        detail: 'Ya existe una zona de cobro con este nombre'
      });
      return;
    }

    if (this.editingIndex !== null) {
      this.billingZonesList[this.editingIndex] = zoneData;
      this.editingIndex = null;
      this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Zona de cobro actualizada correctamente' });
    } else {
      this.billingZonesList.push(zoneData);
      this.messageService.add({ severity: 'success', summary: 'Agregado', detail: 'Zona de cobro agregada a la lista' });
    }

    this.billingZoneForm.reset({ costoEnvio: 0, activo: true });
    this.dataChange.emit({ data: this.billingZonesList });
  }

  editBillingZone(index: number): void {
    this.editingIndex = index;
    this.billingZoneForm.patchValue(this.billingZonesList[index]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingIndex = null;
    this.billingZoneForm.reset({ costoEnvio: 0, activo: true });
  }

  removeBillingZone(index: number): void {
    const zone = this.billingZonesList[index];
    this.billingZonesList.splice(index, 1);
    this.dataChange.emit({ data: this.billingZonesList });
    this.messageService.add({ severity: 'info', summary: 'Eliminado', detail: `Zona de cobro "${zone.nombre}" eliminada` });
    if (this.editingIndex === index) {
      this.cancelEdit();
    }
  }

  async onComplete(): Promise<void> {
    if (this.billingZonesList.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Configuración Incompleta',
        detail: 'Debes agregar al menos una zona de cobro para continuar'
      });
      return;
    }

    this.isSaving = true;
    try {
      const company = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
      for (const zone of this.billingZonesList) {
        const zoneData = { ...zone, company: company.nomComercial || company.nombre };
        await this.maestroService.createBillingZone(zoneData).toPromise();
      }
      this.stepComplete.emit({ data: this.billingZonesList });
      this.messageService.add({
        severity: 'success',
        summary: 'Guardado',
        detail: `${this.billingZonesList.length} zona(s) de cobro configurada(s) correctamente`
      });
    } catch (error) {
      console.error('Error guardando zonas de cobro:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la configuración' });
    } finally {
      this.isSaving = false;
    }
  }

  private markFormAsTouched(): void {
    Object.keys(this.billingZoneForm.controls).forEach(key => {
      this.billingZoneForm.get(key)?.markAsTouched();
    });
  }

  hasError(field: string, error: string): boolean {
    const control = this.billingZoneForm.get(field);
    return !!(control?.hasError(error) && (control?.dirty || control?.touched));
  }

  getErrorMessage(field: string): string {
    const control = this.billingZoneForm.get(field);
    if (control?.hasError('required')) return 'Este campo es requerido';
    if (control?.hasError('min')) return 'El valor mínimo es 0';
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }
    return '';
  }
}
```

### billing-zones-step.component.html
```html
<div class="step-container">
  <div class="step-intro">
    <p class="intro-text">
      Define las zonas de cobro y los costos de envío asociados. Esto te permite cobrar diferentes tarifas según la ubicación.
    </p>
  </div>

  <p-card class="templates-card">
    <ng-template pTemplate="header">
      <div class="card-header"><i class="pi pi-th-large"></i><span>Plantillas Sugeridas</span></div>
    </ng-template>
    <div class="templates-grid">
      <button *ngFor="let template of predefinedTemplates" pButton type="button" [label]="template.nombre"
              icon="pi pi-map-marker" class="p-button-outlined template-button" (click)="useTemplate(template)"></button>
    </div>
    <small class="field-help">Haz clic en una plantilla para cargar sus datos</small>
  </p-card>

  <p-card class="mt-3">
    <ng-template pTemplate="header">
      <div class="card-header"><i class="pi pi-map-marker"></i>
        <span>{{ editingIndex !== null ? 'Editar Zona de Cobro' : 'Agregar Zona de Cobro' }}</span></div>
    </ng-template>
    <form [formGroup]="billingZoneForm">
      <div class="form-grid">
        <div class="form-field col-md-8 col-12">
          <label for="nombre" class="required">Nombre de la Zona *</label>
          <input id="nombre" type="text" pInputText formControlName="nombre" placeholder="Ej: Zona 1 - Metropolitana"
                 [class.p-invalid]="hasError('nombre', 'required') || hasError('nombre', 'minlength')" />
          <small class="p-error" *ngIf="hasError('nombre', 'required') || hasError('nombre', 'minlength')">
            {{ getErrorMessage('nombre') }}</small>
        </div>
        <div class="form-field col-md-4 col-12">
          <label for="costoEnvio" class="required">Costo de Envío (COP) *</label>
          <p-inputNumber id="costoEnvio" formControlName="costoEnvio" mode="currency" currency="COP" locale="es-CO"
                         [min]="0" placeholder="0" [class.p-invalid]="hasError('costoEnvio', 'required') || hasError('costoEnvio', 'min')">
          </p-inputNumber>
          <small class="p-error" *ngIf="hasError('costoEnvio', 'required') || hasError('costoEnvio', 'min')">
            {{ getErrorMessage('costoEnvio') }}</small>
        </div>
        <div class="form-field col-12">
          <label for="descripcion">Descripción (Opcional)</label>
          <textarea id="descripcion" pInputTextarea formControlName="descripcion" rows="2"
                    placeholder="Describe las ciudades o áreas incluidas en esta zona" [autoResize]="true"></textarea>
        </div>
        <div class="form-field col-12">
          <div class="checkbox-field">
            <p-checkbox inputId="activo" formControlName="activo" [binary]="true" label="Activo"></p-checkbox>
          </div>
        </div>
      </div>
      <div class="form-actions">
        <button *ngIf="editingIndex !== null" pButton type="button" label="Cancelar" icon="pi pi-times"
                class="p-button-secondary p-button-outlined" (click)="cancelEdit()"></button>
        <button pButton type="button" [label]="editingIndex !== null ? 'Actualizar Zona' : 'Agregar a Lista'"
                [icon]="editingIndex !== null ? 'pi pi-check' : 'pi pi-plus'" class="p-button-success"
                [disabled]="billingZoneForm.invalid" (click)="addBillingZone()"></button>
      </div>
    </form>
  </p-card>

  <p-card *ngIf="billingZonesList.length > 0" class="mt-3">
    <ng-template pTemplate="header">
      <div class="card-header"><i class="pi pi-list"></i>
        <span>Zonas de Cobro Configuradas ({{ billingZonesList.length }})</span></div>
    </ng-template>
    <p-table [value]="billingZonesList" styleClass="p-datatable-sm" responsiveLayout="scroll">
      <ng-template pTemplate="header">
        <tr><th>Nombre</th><th>Costo de Envío</th><th>Descripción</th><th style="width: 100px">Estado</th><th style="width: 140px">Acciones</th></tr>
      </ng-template>
      <ng-template pTemplate="body" let-zone let-i="rowIndex">
        <tr>
          <td><strong>{{ zone.nombre }}</strong></td>
          <td><span class="badge-price">{{ zone.costoEnvio | currency:'COP':'symbol-narrow':'1.0-0' }}</span></td>
          <td>{{ zone.descripcion || '-' }}</td>
          <td><span class="badge" [class.badge-active]="zone.activo" [class.badge-inactive]="!zone.activo">
            {{ zone.activo ? 'Activo' : 'Inactivo' }}</span></td>
          <td>
            <div class="action-buttons">
              <button pButton type="button" icon="pi pi-pencil" class="p-button-text p-button-sm p-button-info"
                      pTooltip="Editar" (click)="editBillingZone(i)"></button>
              <button pButton type="button" icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger"
                      pTooltip="Eliminar" (click)="removeBillingZone(i)"></button>
            </div>
          </td>
        </tr>
      </ng-template>
    </p-table>
  </p-card>

  <div class="step-actions mt-4">
    <button pButton type="button" label="Guardar y Continuar" icon="pi pi-check" iconPos="right"
            class="p-button-success p-button-lg" [disabled]="billingZonesList.length === 0 || isSaving"
            [loading]="isSaving" (click)="onComplete()"></button>
    <p class="form-status" *ngIf="billingZonesList.length === 0">
      <i class="pi pi-info-circle"></i>Agrega al menos una zona de cobro para continuar</p>
    <p class="form-status success" *ngIf="billingZonesList.length > 0">
      <i class="pi pi-check-circle"></i>{{ billingZonesList.length }} zona(s) configurada(s) - ¡Listo!</p>
  </div>
</div>
```

### billing-zones-step.component.scss
```scss
@import './payment-methods-step.component.scss';

.badge-price {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: var(--green-100);
  color: var(--green-700);
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
}
```

## 9. FIRST-PRODUCT-STEP COMPONENT

### first-product-step.component.ts
```typescript
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';

@Component({
  selector: 'app-first-product-step',
  templateUrl: './first-product-step.component.html',
  styleUrls: ['./first-product-step.component.scss']
})
export class FirstProductStepComponent implements OnInit, OnDestroy {
  @Input() initialData: any = null;
  @Input() aiSuggestion: any = null;
  @Input() categoriesList: any[] = [];
  @Input() warehousesList: any[] = [];
  @Output() dataChange = new EventEmitter<any>();
  @Output() stepComplete = new EventEmitter<any>();

  private destroy$ = new Subject<void>();
  productForm!: FormGroup;
  productCreated: any = null;
  isLoading = false;
  isSaving = false;
  uploadedImageUrl: string | null = null;

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

  private initForm(): void {
    this.productForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      referencia: ['', [Validators.required, Validators.minLength(2)]],
      categoria: ['', Validators.required],
      precio: [0, [Validators.required, Validators.min(0)]],
      descripcion: [''],
      stock: [0, [Validators.min(0)]],
      bodega: ['']
    });
  }

  private loadInitialData(): void {
    if (this.initialData?.data) {
      this.productCreated = this.initialData.data;
      this.productForm.patchValue(this.productCreated);
      setTimeout(() => {
        this.stepComplete.emit({ data: this.productCreated });
      }, 0);
    }
  }

  applySuggestion(): void {
    if (!this.aiSuggestion?.suggestedData) return;
    this.productForm.patchValue(this.aiSuggestion.suggestedData);
  }

  onImageUpload(event: any): void {
    const file = event.files[0];
    // Aquí iría la lógica de upload a Firebase/Storage
    // Por ahora simulamos con un placeholder
    this.uploadedImageUrl = URL.createObjectURL(file);
    this.messageService.add({
      severity: 'success',
      summary: 'Imagen Cargada',
      detail: 'La imagen se ha cargado correctamente'
    });
  }

  async onComplete(): Promise<void> {
    if (this.productForm.invalid) {
      this.markFormAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Incompleto',
        detail: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    this.isSaving = true;
    try {
      const company = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
      const productData = {
        ...this.productForm.value,
        company: company.nomComercial || company.nombre,
        imagenes: this.uploadedImageUrl ? [this.uploadedImageUrl] : [],
        activo: true
      };

      const result = await this.maestroService.createProduct(productData).toPromise();
      this.productCreated = result;
      this.stepComplete.emit({ data: this.productCreated });

      this.messageService.add({
        severity: 'success',
        summary: 'Producto Creado',
        detail: 'Tu primer producto se ha creado exitosamente'
      });
    } catch (error) {
      console.error('Error creando producto:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo crear el producto'
      });
    } finally {
      this.isSaving = false;
    }
  }

  skipStep(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Paso Omitido',
      detail: 'Podrás agregar productos más tarde desde el módulo de inventario'
    });
    this.stepComplete.emit({ skipped: true });
  }

  private markFormAsTouched(): void {
    Object.keys(this.productForm.controls).forEach(key => {
      this.productForm.get(key)?.markAsTouched();
    });
  }

  hasError(field: string, error: string): boolean {
    const control = this.productForm.get(field);
    return !!(control?.hasError(error) && (control?.dirty || control?.touched));
  }

  getErrorMessage(field: string): string {
    const control = this.productForm.get(field);
    if (control?.hasError('required')) return 'Este campo es requerido';
    if (control?.hasError('min')) return 'El valor mínimo es 0';
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }
    return '';
  }
}
```

### first-product-step.component.html
```html
<div class="step-container">
  <div class="step-intro">
    <p class="intro-text">
      Crea tu primer producto para empezar a vender. Este paso es opcional, podrás agregar más productos después.
    </p>
  </div>

  <p-card>
    <ng-template pTemplate="header">
      <div class="card-header"><i class="pi pi-shopping-bag"></i><span>Información del Producto</span></div>
    </ng-template>

    <form [formGroup]="productForm">
      <div class="form-grid">
        <div class="form-field col-md-6 col-12">
          <label for="nombre" class="required">Nombre del Producto *</label>
          <input id="nombre" type="text" pInputText formControlName="nombre" placeholder="Ej: Camiseta Azul Talla M"
                 [class.p-invalid]="hasError('nombre', 'required') || hasError('nombre', 'minlength')" />
          <small class="p-error" *ngIf="hasError('nombre', 'required') || hasError('nombre', 'minlength')">
            {{ getErrorMessage('nombre') }}</small>
        </div>

        <div class="form-field col-md-6 col-12">
          <label for="referencia" class="required">Referencia/SKU *</label>
          <input id="referencia" type="text" pInputText formControlName="referencia" placeholder="Ej: CAM-AZ-M"
                 [class.p-invalid]="hasError('referencia', 'required') || hasError('referencia', 'minlength')" />
          <small class="field-help">Código único para identificar el producto</small>
          <small class="p-error" *ngIf="hasError('referencia', 'required') || hasError('referencia', 'minlength')">
            {{ getErrorMessage('referencia') }}</small>
        </div>

        <div class="form-field col-md-6 col-12">
          <label for="categoria" class="required">Categoría *</label>
          <p-dropdown id="categoria" formControlName="categoria" [options]="categoriesList"
                      optionLabel="nombre" optionValue="nombre" placeholder="Selecciona una categoría"
                      [filter]="true" filterBy="nombre" styleClass="w-100"
                      [class.p-invalid]="hasError('categoria', 'required')">
          </p-dropdown>
          <small class="p-error" *ngIf="hasError('categoria', 'required')">
            {{ getErrorMessage('categoria') }}</small>
        </div>

        <div class="form-field col-md-6 col-12">
          <label for="precio" class="required">Precio (COP) *</label>
          <p-inputNumber id="precio" formControlName="precio" mode="currency" currency="COP" locale="es-CO"
                         [min]="0" placeholder="0" [class.p-invalid]="hasError('precio', 'required') || hasError('precio', 'min')">
          </p-inputNumber>
          <small class="p-error" *ngIf="hasError('precio', 'required') || hasError('precio', 'min')">
            {{ getErrorMessage('precio') }}</small>
        </div>

        <div class="form-field col-md-6 col-12">
          <label for="stock">Stock Inicial (Opcional)</label>
          <p-inputNumber id="stock" formControlName="stock" [showButtons]="true" [min]="0" placeholder="0">
          </p-inputNumber>
        </div>

        <div class="form-field col-md-6 col-12" *ngIf="warehousesList.length > 0">
          <label for="bodega">Bodega (Opcional)</label>
          <p-dropdown id="bodega" formControlName="bodega" [options]="warehousesList"
                      optionLabel="nombre" optionValue="idBodega" placeholder="Selecciona una bodega"
                      [showClear]="true" styleClass="w-100">
          </p-dropdown>
        </div>

        <div class="form-field col-12">
          <label for="descripcion">Descripción (Opcional)</label>
          <textarea id="descripcion" pInputTextarea formControlName="descripcion" rows="3"
                    placeholder="Describe las características principales del producto" [autoResize]="true"></textarea>
        </div>

        <div class="form-field col-12">
          <label>Imagen del Producto (Opcional)</label>
          <p-fileUpload mode="basic" chooseLabel="Seleccionar Imagen" accept="image/*"
                        [maxFileSize]="5000000" (onSelect)="onImageUpload($event)"
                        [auto]="false" chooseIcon="pi pi-upload">
          </p-fileUpload>
          <small class="field-help">Tamaño máximo: 5MB. Formatos: JPG, PNG</small>
          <div *ngIf="uploadedImageUrl" class="image-preview mt-2">
            <img [src]="uploadedImageUrl" alt="Vista previa" />
          </div>
        </div>
      </div>
    </form>
  </p-card>

  <div class="step-actions mt-4">
    <button pButton type="button" label="Omitir este Paso" icon="pi pi-forward" iconPos="right"
            class="p-button-secondary p-button-outlined" (click)="skipStep()"></button>
    <button pButton type="button" label="Crear Producto y Finalizar" icon="pi pi-check" iconPos="right"
            class="p-button-success p-button-lg" [disabled]="productForm.invalid || isSaving"
            [loading]="isSaving" (click)="onComplete()"></button>
  </div>

  <p class="help-text text-center mt-3">
    <i class="pi pi-info-circle"></i>
    Este es un paso opcional. Puedes omitirlo y agregar productos más tarde desde el módulo de inventario.
  </p>
</div>
```

### first-product-step.component.scss
```scss
@import './payment-methods-step.component.scss';

.image-preview {
  display: flex;
  justify-content: center;
  padding: 1rem;
  background: var(--surface-50);
  border-radius: 8px;

  img {
    max-width: 300px;
    max-height: 300px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.help-text {
  color: var(--text-color-secondary);
  font-size: 0.9rem;

  i {
    color: var(--primary-color);
    margin-right: 0.5rem;
  }
}

.step-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;

    button {
      width: 100%;
    }
  }
}
```

---

## IMPLEMENTATION INSTRUCTIONS

1. Copy each component's TypeScript, HTML, and SCSS code into the respective files
2. Update the onboarding.module.ts with the declarations provided below
3. Test each component individually to ensure proper functionality

## Module Declarations

Add these to `/src/app/components/onboarding/onboarding.module.ts`:

```typescript
// Add imports
import { RolesStepComponent } from './steps/roles-step.component';
import { BillingZonesStepComponent } from './steps/billing-zones-step.component';
import { FirstProductStepComponent } from './steps/first-product-step.component';

// Add to declarations array
declarations: [
  // ... existing declarations
  RolesStepComponent,
  BillingZonesStepComponent,
  FirstProductStepComponent
]
```
