import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject, firstValueFrom, of } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, tap, catchError } from 'rxjs/operators';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { EditarPreciosTipoClienteComponent } from '../editar-precios-tipo-cliente/editar-precios-tipo-cliente.component';
import { EditarPrecioUnitarioComponent } from '../editar-precio-unitario/editar-precio-unitario.component';
import { EditarPrecioVolumenComponent } from '../editar-precio-volumen/editar-precio-volumen.component';
import { EditarCostoComponent } from '../editar-costo/editar-costo.component';
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
  /**
   * Toda carga de página pasa por acá. El debounce de 50 ms colapsa las
   * emisiones duplicadas del mismo tick (las 4 pestañas comparten estado y sus
   * 4 p-table quedan vivas en el DOM, así que un cambio de página o de total
   * puede disparar hasta 4 onLazyLoad idénticos), y el switchMap cancela la
   * petición anterior cuando llega una nueva — sin esto, una respuesta lenta
   * podía pisar a una más reciente y mostrar resultados que no correspondían
   * al término escrito.
   */
  private cargaSubject$ = new Subject<number>();

  cargando = false;
  productosFiltrados: Producto[] = [];
  tiposCliente: any[] = [];
  searchTerm: string = '';
  activeTab: number = 0;
  readonly COSTO_TAB_INDEX = 3;

  // Filtro por rango de precio. Aplica a las 4 pestañas porque todas pintan el
  // MISMO campo (`precio.precioUnitarioConIva`, con respaldo a sin IVA): lo que
  // la pestaña 1 llama "precio base", la 2 "precio con IVA", la 3 "precio base"
  // y la 4 "precio venta". Solo cambia la etiqueta.
  precioDesde: number | null = null;
  precioHasta: number | null = null;

  // Paginación server-side
  pageSize = 10;
  totalRecords = 0;
  /** Fila inicial de la grilla — se pone en 0 para volver a la página 1. */
  primeraFila = 0;
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
    this.iniciarCanalDeCarga();

    // Debounce de búsqueda — 500ms después de dejar de escribir
    this.searchSubject$
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => {
        this.searchTerm = term;
        this.volverAPrimeraPagina();
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

  /** Hay algún criterio activo (texto o rango de precio). */
  get hayFiltrosActivos(): boolean {
    return !!this.searchTerm?.trim() || this.precioDesde != null || this.precioHasta != null;
  }

  /**
   * Único canal de carga: colapsa duplicados del mismo tick y cancela la
   * petición en vuelo cuando entra una nueva. El catchError va DENTRO del
   * switchMap a propósito — si estuviera afuera, un error del backend mataría
   * el stream y la pantalla dejaría de cargar hasta recargar el navegador.
   */
  private iniciarCanalDeCarga(): void {
    this.cargaSubject$
      .pipe(
        debounceTime(50),
        tap(() => (this.cargando = true)),
        switchMap((page: number) => {
          const term = this.searchTerm?.trim();
          const usarBusqueda = !!term || this.precioDesde != null || this.precioHasta != null;

          const obs$ = usarBusqueda
            ? this.service.getProductsBySearch(term || '', this.pageSize, page, this.precioDesde, this.precioHasta)
            : this.service.getAllProductsPagination(this.pageSize, page);

          return obs$.pipe(catchError(() => of(null)));
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((data: any) => {
        this.productosFiltrados = Array.isArray(data?.products) ? data.products : [];
        this.totalRecords = data?.pagination?.totalItems ?? this.productosFiltrados.length;
        this.cargando = false;
      });
  }

  /**
   * Carga UNA página de productos desde el servidor.
   * Con texto o rango de precio usa getProductsBySearch (índice cacheado);
   * sin criterios, getAllProductsPagination (paginación nativa).
   */
  cargarPagina(page: number) {
    this.cargaSubject$.next(page);
  }

  /**
   * Vuelve a la página 1 y recarga. Necesario al cambiar el criterio: si
   * buscabas desde la página 5, la grilla pedía la página 5 de un resultado
   * que quizá solo tiene una.
   */
  volverAPrimeraPagina(): void {
    this.primeraFila = 0;
    this.cargarPagina(1);
  }

  /** Aplica el rango de precio (desde/hasta) escrito por el usuario. */
  aplicarFiltroPrecio(): void {
    const desde = this.normalizarPrecio(this.precioDesde);
    const hasta = this.normalizarPrecio(this.precioHasta);

    // Rango invertido: se intercambia en vez de devolver vacío, que se leería
    // como que el filtro está roto.
    if (desde != null && hasta != null && desde > hasta) {
      this.precioDesde = hasta;
      this.precioHasta = desde;
    } else {
      this.precioDesde = desde;
      this.precioHasta = hasta;
    }

    this.volverAPrimeraPagina();
  }

  private normalizarPrecio(valor: any): number | null {
    if (valor === null || valor === undefined || valor === '') return null;
    const n = Number(valor);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  /** Limpia buscador y rango de precio. */
  limpiarFiltros(): void {
    this.searchTerm = '';
    this.precioDesde = null;
    this.precioHasta = null;
    this.volverAPrimeraPagina();
  }

  /** Nombre de lo que se importa/exporta en la pestaña activa, para los tooltips. */
  get nombrePestana(): string {
    if (this.activeTab === 1) return 'precios unitarios';
    if (this.activeTab === 2) return 'precios por volumen';
    if (this.activeTab === this.COSTO_TAB_INDEX) return 'costos';
    return 'precios por tipo de cliente';
  }

  /** Etiqueta del filtro de precio según la pestaña — el campo es el mismo. */
  get etiquetaPrecio(): string {
    if (this.activeTab === 1) return 'Precio con IVA';
    if (this.activeTab === this.COSTO_TAB_INDEX) return 'Precio venta';
    return 'Precio base';
  }

  /**
   * Evento lazy load de p-table — se dispara al cambiar página o rows.
   * El primer disparo (init) lo manejamos aquí; los siguientes son paginación real.
   */
  onLazyLoad(event: any) {
    this.pageSize = event.rows || 10;
    this.primeraFila = event.first || 0;
    const page = Math.floor(this.primeraFila / this.pageSize) + 1;
    this._lazyLoadInitialized = true;
    this.cargarPagina(page);
  }

  /**
   * Carga TODOS los productos — solo para exportar Excel. UNA sola petición.
   *
   * Antes paginaba `/productos/all` de 100 en 100 en lotes paralelos, y esa ruta
   * usa `offset()`: Firestore lee y descarta todo lo que salta, así que cada
   * página tardaba más que la anterior. Medido en ALMARA (2.138 productos, 22
   * páginas): 32 s, de 1,9 s la primera a 10,7 s la página 20, con ~25.300
   * lecturas para un catálogo de 2.138. En HARMONY LENS (139 páginas) el
   * exportar simplemente no terminaba: el modal se quedaba "pensando".
   */
  private async obtenerCatalogoParaExportar(): Promise<Producto[]> {
    // Cache: exports repetidos (p.ej. cambiar de pestaña) no vuelven a pedir el
    // catálogo. Se invalida al editar/importar precios.
    if (this._todosLosProductos) return this._todosLosProductos;

    const resp: any = await firstValueFrom(
      this.service.exportarPrecios().pipe(takeUntil(this.destroy$))
    );
    const all: Producto[] = Array.isArray(resp?.products) ? resp.products : [];
    if (all.length > 0) this._todosLosProductos = all;
    return all;
  }

  // ── Búsqueda ──

  onSearchInput(event: any) {
    this.searchSubject$.next(event.target.value || '');
  }

  buscarProducto() {
    this.volverAPrimeraPagina();
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
      case this.COSTO_TAB_INDEX: this.editarCosto(producto); break;
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

  /**
   * Edición manual del costo de un producto (pestaña Costos). El precio de
   * venta NO se toca acá: se edita en la pestaña Precio unitario.
   */
  private editarCosto(producto: Producto) {
    const modalRef = this.modalService.open(EditarCostoComponent, {
      size: 'lg', centered: true, backdrop: 'static'
    });
    modalRef.componentInstance.producto = producto;

    modalRef.result.then((result) => {
      if (result?.success) {
        this.actualizarProductoEnVista(result.producto);
        Swal.fire('Éxito', 'Costo actualizado correctamente', 'success');
      }
    }).catch(() => {});
  }

  private actualizarProductoEnVista(productoActualizado: Producto) {
    const index = this.productosFiltrados.findIndex(p => p.cd === productoActualizado.cd);
    if (index !== -1) {
      this.productosFiltrados[index] = productoActualizado;
      this.productosFiltrados = [...this.productosFiltrados];
    }
    // El export cachea el catálogo completo; sin esto, exportar después de
    // editar bajaba el valor viejo.
    this._todosLosProductos = null;
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
    if (this.activeTab === 1) {
      this.generarPlantillaUnitarioExcel();
      return;
    }
    if (this.activeTab === 2) {
      this.generarPlantillaVolumenExcel();
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

  /**
   * Plantilla de la pestaña "Precio unitario". Mismos encabezados que lee
   * `procesarImportacionUnitario` y que produce el exportar de esta pestaña,
   * para que el archivo exportado se pueda volver a subir tal cual.
   */
  private generarPlantillaUnitarioExcel() {
    const rows = [
      ['REFERENCIA', 'PRODUCTO', 'PRECIO SIN IVA', '% IVA'],
      ['REF-001', 'Ejemplo (columna informativa, no se importa)', 15000, 19],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 16 }, { wch: 10 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Precio Unitario');
    XLSX.writeFile(wb, `Plantilla_Precio_Unitario_${new Date().toISOString().split('T')[0]}.xlsx`);

    Swal.fire({
      title: 'Plantilla descargada',
      html: 'Llena <strong>REFERENCIA</strong> y <strong>PRECIO SIN IVA</strong>. Si dejas <strong>% IVA</strong> vacío se conserva el IVA que ya tiene el producto.',
      icon: 'success'
    });
  }

  /**
   * Plantilla de la pestaña "Precio por volumen": UNA FILA POR RANGO, con la
   * referencia repetida en cada fila de un mismo producto.
   */
  private generarPlantillaVolumenExcel() {
    const rows = [
      ['REFERENCIA', 'PRODUCTO', 'DESDE', 'HASTA', 'PRECIO SIN IVA', '% IVA'],
      ['REF-001', 'Ejemplo (columna informativa, no se importa)', 1, 9, 15000, 19],
      ['REF-001', '', 10, 49, 13500, 19],
      ['REF-001', '', 50, 0, 12000, 19],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 10 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Precio Volumen');
    XLSX.writeFile(wb, `Plantilla_Precio_Volumen_${new Date().toISOString().split('T')[0]}.xlsx`);

    Swal.fire({
      title: 'Plantilla descargada',
      html: `Una <strong>fila por rango</strong>: repite la referencia en cada fila del mismo producto.<br>
             En el último rango deja <strong>HASTA</strong> en 0 para decir "de ahí en adelante".<br>
             <span class="text-danger">Los rangos del archivo reemplazan los que tenga el producto.</span>`,
      icon: 'success'
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
   * Exporta a Excel la pestaña activa.
   *
   * El modal de carga SOLO se abre si de verdad hay que ir a buscar el catálogo.
   * Cuando ya estaba en caché (exportar una segunda pestaña), abrirlo y
   * reemplazarlo por el de éxito ocurría en el MISMO tick: SweetAlert quedaba en
   * estado "loading" y el diálogo salía sin botón Ok, con el spinner colgado.
   * Ese era el "se queda pensando" de las pestañas de volumen y costo — la
   * primera exportación funcionaba porque la petición daba tiempo al modal.
   * Por eso también va `hideLoading()` antes de cada diálogo de resultado.
   */
  async exportarExcel() {
    const debeCargar = !this._todosLosProductos;

    if (debeCargar) {
      Swal.fire({
        title: 'Preparando exportación...',
        text: 'Cargando catálogo completo',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });
    }

    let productos: Producto[] = [];
    try {
      productos = await this.obtenerCatalogoParaExportar();
    } catch (err) {
      console.error('[ListaPrecios][Export] Error cargando catálogo:', err);
      this.cerrarCargando();
      Swal.fire('Error', 'No se pudo cargar el catálogo para exportar. Intenta de nuevo.', 'error');
      return;
    }

    if (productos.length === 0) {
      this.cerrarCargando();
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
        this.cerrarCargando();
        return;
    }

    try {
      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error('[ListaPrecios][Export] No se pudo escribir el Excel:', err);
      this.cerrarCargando();
      Swal.fire('Error', 'No se pudo generar el archivo Excel.', 'error');
      return;
    }

    this.cerrarCargando();
    Swal.fire({
      title: 'Éxito',
      html: `Excel exportado con <strong>${productos.length}</strong> productos`,
      icon: 'success',
      confirmButtonText: 'Ok'
    });
  }

  /**
   * Saca a SweetAlert del estado "loading" antes de mostrar un resultado.
   * Sin esto el botón de confirmar sigue oculto y el diálogo aparece sin Ok.
   */
  private cerrarCargando(): void {
    if (Swal.isVisible()) Swal.hideLoading();
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

        // Cada pestaña tiene su propio importador: el archivo se interpreta
        // según dónde está parado el usuario.
        let proceso: Promise<void>;
        if (this.activeTab === 1) proceso = this.procesarImportacionUnitario(jsonData);
        else if (this.activeTab === 2) proceso = this.procesarImportacionVolumen(jsonData);
        else proceso = this.procesarImportacion(jsonData);

        proceso.catch(err => {
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

  /** Convierte una celda de Excel a número, tolerando "$ 12.500,50" y "19%". */
  private numeroDeCelda(valor: any): number {
    if (valor === null || valor === undefined || valor === '') return NaN;
    if (typeof valor === 'number') return valor;
    const crudo = valor.toString().trim()
      .replace(/%/g, '')
      .replace(/\s/g, '')
      .replace(/[^0-9,.-]/g, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '')   // punto de miles
      .replace(',', '.');
    return Number(crudo);
  }

  /**
   * Importador de la pestaña "Precio unitario".
   * Columnas: REFERENCIA · PRECIO SIN IVA · % IVA (opcional).
   */
  async procesarImportacionUnitario(datos: any[]) {
    const items: { referencia: string; precioSinIva: number; porcentajeIva?: number | null }[] = [];
    let filasIgnoradas = 0;

    datos.forEach((row: any) => {
      const referencia = (this.buscarColumnaExcel(row, 'REFERENCIA') ?? '').toString().trim();
      if (!referencia) { filasIgnoradas++; return; }

      const precioSinIva = this.numeroDeCelda(this.buscarColumnaExcel(row, 'PRECIO SIN IVA'));
      if (!Number.isFinite(precioSinIva) || precioSinIva < 0) { filasIgnoradas++; return; }

      const ivaCelda = this.buscarColumnaExcel(row, '% IVA');
      const porcentajeIva = this.numeroDeCelda(ivaCelda);

      items.push({
        referencia,
        precioSinIva,
        porcentajeIva: Number.isFinite(porcentajeIva) ? porcentajeIva : null
      });
    });

    if (items.length === 0) {
      Swal.fire('Sin datos', 'No se encontraron filas válidas. Revisa que el archivo tenga las columnas REFERENCIA y PRECIO SIN IVA.', 'warning');
      return;
    }

    const { isConfirmed } = await Swal.fire({
      title: 'Confirmar importación',
      html: `
        <p>Se actualizará el precio unitario de <strong>${items.length} referencia(s)</strong>.</p>
        <p class="text-muted"><small>Si la columna <strong>% IVA</strong> viene vacía se conserva el IVA que ya tiene cada producto.</small></p>
        ${filasIgnoradas > 0 ? `<p class="text-muted"><small>${filasIgnoradas} fila(s) ignorada(s) por falta de referencia o precio.</small></p>` : ''}
      `,
      icon: 'question',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonText: `Importar ${items.length}`,
      confirmButtonColor: '#198754'
    });
    if (!isConfirmed) return;

    await this.enviarImportacionPorLotes(
      items,
      (lote) => firstValueFrom(this.service.importPreciosUnitarios(lote)),
      'Precios unitarios'
    );
  }

  /**
   * Importador de la pestaña "Precio por volumen".
   * Columnas: REFERENCIA · DESDE · HASTA · PRECIO SIN IVA · % IVA (opcional).
   * Va UNA FILA POR RANGO, así que varias filas comparten referencia.
   */
  async procesarImportacionVolumen(datos: any[]) {
    const porReferencia = new Map<string, any[]>();
    let filasIgnoradas = 0;
    let ultimaReferencia = '';

    datos.forEach((row: any) => {
      // La referencia puede venir vacía en las filas de continuación (así la
      // exporta hoy la pestaña); en ese caso se hereda la de la fila anterior.
      const refCelda = (this.buscarColumnaExcel(row, 'REFERENCIA') ?? '').toString().trim();
      const referencia = refCelda || ultimaReferencia;
      if (!referencia) { filasIgnoradas++; return; }
      ultimaReferencia = referencia;

      const desde = this.numeroDeCelda(this.buscarColumnaExcel(row, 'DESDE'));
      const hasta = this.numeroDeCelda(this.buscarColumnaExcel(row, 'HASTA'));
      const precioSinIva = this.numeroDeCelda(this.buscarColumnaExcel(row, 'PRECIO SIN IVA'));
      if (!Number.isFinite(precioSinIva) || precioSinIva < 0 || !Number.isFinite(desde)) {
        filasIgnoradas++;
        return;
      }

      const iva = this.numeroDeCelda(this.buscarColumnaExcel(row, '% IVA'));

      const rangos = porReferencia.get(referencia) || [];
      rangos.push({
        desde,
        hasta: Number.isFinite(hasta) ? hasta : 0,
        precioSinIva,
        porcentajeIva: Number.isFinite(iva) ? iva : null
      });
      porReferencia.set(referencia, rangos);
    });

    const items = Array.from(porReferencia.entries()).map(([referencia, rangos]) => ({ referencia, rangos }));

    if (items.length === 0) {
      Swal.fire('Sin datos', 'No se encontraron rangos válidos. Revisa las columnas REFERENCIA, DESDE y PRECIO SIN IVA.', 'warning');
      return;
    }

    const totalRangos = items.reduce((s, i) => s + i.rangos.length, 0);
    const { isConfirmed } = await Swal.fire({
      title: 'Confirmar importación',
      html: `
        <p><strong>${totalRangos} rango(s)</strong> para <strong>${items.length} referencia(s)</strong>.</p>
        <p class="text-danger"><small><strong>Ojo:</strong> los rangos del Excel <strong>reemplazan</strong> los que tenga cada producto hoy.</small></p>
        ${filasIgnoradas > 0 ? `<p class="text-muted"><small>${filasIgnoradas} fila(s) ignorada(s).</small></p>` : ''}
      `,
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonText: `Importar ${items.length} referencia(s)`,
      confirmButtonColor: '#198754'
    });
    if (!isConfirmed) return;

    await this.enviarImportacionPorLotes(
      items,
      (lote) => firstValueFrom(this.service.importPreciosVolumen(lote)),
      'Precios por volumen'
    );
  }

  /**
   * Envía por lotes y reporta el resultado. Los items ya vienen agrupados por
   * referencia, así que partir en lotes nunca separa los rangos de un producto.
   */
  private async enviarImportacionPorLotes(
    items: any[],
    enviar: (lote: any[]) => Promise<any>,
    titulo: string
  ) {
    const TAM_LOTE = 500;
    const lotes: any[][] = [];
    for (let i = 0; i < items.length; i += TAM_LOTE) lotes.push(items.slice(i, i + TAM_LOTE));

    let actualizados = 0, noEncontrados = 0, ignorados = 0;
    const erroresDetalle: string[] = [];
    const lotesFallidos: number[] = [];

    Swal.fire({
      title: `Importando ${titulo.toLowerCase()}...`,
      html: `Preparando ${lotes.length} lote(s)...`,
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    for (let i = 0; i < lotes.length; i++) {
      Swal.update({
        html: `Procesando lote <strong>${i + 1} de ${lotes.length}</strong>...<br>
               <small class="text-muted">${actualizados} actualizados hasta ahora</small>`
      });
      try {
        const respuesta: any = await enviar(lotes[i]);
        const data = respuesta?.data || respuesta || {};
        actualizados += data.actualizados || 0;
        noEncontrados += data.noEncontrados || 0;
        ignorados += data.ignorados || 0;
        if (Array.isArray(data.erroresDetalle)) erroresDetalle.push(...data.erroresDetalle);
      } catch {
        lotesFallidos.push(i + 1);
      }
    }

    // hideLoading en vez de close: cerrar y volver a abrir en el mismo tick deja
    // el diálogo sin botón Ok (mismo problema que tenía el exportar).
    this.cerrarCargando();
    this._todosLosProductos = null;
    this.cargarPagina(1);

    // Conteo honesto: si un lote falló, no se puede decir que todo salió bien.
    const huboProblemas = lotesFallidos.length > 0 || noEncontrados > 0 || ignorados > 0;
    Swal.fire({
      title: lotesFallidos.length > 0 ? 'Importación incompleta' : 'Importación terminada',
      html: `
        <p><strong>${actualizados}</strong> producto(s) actualizado(s).</p>
        ${noEncontrados > 0 ? `<p class="text-muted">${noEncontrados} referencia(s) no existen en el catálogo.</p>` : ''}
        ${ignorados > 0 ? `<p class="text-muted">${ignorados} fila(s) con datos inválidos.</p>` : ''}
        ${lotesFallidos.length > 0 ? `<p class="text-danger">Fallaron los lotes: ${lotesFallidos.join(', ')}. Vuelve a subir el archivo para reintentarlos.</p>` : ''}
        ${erroresDetalle.length > 0 ? `<details class="text-start mt-2"><summary>Ver detalle (${erroresDetalle.length})</summary><small>${erroresDetalle.slice(0, 50).join('<br>')}</small></details>` : ''}
      `,
      icon: lotesFallidos.length > 0 ? 'error' : (huboProblemas ? 'warning' : 'success')
    });
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

    // Agrupar por referencia: el backend sobrescribe preciosPorTipoCliente completo,
    // así que TODOS los precios de una referencia deben viajar en el mismo lote.
    const preciosPorRef = new Map<string, any[]>();
    precios.forEach(p => {
      const arr = preciosPorRef.get(p.referencia) || [];
      arr.push(p);
      preciosPorRef.set(p.referencia, arr);
    });
    const gruposRef = Array.from(preciosPorRef.values());

    // Lotes de referencias completas (evita 413 por payload y 504 por timeout)
    const CHUNK_REFS = 1000;
    const lotes: any[][] = [];
    for (let i = 0; i < gruposRef.length; i += CHUNK_REFS) {
      lotes.push(gruposRef.slice(i, i + CHUNK_REFS).flat());
    }

    let actualizados = 0, noEncontrados = 0, errores = 0;
    const erroresDetalle: string[] = [];
    const lotesFallidos: number[] = [];

    Swal.fire({
      title: 'Importando precios...',
      html: `Preparando ${lotes.length} lote(s)...`,
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    for (let i = 0; i < lotes.length; i++) {
      Swal.update({
        html: `Procesando lote <strong>${i + 1} de ${lotes.length}</strong>...<br>
               <small class="text-muted">${actualizados} actualizados hasta ahora</small>`
      });
      try {
        const response: any = await firstValueFrom(
          this.service.importPreciosTipoCliente({ precios: lotes[i], porcentajeIva: 19, preciosConIva })
        );
        const data = response?.data || response || {};
        actualizados += data.actualizados || 0;
        noEncontrados += data.noEncontrados || 0;
        errores += data.errores || 0;
        if (Array.isArray(data.erroresDetalle)) erroresDetalle.push(...data.erroresDetalle);
      } catch (err: any) {
        lotesFallidos.push(i + 1);
        erroresDetalle.push(`Lote ${i + 1}: ${err?.error?.details || err?.message || 'error desconocido'}`);
      }
    }

    let html = `
      <p><strong>Actualizados:</strong> ${actualizados}</p>
      <p><strong>No encontrados:</strong> ${noEncontrados}</p>
      ${lotesFallidos.length ? `<p class="text-danger"><strong>Lotes con error:</strong> ${lotesFallidos.join(', ')}</p>` : ''}
    `;
    if (erroresDetalle.length > 0 && erroresDetalle.length <= 10) {
      html += '<hr><ul style="text-align:left;font-size:.85em">';
      erroresDetalle.forEach((e: string) => { html += `<li>${e}</li>`; });
      html += '</ul>';
    }

    this.cerrarCargando();   // si no, el diálogo hereda el estado loading y sale sin Ok
    Swal.fire({
      title: actualizados > 0 ? 'Importación completada' : 'Sin cambios',
      html,
      icon: lotesFallidos.length ? 'warning' : (actualizados > 0 ? 'success' : 'warning'),
      width: '600px'
    }).then(() => {
      this.cargarPagina(1);
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
