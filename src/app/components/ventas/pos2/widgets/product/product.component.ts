import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CartService } from '../../../../../shared/services/cart.service';
import { MaestroService } from '../../../../../shared/services/maestros/maestro.service';
import { InventarioService } from '../../../../../shared/services/inventarios/inventario.service';
import { ImageOptimizerDirective } from '../../../../../shared/directives/image-optimizer.directive';
import { ImageCacheService } from '../../../../../shared/services/image-cache.service';
import { imagenDeProducto } from '../../../../../shared/utils/imagen-producto';

/** Máximo de filas del desplegable de autocompletado. */
const LIMITE_SUGERENCIAS = 8;

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.scss'],
})
export class ProductComponent implements OnInit, OnDestroy {
  @ViewChild('searchInputElement') searchInput: ElementRef | undefined;

  public products: any[] = [];
  public filteredProduct: any[] = [];
  public paginatedProducts: any[] = []; // Productos paginados para mostrar
  public searchQuery: string = '';
  public isBarcodeMode: boolean = false; // Nueva propiedad para el modo código de barras

  // --- Estado SOLO de presentación del modo escáner -------------------------
  // No participa en la lógica de carrito ni de stock: alimenta la tarjeta de
  // "último escaneado" y el aviso de código no encontrado. Lo que se agrega al
  // carrito lo sigue decidiendo addToCart() igual que antes.
  public ultimoEscaneado: any = null;
  public ultimoEscaneadoCantidad: number = 0;
  // Mensaje completo ya redactado (código inexistente o sin existencias).
  public escaneoError: string | null = null;
  // Verdadero mientras se consulta el catálogo completo del backend.
  public buscandoCodigo: boolean = false;

  // --- Autocompletado del buscador (modo catálogo) --------------------------
  // Muestra coincidencias mientras se escribe: primero las de la bodega ya
  // cargada (instantáneo) y luego se completa con el catálogo del backend,
  // porque la bodega solo trae 500 productos.
  public sugerencias: any[] = [];
  public mostrarSugerencias: boolean = false;
  public buscandoSugerencias: boolean = false;
  private readonly sugerenciaInput$ = new Subject<string>();
  private sugerenciaSub?: Subscription;
  public imageLoaded: { [key: string]: boolean } = {};
  public defaultImage: string = 'assets/images/placeholders/product-not-found.svg'; // Añade una imagen por defecto
  public filter = {
    search: '',
  };

  // Variables de paginación
  public currentPage: number = 1;
  public itemsPerPage: number = 12; // Productos por página
  public totalItems: number = 0;
  public totalPages: number = 0;
  public pages: number[] = [];

  constructor(
    public cartService: CartService,
    private maestroService: MaestroService,
    private inventarioService: InventarioService,
    private imageCacheService: ImageCacheService,
    private elementRef: ElementRef
  ) {
  }

  ngOnInit(): void {
    // Recuperar el estado de isBarcodeMode desde localStorage
    const storedBarcodeMode = localStorage.getItem('isBarcodeMode');
    if (storedBarcodeMode) {
      this.isBarcodeMode = JSON.parse(storedBarcodeMode);
    }
    // Limpiar caché antiguo al iniciar
    this.imageCacheService.clearCache();

    // El complemento del autocompletado va contra el backend: se espera a que
    // el cajero deje de escribir para no disparar una petición por tecla.
    this.sugerenciaSub = this.sugerenciaInput$
      .pipe(debounceTime(320), distinctUntilChanged())
      .subscribe((termino) => this.completarSugerenciasDesdeBackend(termino));
  }

  ngOnDestroy(): void {
    if (this.sugerenciaSub) {
      this.sugerenciaSub.unsubscribe();
    }
  }

