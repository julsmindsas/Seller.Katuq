# FRONTEND — Módulo Descuentos y Promociones
# Seller.Katuq · Angular 14 · v2

---

## Contexto

El proyecto Seller.Katuq es un SaaS multi-tenant en Angular 14. El módulo `proceso` agrupa maestros de configuración (Ocasiones, Géneros, Tipos de Cliente, etc.) y está disponible en la ruta `/proceso/*` con lazy loading. Se necesita agregar un nuevo submódulo **Descuentos y Promociones** que siga exactamente el mismo patrón arquitectónico existente: lista con p-table PrimeNG + modal de creación/edición con ReactivesForms + SweetAlert2 para confirmaciones + MaestroService para HTTP.

---

## Modelo de datos (interfaces TypeScript)

```typescript
// Interface principal — frontend
interface DescuentoPromocion {
  id?: string;
  nombre: string;                          // "Descuento de verano"
  descripcion: string;
  codigoPersonalizado: string;             // "VERANO2026" — único por empresa
  tipo: 'porcentaje' | 'valor_fijo' | 'envio_gratis';
  valor: number;                           // 10 si es 10%, 5000 si es $5.000
  fechaInicio: string;                     // ISO string: "2026-07-01"
  fechaFin: string;                        // ISO string: "2026-07-31"
  limiteUsos: number | null;               // null = ilimitado (global)
  usosActuales?: number;                   // solo lectura — lo controla el backend
  aplicaA: 'todos_los_productos' | 'categoria' | 'producto_especifico';
  activo: boolean;

  // ── Campos nuevos recomendados por estándar de mercado ──────────────────
  montoMinimo?: number | null;             // null = sin mínimo. Ej: 50000 → aplica solo si el carrito supera $50.000
  limiteUsosPorCliente?: number | null;    // null = sin límite por usuario individual. Complementa limiteUsos global
  combinable?: boolean;                    // false = no se puede usar junto a otros códigos activos en el mismo carrito
}

// Interface auxiliar — historial de redenciones (colección separada en Firestore)
// NO va en el formulario; la escribe el backend cada vez que un cliente aplica el código
interface RedenciónDescuento {
  id?: string;
  descuentoId: string;                     // referencia al código usado
  codigoPersonalizado: string;             // desnormalizado para consultas rápidas
  company: string;                         // tenant
  clienteId: string;                       // userId del comprador
  ordenId: string;                         // id del pedido donde se aplicó
  montoDescuentoAplicado: number;          // valor real descontado en esa orden
  fechaRedención: string;                  // ISO timestamp
  creadoEn: string;                        // timestamp del servidor
}
```

> `company` viene automáticamente del header HTTP que agrega el interceptor — no va en ningún formulario.
> `usosActuales` es de solo lectura en frontend; el backend lo controla.

---

## Archivos a crear

```
src/app/components/proceso/
└── descuentos-promociones/
    ├── descuentos-promociones.component.ts
    ├── descuentos-promociones.component.html
    ├── descuentos-promociones.component.scss
    └── crear-descuento-promocion/
        ├── crear-descuento-promocion.component.ts
        ├── crear-descuento-promocion.component.html
        └── crear-descuento-promocion.component.scss
```

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/app/components/proceso/proceso-routing.module.ts` | +1 ruta |
| `src/app/components/proceso/proceso.module.ts` | +2 imports + +2 declarations |
| `src/app/shared/services/maestros/maestro.service.ts` | +5 métodos HTTP |
| `src/app/shared/services/nav.service.ts` | +1 ítem en sección "Producto" |

---

## PASO 1 — Agregar métodos al MaestroService

**Archivo:** `src/app/shared/services/maestros/maestro.service.ts`

```typescript
// DESCUENTOS Y PROMOCIONES
public consultarDescuentosPromociones() {
  return this.http.get(this.urlBase + '/v1/descuentos-promociones/all', this.httpOptions);
}

public createDescuentoPromocion(descuento: any) {
  return this.http.post(this.urlBase + '/v1/descuentos-promociones/create', descuento, this.httpOptions);
}

