import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { ProductDetailsComponent } from '../../productos/product-details/product-details.component';
import { Producto } from '../../../shared/models/productos/Producto';
import { MovimientoInventario } from '../model/movimientoinventario'
import * as XLSX from 'xlsx';
import { BodegaService } from '../../../shared/services/bodegas/bodega.service';
import { InventarioService } from '../../../shared/services/inventarios/inventario.service';
import { Table } from 'primeng/table';

// Tipo extendido para productos con información de inventario
interface ProductoInventario extends Producto {
  cantidad?: number;
  bodegaId?: string;
  bodegaNombre?: string;
}

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
  @ViewChild('dt') dt: Table; // Referencia a la tabla PrimeNG

  cargando = false;
  rows: ProductoInventario[] = [];

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
  bodegasActivasMarketPlaces: any[] = [];

  // Movimientos
  movimiento: { [key: string]: number } = {};
  selectedRow: ProductoInventario;
  inventarioPorMarketplace: any = {};
  pageSizeMovimientos = 10;
  currentPageMovimientos = 1;
  totalPagesMovimientos = 0;
  lastDocIdMovimientos: string | null = null;

  // Manejo de bodegas 
  bodegas: any[] = [];
  bodegaSeleccionada: any = null;
  productosSinFiltro: ProductoInventario[] = []; // Para guardar todos los productos sin filtrar

  // Filtros globales
  globalFilterValue: string = '';

  // Nueva propiedad para almacenar los datos filtrados
  rowsFiltradas: any[] = [];
  
  // Control de los filtros
  filtroGlobal: string = '';
  filtros = {
      referencia: '',
      nombre: '',
      cantidadTipo: '',  // 'agotados', 'bajos', 'disponibles'
      precioMin: null,
      precioMax: null,
      valorTotalMin: null,
      valorTotalMax: null
  };
  
  // Control del ordenamiento
  ordenamiento: string = 'nombreAsc';

  constructor(
    private service: MaestroService,
    private inventarioService: InventarioService,
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

    // Cargar solo las bodegas inicialmente, no los productos
    this.cargarBodegas();

    // Inicializar rows como un array vacío
    this.rows = [];
    this.productosSinFiltro = [];
  }

  cargarBodegas() {
    this.cargando = true;
    this.bodegaService.getBodegas().subscribe({
      next: (bodegas) => {
        this.bodegas = bodegas;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar bodegas:', error);
        this.cargando = false;
      }
    });
  }

  obtenerProductosPorBodega(bodegaId: string) {
    // Si no hay bodega seleccionada, no hacer nada
    if (!bodegaId) {
      this.rows = [];
      this.rowsFiltradas = [];
      this.productosSinFiltro = [];
      return;
    }

    this.cargando = true;
    this.inventarioService.obtenerInventarioPorBodega(bodegaId).subscribe({
      next: (r: any) => {
        if (Array.isArray(r.productos) && r.productos.length > 0) {
          this.rows = r.productos.map(itemInventario => ({
            id: itemInventario.productoId,
            ...itemInventario.producto,
            cantidad: itemInventario.cantidad,
            bodegaId: itemInventario.bodegaId,
            bodegaNombre: itemInventario.bodega.nombre,
          }));
          this.productosSinFiltro = [...this.rows];
          this.rowsFiltradas = [...this.rows]; // Inicializar la lista filtrada
          this.totalItems = this.rows.length;
        } else {
          this.rows = [];
          this.rowsFiltradas = [];
          this.productosSinFiltro = [];
          this.totalItems = 0;
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al obtener productos por bodega:', error);
        this.cargando = false;
        this.rows = [];
        this.rowsFiltradas = [];
        this.productosSinFiltro = [];
        this.totalItems = 0;
      }
    });
  }

  onPageChange(event: any) {
    this.pageSize = event.rows;
    this.currentPage = Math.floor(event.first / event.rows) + 1;
  }

  // Métodos de filtrado local

  updateFilter(event: any) {
    const input = (event.target as HTMLInputElement).value.toLowerCase();
    // Solo ejecutar si es Enter y al menos 3 chars
    if (event.key !== 'Enter' || input.length < 3) return;

    // Si tenemos una bodega seleccionada, buscamos solo en esa bodega
    if (this.bodegaSeleccionada?.idBodega) {
      this.cargando = true;
      // Filtrar los datos que ya tenemos
      const filteredRows = this.productosSinFiltro.filter(producto => 
        producto.crearProducto?.titulo?.toLowerCase().includes(input) || 
        producto.identificacion?.referencia?.toLowerCase().includes(input)
      );
      this.rows = filteredRows;
      this.totalItems = filteredRows.length;
      this.cargando = false;
    }
  }

  // Métodos de ordenamiento local

  sortByQuantity() {
    this.ordenamiento = this.ordenamiento === 'cantidadDesc' ? 'cantidadAsc' : 'cantidadDesc';
    this.aplicarOrdenamiento();
  }

  sortByName(order: 'asc' | 'desc' = 'asc') {
    // Ordenar productos por nombre
    this.rows = [...this.rows].sort((a, b) => {
      const nombreA = a.crearProducto?.titulo?.toLowerCase() || '';
      const nombreB = b.crearProducto?.titulo?.toLowerCase() || '';
      return order === 'asc' 
        ? nombreA.localeCompare(nombreB)
        : nombreB.localeCompare(nombreA);
    });
  }

  sortByPrice(order: 'asc' | 'desc' = 'asc') {
    // Ordenar productos por precio
    this.rows = [...this.rows].sort((a, b) => {
      const precioA = a.precio?.precioUnitarioConIva || 0;
      const precioB = b.precio?.precioUnitarioConIva || 0;
      return order === 'asc' 
        ? precioA - precioB
        : precioB - precioA;
    });
  }

  sortByReference(order: 'asc' | 'desc' = 'asc') {
    // Ordenar productos por referencia
    this.rows = [...this.rows].sort((a, b) => {
      const refA = a.identificacion?.referencia?.toLowerCase() || '';
      const refB = b.identificacion?.referencia?.toLowerCase() || '';
      return order === 'asc' 
        ? refA.localeCompare(refB)
        : refB.localeCompare(refA);
    });
  }

  // Filtrar productos agotados
  filterOutOfStock() {
    this.filtrarAgotados();
  }

  // Método para restablecer todos los filtros
  resetFilters() {
    this.limpiarFiltros();
  }

  exportToExcel() {
    if (this.rowsFiltradas.length === 0) {
      Swal.fire({
        title: 'Sin datos',
        text: 'No hay datos para exportar',
        icon: 'warning'
      });
      return;
    }
    
    // Crear una versión simplificada para Excel
    const excelData = this.rowsFiltradas.map(row => {
      return {
        'Referencia': row.identificacion?.referencia || '',
        'Nombre': row.crearProducto?.titulo || '',
        'Cantidad': row.cantidad || 0,
        'Precio Unitario': row.precio?.precioUnitarioConIva || 0,
        'Valor Total': this.calcularValorTotal(row),
        'Bodega': row.bodegaNombre || this.getNombreBodega(row.bodegaId || ''),
        'Tipo Bodega': this.getTipoBodega(row.bodegaId || '')
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
    XLSX.writeFile(workbook, 'Inventario_Detallado.xlsx');
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

  // Al obtener los productos, inicializar la lista filtrada
  onProductsLoaded(products: any[]) {
    this.rows = products;
    this.rowsFiltradas = [...products]; // Inicialmente todas las filas están visibles
    this.totalItems = products.length;
    this.cargando = false;
  }

  // Método para aplicar el filtro global (búsqueda por texto)
  aplicarFiltroGlobal() {
    this.aplicarFiltros();
  }

  // Método central para aplicar todos los filtros
  aplicarFiltros() {
    let resultados = [...this.rows];
    
    // Aplicar filtro de texto global
    if (this.filtroGlobal && this.filtroGlobal.trim() !== '') {
      const filtro = this.filtroGlobal.trim().toLowerCase();
      resultados = resultados.filter(producto => 
        (producto.crearProducto?.titulo?.toLowerCase().includes(filtro) || 
         producto.identificacion?.referencia?.toLowerCase().includes(filtro))
      );
    }
    
    // Aplicar filtro de referencia
    if (this.filtros.referencia && this.filtros.referencia.trim() !== '') {
      const filtro = this.filtros.referencia.trim().toLowerCase();
      resultados = resultados.filter(producto => 
        producto.identificacion?.referencia?.toLowerCase().includes(filtro)
      );
    }
    
    // Aplicar filtro de nombre
    if (this.filtros.nombre && this.filtros.nombre.trim() !== '') {
      const filtro = this.filtros.nombre.trim().toLowerCase();
      resultados = resultados.filter(producto => 
        producto.crearProducto?.titulo?.toLowerCase().includes(filtro)
      );
    }
    
    // Aplicar filtro por cantidad
    if (this.filtros.cantidadTipo) {
      switch (this.filtros.cantidadTipo) {
        case 'agotados':
          resultados = resultados.filter(producto => (producto.cantidad || 0) === 0);
          break;
        case 'bajos':
          resultados = resultados.filter(producto => (producto.cantidad || 0) > 0 && (producto.cantidad || 0) <= 5);
          break;
        case 'disponibles':
          resultados = resultados.filter(producto => (producto.cantidad || 0) > 5);
          break;
      }
    }
    
    // Aplicar filtros de precio unitario
    if (this.filtros.precioMin !== null && this.filtros.precioMin !== undefined && !isNaN(Number(this.filtros.precioMin))) {
      const precioMin = Number(this.filtros.precioMin);
      resultados = resultados.filter(producto => 
        (producto.precio?.precioUnitarioConIva || 0) >= precioMin
      );
    }
    
    if (this.filtros.precioMax !== null && this.filtros.precioMax !== undefined && !isNaN(Number(this.filtros.precioMax))) {
      const precioMax = Number(this.filtros.precioMax);
      resultados = resultados.filter(producto => 
        (producto.precio?.precioUnitarioConIva || 0) <= precioMax
      );
    }
    
    // Aplicar filtros de valor total
    if (this.filtros.valorTotalMin !== null && this.filtros.valorTotalMin !== undefined && !isNaN(Number(this.filtros.valorTotalMin))) {
      const valorMin = Number(this.filtros.valorTotalMin);
      resultados = resultados.filter(producto => 
        this.calcularValorTotal(producto) >= valorMin
      );
    }
    
    if (this.filtros.valorTotalMax !== null && this.filtros.valorTotalMax !== undefined && !isNaN(Number(this.filtros.valorTotalMax))) {
      const valorMax = Number(this.filtros.valorTotalMax);
      resultados = resultados.filter(producto => 
        this.calcularValorTotal(producto) <= valorMax
      );
    }
    
    // Aplicar ordenamiento actual
    this.ordenarResultados(resultados);
    
    // Actualizar la lista filtrada
    this.rowsFiltradas = resultados;
  }
  
  // Método para aplicar ordenamiento
  aplicarOrdenamiento() {
    this.ordenarResultados(this.rowsFiltradas);
  }
  
  // Método para ordenar resultados según el criterio seleccionado
  ordenarResultados(resultados: any[]) {
    switch (this.ordenamiento) {
      case 'nombreAsc':
        resultados.sort((a, b) => (a.crearProducto?.titulo || '').localeCompare(b.crearProducto?.titulo || ''));
        break;
      case 'nombreDesc':
        resultados.sort((a, b) => (b.crearProducto?.titulo || '').localeCompare(a.crearProducto?.titulo || ''));
        break;
      case 'cantidadAsc':
        resultados.sort((a, b) => (a.cantidad || 0) - (b.cantidad || 0));
        break;
      case 'cantidadDesc':
        resultados.sort((a, b) => (b.cantidad || 0) - (a.cantidad || 0));
        break;
      case 'precioAsc':
        resultados.sort((a, b) => (a.precio?.precioUnitarioConIva || 0) - (b.precio?.precioUnitarioConIva || 0));
        break;
      case 'precioDesc':
        resultados.sort((a, b) => (b.precio?.precioUnitarioConIva || 0) - (a.precio?.precioUnitarioConIva || 0));
        break;
      case 'valorTotalAsc':
        resultados.sort((a, b) => this.calcularValorTotal(a) - this.calcularValorTotal(b));
        break;
      case 'valorTotalDesc':
        resultados.sort((a, b) => this.calcularValorTotal(b) - this.calcularValorTotal(a));
        break;
    }
  }
  
  // Método para filtrar solo productos agotados
  filtrarAgotados() {
    this.filtros.cantidadTipo = 'agotados';
    this.aplicarFiltros();
  }
  
  // Método para limpiar todos los filtros
  limpiarFiltros() {
    this.filtroGlobal = '';
    this.filtros = {
      referencia: '',
      nombre: '',
      cantidadTipo: '',
      precioMin: null,
      precioMax: null,
      valorTotalMin: null,
      valorTotalMax: null
    };
    this.ordenamiento = 'nombreAsc';
    this.rowsFiltradas = [...this.rows];
    this.aplicarOrdenamiento();
  }

  /**
   * Calcula el valor total (cantidad * precio) de un producto
   */
  calcularValorTotal(producto: ProductoInventario): number {
    const cantidad = producto.cantidad || 0;
    const precioUnitario = producto.precio?.precioUnitarioConIva || 0;
    return cantidad * precioUnitario;
  }

  /**
   * Calcula el total de unidades en el inventario filtrado
   */
  calcularTotalItems(): number {
    return this.rowsFiltradas.reduce((total, producto) => total + (producto.cantidad || 0), 0);
  }

  /**
   * Calcula el valor total de todo el inventario filtrado
   */
  calcularValorTotalInventario(): number {
    return this.rowsFiltradas.reduce((total, producto) => {
      return total + this.calcularValorTotal(producto);
    }, 0);
  }
}
