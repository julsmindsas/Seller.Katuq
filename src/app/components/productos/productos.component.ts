import { Component, OnInit, ViewChild } from '@angular/core';
import { DatatableComponent, ColumnMode } from "@swimlane/ngx-datatable";
import { MaestroService } from '../../shared/services/maestros/maestro.service';
import { Router } from '@angular/router';
import { NgbActiveModal, NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { ProductDetailsComponent } from './product-details/product-details.component';
import Swal from 'sweetalert2';
import { ImagenService } from '../../shared/utils/image.service';
import { LazyLoadEvent } from 'primeng/api';
import * as XLSX from 'xlsx';
import { UtilsService } from '../../shared/services/utils.service';
import { ProveedoresService } from '../dropshipping/services/proveedores.service';
import { Proveedor } from '../dropshipping/interfaces';
import { ImportResult } from '../../shared/models/column-mapping.model';
import { FulfillmentService } from '../../shared/services/fulfillment/fulfillment.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.scss']
})
export class ProductosComponent implements OnInit {
  @ViewChild(DatatableComponent, { static: false }) table: DatatableComponent;

  cargando = false;
  rows = [];
  temp: any[] = [];

  // Paginación
  pageSize = 10;
  currentPage = 1;
  totalItems = 0;
  totalPages = 0;
  lastDocId: string | null = null;

  userRol: any;
  userNit: any;
  NombreUsuario = '';
  Vendedor = 0;
  empresas = [];

  ColumnMode = ColumnMode;

  closeResult: string;
  isMobile = false;
  empresaActual: any;
  ultimasLetras: any;

  // Filtros de dropshipping
  proveedores: Proveedor[] = [];
  selectedProveedor: string | null = null;
  loadingProveedores = false;
  mostrarSoloDropshipping = false;

  // Import modal
  showImportModal: boolean = false;

  // Fulfillment
  fulfillmentEnabled: boolean = false;
  fulfillmentProvider: string = '';
  fulfillmentProviderName: string = '';
  importandoProductosFulfillment: boolean = false;

  constructor(
    private service: MaestroService,
    private imageService: ImagenService,
    private router: Router,
    private modalService: NgbModal,
    private utilsService: UtilsService,
    private proveedoresService: ProveedoresService,
    private fulfillmentService: FulfillmentService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    const currentCompany = localStorage.getItem("currentCompany");
    this.empresaActual = currentCompany ? JSON.parse(currentCompany) : {};
    const texto = this.empresaActual.nomComercial.toString();
    this.ultimasLetras = texto.substring(texto.length - 3);

    // Cargar datos iniciales
    this.cargarDatos();
    this.cargarProveedores();
    this.checkFulfillmentConfig();
  }

  cargarDatos() {
    this.cargando = true;
    this.service.getAllProductsPagination(this.pageSize, this.currentPage, this.lastDocId ?? undefined).subscribe((response: any) => {
      this.temp = [...response.products];
      this.rows = response.products;
      this.totalItems = response.pagination.totalItems;
      this.totalPages = response.pagination.totalPages;
      this.cargando = false;
      this.lastDocId = response.pagination.lastDocId; // para la paginación basada en cursor
    }, error => {
      console.error("Error al cargar datos:", error);
      this.cargando = false;
    });
  }

  // Cargar proveedores para filtro
  cargarProveedores() {
    this.loadingProveedores = true;
    this.proveedoresService.getProveedoresActivos().subscribe({
      next: (proveedores) => {
        this.proveedores = proveedores || [];
        this.loadingProveedores = false;
      },
      error: (error) => {
        console.error('Error cargando proveedores:', error);
        this.loadingProveedores = false;
      }
    });
  }

  // Filtrar por proveedor
  onProveedorChange() {
    this.currentPage = 1;
    this.lastDocId = null;
    this.cargarDatosFiltrados();
  }

  // Filtrar solo productos dropshipping
  onToggleDropshipping() {
    this.currentPage = 1;
    this.lastDocId = null;
    this.selectedProveedor = null; // Limpiar filtro de proveedor
    this.cargarDatosFiltrados();
  }

  // Limpiar filtros
  limpiarFiltros() {
    this.selectedProveedor = null;
    this.mostrarSoloDropshipping = false;
    this.currentPage = 1;
    this.lastDocId = null;
    this.cargarDatos();
  }

