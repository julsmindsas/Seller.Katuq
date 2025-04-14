import { Component, OnInit, TemplateRef } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { ProductDetailsComponent } from '../../productos/product-details/product-details.component';
import { Producto } from '../../../shared/models/productos/Producto';
import { MovimientoInventario } from '../model/movimientoinventario'
import * as XLSX from 'xlsx';
import { BodegaService } from '../../../shared/services/bodegas/bodega.service';

interface PageReference {
  firstDocId: string | null;
  lastDocId: string | null;
}

@Component({
  selector: 'app-inventarios',
  templateUrl: './inventarios.component.html',
  styleUrls: ['./inventarios.component.scss']
})
export class InventarioCatalogoComponent implements OnInit {

  cargando = false;
  rows: Producto[] = [];

  // Paginación
  pageSize = 10;
  currentPage = 1; // Página actual
  totalItems = 0;
  totalPages = 0;

  // Historial de referencias de páginas
  // El índice de este array será el número de página
  // pageReferences[1] es para página 1, pageReferences[2] para página 2, etc.
  pageReferences: PageReference[] = [];

  // Variables para determinar la dirección
  // isForward = true significa que vas a una página siguiente
  // isForward = false significa que retrocedes
  isForward = true;

  // Parámetros de backend
  // Cuando avanzamos, usamos lastDocId de la página anterior
  // Cuando retrocedemos, usamos firstDocId de la página actual
  lastDocId: string | null = null;
  firstDocId: string | null = null;

  isMobile = false;
  empresaActual: any;
  ultimasLetras: any;
  bodegasActivasMarketPlaces: any;

  // Movimientos
  movimiento: { [key: string]: number } = {};
  selectedRow: Producto;
  inventarioPorMarketplace: any = {};
  pageSizeMovimientos = 10;
  currentPageMovimientos = 1;
  totalPagesMovimientos = 0;
  lastDocIdMovimientos: string | null = null;

  // Manejo de bodegas 
  bodegas: any[] = [];
  bodegaSeleccionada: any = null;
  productosSinFiltro: Producto[] = []; // Para guardar todos los productos sin filtrar

  constructor(
    private service: MaestroService,
    private router: Router,
    private modalService: NgbModal,
    private bodegaService: BodegaService // Inyectamos el servicio de bodegas
  ) { }

  ngOnInit(): void {
    this.empresaActual = JSON.parse(sessionStorage.getItem("currentCompany") ?? '{}');
    const texto = this.empresaActual.nomComercial.toString();
    this.ultimasLetras = texto.substring(texto.length - 3);

    // Inicializar el historial de páginas
    // Suponemos que no tenemos referencias para la página 1 todavía
    this.pageReferences[this.currentPage] = { firstDocId: null, lastDocId: null };

    // Cargar las bodegas usando el servicio compartido
    this.cargarBodegas();
    
    // Cargar los productos
    this.cargarDatos();
    
    // Suscribirse a cambios en la bodega seleccionada
    this.bodegaService.getBodegaSeleccionada().subscribe(bodega => {
      if (bodega !== this.bodegaSeleccionada) {
        this.bodegaSeleccionada = bodega;
        this.filtrarProductosPorBodega();
      }
    });
  }
  
  cargarBodegas() {
    this.bodegaService.getBodegas().subscribe(bodegas => {
      this.bodegas = bodegas;
    });
  }

