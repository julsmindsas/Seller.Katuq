import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ServiciosService } from '../../../shared/services/servicios.service';
import { CategoriaData } from '../../../shared/models/productos/CategoriaData';
import { Data } from '../../../shared/models/productos/Data';

@Component({
  selector: 'app-categories-step',
  templateUrl: './categories-step.component.html',
  styleUrls: ['./categories-step.component.scss']
})
export class CategoriesStepComponent implements OnInit, OnDestroy {
  @Input() initialData: any = null;
  @Input() aiSuggestion: any = null;
  @Output() dataChange = new EventEmitter<any>();
  @Output() stepComplete = new EventEmitter<any>();

  private destroy$ = new Subject<void>();
  categoryForm!: FormGroup;
  categoriesTree: CategoriaData[] = [];
  isLoading = false;
  isSaving = false;
  editingNode: CategoriaData | null = null;
  selectedParentNode: CategoriaData | null = null;

  // Plantillas según el sector de la empresa (convertidas a CategoriaData)
  predefinedTemplatesBySector: { [key: string]: CategoriaData[] } = {
    restaurantes: [
      { label: 'Entradas', data: { nombre: 'Entradas', imagen: '', posicion: 1, activo: true }, children: [] },
      { label: 'Platos Fuertes', data: { nombre: 'Platos Fuertes', imagen: '', posicion: 2, activo: true }, children: [] },
      { label: 'Bebidas', data: { nombre: 'Bebidas', imagen: '', posicion: 3, activo: true }, children: [] },
      { label: 'Postres', data: { nombre: 'Postres', imagen: '', posicion: 4, activo: true }, children: [] },
      { label: 'Combos', data: { nombre: 'Combos', imagen: '', posicion: 5, activo: true }, children: [] }
    ],
    retail: [
      { label: 'Ropa', data: { nombre: 'Ropa', imagen: '', posicion: 1, activo: true }, children: [] },
      { label: 'Electrónica', data: { nombre: 'Electrónica', imagen: '', posicion: 2, activo: true }, children: [] },
      { label: 'Hogar', data: { nombre: 'Hogar', imagen: '', posicion: 3, activo: true }, children: [] },
      { label: 'Deportes', data: { nombre: 'Deportes', imagen: '', posicion: 4, activo: true }, children: [] },
      { label: 'Libros', data: { nombre: 'Libros', imagen: '', posicion: 5, activo: true }, children: [] }
    ],
    salud_belleza: [
      { label: 'Cuidado Facial', data: { nombre: 'Cuidado Facial', imagen: '', posicion: 1, activo: true }, children: [] },
      { label: 'Cuidado Corporal', data: { nombre: 'Cuidado Corporal', imagen: '', posicion: 2, activo: true }, children: [] },
      { label: 'Maquillaje', data: { nombre: 'Maquillaje', imagen: '', posicion: 3, activo: true }, children: [] },
      { label: 'Cabello', data: { nombre: 'Cabello', imagen: '', posicion: 4, activo: true }, children: [] },
      { label: 'Suplementos', data: { nombre: 'Suplementos', imagen: '', posicion: 5, activo: true }, children: [] }
    ],
    default: [
      { label: 'General', data: { nombre: 'General', imagen: '', posicion: 1, activo: true }, children: [] },
      { label: 'Destacados', data: { nombre: 'Destacados', imagen: '', posicion: 2, activo: true }, children: [] },
      { label: 'Nuevos', data: { nombre: 'Nuevos', imagen: '', posicion: 3, activo: true }, children: [] },
      { label: 'Ofertas', data: { nombre: 'Ofertas', imagen: '', posicion: 4, activo: true }, children: [] }
    ]
  };