  /** Cierra el autocompletado al hacer clic fuera del buscador. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.mostrarSugerencias) return;
    const caja = this.elementRef.nativeElement.querySelector('.cat-searchbox');
    if (caja && !caja.contains(event.target as Node)) {
      this.mostrarSugerencias = false;
    }
  }

  async handleImageLoad(event: any, productId: string) {
    const img = event.target as HTMLImageElement;
    this.imageLoaded[productId] = true;

    // Convertir la imagen a dataURL y guardar en caché
    try {
      const startTime = performance.now();
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.4); // Comprimir a JPEG con 40% de calidad
        await this.imageCacheService.cacheImage(img.src, dataUrl);
        
        // Métricas de rendimiento
        const endTime = performance.now();
        const originalSize = this.getImageSize(img.src);
        const compressedSize = this.getDataUrlSize(dataUrl);
        const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
        
        console.log('Métricas de imagen:', {
          productId,
          loadTime: `${(endTime - startTime).toFixed(2)}ms`,
          originalSize: this.formatBytes(originalSize),
          compressedSize: this.formatBytes(compressedSize),
          compressionRatio: `${compressionRatio}%`,
          dimensions: `${img.naturalWidth}x${img.naturalHeight}`
        });
      }
    } catch (error) {
      console.error('Error al cachear imagen:', error);
    }
  }

  private getImageSize(url: string): number {
    // Estimación aproximada del tamaño de la imagen original
    const xhr = new XMLHttpRequest();
    xhr.open('HEAD', url, false);
    xhr.send();
    return parseInt(xhr.getResponseHeader('Content-Length') || '0', 10);
  }

  private getDataUrlSize(dataUrl: string): number {
    const base64 = dataUrl.split(',')[1];
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    return Math.ceil((base64.length * 3) / 4) - padding;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async handleImageError(event: any) {
    event.target.src = this.defaultImage;
  }

  async precargarImagenes(productos: any[]) {
    for (const producto of productos) {
      const imageUrl = this.getProductImageUrl(producto);
      // Solo precargar si no es la imagen por defecto
      if (imageUrl !== this.defaultImage) {
        try {
          // Intentar obtener del caché
          const cachedDataUrl = await this.imageCacheService.getCachedImage(imageUrl);
          if (cachedDataUrl) {
            // Si está en caché, precargar
            const img = new Image();
            img.src = cachedDataUrl;
            img.onload = () => {
              this.imageLoaded[producto._id] = true;
            };
          }
        } catch (error) {
          console.error('Error al precargar imagen:', error);
        }
      }
    }
  }

  obtenerProductos(bodegaId?: string) {
    // Validar que hay bodega asignada
    if (!bodegaId) {
      console.warn('POS Product: No se pueden cargar productos sin bodega asignada');
      // Limpiar productos para mostrar mensaje al usuario
      this.products = [];
      this.filteredProduct = [];
      this.paginatedProducts = [];
      return;
    }

    // Cargar productos de la bodega específica
    this.obtenerProductosPorBodega(bodegaId);
  }

  obtenerProductosPorBodega(bodegaId: string) {
    this.inventarioService.obtenerInventarioPorBodega(bodegaId).subscribe(async (r: any) => {
      if (Array.isArray(r.productos) && r.productos.length > 0) {
        this.products = r.productos.map(itemInventario => {
          return {
            ...itemInventario,
            ...itemInventario.producto,
            disponibilidad: {
              ...itemInventario?.producto?.disponibilidad,
              cantidadDisponible: itemInventario?.cantidad,
            },
            cantidad: 1,
            imageLoaded: false
          };
        });
        this.filteredProduct = this.products;
        this.updatePagination();
        // Precargar imágenes de la primera página
        await this.precargarImagenes(this.paginatedProducts);
      } else {
        this.products = [];
        this.filteredProduct = [];
        this.paginatedProducts = [];
      }
      console.log('Productos por bodega', bodegaId, r);
    });
  }

  updateQuantity(value: number, product: any) {
    // Si el producto no es inventariable, permitir cualquier cantidad
    if (!product.disponibilidad?.inventariable) {
      if (value === 1) {
        product.cantidad += 1;
      } else if (value === -1 && product.cantidad > 1) {
        product.cantidad -= 1;
      }
      return;
    }

    // Si es inventariable, validar stock
    const stockDisponible = product.disponibilidad?.cantidadDisponible ?? 0;

    if (value === 1 && product.cantidad < stockDisponible) {
      product.cantidad += 1;
    } else if (value === -1 && product.cantidad > 1) {
      product.cantidad -= 1;
    } else if (value === 1 && product.cantidad >= stockDisponible) {
      console.warn(`No hay suficiente stock para ${product.crearProducto?.titulo}. Disponible: ${stockDisponible}`);
    }
  }

  // Devuelve true si el producto realmente entró al carrito. Las mismas reglas
  // de antes; solo se informa el resultado para que la UI no diga "agregado"
  // cuando el stock lo impidió.
  addToCart(product: any): boolean {
    // Si el producto no es inventariable, agregar directamente al carrito
    if (!product.disponibilidad?.inventariable) {
      this.cartService.posAddToCart(product);
      return true;
    }

    // Si es inventariable, validar stock
    const stockDisponible = product.disponibilidad?.cantidadDisponible ?? 0;
    if (stockDisponible >= product.cantidad) {
      this.cartService.posAddToCart(product);
      return true;
    } else {
      console.warn(`No hay suficiente stock para ${product.crearProducto?.titulo}. Disponible: ${stockDisponible}`);
      return false;
    }
  }

  searchStores() {
    this.filter['search'] = this.searchQuery.toLowerCase();
    // reemplazar la comilla simple por un guion - 
    this.filter['search'] = this.filter['search'].replace(/'/g, '-');

    this.filterDetails();

    // El autocompletado solo aplica al modo catálogo; en escáner el Enter manda.
    if (!this.isBarcodeMode) {
      this.actualizarSugerencias();
    } else {
      this.cerrarSugerencias();
    }
  }

  // ===========================================================================
  // AUTOCOMPLETADO DEL BUSCADOR (modo catálogo)
  // ===========================================================================

  /**
   * Arma la lista de sugerencias: primero lo que ya está cargado de la bodega
   * (respuesta instantánea) y, si son pocas, se completa con el catálogo del
   * backend — la bodega solo trae 500 productos.
   */
  private actualizarSugerencias(): void {
    const termino = (this.searchQuery || '').trim();

    if (termino.length < 2) {
      this.cerrarSugerencias();
      return;
    }

    this.sugerencias = this.filteredProduct.slice(0, LIMITE_SUGERENCIAS);
    this.mostrarSugerencias = true;

    if (this.sugerencias.length < LIMITE_SUGERENCIAS) {
      this.buscandoSugerencias = true;
      this.sugerenciaInput$.next(termino);
    } else {
      this.buscandoSugerencias = false;
    }
  }

