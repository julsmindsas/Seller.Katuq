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
  showImportModal = false;
  
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
          "data": { "nombre": "Nueva categoria ", "imagen": "", "posicion": 1, "activo": true, "consecutivo": null },
          "children": []
        }
      ]
    }
    else {
      this.data.unshift(
        {
          "data": { "nombre": "Nueva categoria ", "imagen": "", "posicion": this.data.length + 1, "activo": true, "consecutivo": null },
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

  /**
   * Agrega una subcategoría al nodo.
   *
   * `expanded = true` es imprescindible: el TreeTable de PrimeNG solo dibuja
   * los hijos de un nodo EXPANDIDO. Sin esto la subcategoría se creaba bien
   * pero quedaba escondida bajo una fila colapsada, y como esta pantalla
   * tampoco tenía `<p-toast>` (los mensajes se emitían al vacío), el botón
   * parecía no hacer absolutamente nada.
   *
   * El hijo se crea con `children: []` y `parent` para que quede igual que el
   * resto del árbol: sin `parent`, eliminarlo antes del primer re-dibujado no
   * encontraría la lista de hermanos.
   */
  addChild(node: TreeNode) {
    if (!this.puedeAgregarHijo(node)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Máximo 3 niveles',
        detail: 'El catálogo maneja categoría, subcategoría y sub-subcategoría. Un cuarto nivel no se puede elegir en el producto ni importar.',
        life: 6000,
      });
      return;
    }
    if (node.children == undefined) {
      node.children = [];
    }
    const hijo: TreeNode = {
      data: {
        nombre: 'Nueva categoria ',
        imagen: '',
        posicion: node.children.length + 1,
        activo: true,
        consecutivo: null,
      },
      children: [],
      parent: node,
    };
    const tipoHijo = this.nombreNivelHijo(node);
    node.children.unshift(hijo);
    node.expanded = true;

    this.data = [...this.data];
    this.cdr.detectChanges();
    this.cdr.markForCheck();

    this.showSuccess(`${tipoHijo.charAt(0).toUpperCase() + tipoHijo.slice(1)} creada dentro de "${node.data?.nombre ?? ''}"`);
  }

  /** Profundidad del nodo en el árbol: 1 = categoría, 2 = subcategoría, 3 = sub-subcategoría. */
  nivelDe(node: TreeNode): number {
    let nivel = 1;
    let actual: any = node;
    const vistos = new Set<any>();
    while (actual?.parent && !vistos.has(actual)) {
      vistos.add(actual);
      nivel++;
      actual = actual.parent;
    }
    return nivel;
  }

  /**
   * Cómo se llama lo que hay en esta fila, según su profundidad.
   *
   * Todas las filas mostraban "categoría", incluidas las subcategorías: el
   * botón de eliminar decía "Eliminar esta categoría" estando parado sobre una
   * subcategoría, y daba la impresión de que iba a borrar la categoría padre
   * entera. Es un texto, pero sobre un botón destructivo sin deshacer.
   */
  nombreNivel(node: TreeNode): string {
    const nivel = this.nivelDe(node);
    if (nivel === 1) return 'categoría';
    if (nivel === 2) return 'subcategoría';
    return 'sub-subcategoría';
  }

  nombreNivelHijo(node: TreeNode): string {
    const nivel = this.nivelDe(node);
    if (nivel === 1) return 'subcategoría';
    return 'sub-subcategoría';
  }

  /**
   * El árbol solo admite 3 niveles: el formulario de producto
   * (`crear-productos.processCategorias`) mapea categoría → subcategoría →
   * sub-subcategoría y del cuarto en adelante devuelve nodos vacíos. La
   * plantilla de importación tampoco tiene columna para un cuarto nivel.
   * Crearlo dejaría datos que ninguna otra pantalla sabe leer.
   */
  puedeAgregarHijo(node: TreeNode): boolean {
    return this.nivelDe(node) < 3;
  }

  /** Cuenta descendientes, para avisar cuántos se llevaría por delante un borrado. */
  private contarDescendientes(node: TreeNode): number {
    const hijos = (node?.children || []) as TreeNode[];
    return hijos.reduce((acc, h) => acc + 1 + this.contarDescendientes(h), 0);
  }

  // Display confirmation dialog before deletion
  confirmDelete(node) {
    this.nodeToDelete = node;

    // El mensaje NOMBRA lo que se va a borrar y de dónde cuelga. Antes decía
    // "esta categoría" para todo, sin decir cuál: parado sobre una
    // subcategoría no había forma de saber si iba a borrarla a ella o a su
    // categoría padre.
    const tipo = this.nombreNivel(node);
    const nombre = String(node?.data?.nombre ?? '').trim() || '(sin nombre)';
    const padre = String((node as any)?.parent?.data?.nombre ?? '').trim();
    const descendientes = this.contarDescendientes(node);

    let msg = `¿Eliminar la ${tipo} "${nombre}"`;
    if (padre) msg += ` de "${padre}"`;
    msg += '?';
    if (descendientes > 0) {
      msg += ` Se eliminarán también sus ${descendientes} ${descendientes === 1 ? 'subcategoría' : 'subcategorías'}.`;
    }
    msg += ' Esta acción no se puede deshacer.';
    this.confirmationMessage = msg;

    this.modalService.open(this.confirmationDialog, { centered: true }).result.then((result) => {
      if (result === 'confirm') {
        this.deleteChild(this.nodeToDelete);
      }
      this.nodeToDelete = null;
    }, () => {
      this.nodeToDelete = null; // cerrado sin confirmar
    });
  }

  /**
   * Elimina un nodo de su lista de hermanos.
   *
   * Antes había una tercera rama, para el caso "tiene padre Y tiene children",
   * que hacía `node.children.indexOf(node)` — o sea, buscaba el nodo DENTRO DE
   * SÍ MISMO. Eso siempre da -1, y `splice(-1, 1)` borra el ÚLTIMO elemento:
   *  · subcategoría hoja (`children: []`) → no borraba nada,
   *  · subcategoría con hijos → borraba su último hijo,
   * y en los dos casos el toast decía "eliminada con éxito".
   *
   * Esa rama se alcanzaba siempre con categorías importadas, porque el
   * importador serializa todos los nodos con `children: []`.
   *
   * La colección de la que hay que sacar el nodo es siempre la misma: los
   * hermanos. Si no tiene padre, son las raíces.
   */
  deleteChild(node) {
    const tipo = this.nombreNivel(node);
    const nombre = String(node?.data?.nombre ?? '').trim() || '(sin nombre)';
    const hermanos = node.parent ? node.parent.children : this.data;
    if (!Array.isArray(hermanos)) return;

    const index = hermanos.indexOf(node);
    if (index === -1) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No se pudo eliminar',
        detail: `La ${tipo} "${nombre}" ya no está en el árbol. Recargá la pantalla e intentá de nuevo.`,
      });
      return;
    }
    hermanos.splice(index, 1);

    this.data = [...this.data];
    this.cdr.detectChanges();
    this.cdr.markForCheck();

    this.showSuccess(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} "${nombre}" eliminada. Recordá guardar.`);
  }

  // Display confirmation dialog before saving
  confirmSave() {
    // Limpiar el nodo pendiente: el diálogo es el mismo para borrar y para
    // guardar, y si quedara marcado el botón Confirmar saldría en rojo de
    // borrado sobre una acción que no borra nada.
    this.nodeToDelete = null;
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

  openImportModal() {
    this.showImportModal = true;
  }

  onImportComplete(result: any) {
    this.showImportModal = false;
    if (result && (result.success > 0 || result.created > 0 || result.updated > 0)) {
      const created = result.created ?? 0;
      const updated = result.updated ?? 0;
      this.showSuccess(`Se importaron ${created} categorías nuevas` + (updated > 0 ? ` y se actualizaron ${updated}` : ''));
      this.obtenerCategorias();
    } else if (result && result.failed > 0) {
      this.showError('Algunas categorías no pudieron importarse. Revisa los errores.');
    }
  }
}