  cargarDatos() {
    this.cargando = true;

    // Determinar si avanzamos o retrocedemos
    // Si isForward = true, usaremos lastDocId de la página anterior
    // Si isForward = false, usaremos firstDocId de la página actual
    let lastDocToSend = null;
    let firstDocToSend = null;

    if (this.currentPage > 1 && this.isForward) {
      // Si vamos hacia adelante, tomamos el lastDocId de la página anterior
      const previousPage = this.currentPage - 1;
      lastDocToSend = this.pageReferences[previousPage]?.lastDocId || null;
    }

    if (!this.isForward && this.currentPage >= 1) {
      // Si retrocedemos, tomamos el firstDocId de la página actual (la que estamos dejando)
      // Para retroceder a la página anterior (por ejemplo, de 3 a 2),
      // usamos el firstDocId de la página 3.
      // Ojo: Esto implica que ya visitaste la página actual antes y tienes su firstDocId.
      const currentPageRef = this.pageReferences[this.currentPage];
      firstDocToSend = currentPageRef?.firstDocId || null;
      lastDocToSend = currentPageRef?.lastDocId || null;
    }

    this.service.getAllProductsInventariablesPagination(this.pageSize, this.currentPage, lastDocToSend, firstDocToSend)
      .subscribe({
        next: (response: any) => {
          this.rows = response.products;
          this.productosSinFiltro = [...this.rows]; // Guardamos una copia sin filtrar
          this.totalItems = response.pagination.totalItems;
          this.totalPages = response.pagination.totalPages;
          this.cargando = false;

          // Guardamos las referencias de la página actual
          this.pageReferences[this.currentPage] = {
            firstDocId: response.pagination.firstDocId,
            lastDocId: response.pagination.lastDocId
          };

          // Actualizamos las variables locales
          this.lastDocId = response.pagination.lastDocId;
          this.firstDocId = response.pagination.firstDocId;

          // Si hay una bodega seleccionada, filtramos los productos
          this.filtrarProductosPorBodega();
        },
        error: (err) => {
          console.error("Error al cargar datos:", err);
          this.cargando = false;
        }
      });
  }
  
  // Método para aplicar el filtro de bodega a los productos
  filtrarProductosPorBodega() {
    if (!this.bodegaSeleccionada) {
      this.rows = [...this.productosSinFiltro]; // Si no hay bodega seleccionada, mostramos todos
      return;
    }
    
    this.rows = this.productosSinFiltro.filter(producto => 
      producto.bodegaId === this.bodegaSeleccionada.idBodega
    );
  }

  // Método para cambiar la bodega seleccionada
  cambiarBodegaSeleccionada(bodega: any) {
    this.bodegaService.seleccionarBodega(bodega);
  }

  onPageChange(event: any) {
    const newPageSize = event.rows;
    const newCurrentPage = Math.floor(event.first / event.rows) + 1;

    if (newPageSize !== this.pageSize || newCurrentPage !== this.currentPage) {
      // Determinar dirección:
      // Si la nueva página es mayor que la actual, vamos hacia adelante
      // Si la nueva página es menor, retrocedemos
      this.isForward = newCurrentPage > this.currentPage;

      // Actualizar currentPage y pageSize
      this.pageSize = newPageSize;
      this.currentPage = newCurrentPage;

      // Si no tenemos referencias para esta página (no visitada antes),
      // inicializamos en null
      if (!this.pageReferences[this.currentPage]) {
        this.pageReferences[this.currentPage] = { firstDocId: null, lastDocId: null };
      }

      this.cargando = true;
      this.cargarDatos();
    }
  }

  crearProducto() {
    sessionStorage.removeItem('infoForms');
    this.router.navigateByUrl('productos/crearProductos');
  }

