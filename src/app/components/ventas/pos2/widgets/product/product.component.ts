import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CartService } from '../../../../../shared/services/cart.service';
import { MaestroService } from '../../../../../shared/services/maestros/maestro.service';
import { InventarioService } from '../../../../../shared/services/inventarios/inventario.service';
import { ImageOptimizerDirective } from '../../../../../shared/directives/image-optimizer.directive';
import { ImageCacheService } from '../../../../../shared/services/image-cache.service';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.scss'],
})
export class ProductComponent implements OnInit {
  @ViewChild('searchInputElement') searchInput: ElementRef | undefined;

  public products: any[] = [];
  public filteredProduct: any[] = [];
  public paginatedProducts: any[] = []; // Productos paginados para mostrar
  public searchQuery: string = '';
  public isBarcodeMode: boolean = false; // Nueva propiedad para el modo código de barras
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
    private imageCacheService: ImageCacheService
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
      if (producto.crearProducto?.imagenesPrincipales?.[0]?.urls) {
        const url = producto.crearProducto.imagenesPrincipales[0].urls;
        try {
          // Intentar obtener del caché
          const cachedDataUrl = await this.imageCacheService.getCachedImage(url);
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
    if (bodegaId) {
      this.obtenerProductosPorBodega(bodegaId);
    } else {
      this.maestroService.getAllProductsPagination(100, 1).subscribe(async (r: any) => {
        if (r.products && (r.products as any[]).length > 0) {
          const productosPorEmpresa = r.products;
          let data = productosPorEmpresa;
          this.products = data.map(product => ({
            ...product,
            cantidad: 1,
            imageLoaded: false
          }));
          this.filteredProduct = this.products;
          this.updatePagination();
          // Precargar imágenes de la primera página
          await this.precargarImagenes(this.paginatedProducts);
        } else {
          this.products = [];
          this.filteredProduct = [];
          this.paginatedProducts = [];
        }
        console.log("🚀 Productos generales cargados:", r)
      });
    }
  }

  obtenerProductosPorBodega(bodegaId: string) {
    this.inventarioService.obtenerInventarioPorBodega(bodegaId).subscribe(async (r: any) => {
      if (Array.isArray(r.productos) && r.productos.length > 0) {
        this.products = r.productos.map(itemInventario => {
          return {
            ...itemInventario,
            ...itemInventario.producto,
            disponibilidad: {
              ...itemInventario.producto.disponibilidad,
              cantidadDisponible: itemInventario.cantidad,
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

  addToCart(product: any) {
    // Si el producto no es inventariable, agregar directamente al carrito
    if (!product.disponibilidad?.inventariable) {
      this.cartService.posAddToCart(product);
      return;
    }

    // Si es inventariable, validar stock
    const stockDisponible = product.disponibilidad?.cantidadDisponible ?? 0;
    if (stockDisponible >= product.cantidad) {
      this.cartService.posAddToCart(product);
    } else {
      console.warn(`No hay suficiente stock para ${product.crearProducto?.titulo}. Disponible: ${stockDisponible}`);
    }
  }

  searchStores() {
    this.filter['search'] = this.searchQuery.toLowerCase();
    // reemplazar la comilla simple por un guion - 
    this.filter['search'] = this.filter['search'].replace(/'/g, '-');

    this.filterDetails();
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
        this.addToCart(firstMatch);
        this.searchQuery = '';
        this.searchStores();
        if (this.searchInput && this.searchInput.nativeElement) {
          this.searchInput.nativeElement.focus();
        }
      } else {
        // Si no se encuentra ninguna coincidencia en modo código de barras,
        // searchStores utilizará el searchQuery actual para filtrar la lista (probablemente mostrando "no encontrado").
        this.searchStores();
      }

    } else { // Si no es modo barcode, o el query está vacío
      this.searchStores(); // Comportamiento normal de filtrar la lista
    }
  }

  // Nueva función para manejar el cambio del checkbox y guardar en localStorage
  onBarcodeModeChange(): void {
    localStorage.setItem('isBarcodeMode', JSON.stringify(this.isBarcodeMode));
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
}