  // Cargar datos con filtros aplicados
  cargarDatosFiltrados() {
    this.cargando = true;
    
    if (this.selectedProveedor) {
      // Filtrar por proveedor específico
      this.service.getProductosByProveedor(this.selectedProveedor, this.pageSize, this.currentPage).subscribe((response: any) => {
        this.temp = [...response.products];
        this.rows = response.products;
        this.totalItems = response.pagination.totalItems;
        this.totalPages = response.pagination.totalPages;
        this.cargando = false;
      }, error => {
        console.error("Error al cargar productos por proveedor:", error);
        this.cargando = false;
      });
    } else if (this.mostrarSoloDropshipping) {
      // Filtrar solo productos dropshipping
      this.service.getProductosDropshipping(this.pageSize, this.currentPage).subscribe((response: any) => {
        this.temp = [...response.products];
        this.rows = response.products;
        this.totalItems = response.pagination.totalItems;
        this.totalPages = response.pagination.totalPages;
        this.cargando = false;
      }, error => {
        console.error("Error al cargar productos dropshipping:", error);
        this.cargando = false;
      });
    } else {
      // Sin filtros, cargar todos
      this.cargarDatos();
    }
  }

  // Cambiar página

  onPageChange(event: any) {
    const newPageSize = event.rows;
    const newCurrentPage = Math.floor(event.first / event.rows) + 1;

    // Solo actualizar y cargar datos si hay un cambio real en el tamaño de página o en la página actual
    if (newPageSize !== this.pageSize || newCurrentPage !== this.currentPage) {
      this.pageSize = newPageSize;
      this.currentPage = newCurrentPage;

      // Establecer cargando en true y llamar al método de carga apropiado
      this.cargando = true;
      if (this.selectedProveedor || this.mostrarSoloDropshipping) {
        this.cargarDatosFiltrados();
      } else {
        this.cargarDatos();
      }
    }
  }



  crearProducto() {
    sessionStorage.removeItem('infoForms');
    this.router.navigateByUrl('productos/crearProductos');
  }

  editarProducto(row) {
    console.log(row);
    sessionStorage.setItem('infoForms', JSON.stringify(row));
    this.router.navigateByUrl('productos/crearProductos');
  }

  configurarDropshipping(row) {
    console.log(row);
    sessionStorage.setItem('infoForms', JSON.stringify(row));
    sessionStorage.setItem('openDropshippingTab', 'true');
    this.router.navigateByUrl('productos/crearProductos');
  }

