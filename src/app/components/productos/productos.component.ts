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

@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.scss']
})
export class ProductosComponent implements OnInit {
  @ViewChild(DatatableComponent, { static: false }) table: DatatableComponent;

  cargando = false;
  rows = [];
  temp = [];

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

  constructor(
    private service: MaestroService,
    private imageService: ImagenService,
    private router: Router,
    private modalService: NgbModal
  ) { }

  ngOnInit(): void {
    this.empresaActual = JSON.parse(sessionStorage.getItem("currentCompany"));
    const texto = this.empresaActual.nomComercial.toString();
    this.ultimasLetras = texto.substring(texto.length - 3);

    // Cargar datos iniciales
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    this.service.getAllProductsPagination(this.pageSize, this.currentPage, this.lastDocId).subscribe((response: any) => {
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

  // Cambiar página

  onPageChange(event: any) {
    const newPageSize = event.rows;
    const newCurrentPage = Math.floor(event.first / event.rows) + 1;

    // Solo actualizar y cargar datos si hay un cambio real en el tamaño de página o en la página actual
    if (newPageSize !== this.pageSize || newCurrentPage !== this.currentPage) {
      this.pageSize = newPageSize;
      this.currentPage = newCurrentPage;

      // Establecer cargando en true y llamar a cargarDatos solo si hay un cambio real
      this.cargando = true;
      this.cargarDatos();
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

  updateFilter(event: any) {
    const input = (event.target as HTMLInputElement).value.toLowerCase();

    // Solo ejecutar si la tecla presionada es Enter y hay un valor de al menos 3 caracteres.
    if (event.key !== 'Enter' || input.length < 3) {
      return;
    }

    let temp: any;
    this.cargando = true;

    // temp = this.temp.filter((d) => {
    //   const res = d.crearProducto.titulo.toLowerCase().indexOf(val) !== -1 || !val;
    //   const res1 = d.crearProducto.descripcion.toLowerCase().indexOf(val) !== -1 || !val;
    //   const res4 = d.identificacion?.referencia != null ? d.identificacion?.referencia.toString().toLowerCase().indexOf(val) !== -1 : !val || !val;
    //   const res5 = d.disponibilidad?.cantidadDisponible?.toString().toLowerCase().indexOf(val) !== -1 || !val;
    //   const res8 = d.precio?.precioUnitarioSinIva?.toString().toLowerCase().indexOf(val) !== -1 || !val;
    //   const res9 = d.date_edit.toLowerCase().indexOf(val) !== -1 || !val;
    //   return res || res1 || res4 || res5 || res8 || res9;
    // });
    const context = this;
    this.service.getProductsBySearch(input, this.pageSize, this.currentPage, this.lastDocId).subscribe({
      next(response: any) {
        context.temp = [...response.products];
        context.rows = response.products;
        context.totalItems = response.pagination.totalItems;
        context.totalPages = response.pagination.totalPages;
        context.cargando = false;
        context.lastDocId = response.pagination.lastDocId; // para la paginación basada en cursor

      },
      error(err) {
        console.error(err)
        context.cargando = false;

      },
    })

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
}