public editDescuentoPromocion(descuento: any) {
  return this.http.post(this.urlBase + '/v1/descuentos-promociones/edit', descuento, this.httpOptions);
}

public deleteDescuentoPromocion(descuento: any) {
  return this.http.post(this.urlBase + '/v1/descuentos-promociones/remove', descuento, this.httpOptions);
}

// HISTORIAL DE REDENCIONES — solo lectura desde el admin
public consultarRedenciones(descuentoId: string) {
  return this.http.get(
    this.urlBase + `/v1/descuentos-promociones/redenciones/${descuentoId}`,
    this.httpOptions
  );
}
```

---

## PASO 2 — Componente lista (.ts)

**Archivo:** `src/app/components/proceso/descuentos-promociones/descuentos-promociones.component.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { CrearDescuentoPromocionComponent } from './crear-descuento-promocion/crear-descuento-promocion.component';

@Component({
  selector: 'app-descuentos-promociones',
  templateUrl: './descuentos-promociones.component.html',
  styleUrls: ['./descuentos-promociones.component.scss']
})
export class DescuentosPromocionesComponent implements OnInit {
  rows = [];
  temp = [];
  cargando = false;

  constructor(
    private service: MaestroService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    this.service.consultarDescuentosPromociones().subscribe({
      next: (data: any) => {
        this.rows = data || [];
        this.temp = [...this.rows];
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  openCrearModal() {
    const modalRef = this.modalService.open(CrearDescuentoPromocionComponent, { size: 'lg', centered: true });
    modalRef.componentInstance.mostrarCrear = true;
    modalRef.result.then(result => { if (result === 'success') this.cargarDatos(); }).catch(() => {});
  }

  openEditarModal(row: any) {
    const modalRef = this.modalService.open(CrearDescuentoPromocionComponent, { size: 'lg', centered: true });
    modalRef.componentInstance.mostrarCrear = false;
    modalRef.componentInstance.descuentoData = row;
    modalRef.result.then(result => { if (result === 'success') this.cargarDatos(); }).catch(() => {});
  }

  eliminar(row: any) {
    // IMPORTANTE: el backend NO borra físicamente — desactiva el documento
    // para preservar el historial de redenciones ligado al código
    Swal.fire({
      title: '¿Desactivar descuento?',
      text: `"${row.nombre}" será desactivado. El historial de usos se conservará.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.service.deleteDescuentoPromocion({ id: row.id }).subscribe({
          next: () => { Swal.fire('Desactivado', '', 'success'); this.cargarDatos(); },
          error: () => Swal.fire('Error', 'No se pudo desactivar', 'error')
        });
      }
    });
  }

  updateFilter(event: any) {
    const val = event.target.value.toLowerCase();
    this.rows = this.temp.filter(d =>
      d.nombre?.toLowerCase().includes(val) || d.codigoPersonalizado?.toLowerCase().includes(val) || !val
    );
  }

  // 4 estados posibles para el badge
  getEstado(row: any): 'vigente' | 'agotado' | 'vencido' | 'inactivo' {
    if (!row.activo) return 'inactivo';
    if (row.limiteUsos !== null && row.usosActuales >= row.limiteUsos) return 'agotado';
    const hoy = new Date().toISOString().split('T')[0];
    if (row.fechaFin < hoy) return 'vencido';
    if (row.fechaInicio <= hoy && row.fechaFin >= hoy) return 'vigente';
    return 'inactivo';
  }
}
```

---

## PASO 3 — Componente lista (.html)

**Archivo:** `src/app/components/proceso/descuentos-promociones/descuentos-promociones.component.html`

Columnas: Nombre · Código · Tipo/Valor · Monto mínimo · Vigencia · Usos · Combinable · Estado · Acciones

```html
<div class="container-fluid">
  <div class="row">
    <div class="col-sm-12 p-2">
      <div class="card">

        <div class="loader-box" *ngIf="cargando">
          <div class="loader-8"></div>
        </div>

        <div class="row col-12 p-4 pb-0">
          <div class="col-6">
            <p class="text-left fc-secondary fw-bold fs-24 m-0 p-0">{{ "Descuentos y Promociones" | translate }}</p>
            <p class="text-left text-muted fs-18 m-0 p-0">{{ "Gestiona cupones, descuentos por porcentaje y promociones especiales." | translate }}</p>
          </div>
          <div class="col-6 p-3" style="text-align:end">
            <input type="text" class="form-control d-inline-block w-auto mr-2"
              placeholder="Buscar nombre o código..." (input)="updateFilter($event)">
            <button class="btn btn-primary ml-3 mb-2" (click)="openCrearModal()">
              <i class="icofont icofont-plus"></i>&nbsp; Crear Descuento
            </button>
          </div>
        </div>

        <div class="card-body" *ngIf="!cargando">
          <p-table [value]="rows" [paginator]="true" [rows]="10"
            styleClass="p-datatable-gridlines p-datatable-striped"
            [rowsPerPageOptions]="[10,20,50]" [rowHover]="true"
            [globalFilterFields]="['nombre','codigoPersonalizado','tipo']">

            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="nombre">Nombre <p-sortIcon field="nombre"></p-sortIcon></th>
                <th>Código</th>
                <th>Tipo / Valor</th>
                <th>Monto mínimo</th>
                <th>Vigencia</th>
                <th>Usos (actual / global / x cliente)</th>
                <th>Combinable</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </ng-template>

            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.nombre }}</td>
                <td><span class="badge bg-secondary fw-bold">{{ row.codigoPersonalizado }}</span></td>
                <td>
                  {{ row.tipo === 'porcentaje' ? row.valor + '%' :
                     row.tipo === 'valor_fijo' ? '$' + (row.valor | number) :
                     'Envío gratis' }}
                </td>
                <td>{{ row.montoMinimo ? ('$' + (row.montoMinimo | number)) : 'Sin mínimo' }}</td>
                <td>{{ row.fechaInicio }} → {{ row.fechaFin }}</td>
                <td>
                  {{ row.usosActuales || 0 }} /
                  {{ row.limiteUsos || '∞' }} global |
                  {{ row.limiteUsosPorCliente || '∞' }} x cliente
                </td>
                <td>
                  <i [class]="row.combinable
                    ? 'icofont icofont-check text-success'
                    : 'icofont icofont-close text-danger'"></i>
                </td>
                <td>
                  <span [ngClass]="{
                    'badge bg-success':          getEstado(row) === 'vigente',
                    'badge bg-warning text-dark': getEstado(row) === 'agotado',
                    'badge bg-secondary':         getEstado(row) === 'vencido',
                    'badge bg-danger':            getEstado(row) === 'inactivo'
                  }">
                    {{ getEstado(row) | titlecase }}
                  </span>
                </td>
                <td>
                  <i class="icofont icofont-pencil-alt-5 fc-primary" style="cursor:pointer;margin-right:8px"
                    (click)="openEditarModal(row)" ngbTooltip="Editar"></i>
                  <i class="icofont icofont-trash fc-danger" style="cursor:pointer"
                    (click)="eliminar(row)" ngbTooltip="Desactivar"></i>
                </td>
              </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
              <tr><td colspan="9">No hay descuentos registrados</td></tr>
            </ng-template>
            <ng-template pTemplate="summary">
              Total: {{ rows?.length || 0 }} registros
            </ng-template>

          </p-table>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## PASO 4 — Componente modal crear/editar (.ts)

**Archivo:** `src/app/components/proceso/descuentos-promociones/crear-descuento-promocion/crear-descuento-promocion.component.ts`

```typescript
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-descuento-promocion',
  templateUrl: './crear-descuento-promocion.component.html',
  styleUrls: ['./crear-descuento-promocion.component.scss']
})
export class CrearDescuentoPromocionComponent implements OnInit {
  @Input() mostrarCrear: boolean = true;
  @Input() descuentoData: any;

  form: FormGroup;

  tiposDescuento = [
    { label: 'Porcentaje (%)', value: 'porcentaje' },
    { label: 'Valor fijo ($)', value: 'valor_fijo' },
    { label: 'Envío gratis', value: 'envio_gratis' }
  ];

  aplicaAOpciones = [
    { label: 'Todos los productos', value: 'todos_los_productos' },
    { label: 'Categoría específica', value: 'categoria' },
    { label: 'Producto específico', value: 'producto_especifico' }
  ];

  constructor(
    private fb: FormBuilder,
    private service: MaestroService,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group({
      id: [''],
      nombre: ['', Validators.required],
      descripcion: [''],
      codigoPersonalizado: ['', Validators.required],
      tipo: ['porcentaje', Validators.required],
      valor: [0, [Validators.required, Validators.min(0)]],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
      limiteUsos: [null],
      aplicaA: ['todos_los_productos', Validators.required],
      activo: [true],
      // ── Campos nuevos ────────────────────────────────────────────────────
      montoMinimo: [null, [Validators.min(0)]],
      limiteUsosPorCliente: [null, [Validators.min(1)]],
      combinable: [false]
    });
  }

  ngOnInit(): void {
    if (this.descuentoData) {
      this.form.patchValue(this.descuentoData);
    }
  }

  get tipoSeleccionado() { return this.form.get('tipo')?.value; }

  codigoUpper(event: any) {
    event.target.value = event.target.value.toUpperCase();
    this.form.get('codigoPersonalizado')?.setValue(event.target.value, { emitEvent: false });
  }

  guardar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.service.createDescuentoPromocion(this.form.value).subscribe({
      next: () => Swal.fire('¡Creado!', 'El descuento fue creado exitosamente.', 'success')
                      .then(() => this.activeModal.close('success')),
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo crear el descuento.';
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  editar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.service.editDescuentoPromocion(this.form.value).subscribe({
      next: () => Swal.fire('¡Actualizado!', 'El descuento fue actualizado.', 'success')
                      .then(() => this.activeModal.close('success')),
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo actualizar el descuento.';
        Swal.fire('Error', msg, 'error');
      }
    });
  }
}
```

---

## PASO 5 — Componente modal crear/editar (.html)

**Archivo:** `src/app/components/proceso/descuentos-promociones/crear-descuento-promocion/crear-descuento-promocion.component.html`

Layout (2 columnas Bootstrap):
```
Fila 1: [Nombre*]                    [Código personalizado*]
Fila 2: [Tipo de descuento*]         [Valor* — oculto si tipo=envio_gratis]
Fila 3: [Fecha inicio*]              [Fecha fin*]
Fila 4: [Aplica a*]                  [Límite de usos global]
Fila 5: [Monto mínimo]               [Límite de usos por cliente]
Fila 6: [Descripción — col-12]
Fila 7: [Toggle Activo]              [Toggle Combinable]
```

```html
<div class="modal-header">
  <h5 class="modal-title">{{ mostrarCrear ? 'Crear Descuento' : 'Editar Descuento' }}</h5>
  <button type="button" class="close" (click)="activeModal.dismiss()">
    <span>&times;</span>
  </button>
</div>

<div class="modal-body">
  <form [formGroup]="form">

    <!-- Fila 1 -->
    <div class="row">
      <div class="col-md-6 mb-3">
        <label>Nombre <span class="text-danger">*</span></label>
        <input type="text" class="form-control" formControlName="nombre"
          placeholder="Ej: Descuento de verano">
        <small class="text-danger"
          *ngIf="form.get('nombre')?.invalid && form.get('nombre')?.touched">
          Campo requerido
        </small>
      </div>
      <div class="col-md-6 mb-3">
        <label>Código personalizado <span class="text-danger">*</span></label>
        <input type="text" class="form-control text-uppercase"
          formControlName="codigoPersonalizado"
          placeholder="Ej: VERANO2026"
          (input)="codigoUpper($event)"
          [attr.disabled]="!mostrarCrear && descuentoData?.usosActuales > 0 ? true : null">
        <small class="text-muted"
          *ngIf="!mostrarCrear && descuentoData?.usosActuales > 0">
          El código no puede editarse porque ya tiene usos registrados.
        </small>
        <small class="text-danger"
          *ngIf="form.get('codigoPersonalizado')?.invalid && form.get('codigoPersonalizado')?.touched">
          Campo requerido
        </small>
      </div>
    </div>

    <!-- Fila 2 -->
    <div class="row">
      <div class="col-md-6 mb-3">
        <label>Tipo de descuento <span class="text-danger">*</span></label>
        <select class="form-control" formControlName="tipo">
          <option *ngFor="let t of tiposDescuento" [value]="t.value">{{ t.label }}</option>
        </select>
      </div>
      <div class="col-md-6 mb-3" *ngIf="tipoSeleccionado !== 'envio_gratis'">
        <label>Valor <span class="text-danger">*</span></label>
        <div class="input-group">
          <input type="number" class="form-control" formControlName="valor" min="0">
          <div class="input-group-append">
            <span class="input-group-text">
              {{ tipoSeleccionado === 'porcentaje' ? '%' : '$' }}
            </span>
          </div>
        </div>
        <small class="text-danger"
          *ngIf="form.get('valor')?.invalid && form.get('valor')?.touched">
          Valor inválido
        </small>
      </div>
    </div>

    <!-- Fila 3 -->
    <div class="row">
      <div class="col-md-6 mb-3">
        <label>Fecha inicio <span class="text-danger">*</span></label>
        <input type="date" class="form-control" formControlName="fechaInicio">
        <small class="text-danger"
          *ngIf="form.get('fechaInicio')?.invalid && form.get('fechaInicio')?.touched">
          Campo requerido
        </small>
      </div>
      <div class="col-md-6 mb-3">
        <label>Fecha fin <span class="text-danger">*</span></label>
        <input type="date" class="form-control" formControlName="fechaFin">
        <small class="text-danger"
          *ngIf="form.get('fechaFin')?.invalid && form.get('fechaFin')?.touched">
          Campo requerido
        </small>
      </div>
    </div>

    <!-- Fila 4 -->
    <div class="row">
      <div class="col-md-6 mb-3">
        <label>Aplica a <span class="text-danger">*</span></label>
        <select class="form-control" formControlName="aplicaA">
          <option *ngFor="let op of aplicaAOpciones" [value]="op.value">{{ op.label }}</option>
        </select>
      </div>
      <div class="col-md-6 mb-3">
        <label>Límite de usos global</label>
        <input type="number" class="form-control" formControlName="limiteUsos"
          placeholder="Vacío = ilimitado" min="1">
        <small class="text-muted">
          Número máximo de veces que este código puede usarse en total.
        </small>
      </div>
    </div>

    <!-- Fila 5 — CAMPOS NUEVOS -->
    <div class="row">
      <div class="col-md-6 mb-3">
        <label>Monto mínimo de orden</label>
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text">$</span>
          </div>
          <input type="number" class="form-control" formControlName="montoMinimo"
            placeholder="Vacío = sin mínimo" min="0">
        </div>
        <small class="text-muted">
          El carrito debe superar este monto para que el código aplique.
        </small>
      </div>
      <div class="col-md-6 mb-3">
        <label>Límite de usos por cliente</label>
        <input type="number" class="form-control" formControlName="limiteUsosPorCliente"
          placeholder="Vacío = sin límite" min="1">
        <small class="text-muted">
          Cuántas veces puede usar este código un mismo cliente.
        </small>
      </div>
    </div>

    <!-- Fila 6 -->
    <div class="row">
      <div class="col-12 mb-3">
        <label>Descripción</label>
        <textarea class="form-control" formControlName="descripcion" rows="2"
          placeholder="Descripción interna del descuento..."></textarea>
      </div>
    </div>

    <!-- Fila 7 — Toggles -->
    <div class="row">
      <div class="col-md-6 mb-3">
        <label class="d-block">Estado</label>
        <label class="toggle-switch">
          <input type="checkbox" formControlName="activo">
          <span class="slider"></span>
        </label>
        <span class="ml-2">
          {{ form.get('activo')?.value ? 'Activo' : 'Inactivo' }}
        </span>
      </div>
      <div class="col-md-6 mb-3">
        <label class="d-block">¿Combinable con otros códigos?</label>
        <label class="toggle-switch">
          <input type="checkbox" formControlName="combinable">
          <span class="slider"></span>
        </label>
        <span class="ml-2">
          {{ form.get('combinable')?.value ? 'Sí' : 'No' }}
        </span>
        <small class="d-block text-muted">
          Si está desactivado, el checkout rechazará otros códigos activos simultáneos.
        </small>
      </div>
    </div>

  </form>
</div>

<div class="modal-footer">
  <button class="btn btn-secondary" (click)="activeModal.dismiss()">Cancelar</button>
  <button class="btn btn-primary" (click)="mostrarCrear ? guardar() : editar()">
    {{ mostrarCrear ? 'Crear' : 'Guardar cambios' }}
  </button>
</div>
```

---

## PASO 6 — SCSS

El componente lista no necesita estilos adicionales (hereda Bootstrap + PrimeNG).

El modal reutiliza el toggle switch existente:

```scss
// Copiar el bloque .toggle-switch de:
// src/app/components/proceso/tipos-cliente/crear-tipo-cliente/crear-tipo-cliente.component.scss
```

---

## PASO 7 — Registrar rutas en proceso-routing.module.ts

```typescript
import { DescuentosPromocionesComponent } from './descuentos-promociones/descuentos-promociones.component';
import { CrearDescuentoPromocionComponent } from './descuentos-promociones/crear-descuento-promocion/crear-descuento-promocion.component';

// En const routes[]:
{ path: 'descuentos-promociones', component: DescuentosPromocionesComponent },
```

> No se necesita ruta para el modal — es un componente de presentación, no una página.

---

## PASO 8 — Declarar en proceso.module.ts

```typescript
import { DescuentosPromocionesComponent } from './descuentos-promociones/descuentos-promociones.component';
import { CrearDescuentoPromocionComponent } from './descuentos-promociones/crear-descuento-promocion/crear-descuento-promocion.component';

// En declarations[]:
DescuentosPromocionesComponent,
CrearDescuentoPromocionComponent
```

> No se necesitan módulos nuevos en `imports[]` — NgbModule, TableModule y SharedModule son suficientes.

---

## PASO 9 — Agregar ítem al menú en nav.service.ts

```typescript
{
  title: "Producto",
  icon: "tag",
  type: "sub",
  active: false,
  children: [
    { path: "proceso/ocasiones",              title: "Ocasiones",                type: "link", icon: "gift"    },
    { path: "proceso/generos",                title: "Géneros",                  type: "link", icon: "users"   },
    { path: "proceso/tipos-cliente",          title: "Tipos de Cliente",         type: "link", icon: "user-check" },
    // ← NUEVO:
    { path: "proceso/descuentos-promociones", title: "Descuentos y Promociones", type: "link", icon: "percent" }
  ]
}
```

---

## Orden de ejecución recomendado (frontend)

1. MaestroService — agregar los 5 métodos
2. Componentes — crear los 6 archivos (ts + html + scss × 2)
3. Routing — registrar en `proceso-routing.module.ts`
4. Module — declarar en `proceso.module.ts`
5. Nav — agregar ítem en `nav.service.ts`
6. `npm start` — verificar compilación sin errores

---

## Checklist de verificación (frontend)

- [ ] `npm start` compila sin errores
- [ ] Sidebar muestra "Descuentos y Promociones" bajo Producto
- [ ] URL `/proceso/descuentos-promociones` carga la tabla
- [ ] Crear código "TEST10" — badge "Vigente" aparece en tabla
- [ ] Columnas monto mínimo, usos por cliente y combinable visibles
- [ ] Editar descuento → tabla refresca
- [ ] Desactivar → SweetAlert advierte conservación del historial
- [ ] Badge "Vencido" con fecha pasada
- [ ] Badge "Agotado" cuando usosActuales >= limiteUsos
- [ ] Campo `codigoPersonalizado` bloqueado en edición si usosActuales > 0