  /** Completa las sugerencias con productos del catálogo que no están cargados. */
  private completarSugerenciasDesdeBackend(termino: string): void {
    // El endpoint exige mínimo 2 caracteres.
    if (!termino || termino.length < 2 || this.isBarcodeMode) {
      this.buscandoSugerencias = false;
      return;
    }

    const idBodega = this.obtenerBodegaActiva();

    this.inventarioService.buscarCodigoParaPOS(termino, 'general', LIMITE_SUGERENCIAS).subscribe({
      next: (r: any) => {
        this.buscandoSugerencias = false;

        // Si el cajero siguió escribiendo, esta respuesta ya no aplica.
        if ((this.searchQuery || '').trim() !== termino) return;

        const yaListadas = new Set(
          this.sugerencias.map((p) => p?.identificacion?.referencia).filter(Boolean)
        );

        const delCatalogo = (r?.products || [])
          .filter((p: any) => !yaListadas.has(p?.identificacion?.referencia))
          .map((p: any) => this.adaptarProductoDelCatalogo(p, idBodega));

        this.sugerencias = [...this.sugerencias, ...delCatalogo].slice(0, LIMITE_SUGERENCIAS);
        this.mostrarSugerencias = this.sugerencias.length > 0;
      },
      error: () => {
        // Sin conexión al catálogo se queda con las sugerencias locales.
        this.buscandoSugerencias = false;
      }
    });
  }

  /** Agrega la sugerencia elegida por la misma puerta de siempre: addToCart(). */
  seleccionarSugerencia(producto: any): void {
    const agregado = this.addToCart(producto);

    if (agregado) {
      this.ultimoEscaneado = producto;
      this.ultimoEscaneadoCantidad = producto.cantidad || 1;
      this.escaneoError = null;
    } else {
      const disponible = producto?.disponibilidad?.cantidadDisponible ?? 0;
      const nombre = producto?.crearProducto?.titulo || 'Producto';
      this.escaneoError = `${nombre} — sin existencias en esta bodega (disponible: ${disponible})`;
    }

    this.searchQuery = '';
    this.cerrarSugerencias();
    this.filterDetails();

    if (this.searchInput && this.searchInput.nativeElement) {
      this.searchInput.nativeElement.focus();
    }
  }