  currentTemplates: CategoriaData[] = [];

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private serviciosService: ServiciosService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadTemplatesBySector();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.categoryForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      imagen: [''],
      posicion: [1, [Validators.required, Validators.min(1)]],
      activo: [true]
    });
  }

  private loadTemplatesBySector(): void {
    const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
    const sector = company.sector || 'default';
    this.currentTemplates = this.predefinedTemplatesBySector[sector] || this.predefinedTemplatesBySector['default'];
  }

  private loadInitialData(): void {
    if (this.initialData?.data && Array.isArray(this.initialData.data)) {
      this.categoriesTree = this.initialData.data;
      if (this.categoriesTree.length > 0) {
        setTimeout(() => {
          this.stepComplete.emit({ data: this.categoriesTree });
        }, 0);
      }
    }
  }

  applySuggestion(): void {
    if (!this.aiSuggestion?.suggestedData) return;
    if (Array.isArray(this.aiSuggestion.suggestedData)) {
      this.categoriesTree = this.aiSuggestion.suggestedData;
    }
  }

  useTemplate(template: CategoriaData): void {
    if (template.data) {
      this.categoryForm.patchValue(template.data);
    }
  }

  loadAllTemplates(): void {
    const newCategories = this.currentTemplates.filter(template =>
      !this.categoriesTree.some(cat => cat.label.toLowerCase() === template.label.toLowerCase())
    );
    this.categoriesTree.push(...newCategories);
    this.dataChange.emit({ data: this.categoriesTree });
    this.messageService.add({
      severity: 'success',
      summary: 'Cargado',
      detail: `${newCategories.length} categorías agregadas`
    });
  }

  addCategory(): void {
    if (this.categoryForm.invalid) {
      this.markFormAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Incompleto',
        detail: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    const formData: Data = this.categoryForm.value;
    const newCategory: CategoriaData = {
      label: formData.nombre,
      data: formData,
      children: []
    };

    const existsName = this.categoriesTree.some(
      (c) => c.label.toLowerCase() === newCategory.label.toLowerCase() && c !== this.editingNode
    );

    if (existsName) {
      this.messageService.add({
        severity: 'error',
        summary: 'Nombre Duplicado',
        detail: 'Ya existe una categoría con este nombre'
      });
      return;
    }

    if (this.editingNode) {
      this.editingNode.label = newCategory.label;
      this.editingNode.data = newCategory.data;
      this.editingNode = null;
      this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Categoría actualizada correctamente' });
    } else {
      if (this.selectedParentNode) {
        if (!this.selectedParentNode.children) {
          this.selectedParentNode.children = [];
        }
        this.selectedParentNode.children.push(newCategory);
      } else {
        this.categoriesTree.push(newCategory);
      }
      this.messageService.add({ severity: 'success', summary: 'Agregado', detail: 'Categoría agregada a la lista' });
    }

    this.categoryForm.reset({ activo: true, posicion: 1 });
    this.selectedParentNode = null;
    this.dataChange.emit({ data: this.categoriesTree });
  }

  editCategory(node: CategoriaData): void {
    this.editingNode = node;
    if (node.data) {
      this.categoryForm.patchValue(node.data);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingNode = null;
    this.selectedParentNode = null;
    this.categoryForm.reset({ activo: true, posicion: 1 });
  }

  removeCategory(node: CategoriaData): void {
    const removeFromTree = (nodes: CategoriaData[], target: CategoriaData): boolean => {
      const index = nodes.indexOf(target);
      if (index !== -1) {
        nodes.splice(index, 1);
        return true;
      }
      for (const n of nodes) {
        if (n.children && removeFromTree(n.children, target)) {
          return true;
        }
      }
      return false;
    };

    removeFromTree(this.categoriesTree, node);
    this.dataChange.emit({ data: this.categoriesTree });
    this.messageService.add({ severity: 'info', summary: 'Eliminado', detail: `Categoría "${node.label}" eliminada` });
    if (this.editingNode === node) {
      this.cancelEdit();
    }
  }

  async onComplete(): Promise<void> {
    if (this.categoriesTree.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Configuración Incompleta',
        detail: 'Debes agregar al menos una categoría para continuar'
      });
      return;
    }

    this.isSaving = true;
    try {
      const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');

      // Preparar datos para enviar al servicio
      const categoriesData = {
        categorias: this.categoriesTree,
        company: company.nomComercial || company.nombre,
        cd: company.cd
      };

      await this.serviciosService.postCategory(categoriesData);

      this.stepComplete.emit({ data: this.categoriesTree });
      this.messageService.add({
        severity: 'success',
        summary: 'Guardado',
        detail: `${this.categoriesTree.length} categoría(s) configurada(s) correctamente`
      });
    } catch (error) {
      console.error('Error guardando categorías:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la configuración' });
    } finally {
      this.isSaving = false;
    }
  }

  private markFormAsTouched(): void {
    Object.keys(this.categoryForm.controls).forEach(key => {
      this.categoryForm.get(key)?.markAsTouched();
    });
  }

  hasError(field: string, error: string): boolean {
    const control = this.categoryForm.get(field);
    return !!(control?.hasError(error) && (control?.dirty || control?.touched));
  }

  getErrorMessage(field: string): string {
    const control = this.categoryForm.get(field);
    if (control?.hasError('required')) return 'Este campo es requerido';
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }
    return '';
  }
}
