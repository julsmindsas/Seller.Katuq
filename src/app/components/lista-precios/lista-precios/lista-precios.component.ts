import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { EditarPreciosTipoClienteComponent } from '../editar-precios-tipo-cliente/editar-precios-tipo-cliente.component';
import { EditarPrecioUnitarioComponent } from '../editar-precio-unitario/editar-precio-unitario.component';
import { EditarPrecioVolumenComponent } from '../editar-precio-volumen/editar-precio-volumen.component';
import { ImportarCostosModalComponent } from '../importar-costos-modal/importar-costos-modal.component';
import { Producto, PrecioPorTipoCliente } from 'src/app/shared/models/productos/Producto';

@Component({
  selector: 'app-lista-precios',
  templateUrl: './lista-precios.component.html',
  styleUrls: ['./lista-precios.component.scss']
})
export class ListaPreciosComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput: any;

  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  cargando = false;
  productosFiltrados: Producto[] = [];
  tiposCliente: any[] = [];
  searchTerm: string = '';
  activeTab: number = 0;
  readonly COSTO_TAB_INDEX = 3;

  // Paginación server-side
  pageSize = 10;
  totalRecords = 0;
  private _lazyLoadInitialized = false;

  // Row expansion
  expandedRows: { [key: string]: boolean } = {};

  // Cache de todos los productos — solo se carga para exportar
  private _todosLosProductos: Producto[] | null = null;

  constructor(
    private service: MaestroService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.cargarTiposCliente();

    // Debounce de búsqueda — 500ms después de dejar de escribir
    this.searchSubject$
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => {
        this.searchTerm = term;
        this.cargarPagina(1);
      });

    // cargarPagina(1) como fallback: si p-table no dispara onLazyLoad en el primer render
    // (ocurre en algunos casos dentro de p-tabPanel), cargamos manualmente
    setTimeout(() => {
      if (!this._lazyLoadInitialized) {
        this.cargarPagina(1);
      }
    }, 300);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Carga de datos ──

  cargarTiposCliente() {
    this.service.consultarTiposCliente()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          let tiposProcesados: any[] = [];
          if (Array.isArray(data)) tiposProcesados = data;
          else if (data?.data && Array.isArray(data.data)) tiposProcesados = data.data;
          else if (data?.results && Array.isArray(data.results)) tiposProcesados = data.results;

          this.tiposCliente = tiposProcesados.map(tipo => ({
            ...tipo,
            descripcion: tipo.descripcion || tipo.description || '',
            nombre: tipo.nombre || tipo.name || ''
          }));
        },
        error: () => {
          this.service.consultarTiposClienteActivos()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (dataActivos: any) => {
                this.tiposCliente = Array.isArray(dataActivos) ? dataActivos : [];
              }
            });
        }
      });
  }

  /**
   * Carga UNA página de productos desde el servidor.
   * Si hay searchTerm, usa getProductsBySearch; si no, getAllProductsPagination.
   */
  cargarPagina(page: number) {
    this.cargando = true;
    const term = this.searchTerm?.trim();

    const obs$ = term
      ? this.service.getProductsBySearch(term, this.pageSize, page)
      : this.service.getAllProductsPagination(this.pageSize, page);

    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        this.productosFiltrados = Array.isArray(data?.products) ? data.products : [];
        this.totalRecords = data?.pagination?.totalItems || this.productosFiltrados.length;
        this.cargando = false;
      },
      error: () => {
        this.productosFiltrados = [];
        this.cargando = false;
      }
    });
  }

  /**
   * Evento lazy load de p-table — se dispara al cambiar página o rows.
   * El primer disparo (init) lo manejamos aquí; los siguientes son paginación real.
   */
  onLazyLoad(event: any) {
    this.pageSize = event.rows || 10;
    const page = Math.floor((event.first || 0) / this.pageSize) + 1;
    this._lazyLoadInitialized = true;
    this.cargarPagina(page);
  }

  /**
   * Carga TODOS los productos (todas las páginas) — solo para exportar Excel.
   * Paginación en PARALELO (batches) → rápido aun con miles de productos.
   * Siempre trae fresco (precios actuales), reintenta páginas que fallen y, si
   * queda incompleto, pide confirmación en vez de exportar parcial en silencio.
   */
  private async cargarTodosLosProductos(callback: () => void) {
    // Cache: exports repetidos (p.ej. cambiar de pestaña) no re-paginan el catálogo.
    // Se invalida al editar/importar/eliminar precios (this._todosLosProductos = null).
    if (this._todosLosProductos) { callback(); return; }

    const PAGE = 100;        // máx que acepta el backend
    const CONCURRENCY = 6;   // páginas en paralelo por batch

    const actualizarProgreso = (cargados: number, total: number) => {
      const el = Swal.getHtmlContainer();
      if (el) el.innerHTML = `Cargando catálogo… <b>${cargados}</b>${total ? ' / ' + total : ''} productos`;
    };

    try {
      // Página 1 → total real de páginas/items (con count del backend).
      const first: any = await this.service.getAllProductsPagination(PAGE, 1)
        .pipe(takeUntil(this.destroy$)).toPromise();
      const all: Producto[] = Array.isArray(first?.products) ? [...first.products] : [];
      const totalItems = first?.pagination?.totalItems || all.length;
      const totalPages = Math.max(1, first?.pagination?.totalPages || 1);
      actualizarProgreso(all.length, totalItems);

      // Resto de páginas en paralelo (offset → páginas independientes).
      for (let start = 2; start <= totalPages; start += CONCURRENCY) {
        const batch: Promise<any>[] = [];
        for (let p = start; p < start + CONCURRENCY && p <= totalPages; p++) {
          batch.push(this.fetchPaginaConReintento(p, PAGE));
        }
        const results = await Promise.all(batch);
        for (const r of results) {
          if (Array.isArray(r?.products)) all.push(...r.products);
        }
        actualizarProgreso(all.length, totalItems);
      }

      // Anti parcial-silencioso: si faltan productos, avisar antes de exportar.
      const incompleto = !!(totalItems && all.length < totalItems);
      if (incompleto) {
        const resp = await Swal.fire({
          title: 'Exportación incompleta',
          html: `Se cargaron <b>${all.length}</b> de <b>${totalItems}</b> productos (alguna página falló).<br>¿Exportar de todos modos?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Exportar lo cargado',
          cancelButtonText: 'Cancelar'
        });
        if (!resp.isConfirmed) return; // cancela sin exportar ni error
      }

      this._todosLosProductos = all;
      callback();
      // No cachear un export parcial: la próxima vez se reintenta completo.
      if (incompleto) this._todosLosProductos = null;
    } catch (err) {
      console.error('[ListaPrecios][Export] Error cargando catálogo completo:', err);
      Swal.fire('Error', 'No se pudo cargar el catálogo completo para exportar. Intenta de nuevo.', 'error');
    }
  }

  /** Trae una página de productos con reintento; si falla del todo, devuelve vacío. */
  private async fetchPaginaConReintento(page: number, pageSize: number, intentos = 2): Promise<any> {
    for (let i = 0; i < intentos; i++) {
      try {
        return await this.service.getAllProductsPagination(pageSize, page)
          .pipe(takeUntil(this.destroy$)).toPromise();
      } catch (e) {
        if (i === intentos - 1) {
          console.warn(`[ListaPrecios][Export] Página ${page} falló tras ${intentos} intentos`, e);
          return { products: [] };
        }
      }
    }
    return { products: [] };
  }

  // ── Búsqueda ──

  onSearchInput(event: any) {
    this.searchSubject$.next(event.target.value || '');
  }

  buscarProducto() {
    this.cargarPagina(1);
  }

  onTabChange(event: any) {
    this.activeTab = event.index;
  }

  // ── Precios base y comparación ──

  obtenerPrecio(producto: Producto): number {
    if (this.activeTab === 0 && producto.preciosPorTipoCliente?.length > 0) {
      return producto.preciosPorTipoCliente[0].precio ||
             producto.precio?.precioUnitarioConIva ||
             producto.precio?.precioUnitarioSinIva || 0;
    }
    return producto.precio?.precioUnitarioConIva || producto.precio?.precioUnitarioSinIva || 0;
  }

  obtenerPrecioBase(producto: Producto): number {
    return producto.precio?.precioUnitarioConIva || producto.precio?.precioUnitarioSinIva || 0;
  }

  getPorcentajeDiferencia(producto: Producto, precioTipo: number): number {
    const precioBase = this.obtenerPrecioBase(producto);
    if (precioBase === 0) return 0;
    return ((precioTipo - precioBase) / precioBase) * 100;
  }

  getPreciosValidosPorTipoCliente(producto: Producto): PrecioPorTipoCliente[] {
    if (!producto.preciosPorTipoCliente?.length || !this.tiposCliente?.length) return [];

    const tiposClienteIds = this.tiposCliente.map(t => t.id);
    return producto.preciosPorTipoCliente
      .filter(precio => tiposClienteIds.includes(precio.tipoClienteId))
      .map(precio => {
        const tipoActual = this.tiposCliente.find(t => t.id === precio.tipoClienteId);
        return {
          ...precio,
          tipoClienteNombre: tipoActual?.descripcion || tipoActual?.nombre || precio.tipoClienteNombre
        };
      });
  }

  getTiposClienteSinPrecio(producto: Producto): any[] {
    if (!this.tiposCliente?.length) return [];
    if (!producto.preciosPorTipoCliente?.length) return this.tiposCliente;

    const tiposConPrecio = producto.preciosPorTipoCliente.map(p => p.tipoClienteId);
    return this.tiposCliente.filter(tipo => !tiposConPrecio.includes(tipo.id));
  }

  obtenerFechaEdicion(producto: Producto): string {
    return producto.date_edit || '-';
  }

  // ── TrackBy ──
  trackByTipoClienteId(index: number, precio: PrecioPorTipoCliente): string {
    return precio.tipoClienteId;
  }

  trackByTipoId(index: number, tipo: any): string {
    return tipo.id;
  }

  // ── Edición ──

  editarPrecio(producto: Producto) {
    if (!producto) return;

    switch (this.activeTab) {
      case 0: this.editarPrecioTipoCliente(producto); break;
      case 1: this.editarPrecioUnitario(producto); break;
      case 2: this.editarPrecioVolumen(producto); break;
      case this.COSTO_TAB_INDEX: this.abrirModalImportarCostos(); break;
    }
  }

  private editarPrecioTipoCliente(producto: Producto) {
    const modalRef = this.modalService.open(EditarPreciosTipoClienteComponent, {
      size: 'lg', centered: true, backdrop: 'static'
    });
    modalRef.componentInstance.producto = producto;

    modalRef.result.then((result) => {
      if (result?.success) {
        this.actualizarProductoEnVista(result.producto);
        Swal.fire('Éxito', 'Precios por tipo de cliente guardados correctamente', 'success');
      } else if (result && result.success === false) {
        const msg = typeof result.error === 'string' ? result.error : (result.error?.message || 'No se pudieron guardar los precios');
        Swal.fire('Error', msg, 'error');
      }
    }).catch(() => {});
  }

  private editarPrecioUnitario(producto: Producto) {
    const modalRef = this.modalService.open(EditarPrecioUnitarioComponent, {
      size: 'lg', centered: true, backdrop: 'static'
    });
    modalRef.componentInstance.producto = producto;

    modalRef.result.then((result) => {
      if (result?.success) {
        this.actualizarProductoEnVista(result.producto);
        Swal.fire('Éxito', 'Precio unitario guardado correctamente', 'success');
      }
    }).catch(() => {});
  }

  private editarPrecioVolumen(producto: Producto) {
    const modalRef = this.modalService.open(EditarPrecioVolumenComponent, {
      size: 'xl', centered: true, backdrop: 'static'
    });
    modalRef.componentInstance.producto = producto;

    modalRef.result.then((result) => {
      if (result?.success) {
        this.actualizarProductoEnVista(result.producto);
        Swal.fire('Éxito', 'Precios por volumen guardados correctamente', 'success');
      }
    }).catch(() => {});
  }

  private actualizarProductoEnVista(productoActualizado: Producto) {
    const index = this.productosFiltrados.findIndex(p => p.cd === productoActualizado.cd);
    if (index !== -1) {
      this.productosFiltrados[index] = productoActualizado;
      this.productosFiltrados = [...this.productosFiltrados];
    }
  }

  obtenerCostoUnitario(producto: Producto): number {
    const costoPlano = Number((producto as any)?.costoUnitario);
    if (Number.isFinite(costoPlano) && costoPlano > 0) return costoPlano;

    const costoPrecio = Number(producto?.precio?.costoUnitario);
    if (Number.isFinite(costoPrecio) && costoPrecio > 0) return costoPrecio;

    const costoObj = Number((producto as any)?.costo?.costoUnitario ?? (producto as any)?.costo?.valor);
    return Number.isFinite(costoObj) && costoObj > 0 ? costoObj : 0;
  }

  obtenerFuenteCosto(producto: Producto): string {
    return (producto as any)?.costoFuente || (producto as any)?.costo?.fuente || '-';
  }

  obtenerFechaVigenciaCosto(producto: Producto): string {
    return (producto as any)?.costo?.fechaVigencia || (producto as any)?.fechaVigenciaCosto || '-';
  }

  // ── Exportación Excel ──

  descargarFormatoExcel() {
    if (this.activeTab === this.COSTO_TAB_INDEX) {
      this.generarPlantillaCostosExcel();
      return;
    }

    if (this.tiposCliente.length === 0) {
      Swal.fire({
        title: 'Cargando tipos de cliente...',
        text: 'Por favor espera mientras cargamos los tipos de cliente',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      this.service.consultarTiposCliente()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data: any) => {
            if (Array.isArray(data)) this.tiposCliente = data;
            else if (data?.data && Array.isArray(data.data)) this.tiposCliente = data.data;
            else if (data?.results && Array.isArray(data.results)) this.tiposCliente = data.results;

            if (this.tiposCliente.length === 0) {
              Swal.fire('Advertencia', 'No hay tipos de cliente disponibles.', 'warning');
              return;
            }
            this.generarPlantillaExcel();
          },
          error: () => {
            Swal.fire('Error', 'No se pudieron cargar los tipos de cliente', 'error');
          }
        });
      return;
    }

    this.generarPlantillaExcel();
  }

  private generarPlantillaExcel() {
    const headers = ['REFERENCIA'];
    this.tiposCliente.forEach((tipo, index) => {
      const descripcion = (tipo.descripcion || tipo.description || '').trim();
      const nombre = (tipo.nombre || tipo.name || '').trim();
      headers.push(descripcion || nombre || `Tipo_${tipo.id || index}`);
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    worksheet['!cols'] = [{ wch: 20 }, ...this.tiposCliente.map(() => ({ wch: 25 }))];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Precios');

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Plantilla_Precios_Tipo_Cliente_${fecha}.xlsx`);

    Swal.fire({
      title: 'Éxito',
      html: `Plantilla Excel descargada con ${this.tiposCliente.length} tipo(s) de cliente`,
      icon: 'success',
      confirmButtonText: 'Ok'
    });
  }

  private generarPlantillaCostosExcel() {
    const headers = ['REFERENCIA', 'COSTO', 'FECHA_VIGENCIA'];
    const rows = [
      headers,
      ['REF-001', 15000, new Date().toISOString().slice(0, 10)],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 18 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Costos');

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Plantilla_Costos_${fecha}.xlsx`);
  }

  /**
   * Exporta todos los productos con precios a Excel.
   * Carga el catálogo completo solo cuando se exporta.
   */
  exportarExcel() {
    Swal.fire({
      title: 'Preparando exportación...',
      text: 'Cargando catálogo completo',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    this.cargarTodosLosProductos(() => {
      const productos = this._todosLosProductos || [];
      if (productos.length === 0) {
        Swal.fire('Advertencia', 'No hay productos para exportar', 'warning');
        return;
      }

      const fecha = new Date().toISOString().split('T')[0];
      let workbook: XLSX.WorkBook;
      let filename: string;

      switch (this.activeTab) {
        case 0:
          workbook = this.generarExcelTipoCliente(productos);
          filename = `Precios_Tipo_Cliente_${fecha}.xlsx`;
          break;
        case 1:
          workbook = this.generarExcelUnitario(productos);
          filename = `Precios_Unitarios_${fecha}.xlsx`;
          break;
        case 2:
          workbook = this.generarExcelVolumen(productos);
          filename = `Precios_Volumen_${fecha}.xlsx`;
          break;
        case this.COSTO_TAB_INDEX:
          workbook = this.generarExcelCostos(productos);
          filename = `Costos_${fecha}.xlsx`;
          break;
        default:
          Swal.close();
          return;
      }

      XLSX.writeFile(workbook, filename);
      Swal.fire({
        title: 'Éxito',
        html: `Excel exportado con ${productos.length} productos`,
        icon: 'success',
        confirmButtonText: 'Ok'
      });
    });
  }

  private generarExcelTipoCliente(productos: Producto[]): XLSX.WorkBook {
    const tipoNombres = this.tiposCliente.map(t =>
      (t.descripcion || t.description || t.nombre || t.name || '').trim()
    );

    const headers = ['REFERENCIA', 'PRODUCTO', 'PRECIO BASE', ...tipoNombres];
    const rows: any[][] = [headers];

    productos.forEach(p => {
      const fila: any[] = [
        p.identificacion?.referencia || '',
        p.crearProducto?.titulo || '',
        p.precio?.precioUnitarioConIva || p.precio?.precioUnitarioSinIva || 0
      ];
      this.tiposCliente.forEach(tipo => {
        const precioTipo = p.preciosPorTipoCliente?.find(
          (pt: PrecioPorTipoCliente) => pt.tipoClienteId === tipo.id
        );
        // Exportar el precio CON IVA (lo que muestra la UI), no el precio sin IVA.
        // `precio` es el valor sin IVA (ej. 96025); `precioConIva` es el real (ej. 114270).
        // Mismo criterio que PRECIO BASE arriba (prefiere ...ConIva).
        fila.push(precioTipo?.precioConIva || precioTipo?.precio || '');
      });
      rows.push(fila);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 35 }, { wch: 15 }, ...tipoNombres.map(() => ({ wch: 20 }))];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Precio Tipo Cliente');
    return wb;
  }

  private generarExcelUnitario(productos: Producto[]): XLSX.WorkBook {
    const headers = ['REFERENCIA', 'PRODUCTO', 'PRECIO SIN IVA', '% IVA', 'VALOR IVA', 'PRECIO CON IVA'];
    const rows: any[][] = [headers];

    productos.forEach(p => {
      rows.push([
        p.identificacion?.referencia || '',
        p.crearProducto?.titulo || '',
        p.precio?.precioUnitarioSinIva || 0,
        (p.precio?.precioUnitarioIva || '0') + '%',
        p.precio?.valorIva || 0,
        p.precio?.precioUnitarioConIva || 0
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 35 }, { wch: 18 }, { wch: 10 }, { wch: 15 }, { wch: 18 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Precio Unitario');
    return wb;
  }

  private generarExcelVolumen(productos: Producto[]): XLSX.WorkBook {
    const headers = ['REFERENCIA', 'PRODUCTO', 'PRECIO BASE', 'DESDE', 'HASTA', 'PRECIO SIN IVA', '% IVA', 'PRECIO CON IVA'];
    const rows: any[][] = [headers];

    productos.forEach(p => {
      const ref = p.identificacion?.referencia || '';
      const titulo = p.crearProducto?.titulo || '';
      const precioBase = p.precio?.precioUnitarioConIva || 0;
      const rangos = p.precio?.preciosVolumen || [];

      if (rangos.length === 0) {
        rows.push([ref, titulo, precioBase, '', '', '', '', '']);
      } else {
        rangos.forEach((rango: any, i: number) => {
          rows.push([
            i === 0 ? ref : '', i === 0 ? titulo : '', i === 0 ? precioBase : '',
            rango.numeroUnidadesInicial || '', rango.numeroUnidadesLimite || '',
            rango.valorUnitarioPorVolumenSinIVA || 0,
            (rango.valorIVAPorVolumen || 0) + '%',
            rango.valorUnitarioPorVolumenConIVA || 0
          ]);
        });
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 35 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 10 }, { wch: 18 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Precio Volumen');
    return wb;
  }

  private generarExcelCostos(productos: Producto[]): XLSX.WorkBook {
    const headers = ['REFERENCIA', 'PRODUCTO', 'COSTO', 'FUENTE', 'FECHA_VIGENCIA', 'PRECIO VENTA'];
    const rows: any[][] = [headers];

    productos.forEach(p => {
      rows.push([
        p.identificacion?.referencia || '',
        p.crearProducto?.titulo || '',
        this.obtenerCostoUnitario(p),
        this.obtenerFuenteCosto(p),
        this.obtenerFechaVigenciaCosto(p),
        p.precio?.precioUnitarioConIva || p.precio?.precioUnitarioSinIva || 0
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 35 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Costos');
    return wb;
  }

  // ── Importación Excel ──

  importarPrecios() {
    if (this.activeTab === this.COSTO_TAB_INDEX) {
      this.abrirModalImportarCostos();
      return;
    }
    this.fileInput.nativeElement.click();
  }

  abrirModalImportarCostos() {
    const modalRef = this.modalService.open(ImportarCostosModalComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.result.then((result) => {
      if (result?.result === 'applied') {
        this._todosLosProductos = null;
        this.cargarPagina(1);
      }
    }).catch(() => {});
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.leerArchivoExcel(file);
  }

  private leerArchivoExcel(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        this.procesarImportacion(jsonData).catch(err => {
          Swal.fire('Error', 'Error al procesar importación: ' + (err?.message || err), 'error');
        });
      } catch {
        Swal.fire('Error', 'Error al leer el archivo Excel', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  /** Normaliza texto para comparación: sin tildes, sin espacios extra, minúsculas */
  private normalizarTexto(s: string): string {
    return (s || '').trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /** Busca el valor de una columna en el row de Excel usando comparación normalizada */
  private buscarColumnaExcel(row: any, nombreBuscado: string): any {
    const normBuscado = this.normalizarTexto(nombreBuscado);
    const entrada = Object.entries(row).find(([k]) => this.normalizarTexto(k) === normBuscado);
    return entrada?.[1];
  }

  async procesarImportacion(datos: any[]) {
    // Preguntar si los precios son con o sin IVA
    const resultadoIva = await Swal.fire({
      title: '¿Los precios del Excel incluyen IVA?',
      html: `<p class="text-muted mb-3">Indica cómo están expresados los precios en tu archivo.</p>`,
      icon: 'question',
      showCancelButton: true,
      cancelButtonText: 'Cancelar importación',
      confirmButtonText: 'Sí, incluyen IVA',
      showDenyButton: true,
      denyButtonText: 'No, son sin IVA',
      denyButtonColor: '#0d6efd',
      confirmButtonColor: '#198754',
    });

    if (resultadoIva.isDismissed) return;
    const preciosConIva: boolean = resultadoIva.isConfirmed;

    // Parsear Excel → array plano de { referencia, tipoClienteId, tipoClienteNombre, precio }
    const precios: any[] = [];
    let filasIgnoradas = 0;

    datos.forEach((row: any) => {
      const referenciaRaw = this.buscarColumnaExcel(row, 'REFERENCIA') ?? '';
      const referencia = referenciaRaw.toString().trim();
      if (!referencia) { filasIgnoradas++; return; }

      this.tiposCliente.forEach(tipo => {
        const nombreTipo = tipo.descripcion?.trim() || tipo.description?.trim() || tipo.nombre?.trim() || '';
        if (!nombreTipo) return;

        const valorCelda = this.buscarColumnaExcel(row, nombreTipo);
        if (valorCelda !== undefined && valorCelda !== null && valorCelda !== '') {
          const precioNumero = parseFloat(valorCelda.toString().replace(/[^0-9.-]/g, ''));
          if (!isNaN(precioNumero) && precioNumero > 0) {
            precios.push({
              referencia,
              tipoClienteId: tipo.id,
              tipoClienteNombre: tipo.descripcion || nombreTipo,
              precio: precioNumero
            });
          }
        }
      });
    });

    if (precios.length === 0) {
      Swal.fire('Sin precios', `No se encontraron precios válidos en el Excel. ${filasIgnoradas} filas sin referencia.`, 'warning');
      return;
    }

    // Preview
    const refsUnicas = new Set(precios.map(p => p.referencia)).size;
    const { isConfirmed } = await Swal.fire({
      title: 'Confirmar importación',
      html: `
        <p><strong>${precios.length} precios</strong> para <strong>${refsUnicas} referencias</strong>.</p>
        <p>Precios expresados <strong>${preciosConIva ? 'con IVA incluido' : 'sin IVA'}</strong>.</p>
        ${filasIgnoradas > 0 ? `<p class="text-muted"><small>${filasIgnoradas} filas sin referencia ignoradas</small></p>` : ''}
        <p>El backend buscará cada producto por referencia y guardará los precios.</p>
      `,
      icon: 'question',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonText: `Importar ${precios.length} precios`,
      confirmButtonColor: '#198754'
    });

    if (!isConfirmed) return;

    Swal.fire({
      title: 'Importando precios...',
      text: 'Enviando al servidor',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    // Enviar al backend — UNA sola petición
    this.service.importPreciosTipoCliente({
      precios,
      porcentajeIva: 19,
      preciosConIva
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        const data = response?.data || response;
        const actualizados = data.actualizados || 0;
        const noEncontrados = data.noEncontrados || 0;
        const errores = data.errores || 0;
        const erroresDetalle = data.erroresDetalle || [];

        let html = `
          <p><strong>Actualizados:</strong> ${actualizados}</p>
          <p><strong>No encontrados:</strong> ${noEncontrados}</p>
        `;
        if (erroresDetalle.length > 0 && erroresDetalle.length <= 10) {
          html += '<hr><ul style="text-align:left;font-size:.85em">';
          erroresDetalle.forEach((e: string) => { html += `<li>${e}</li>`; });
          html += '</ul>';
        }

        Swal.fire({
          title: actualizados > 0 ? 'Importación completada' : 'Sin cambios',
          html,
          icon: actualizados > 0 ? 'success' : 'warning',
          width: '600px'
        }).then(() => {
          this.cargarPagina(1);
        });
      },
      error: (err) => {
        Swal.fire('Error', 'Error del servidor: ' + (err?.error?.details || err?.message || 'desconocido'), 'error');
      }
    });
  }

  // ── Limpiar precios ──

  async limpiarPreciosTipoCliente() {
    const resultado = await Swal.fire({
      title: 'Limpiar precios por tipo de cliente',
      html: `<p>Esto eliminará los precios por tipo de cliente de <strong>todos</strong> los productos.</p>
             <p>Esta acción <strong>no se puede deshacer</strong>.</p>
             <p>Escribe <strong>LIMPIAR</strong> para confirmar:</p>`,
      input: 'text',
      inputPlaceholder: 'LIMPIAR',
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Limpiar todo',
      confirmButtonColor: '#dc3545',
      preConfirm: (value) => {
        if (value?.trim().toUpperCase() !== 'LIMPIAR') {
          Swal.showValidationMessage('Escribe exactamente: LIMPIAR');
          return false;
        }
        return value;
      }
    });

    if (!resultado.isConfirmed) return;

    Swal.fire({
      title: 'Limpiando precios...',
      text: 'El servidor está procesando',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    this.service.limpiarPreciosTipoCliente()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const actualizados = response?.data?.actualizados || 0;
          this.cargarPagina(1);
          Swal.fire({
            title: 'Limpieza completada',
            html: `<p>Productos limpiados: <strong>${actualizados}</strong></p>`,
            icon: actualizados > 0 ? 'success' : 'info'
          });
        },
        error: (err) => {
          Swal.fire('Error', 'Error del servidor: ' + (err?.error?.details || err?.error?.error || err?.message || 'desconocido'), 'error');
        }
      });
  }

  private mostrarResultadoImportacion(procesados: number, actualizados: number, errores: number, erroresDetalle: string[]) {
    let mensajeHtml = `
      <p><strong>Productos procesados:</strong> ${procesados}</p>
      <p><strong>Productos actualizados:</strong> ${actualizados}</p>
      <p><strong>Errores:</strong> ${errores}</p>
    `;

    if (erroresDetalle.length > 0 && erroresDetalle.length <= 10) {
      mensajeHtml += '<hr><p><strong>Detalles:</strong></p><ul style="text-align: left; font-size: 0.9em;">';
      erroresDetalle.forEach(error => { mensajeHtml += `<li>${error}</li>`; });
      mensajeHtml += '</ul>';
    } else if (erroresDetalle.length > 10) {
      mensajeHtml += `<p><small>${erroresDetalle.length} errores en total.</small></p>`;
    }

    Swal.fire({
      title: errores > 0 ? 'Importación completada con errores' : 'Importación completada',
      html: mensajeHtml,
      icon: errores > 0 ? 'warning' : 'success',
      confirmButtonText: 'Ok',
      width: '600px'
    }).then(() => {
      this._todosLosProductos = null; // Invalidar cache
      this.cargarPagina(1); // Recargar página actual
    });
  }
}