  duplicarProducto(row) {
    console.log('Producto a duplicar:', row);
    
    // Mostrar confirmación antes de duplicar
    Swal.fire({
      title: '¿Duplicar Producto?',
      html: `
        <div style="text-align: left; margin: 20px 0;">
          <p><strong>Producto:</strong> ${row.crearProducto?.titulo || 'Sin título'}</p>
          <p><strong>Referencia actual:</strong> ${row.identificacion?.referencia || 'Sin referencia'}</p>
          <hr>
          <p style="color: #666; font-size: 14px;">
            Se creará una copia exacta del producto con una nueva referencia.<br>
            <strong>Nueva referencia:</strong> ${row.identificacion?.referencia || 'REF'}-COPY-${new Date().getTime().toString().slice(-4)}
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="fa fa-copy"></i> Sí, duplicar',
      cancelButtonText: '<i class="fa fa-times"></i> Cancelar',
      focusCancel: true,
      customClass: {
        popup: 'swal-wide'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarDuplicacion(row);
      }
    });
  }

  private ejecutarDuplicacion(row) {
    console.log('Ejecutando duplicación del producto:', row);
    
    // Mostrar loading
    Swal.fire({
      title: 'Duplicando producto...',
      text: 'Por favor espera mientras se crea la copia del producto.',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // Usar deepClone para crear una copia exacta del producto
    const productoDuplicado = this.utilsService.deepClone(row);
    
    // Quitar las propiedades que no deben duplicarse para crear un nuevo producto
    delete productoDuplicado.id;
    delete productoDuplicado._id;
    delete productoDuplicado.cd;
    delete productoDuplicado.date_edit;
    
    // Modificar la referencia para indicar que es una copia
    if (productoDuplicado.identificacion && productoDuplicado.identificacion.referencia) {
      const timestamp = new Date().getTime().toString().slice(-4);
      productoDuplicado.identificacion.referencia = `${productoDuplicado.identificacion.referencia}-COPY-${timestamp}`;
    }
    
    // Modificar el título para indicar que es una copia
    if (productoDuplicado.crearProducto && productoDuplicado.crearProducto.titulo) {
      productoDuplicado.crearProducto.titulo = `Copia de ${productoDuplicado.crearProducto.titulo}`;
    }
    
    // También modificar el código de barras si existe
    if (productoDuplicado.identificacion && productoDuplicado.identificacion.codigoBarras) {
      const timestamp = new Date().getTime().toString().slice(-4);
      productoDuplicado.identificacion.codigoBarras = `${productoDuplicado.identificacion.codigoBarras}-COPY-${timestamp}`;
    }
    
    console.log('Producto duplicado (sin ID):', productoDuplicado);
    
    // Guardar automáticamente el producto duplicado
    this.service.createProduct(productoDuplicado).subscribe({
      next: (response) => {
        console.log('Producto duplicado guardado exitosamente:', response);
        
        // Recargar la lista de productos para mostrar el nuevo producto
        this.cargarDatos();
        
        // Mostrar mensaje de éxito
        Swal.fire({
          title: '¡Producto Duplicado!',
          html: `
            <div style="text-align: left; margin: 20px 0;">
              <p><i class="fa fa-check-circle" style="color: #28a745;"></i> El producto se ha duplicado exitosamente.</p>
              <hr>
              <p><strong>Producto original:</strong> ${row.crearProducto?.titulo}</p>
              <p><strong>Nueva referencia:</strong> <span style="color: #28a745; font-weight: bold;">${productoDuplicado.identificacion?.referencia}</span></p>
              <p><strong>Nuevo título:</strong> ${productoDuplicado.crearProducto?.titulo}</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: '<i class="fa fa-check"></i> Perfecto',
          showCancelButton: true,
          cancelButtonText: '<i class="fa fa-edit"></i> Editar ahora',
          confirmButtonColor: '#28a745',
          cancelButtonColor: '#007bff'
        }).then((result) => {
          if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
            // Si el usuario quiere editar, navegar al formulario
            sessionStorage.setItem('infoForms', JSON.stringify(response));
            this.router.navigateByUrl('productos/crearProductos');
          }
        });
      },
      error: (error) => {
        console.error('Error al guardar el producto duplicado:', error);
        
        // Mostrar mensaje de error
        Swal.fire({
          title: 'Error al Duplicar',
          html: `
            <div style="text-align: left; margin: 20px 0;">
              <p><i class="fa fa-exclamation-triangle" style="color: #dc3545;"></i> No se pudo guardar el producto duplicado.</p>
              <hr>
              <p><strong>Error:</strong> ${error.error?.msg || 'Error desconocido'}</p>
              <p style="color: #666; font-size: 14px;">Puedes intentar de nuevo o editar manualmente el producto.</p>
            </div>
          `,
          icon: 'error',
          confirmButtonText: '<i class="fa fa-redo"></i> Intentar de nuevo',
          showCancelButton: true,
          cancelButtonText: '<i class="fa fa-edit"></i> Editar manualmente',
          confirmButtonColor: '#dc3545',
          cancelButtonColor: '#6c757d'
        }).then((result) => {
          if (result.isConfirmed) {
            // Intentar de nuevo
            this.ejecutarDuplicacion(row);
          } else if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
            // Si falla el guardado automático, permitir edición manual
            sessionStorage.setItem('infoForms', JSON.stringify(productoDuplicado));
            this.router.navigateByUrl('productos/crearProductos');
          }
        });
      }
    });
  }

  updateFilter(event: any) {
    const input = (event.target as HTMLInputElement).value.toLowerCase();
    if (input === "") { // Si se borra el contenido del filtro
        this.currentPage = 1;
        this.cargarDatos();
        return;
    }
    if (event.key !== 'Enter' || input.length < 3) {
        return;
    }
    // ...resto del código para búsqueda con enter y mínimo 3 caracteres...
    const context = this;
    this.cargando = true;
    this.service.getProductsBySearch(input, this.pageSize, this.currentPage, this.lastDocId ?? undefined).subscribe({
      next(response: any) {
        context.temp = [...response.products];
        context.rows = response.products;
        context.totalItems = response.pagination.totalItems;
        context.totalPages = response.pagination.totalPages;
        context.cargando = false;
        context.lastDocId = response.pagination.lastDocId;
      },
      error(err) {
        console.error(err);
        context.cargando = false;
      },
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
          // this.imageService.eliminarImagen(row.crearProducto.imagenesPrincipales[0].path);
        }
        this.service.deleteProducto(row).subscribe({
          next(value: any) {
            generalContext.cargarDatos();
            Swal.fire({
              title: 'Producto eliminado',
              text: 'El producto se ha eliminado correctamente',
              icon: 'success'
            });
          },
          error(err: any) {
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

  exportToExcel() {
    this.service.exportToExcel().subscribe({
      next: (response) => {
        // Crear un Blob y un enlace temporal para descargar el archivo
        const blob = new Blob([response], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'productos.xlsx'; // Nombre del archivo
        a.click();

        // Liberar memoria
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al exportar el archivo:', err);
      },
    });
  }

  // ============== MÉTODOS DE IMPORTACIÓN ==============

  openImportModal(): void {
    this.showImportModal = true;
  }

  onImportComplete(result: ImportResult): void {
    this.showImportModal = false;
    if (result.success > 0) {
      Swal.fire({
        title: 'Importación Exitosa',
        text: `${result.success} productos importados correctamente`,
        icon: 'success'
      });
      // Recargar lista de productos
      this.cargarDatos();
    }
    if (result.failed > 0) {
      Swal.fire({
        title: 'Importación con errores',
        text: `${result.failed} productos no pudieron ser importados`,
        icon: 'warning'
      });
    }
  }

  // ============== MÉTODOS DE FULFILLMENT ==============

  /**
   * Verifica si hay un proveedor de fulfillment configurado
   */
  checkFulfillmentConfig(): void {
    this.fulfillmentService.getConfiguredProviders().subscribe({
      next: (providers) => {
        if (providers && providers.length > 0) {
          const activeProvider = providers.find(p => p.configured);
          if (activeProvider) {
            this.fulfillmentEnabled = true;
            this.fulfillmentProvider = activeProvider.provider;
            this.fulfillmentProviderName = this.fulfillmentService.getProviderDisplayName(activeProvider.provider);
            console.log(`✅ Fulfillment habilitado: ${this.fulfillmentProviderName}`);
          }
        }
      },
      error: () => {
        this.fulfillmentEnabled = false;
      }
    });
  }

  /**
   * Importa productos desde el fulfillment
   */
  importarProductosFulfillment(): void {
    if (!this.fulfillmentEnabled || !this.fulfillmentProvider) {
      this.toastr.warning('No hay proveedor de fulfillment configurado', 'Advertencia');
      return;
    }

    Swal.fire({
      title: 'Importar Productos de Fulfillment',
      text: `¿Desea importar los productos desde ${this.fulfillmentProviderName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, importar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarImportacionFulfillment();
      }
    });
  }

  /**
   * Ejecuta la importación de productos desde fulfillment
   */
  private ejecutarImportacionFulfillment(): void {
    this.importandoProductosFulfillment = true;

    Swal.fire({
      title: 'Importando productos...',
      text: 'Por favor espera mientras se importan los productos desde el fulfillment.',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    this.fulfillmentService.importProductsFromFulfillment(this.fulfillmentProvider)
      .subscribe({
        next: (res) => {
          this.importandoProductosFulfillment = false;
          if (res.success) {
            this.cargarDatos();
            Swal.fire({
              title: 'Importación Completada',
              html: `<p><strong>${res.data?.created || res.created || 0}</strong> productos creados</p>
                     <p><strong>${res.data?.skipped || res.skipped || 0}</strong> productos omitidos</p>
                     ${(res.data?.errors || res.errors || 0) > 0 ? `<p class="text-danger"><strong>${res.data?.errors || res.errors}</strong> errores</p>` : ''}`,
              icon: (res.data?.errors || res.errors || 0) > 0 ? 'warning' : 'success'
            });
          } else {
            Swal.fire('Error', res.error || 'Error al importar productos', 'error');
          }
        },
        error: (error) => {
          this.importandoProductosFulfillment = false;
          console.error('Error importando productos:', error);
          Swal.fire('Error', 'Error al importar productos del fulfillment', 'error');
        }
      });
  }
}
