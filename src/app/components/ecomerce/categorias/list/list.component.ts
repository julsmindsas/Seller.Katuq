import { Component, OnChanges, OnInit, SimpleChanges, ViewChild, TemplateRef } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { ChangeDetectorRef } from '@angular/core';
import { parse, stringify } from 'flatted';
import { NgbModal, NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  providers: [MessageService]
})
export class ListComponent implements OnInit, OnChanges {
  @ViewChild('confirmationDialog') confirmationDialog: TemplateRef<any>;
  
  files1: TreeNode[];
  files2: TreeNode[];
  cols: any[];
  data: TreeNode[] = [];
  categoriaPorEmpresa: { empresa: string; categoria: string; };
  cargando = true;
  confirmationMessage: string = '';
  nodeToDelete: any = null;
  
  // Toast configuration
  position = 'top-right';
  
  constructor(
    private nodeService: MaestroService, 
    private cdr: ChangeDetectorRef, 
    private modalService: NgbModal,
    private messageService: MessageService
  ) { }

  create() {
    if (this.data.length == 0) {
      this.data = [
        {
          "data": { "nombre": "Nueva categoria ", "imagen": "", "posicion": 1, "activo": true },
          "children": []
        }
      ]
    }
    else {
      this.data.push(
        {
          "data": { "nombre": "Nueva categoria ", "imagen": "", "posicion": this.data.length +1, "activo": true },
          "children": []
        }
      )
    }
    this.data = [...this.data];
    this.showSuccess('Categoría principal creada con éxito');
  }

  ngOnInit() {
    this.data = [];
    this.obtenerCategorias();
    this.categoriaPorEmpresa = {
      empresa: 'prueba',
      categoria: ""
    };

    this.cols = [
      { field: 'name', header: 'Name' },
      { field: 'size', header: 'Size' },
      { field: 'type', header: 'Type' }
    ];
    this.data = [...this.data];
    this.cargando = false;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.data = [...changes['data'].currentValue];
    }
  }

  addChild(node: TreeNode) {
    if (node.children == undefined) {
      node.children = [];
    }
    const hijo = Object.assign({}, { "data": { "nombre": "Nueva categoria ", "imagen":"", "posicion": node.children.length, "activo": true } });
    node.children.push(hijo);
    this.cdr.detectChanges();
    this.cdr.markForCheck();
    this.data = [...this.data];
    
    this.showSuccess('Subcategoría creada con éxito');
  }

  // Display confirmation dialog before deletion
  confirmDelete(node) {
    this.nodeToDelete = node;
    this.confirmationMessage = '¿Está seguro que desea eliminar esta categoría? Esta acción no se puede deshacer.';
    
    this.modalService.open(this.confirmationDialog, { centered: true }).result.then((result) => {
      if (result === 'confirm') {
        this.deleteChild(this.nodeToDelete);
      }
    }, (reason) => {
      // Dialog dismissed
    });
  }

  deleteChild(node) {
    if (node.parent == null) {
      const index = this.data.indexOf(node);
      this.data.splice(index, 1);
    }
    else if (node.children == undefined) {
      const index = node.parent.children.indexOf(node);
      node.parent.children.splice(index, 1);
    }
    else {
      const index = node.children.indexOf(node);
      node.children.splice(index, 1);
    }

    this.data = [...this.data];
    this.cdr.detectChanges();
    this.cdr.markForCheck();
    
    this.showSuccess('Categoría eliminada con éxito');
  }

  // Display confirmation dialog before saving
  confirmSave() {
    this.confirmationMessage = '¿Está seguro que desea guardar todos los cambios realizados?';
    
    this.modalService.open(this.confirmationDialog, { centered: true }).result.then((result) => {
      if (result === 'confirm') {
        this.guardar();
      }
    }, (reason) => {
      // Dialog dismissed
    });
  }

  guardar() {
    this.cargando = true;
    this.categoriaPorEmpresa.categoria = stringify(this.data);
    this.nodeService.createCategorias(this.categoriaPorEmpresa).subscribe(     
      (r: any) => {
        this.cargando = false;
        this.showSuccess('Categorías guardadas correctamente');
        console.log("🚀 ~ file: list.component.ts:140 ~ ListComponent ~ this.nodeService.createCategorias ~ r", r);
        console.log("🚀 ~ file: list.component.ts:140 ~ ListComponent ~ this.nodeService.createCategorias ~ r.categorias", parse(r.categorias.categoria));
      },
      (error) => {
        this.cargando = false;
        this.showError('Error al guardar las categorías');
        console.error("Error guardando categorías:", error);
      }
    );
  }

  obtenerCategorias() {
    this.cargando = true;
    this.nodeService.getCategorias().subscribe(
      (r: any) => {
        this.cargando = false;
        if ((r as any[]).length > 0) {
          this.categoriaPorEmpresa = r[0];
          this.data = parse(this.categoriaPorEmpresa.categoria);
          this.data = [...this.data];
        }
        console.log("🚀 ~ file: list.component.ts:140 ~ ListComponent ~ this.nodeService.createCategorias ~ r", r);
      },
      (error) => {
        this.cargando = false;
        this.showError('Error al cargar las categorías');
        console.error("Error cargando categorías:", error);
      }
    );
  }

  // Image selection
  selectImage(node) {
    // Normalmente esto abriría un selector de archivos, implementamos una versión simple para demostración
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        // En una implementación real, subiríamos la imagen a un servidor
        // Para esta demostración, usaremos un lector de archivos para mostrar la vista previa
        const reader = new FileReader();
        reader.onload = (event: any) => {
          node.data.imagen = event.target.result;
          this.cdr.detectChanges();
          this.showSuccess('Imagen seleccionada correctamente');
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  }

  // Toast notifications
  showSuccess(msg: string) {
    this.messageService.add({
      severity: 'success', 
      summary: 'Éxito', 
      detail: msg,
      life: 3000
    });
  }

  showError(msg: string) {
    this.messageService.add({
      severity: 'error', 
      summary: 'Error', 
      detail: msg,
      life: 5000
    });
  }
}