  /** Reabre el desplegable al enfocar si ya hay término escrito. */
  onBuscadorFocus(): void {
    if (!this.isBarcodeMode && (this.searchQuery || '').trim().length >= 2) {
      this.actualizarSugerencias();
    }
  }

  cerrarSugerencias(): void {
    this.mostrarSugerencias = false;
    this.buscandoSugerencias = false;
    this.sugerencias = [];
  }

  /** Stock a mostrar/validar para una sugerencia. */
  stockSugerencia(producto: any): number {
    return producto?.disponibilidad?.cantidadDisponible ?? 0;
  }

  esInventariable(producto: any): boolean {
    return producto?.disponibilidad?.inventariable !== false;
  }

  onSearchEnter(): void {
    const trimmedQueryRaw = this.searchQuery.trim();
    // Reemplazar la comilla simple por un guion -
    this.searchQuery = trimmedQueryRaw.replace(/'/g, '-');
    const trimmedQuery = this.searchQuery.trim();
    const lowerCaseTrimmedQuery = trimmedQuery.toLowerCase();

    if (this.isBarcodeMode && trimmedQuery !== '') {
      let firstMatch: any | undefined = undefined;

      // Intento 1: Coincidencia directa (o contenida) del código de barras (sin normalizar query aún, solo lowercase)
      // Busca en la lista completa de productos (this.products)
      firstMatch = this.products.find(p =>
        p.identificacion?.codigoBarras &&
        p.identificacion.codigoBarras.toLowerCase().includes(lowerCaseTrimmedQuery)
      );

      // Intento 2: Coincidencia del código de barras normalizado con el query normalizado
      // Busca en la lista completa de productos (this.products)
      if (!firstMatch) {
        const normalizedQuery = this.normalizeText(lowerCaseTrimmedQuery.replace(/'/g, '-'));
        if (normalizedQuery) { // Asegurarse de que la consulta normalizada no esté vacía
          firstMatch = this.products.find(p =>
            p.identificacion?.codigoBarras &&
            this.normalizeText(p.identificacion.codigoBarras).includes(normalizedQuery)
          );
        }
      }

      // Intento 3: Si no hay coincidencia por código de barras, usar lógica de filterDetails en this.products
      // Busca en la lista completa de productos (this.products)
      if (!firstMatch) {
        const preparedQueryForFilterDetails = lowerCaseTrimmedQuery.replace(/'/g, '-');
        const searchTerms = this.normalizeText(preparedQueryForFilterDetails).split(' ').filter(term => term.length > 0);

        if (searchTerms.length > 0) {
          firstMatch = this.products.find(product => {
            const searchFields = [
              this.normalizeText(product.crearProducto?.titulo),
              this.normalizeText(product.crearProducto?.descripcion),
              this.normalizeText(product.identificacion?.referencia),
              product.exposicion?.etiquetas ? this.normalizeText(product.exposicion.etiquetas.join(', ')) : '',
              product.identificacion?.codigoBarras ? this.normalizeText(product.identificacion.codigoBarras) : ''
            ].filter(Boolean);

            return searchTerms.every(term =>
              searchFields.some(field => field && field.includes(term))
            );
          });
        }
      }

      if (firstMatch) {
        const agregado = this.addToCart(firstMatch);

        // Acuse visual del escaneo (solo presentación). Si el stock impidió
        // agregarlo, se avisa en vez de mostrar el acuse verde.
        if (agregado) {
          this.ultimoEscaneado = firstMatch;
          this.ultimoEscaneadoCantidad = firstMatch.cantidad || 1;
          this.escaneoError = null;
        } else {
          this.ultimoEscaneado = null;
          const disponible = firstMatch.disponibilidad?.cantidadDisponible ?? 0;
          const nombre = firstMatch.crearProducto?.titulo || trimmedQuery;
          this.escaneoError = `${nombre} — sin existencias en esta bodega (disponible: ${disponible})`;
        }

      } else {
        // No está entre los productos precargados de la bodega (máximo 500).
        // Antes de darlo por inexistente se consulta el catálogo completo.
        this.ultimoEscaneado = null;
        this.escaneoError = null;
        this.buscarCodigoEnBackend(trimmedQuery);
      }

      // En modo escáner el campo SIEMPRE queda vacío y con el foco tras Enter,
      // haya coincidido o no: el cajero dispara el lector otra vez de una, sin
      // borrar el código anterior a mano.
      this.searchQuery = '';
      this.searchStores();
      if (this.searchInput && this.searchInput.nativeElement) {
        this.searchInput.nativeElement.focus();
      }

    } else { // Si no es modo barcode, o el query está vacío
      this.searchStores(); // Comportamiento normal de filtrar la lista
    }
  }

  // Nueva función para manejar el cambio del checkbox y guardar en localStorage
  onBarcodeModeChange(): void {
    localStorage.setItem('isBarcodeMode', JSON.stringify(this.isBarcodeMode));
    // Al cambiar de modo se limpia el acuse del escaneo anterior y se deja el
    // cursor listo en el campo (el cajero escanea sin tocar el mouse).
    this.ultimoEscaneado = null;
    this.escaneoError = null;
    setTimeout(() => {
      if (this.searchInput && this.searchInput.nativeElement) {
        this.searchInput.nativeElement.focus();
      }
    }, 0);
  }


  /**
   * Respaldo del escáner: busca el código en el catálogo COMPLETO del backend
   * cuando no aparece entre los productos precargados de la bodega.
   *
   * El endpoint de inventario por bodega tiene tope de 500 productos, así que
   * sin esto un código válido se reportaba como inexistente.
   *
   * Reglas que se respetan:
   *  - El stock que manda es el de LA BODEGA ACTIVA (stockPorBodega[idBodega]),
   *    nunca el total del catálogo: vender contra el total permitiría despachar
   *    existencias que están en otra bodega.
   *  - El alta al carrito sigue pasando por addToCart(), con sus validaciones.
   */
  private buscarCodigoEnBackend(codigo: string): void {
    const idBodega = this.obtenerBodegaActiva();
    if (!idBodega) {
      this.escaneoError = `El código “${codigo}” no está cargado y no hay bodega seleccionada`;
      return;
    }

    this.buscandoCodigo = true;

    // Primero por código de barras exacto; si no hay, por referencia/título.
    this.inventarioService.buscarCodigoParaPOS(codigo, 'codigoBarras', 5).subscribe({
      next: (r: any) => {
        const encontrados = r?.products || [];
        if (encontrados.length > 0) {
          this.procesarProductoDelBackend(encontrados[0], codigo, idBodega);
          return;
        }
        this.inventarioService.buscarCodigoParaPOS(codigo, 'general', 5).subscribe({
          next: (r2: any) => {
            const alt = r2?.products || [];
            if (alt.length > 0) {
              this.procesarProductoDelBackend(alt[0], codigo, idBodega);
            } else {
              this.buscandoCodigo = false;
              this.escaneoError = `El código “${codigo}” no existe en el catálogo`;
            }
          },
          error: () => {
            this.buscandoCodigo = false;
            this.escaneoError = `No se pudo consultar el código “${codigo}”. Revisa la conexión.`;
          }
        });
      },
      error: () => {
        this.buscandoCodigo = false;
        this.escaneoError = `No se pudo consultar el código “${codigo}”. Revisa la conexión.`;
      }
    });
  }

  /**
   * Adapta el producto que devuelve el catálogo a la forma que usa el POS y lo
   * manda por la misma puerta de siempre: addToCart().
   */
  private procesarProductoDelBackend(encontrado: any, codigo: string, idBodega: string): void {
    this.buscandoCodigo = false;

    const producto = this.adaptarProductoDelCatalogo(encontrado, idBodega);
    const disponible = producto.disponibilidad.cantidadDisponible;

    if (this.addToCart(producto)) {
      this.ultimoEscaneado = producto;
      this.ultimoEscaneadoCantidad = producto.cantidad;
      this.escaneoError = null;
    } else {
      this.ultimoEscaneado = null;
      const nombre = producto.crearProducto?.titulo || codigo;
      this.escaneoError = `${nombre} — sin existencias en esta bodega (disponible: ${disponible})`;
    }
  }

  /**
   * Adapta un producto del catálogo a la forma que usa el POS.
   *
   * CLAVE: el stock que queda es el de LA BODEGA ACTIVA (stockPorBodega), no el
   * `cantidadDisponible` que llega del backend — ese es el total de TODAS las
   * bodegas y vender contra él permitiría comprometer existencias ajenas.
   */
  private adaptarProductoDelCatalogo(encontrado: any, idBodega: string | null): any {
    const inventariable = encontrado?.disponibilidad?.inventariable !== false;
    // stockPorBodega viene indexado por el business code de la bodega (BOD-00X).
    const stockBodega = idBodega ? (encontrado?.stockPorBodega?.[idBodega] ?? 0) : 0;
    const disponible = inventariable
      ? stockBodega
      : (encontrado?.disponibilidad?.cantidadDisponible ?? 0);

    return {
      ...encontrado,
      _id: encontrado?.cd || encontrado?._id,
      cantidad: 1,
      disponibilidad: {
        ...(encontrado?.disponibilidad || {}),
        inventariable,
        cantidadDisponible: disponible,
      },
    };
  }

  /** Business code (BOD-00X) de la bodega activa del POS. */
  private obtenerBodegaActiva(): string | null {
    try {
      const raw = localStorage.getItem('warehousePOS');
      const bodega = raw ? JSON.parse(raw) : null;
      return bodega?.idBodega || null;
    } catch {
      return null;
    }
  }

  /** Descarta el aviso de código no encontrado (solo presentación). */
  limpiarErrorEscaneo(): void {
    this.escaneoError = null;
  }

  /** Total de una línea del ticket, para la tabla de escaneos. */
  totalLinea(item: any): number {
    const precio = item?.precio?.precioUnitarioConIva || 0;
    const cantidad = item?.cantidad || 0;
    return precio * cantidad;
  }

  /**
   * Normaliza texto eliminando acentos y convirtiéndolo a minúsculas
   */
  private normalizeText(input: string | object | undefined | null): string {
    if (input === undefined || input === null) return '';
    // Convert object to string if necessary
    const text = typeof input === 'object' ? JSON.stringify(input) : input.toString();
    return text.replace(/<[^>]*>/g, '')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  filterDetails() {
    if (!this.filter.search || this.filter.search === '') {
      this.filteredProduct = [...this.products];
    } else {
      const searchTerms = this.normalizeText(this.filter.search).split(' ');

      this.filteredProduct = this.products.filter(product => {
        // Campos a buscar
        const searchFields = [
          this.normalizeText(product.crearProducto?.titulo),
          this.normalizeText(product.crearProducto?.descripcion),
          this.normalizeText(product.identificacion?.referencia),
          this.normalizeText(product.exposicion?.etiquetas.join(', ')),
        ];
        // Comprueba si todos los términos de búsqueda coinciden en al menos uno de los campos
        return searchTerms.every(term =>
          searchFields.some(field => field && field.includes(term))
        );
      });
    }

    // Reset a primera página cuando se filtra
    this.currentPage = 1;
    this.updatePagination();
  }

  /**
   * Actualiza la paginación y los productos a mostrar
   */
  updatePagination() {
    this.totalItems = this.filteredProduct.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);

    // Generar array con números de página para la navegación
    this.pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      this.pages.push(i);
    }

    // Calcular productos de la página actual
    const startItem = (this.currentPage - 1) * this.itemsPerPage;
    const endItem = Math.min(startItem + this.itemsPerPage, this.totalItems);
    this.paginatedProducts = this.filteredProduct.slice(startItem, endItem);
  }

  /**
   * Cambia a la página especificada
   */
  goToPage(page: number) {
    if (page < 1) {
      page = 1;
    } else if (page > this.totalPages) {
      page = this.totalPages;
    }

    if (this.currentPage !== page) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  /**
   * Va a la página anterior
   */
  prevPage() {
    this.goToPage(this.currentPage - 1);
  }

  /**
   * Va a la página siguiente
   */
  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  /**
   * Obtiene la URL de la imagen del producto de forma segura
   * @param product El producto del cual obtener la imagen
   * @returns URL de la imagen o imagen por defecto si no existe
   */
  getProductImageUrl(product: any): string {
    // La ruta que guarda Osmosis es relativa y no carga servida tal cual:
    // `imagenDeProducto` la resuelve contra el CDN. Ver shared/utils.
    return imagenDeProducto(product, this.defaultImage);
  }
}