  editarProducto(row) {
    this.service.editProductByReference(row).subscribe({
      next: () => {
        Swal.fire({
          title: 'Producto editado',
          text: 'El producto se ha editado correctamente',
          icon: 'success'
        });
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  updateFilter(event: any) {
    const input = (event.target as HTMLInputElement).value.toLowerCase();
    // Solo ejecutar si es Enter y al menos 3 chars
    if (event.key !== 'Enter' || input.length < 3) return;

    this.cargando = true;
    const context = this;
    this.service.getProductsBySearch(input, this.pageSize, this.currentPage, this.lastDocId).subscribe({
      next(response: any) {
        context.rows = response.products;
        context.totalItems = response.pagination.totalItems;
        context.totalPages = response.pagination.totalPages;
        context.cargando = false;
        context.lastDocId = response.pagination.lastDocId;
        context.firstDocId = response.pagination.firstDocId;

        // Guardar refs de la página actual después de una búsqueda
        context.pageReferences[context.currentPage] = {
          firstDocId: context.firstDocId,
          lastDocId: context.lastDocId
        };
      },
      error(err) {
        console.error(err);
        context.cargando = false;
      }
    });
  }

  viewProduct(row) {
    const config: NgbModalOptions = {
      backdrop: "static",
      size: 'xl',
      keyboard: true,
      centered: true,
      animation: true,
      fullscreen: true,
      scrollable: true,
      windowClass: 'modal-fullscreen'
    }
    const modalRef = this.modalService.open(ProductDetailsComponent, config);
    modalRef.componentInstance.producto = row;
    modalRef.componentInstance.isView = true;
  }

  eliminarProducto(row) {
    const generalContext = this;
    Swal.fire({
      title: '¿Está seguro de eliminar el producto?',
      text: 'Esta acción no se puede revertir',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        if (Array.isArray(row.crearProducto.imagenesPrincipales) && row.crearProducto.imagenesPrincipales?.length > 0) {
          // si tienes un service para imagenes
          // this.imageService.eliminarImagen(row.crearProducto.imagenesPrincipales[0].path);
        }
        generalContext.service.deleteProducto(row).subscribe({
          next() {
            generalContext.cargarDatos();
            Swal.fire({
              title: 'Producto eliminado',
              text: 'El producto se ha eliminado correctamente',
              icon: 'success'
            });
          },
          error() {
            Swal.fire({
              title: 'Error',
              text: 'No se ha podido eliminar el producto',
              icon: 'error'
            });
          }
        })
      }
    });
  }

  actualizarInventarioTemp(key: string | number, value: number) {
    this.inventarioPorMarketplace[key] = value;
  }

  guardarInventario() {
    let totalInventario = 0;
    const movimientos: MovimientoInventario[] = [];

    Object.keys(this.inventarioPorMarketplace).forEach(key => {
      const cantidad = parseInt(this.inventarioPorMarketplace[key]) || 0;
      totalInventario += cantidad;
      if (cantidad) {
        const movimiento: MovimientoInventario = {
          productId: this.selectedRow.cd,
          productRef: "N/A",
          cantidadCambio: cantidad,
          clienteDocumento: "N/A",
          tipoMovimiento: cantidad > 0 ? "in" : "out",
          origenMovimiento: "InventarioCatalogo",
          fecha: new Date().toISOString(),
          ordenId: "N/A",
          usuario: "sistema",
          company: "N/A",
          canal: key.toString(),
          ubicacion: 'Principal'
        };
        movimientos.push(movimiento);
      }
    });

    this.selectedRow.disponibilidad.cantidadDisponible =
      parseInt(this.selectedRow.disponibilidad.cantidadDisponible.toString()) + totalInventario;
    this.editarProducto(this.selectedRow);
    this.guardarMovimientoInventario(movimientos);
  }

  guardarMovimientoInventario(movimientos: MovimientoInventario[]) {
    const context = this;
    this.service.guardarMovimientoInventario({ movimientosInventario: movimientos }).subscribe({
      next() {
        Swal.fire({
          title: 'Movimientos de inventario generado',
          text: 'Movimientos de inventario generado exitosamente',
          icon: 'success'
        });
      },
      error(err) {
        console.error(err);
        Swal.fire({
          title: 'Error',
          text: 'Movimientos de inventario con errores',
          icon: 'error'
        });
      },
      complete() {
        context.modalService.dismissAll();
      }
    })
  }

  getMovimientosInventarioByProduct(row: any, content: TemplateRef<any>) {
    this.selectedRow = row;
    this.movimiento = {};
    const context = this;
    this.service.getMovimientosInventarioByProduct(row, this.pageSizeMovimientos, this.currentPageMovimientos, this.lastDocIdMovimientos)
      .subscribe({
        next(value) {
          context.movimiento = value.inventoryMovements;
          context.lastDocIdMovimientos = value.pagination.lastDocId;
          context.modalService.open(content, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'xl'
          });
        },
        error(err) {
          console.error(err);
        }
      });
  }

  sortByQuantity() {
    this.cargando = true;
    this.service.getAllProductsInventariablesPagination(this.pageSize, this.currentPage, null, null, {
      orderBy: 'disponibilidad.cantidadDisponible',
      orderDirection: 'asc'
    }).subscribe(response => {
      this.rows = response.products;
      this.totalItems = response.pagination.totalItems;
      this.totalPages = response.pagination.totalPages;
      this.cargando = false;
    });
  }

  // Al dar clic en el botón "Filtrar Agotados"
  filterOutOfStock() {
    this.cargando = true;
    this.service.getAllProductsInventariablesPagination(this.pageSize, this.currentPage, null, null, {
      filterOutOfStock: true
    }).subscribe(response => {
      this.rows = response.products;
      this.totalItems = response.pagination.totalItems;
      this.totalPages = response.pagination.totalPages;
      this.cargando = false;
    });
  }

  exportToExcel() {
    const worksheet = XLSX.utils.json_to_sheet(this.rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
    XLSX.writeFile(workbook, 'Inventario.xlsx');
  }

  openInventoryModal(row: Producto, content: TemplateRef<any>) {
    this.selectedRow = row;
    this.movimiento = {}; // Resetear el objeto de movimientos
    
    // Mostrar en el modal la bodega a la que pertenece el producto
    const bodegaDelProducto = this.bodegas.find(b => b.idBodega === row.bodegaId);
    
    this.inventarioPorMarketplace = row.marketplace.campos.filter(c => c.activo === true).map(campo => ({
      name: campo.nameMP,
      cantidad: 0
    }));

    this.bodegasActivasMarketPlaces = this.selectedRow.marketplace.campos.filter(c => c.activo === true);

    this.inventarioPorMarketplace['puntoDeVenta'] = 0;
    this.inventarioPorMarketplace['sellerCenter'] = 0;
    this.inventarioPorMarketplace['paginaWeb'] = 0;

    this.modalService.open(content, {
      ariaLabelledBy: 'modal-basic-title',
      size: 'xl'
    });
  }

  // Métodos auxiliares para la plantilla
  
  /**
   * Obtiene el nombre de una bodega por el ID
   */
  getNombreBodega(bodegaId: string): string {
    const bodega = this.bodegas.find(b => b.idBodega === bodegaId);
    return bodega?.nombre || 'Sin bodega asignada';
  }

  /**
   * Obtiene el tipo de una bodega por el ID
   */
  getTipoBodega(bodegaId: string): string {
    const bodega = this.bodegas.find(b => b.idBodega === bodegaId);
    return bodega?.tipo || '';
  }

  /**
   * Determina si una bodega es de tipo físico
   */
  isBodegaFisica(bodegaId: string): boolean {
    return this.getTipoBodega(bodegaId) === 'Física';
  }

  /**
   * Determina si una bodega es de tipo transaccional
   */
  isBodegaTransaccional(bodegaId: string): boolean {
    return this.getTipoBodega(bodegaId) === 'Transaccional';
  }

  /**
   * Devuelve las clases CSS para el movimiento de inventario
   */
  getClaseMovimiento(tipoMovimiento: string): any {
    return {
      'bg-success': tipoMovimiento === 'in',
      'bg-danger': tipoMovimiento === 'out'
    };
  }

  /**
   * Devuelve las clases del icono para el movimiento de inventario
   */
  getClaseIconoMovimiento(tipoMovimiento: string): any {
    return {
      'bi-arrow-up-circle': tipoMovimiento === 'in',
      'bi-arrow-down-circle': tipoMovimiento === 'out'
    };
  }

  /**
   * Devuelve las clases CSS para la etiqueta de tipo de bodega
   */
  getClasesTipoBodega(bodegaId: string): any {
    const tipo = this.getTipoBodega(bodegaId);
    return {
      'bg-primary': tipo === 'Física',
      'bg-info': tipo === 'Transaccional'
    };
  }
}
