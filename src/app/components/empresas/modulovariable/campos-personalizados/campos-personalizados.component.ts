import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { CustomFieldsService, CustomFieldGroup, CustomFieldConfig } from '../../../../shared/services/custom-fields.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-campos-personalizados',
  templateUrl: './campos-personalizados.component.html'
})
export class CamposPersonalizadosComponent implements OnInit {
  grupos: CustomFieldGroup[] = [];
  loading = true;
  editingGroup: CustomFieldGroup | null = null;
  groupForm!: FormGroup;
  showForm = false;

  tiposCampo = [
    { valor: 'text', etiqueta: 'Texto' },
    { valor: 'number', etiqueta: 'Número' },
    { valor: 'select', etiqueta: 'Lista desplegable' },
    { valor: 'checkbox', etiqueta: 'Casilla de verificación' },
    { valor: 'date', etiqueta: 'Fecha' },
    { valor: 'textarea', etiqueta: 'Texto largo' }
  ];

  constructor(
    private customFieldsService: CustomFieldsService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadGroups();
    this.initForm();
  }

  private loadGroups(): void {
    this.loading = true;
    this.customFieldsService.getAllGroups().subscribe(groups => {
      this.grupos = groups;
      this.loading = false;
    });
  }

  private initForm(): void {
    this.groupForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      contexto: ['carrito'],
      activo: [true],
      orden: [0],
      campos: this.fb.array([])
    });
  }

  get camposArray(): FormArray {
    return this.groupForm.get('campos') as FormArray;
  }

  agregarCampo(): void {
    this.camposArray.push(this.fb.group({
      id: [`campo_${Date.now()}`],
      etiqueta: ['', Validators.required],
      tipo: ['text'],
      requerido: [false],
      grupo: [''],
      orden: [this.camposArray.length + 1],
      min: [null],
      max: [null],
      step: [null],
      opciones: [''] // Para select: "opcion1,opcion2,opcion3"
    }));
  }

  eliminarCampo(index: number): void {
    this.camposArray.removeAt(index);
  }

  moverCampo(index: number, direction: number): void {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.camposArray.length) return;
    const item = this.camposArray.at(index);
    this.camposArray.removeAt(index);
    this.camposArray.insert(newIndex, item);
    // Actualizar ordenes
    this.camposArray.controls.forEach((c, i) => c.get('orden')?.setValue(i + 1));
  }

  nuevoGrupo(): void {
    this.editingGroup = null;
    this.initForm();
    this.showForm = true;
  }

  editarGrupo(grupo: CustomFieldGroup): void {
    this.editingGroup = grupo;
    this.initForm();

    this.groupForm.patchValue({
      nombre: grupo.nombre,
      descripcion: grupo.descripcion || '',
      contexto: grupo.contexto || 'carrito',
      activo: grupo.activo,
      orden: grupo.orden || 0
    });

    // Cargar campos existentes
    for (const campo of (grupo.campos || [])) {
      const opcionesStr = (campo.opciones || []).map((o: any) => o.etiqueta || o.valor || o).join(',');
      this.camposArray.push(this.fb.group({
        id: [campo.id],
        etiqueta: [campo.etiqueta, Validators.required],
        tipo: [campo.tipo || 'text'],
        requerido: [campo.requerido || false],
        grupo: [campo.grupo || ''],
        orden: [campo.orden || 0],
        min: [campo.validacion?.min ?? null],
        max: [campo.validacion?.max ?? null],
        step: [campo.validacion?.step ?? null],
        opciones: [opcionesStr]
      }));
    }

    this.showForm = true;
  }

  cancelar(): void {
    this.showForm = false;
    this.editingGroup = null;
  }

  guardar(): void {
    if (this.groupForm.invalid) {
      this.groupForm.markAllAsTouched();
      return;
    }

    const formValue = this.groupForm.value;

    // Transformar campos del formulario al formato de la API
    const campos: CustomFieldConfig[] = formValue.campos.map((c: any, i: number) => {
      const campo: any = {
        id: c.id || `campo_${Date.now()}_${i}`,
        etiqueta: c.etiqueta,
        tipo: c.tipo,
        requerido: c.requerido || false,
        grupo: c.grupo || undefined,
        orden: c.orden || i + 1
      };

      // Validaciones segun tipo
      if (c.tipo === 'number') {
        campo.validacion = {};
        if (c.min != null) campo.validacion.min = Number(c.min);
        if (c.max != null) campo.validacion.max = Number(c.max);
        if (c.step != null) campo.validacion.step = Number(c.step);
      }

      // Opciones para select
      if (c.tipo === 'select' && c.opciones) {
        campo.opciones = c.opciones.split(',').map((o: string) => ({
          valor: o.trim(),
          etiqueta: o.trim()
        })).filter((o: any) => o.valor);
      }

      return campo;
    });

    const groupData: Partial<CustomFieldGroup> = {
      nombre: formValue.nombre,
      descripcion: formValue.descripcion,
      contexto: formValue.contexto,
      activo: formValue.activo,
      orden: formValue.orden || 0,
      campos
    };

    const save$ = this.editingGroup
      ? this.customFieldsService.updateGroup(this.editingGroup.id, groupData)
      : this.customFieldsService.createGroup(groupData);

    save$.subscribe({
      next: () => {
        this.toastr.success(
          this.editingGroup ? 'Grupo actualizado' : 'Grupo creado',
          'Campos Personalizados'
        );
        this.showForm = false;
        this.editingGroup = null;
        this.loadGroups();
      },
      error: (err: any) => {
        this.toastr.error(err.message || 'Error guardando', 'Error');
      }
    });
  }

  eliminarGrupo(grupo: CustomFieldGroup): void {
    Swal.fire({
      title: 'Eliminar grupo',
      text: `Se eliminara "${grupo.nombre}" y todos sus campos. Esta accion no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.customFieldsService.deleteGroup(grupo.id).subscribe({
          next: () => {
            this.toastr.success('Grupo eliminado', 'Campos Personalizados');
            this.loadGroups();
          },
          error: (err: any) => this.toastr.error(err.message, 'Error')
        });
      }
    });
  }

  toggleActivo(grupo: CustomFieldGroup): void {
    this.customFieldsService.updateGroup(grupo.id, { activo: !grupo.activo }).subscribe({
      next: () => {
        grupo.activo = !grupo.activo;
        this.toastr.info(
          grupo.activo ? 'Grupo activado' : 'Grupo desactivado',
          grupo.nombre
        );
      }
    });
  }
}
