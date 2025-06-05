import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { QuickViewComponent } from '../../pos-quick-view/quick-view.component';
import { VentasService } from '../../../../shared/services/ventas/ventas.service';
import Swal from 'sweetalert2';
import { Producto } from '../../../../shared/models/productos/Producto';
import { MaestroService } from '../../../../shared/services/maestros/maestro.service';
import { parse, stringify } from 'flatted';
import { FormGroup, FormControl, FormArray, FormBuilder, Validators } from '@angular/forms';
import { POSConfProductToCartComponent } from '../conf-product-to-cart/conf-product-to-cart.component';
import { After } from 'v8';
import { forkJoin, Subscription } from 'rxjs';
import { POSPedidosUtilService } from '../../pos-service/pos-pedidos.util.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { CartSingletonService } from '../../../../shared/services/ventas/cart.singleton.service';
import { POSCarrito } from '../../pos-modelo/pedido';

@Component({
  selector: 'app-ecomerce-products',
  templateUrl: './ecomerce-products.component.html',
  styleUrls: ['./ecomerce-products.component.scss']
})
export class EcomerceProductsComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {

  @Input() public ciudad: string;
  @Output() onRender = new EventEmitter<void>();

  private subs: Subscription[] = [];
  openSidebar: boolean = false;
  col: string;
  listView: any;
  productos: Producto[];
  categorias: any[];
  empresaActual: any;
  marketplace: any;
  formaEntrega: any[];
  tiempoEntrega: any[];
  ocasiones: any[];
  generos: any[];
  formasPago: any[];
  filterForm: FormGroup;
  minPrice: number = 0;
  maxPrice: number = 10000000;
  tipoEntrega: any[];
  isOpenModalDirect: any;
  productoSeleccionado: Producto;
  @Input() isRebuy: boolean = false;
  temp: Producto[];
  scannedBarcode: any;
  producto: Producto;
  clearBarcodeInterval: any;
  productoConfiguradoForm: FormGroup<{ producto: FormControl<any>; datosEntrega: FormControl<any>; cantidad: FormControl<number>; preferencias: FormControl<any[]>; adiciones: FormControl<any[]>; tarjetas: FormControl<any[]>; }>;
  datosEntrega: FormGroup<{ tipoEntrega: FormControl<any>; formaEntrega: FormControl<any>; fechaEntrega: FormControl<any>; horarioEntrega: FormControl<any>; genero: FormControl<any>; ocasion: FormControl<any>; colores: FormControl<any>; observaciones: FormControl<any>; }>;
  inStepCorrect: any;
  mobileFiltersVisible: boolean = false;
  isMobile: boolean = false;
  selectedProducts: any[] = [];

  toggleMobileFilters(): void {
    this.mobileFiltersVisible = !this.mobileFiltersVisible;
  }

  constructor(private ventasService: VentasService, private modalService: NgbModal, private maestroService: MaestroService,
    private fb: FormBuilder, private carsingleton: CartSingletonService, private pedidoUtilService: POSPedidosUtilService, private toastrService: ToastrService,
    private cd: ChangeDetectorRef
  ) {
    this.initForm();
    this.productoConfiguradoForm = this.fb.group({
      producto: [ /* producto inicial */],
      datosEntrega: [null],
      cantidad: [1, Validators.required],
      preferencias: [[]],
      adiciones: [[]],
      tarjetas: [[]]
    });
    this.datosEntrega = this.fb.group({
      tipoEntrega: [null],
      formaEntrega: [null, Validators.required],
      fechaEntrega: [null, Validators.required],
      horarioEntrega: [null, Validators.required],
      genero: [null, Validators.required],
      ocasion: [null, Validators.required],
      colores: [[], Validators.required],
      observaciones: [null, Validators.required]
    });
  }
  ngOnChanges(changes: SimpleChanges): void {
    
    // this.cd.detectChanges();
  }
  ngOnDestroy(): void {
    document.removeEventListener('keypress', this.handleBarcodeScan.bind(this));
    clearInterval(this.clearBarcodeInterval);
  }

  ngAfterViewInit(): void {
    if (this.isRebuy) {
      this.cargarTodo();
    }
  }

  public cargarTodo() {
    this.initForm();
    this.filtrarProductos();
    this.listView = false;
    this.col = '3';
    this.obtenerFiltros();
  }

  get genres(): FormArray {
    return this.filterForm.get('genres') as FormArray;
  }

  get occasions(): FormArray {
    return this.filterForm.get('occasions') as FormArray;
  }

  get deliveryTimes(): FormArray {
    return this.filterForm.get('deliveryTimes') as FormArray;
  }

  onGenreChange(event: any, index: number) {
    const genres = this.filterForm.get('genres') as FormGroup;

    if (event.target.checked) {
      // Si la ocasión está seleccionada, establecer su valor en el objeto a true.
      genres.addControl(event.target.value, new FormControl(true));
    } else {
      // Si la ocasión no está seleccionada, eliminar su entrada en el objeto.
      genres.removeControl(event.target.value);
    }

    this.filtrarProductos();
  }


  private onOccasionChange(event: any, index: number) {
    const occasions = this.filterForm.get('occasions') as FormGroup;

    if (event.target.checked) {
      // Si la ocasión está seleccionada, establecer su valor en el objeto a true.
      occasions.addControl(event.target.value, new FormControl(true));
    } else {
      // Si la ocasión no está seleccionada, eliminar su entrada en el objeto.
      occasions.removeControl(event.target.value);
    }

    this.filtrarProductos();
  }



  private onDeliveryTimeChange(event: any, index: number) {
    const deliveryTimesArray = this.filterForm.get('deliveryTimes') as FormArray;

    if (event.target.checked) {
      deliveryTimesArray.push(new FormControl(event.target.value));
    } else {
      let i = 0;
      deliveryTimesArray.controls.forEach((item: FormControl) => {
        if (item.value == event.target.value) {
          deliveryTimesArray.removeAt(i);
          return;
        }
        i++;
      });
    }

    this.filtrarProductos();
  }


  private initForm() {
    this.filterForm = this.fb.group({
      genres: this.fb.group({}),
      occasions: this.fb.group({}),
      deliveryTimes: this.fb.array([]),
      isRecommended: [false],
      isNew: [false],
      isBestSeller: [false],
      isOnSale: [false],
      hasFreeShipping: [false],
      priceRange: [[this.minPrice, this.maxPrice]],
      category: [''],
      onlyPOS: [true]
      // deliveryCity: [[]]
    });

  }

  ngOnInit(): void {
    // this.listProducts();
    // this.listView = false;
    // this.col = '2';
    // this.obtenerFiltros();

    // this.registrarEventos();
    this.clearBarcodeInterval = setInterval(() => {
      if (this.scannedBarcode) {
        console.log('Limpiando código de barras: ', this.scannedBarcode);
        this.scannedBarcode = '';
      }
    }, 5000); // 5000ms = 5 segundos
    this.isMobile = window.innerWidth < 768;
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth < 768;
    });
  }

  registrarEventos() {
    document.addEventListener('keypress', this.handleBarcodeScan.bind(this));
  }

  desRegistrarEventos() {
    document.removeEventListener('keypress', this.handleBarcodeScan.bind(this));
  }



  private handleBarcodeScan(event: KeyboardEvent): void {
    if (!this.inStepCorrect)
      return;

    let char = event.key;

    if (char === 'Enter') {
      this.searchProductByBarcode(this.scannedBarcode.trim());
      this.scannedBarcode = ''; // Limpia el buffer
    }
    else {
      let char = '';
    }

    if (!this.scannedBarcode) {
      this.scannedBarcode = ''; // Inicializa si está vacío
    }

    this.scannedBarcode += char;
    console.log(this.scannedBarcode);

    // Procesar el código al recibir "Enter"

  }

  private searchProductByBarcode(barcode: string): void {
    this.toastrService.info('Buscando producto...', 'Por favor espera', {
      timeOut: 2000,
      positionClass: 'toast-bottom-right'
    });
    if (this.productos.filter(p => p.identificacion.codigoBarras == barcode).length > 0) {
      this.producto = this.productos.filter(p => p.identificacion.referencia == barcode)[0];

      this.addToCarByBarcode()
    }
    else {
      this.toastrService.info('Producto no econtrado', 'producto no existe', {
        timeOut: 2000,
        positionClass: 'toast-bottom-right'
      });
    }
    // const sub = this.maestroService.getProductByBarcode(barcode).subscribe({
    //   next: (product: Producto) => {
    //     if (product) {
    //       this.producto = product;
    //       this.toastrService.success('Producto encontrado', product.crearProducto.titulo, {
    //         timeOut: 3000,
    //         positionClass: 'toast-bottom-right'
    //       });
    //     } else {
    //       this.toastrService.error('Producto no encontrado', 'Error', {
    //         timeOut: 3000,
    //         positionClass: 'toast-bottom-right'
    //       });
    //     }
    //   },
    //   error: () => {
    //     this.toastrService.error('Error al buscar el producto', 'Error', {
    //       timeOut: 3000,
    //       positionClass: 'toast-bottom-right'
    //     });
    //   }
    // });

    // this.subs.push(sub);
  }



  addToCarByBarcode(): void {
    const fechaActual = new Date();
    this.datosEntrega.controls['fechaEntrega'].setValue({ year: fechaActual.getFullYear(), month: fechaActual.getMonth(), day: fechaActual.getDate() });
    this.datosEntrega.controls['formaEntrega'].setValue('Recoge');
    this.datosEntrega.controls['horarioEntrega'].setValue('Recoger de 9:00am a 18:00pm');
    this.productoConfiguradoForm.controls.datosEntrega.setValue(this.datosEntrega.value);
    this.productoConfiguradoForm.controls.cantidad.setValue(1);
    this.productoConfiguradoForm.controls.preferencias.setValue([]);
    this.productoConfiguradoForm.controls.adiciones.setValue([]);
    this.productoConfiguradoForm.controls.tarjetas.setValue([]);

    let ProductoCompra: any = {
      producto: this.producto,
      configuracion: this.productoConfiguradoForm.value,
      cantidad: 1,
    };

    this.carsingleton.addToCart(ProductoCompra);

    this.toastrService.success('Producto agregado al carrito', 'Éxito', {
      timeOut: 5000,
      progressBar: true,
      positionClass: 'toast-bottom-right'
    });

  }


  obtenerFiltros() {
    // this.getAllFilters();
    this.pedidoUtilService.getAllMaestro$().subscribe((data: any) => {
      this.empresaActual = data.empresaActual;
      this.formaEntrega = data.formaEntrega;
      this.tiempoEntrega = data.tiempoEntrega;
      this.tipoEntrega = data.tipoEntrega;
      this.ocasiones = data.ocasiones;
      this.generos = data.generos;
      this.formasPago = data.formasPago;
      this.categorias = data.categorias;
    });
  }


  getAllFilters() {
    this.empresaActual = JSON.parse(sessionStorage.getItem("currentCompany")!);

    forkJoin([
      this.maestroService.getFormaEntrega(),
      this.maestroService.getTiempoEntrega(),
      this.maestroService.getTipoEntrega(),
      this.maestroService.consultarOcasion(),
      this.maestroService.consultarGenero(),
      this.maestroService.consultarFormaPago(),
      this.maestroService.getCategorias()
    ]).subscribe({
      next: (results: any[]) => {
        this.formaEntrega = results[0];
        this.tiempoEntrega = results[1];
        this.tipoEntrega = results[2];
        this.ocasiones = results[3];
        this.generos = results[4];
        this.formasPago = results[5];
        this.categorias = parse((results[6] as any[])[0].categoria).map(p => {
          return {
            label: p.data.nombre,
            data: p.data,
            children: p.children.map(sub => {
              return {
                label: sub.data.nombre,
                data: sub.data,
                children: sub.children ? sub.children.map(sub2 => {
                  return {
                    label: sub2.data.nombre,
                    data: sub2.data,
                    children: sub2.children ? sub2.children.map(sub2 => {
                      return {

                      }
                    }) : null
                  }
                }) : null
              }
            })
          }
        });

        if (this.isOpenModalDirect) {
          this.configurarProducto(this.productos[0]);
        }
      },
      error: (error) => {
        Swal.fire({
          title: 'Error!',
          text: 'Error al cargar los datos' + error,
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  listProducts() {


    this.ventasService.getProducts().subscribe({
      next: (data) => {
        console.log(data);
        this.productos = data;

        const precios = this.productos.map((producto) => producto.precio.precioUnitarioConIva);
        this.minPrice = precios.reduce((min, precio) => (precio < min ? precio : min), precios[0]);
        this.maxPrice = precios.reduce((max, precio) => (precio > max ? precio : max), precios[0]);

        this.filterForm.get('priceRange')?.setValue([this.minPrice, this.maxPrice]);
      },
      error: (error) => {
        Swal.fire({
          title: 'Error!',
          text: 'Error al cargar los productos' + error,
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }
  limpiarFiltros() {
    this.initForm();

    this.tiempoEntrega.forEach((tiempo) => {
      tiempo.checked = false;
      const checkbox = document.getElementById("tiempo-" + tiempo.nombreInterno) as HTMLInputElement;
      checkbox.checked = false;
    });

    this.ocasiones.forEach((ocasion) => {
      const checkbox = document.getElementById("ocasion-" + ocasion.id) as HTMLInputElement;
      checkbox.checked = false;
    });

    this.generos.forEach((genero) => {
      const checkbox = document.getElementById("genero-" + genero.id) as HTMLInputElement;
      checkbox.checked = false;
    });
    // this.filterForm.reset();
    this.filterForm.get('priceRange')?.setValue([this.minPrice, this.maxPrice]);
    this.filterForm.get('category')?.setValue('');

    this.filtrarProductos();
  }
  filtrarProductos() {
    const filter = this.filterForm.value;
    // filter.deliveryCity = { label: "Medellín", value: "Medellín" };
    filter.category = stringify(filter.category);
    this.ventasService.getProductsByFilter(filter).subscribe({
      next: (data) => {
        console.log(data);
        this.productos = data;
        this.temp = [...data];


        if(this.productos.length == 0){
          Swal.fire({
            title: 'Información',
            text: 'No se encontraron productos con los filtros seleccionados',
            icon: 'info',
            confirmButtonText: 'Aceptar'
          });
        } else if(this.productos.length > 20){
          this.col = '1';
        } else if(this.productos.length > 10){
          this.col = '2';
        } else {
          this.col = '3';
        }


      },
      error: (error) => {
        Swal.fire({
          title: 'Error!',
          text: 'Error al cargar los productos' + error,
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }
  sidebarToggle() {
    this.openSidebar = !this.openSidebar;
    this.col = '3';
  }

  toggleListView(val) {
    this.listView = val;
  }

  gridColumn(val) {
    this.col = val;
  }
  @Input('icon') public icon;

  public col1: string = '4';
  public col2: string = '6';

  @ViewChild("quickView") QuickView: QuickViewComponent;
  @ViewChild("confProduct") confProduct: POSConfProductToCartComponent;
  @ViewChild("confProductToCartModal", { static: false }) confProductToCartModal: TemplateRef<any>;

  configurarProducto(producto: Producto) {

    // if (this.generos == undefined || this.ocasiones == undefined || this.tipoEntrega == undefined) {
    //   this.obtenerFiltros();
    // }

    // this.confProduct.tipoEntrega = this.tipoEntrega;
    // this.confProduct.generos = this.generos.filter((p: { id: number }) => producto.procesoComercial.genero.find((g: number) => g == p.id));
    // this.confProduct.ocasiones = this.ocasiones.filter((p: { id: string }) => producto.procesoComercial.ocasion.find((g: string) => g == p.id));

    // this.confProduct.variables = parse(producto.procesoComercial.variablesForm);
    // this.confProduct.configurarProducto(producto);
    this.productoSeleccionado = producto;

    this.modalService.open(this.confProductToCartModal, {
      // ariaLabelledBy: 'modal-basic-title',
      centered: true,
      // windowClass: 'Quickview',
      size: 'xl',
      keyboard: true,
      animation: true,
      scrollable: true,
      fullscreen: true,
      windowClass: 'modal-fullscreen',

    }).result.then((result) => {
      `Result ${result}`

    }, (reason) => {
      if (this.isRebuy) {
        this.modalService.dismissAll(reason);
      }
      // this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });

  }
  updateFilter(event: any) {
    const val = event.target.value.toLowerCase();

    this.productos = this.temp.filter((d) => {
      return (
        d.crearProducto.titulo.toLowerCase().includes(val) ||
        d.crearProducto.descripcion.toLowerCase().includes(val) ||
        (d.identificacion?.referencia?.toString().toLowerCase().includes(val) ?? false) ||
        (d.disponibilidad?.cantidadDisponible?.toString().toLowerCase().includes(val) ?? false) ||
        (d.precio?.precioUnitarioSinIva?.toString().toLowerCase().includes(val) ?? false) ||
        (d.date_edit?.toLowerCase().includes(val) ?? false)
      );
    });
  }

  quickAddToCart(producto: Producto, event: MouseEvent): void {
    
    event.stopPropagation(); // Evita conflictos de clic en la tarjeta
    
    // Validación de inventario antes de agregar al carrito
    if (producto?.disponibilidad?.inventariable) {
      const stockDisponible = producto.disponibilidad?.cantidadDisponible || 0;
      
      if (stockDisponible === 0) {
        this.toastrService.error('No hay unidades disponibles para este producto', 'Sin Stock', {
          timeOut: 3000,
          positionClass: 'toast-bottom-right'
        });
        return;
      }
      
      const defaultQuantity = producto.disponibilidad?.cantidadMinVenta || 1;
      
      if (defaultQuantity > stockDisponible) {
        this.toastrService.warning(
          `Solo hay ${stockDisponible} unidades disponibles. La cantidad mínima de venta es ${defaultQuantity}.`, 
          'Stock Insuficiente', 
          {
            timeOut: 4000,
            positionClass: 'toast-bottom-right'
          }
        );
        return;
      }
    }
    
    const defaultQuantity = producto.disponibilidad?.cantidadMinVenta || 1;
    const fechaActual = new Date();
    // Configuración de datos de entrega predeterminados
    const datosEntrega = {
      fechaEntrega: { year: fechaActual.getFullYear(), month: fechaActual.getMonth() + 1, day: fechaActual.getDate() },
      formaEntrega: 'Recoge',
      horarioEntrega: 'Recoger de 9:00am a 18:00pm'
    };
    // Cálculo del precio unitario según escalas de precios (si aplica)
    let unitPrice = producto.precio.precioUnitarioConIva;
    if (producto.precio.preciosVolumen && producto.precio.preciosVolumen.length > 0) {
      const rangoActual = producto.precio.preciosVolumen.find(
        x => defaultQuantity >= x.numeroUnidadesInicial && defaultQuantity <= x.numeroUnidadesLimite
      );
      if (rangoActual) {
        unitPrice = rangoActual.valorUnitarioPorVolumenConIVA;
      }
    }
    // Cálculo del precio total
    const totalPrice = unitPrice * defaultQuantity;

    // Armar configuración similar a conf-product-to-cart
    const configuracion = {
      cantidad: defaultQuantity,
      datosEntrega: datosEntrega,
      preferencias: [],
      adiciones: [],
      tarjetas: [],
      unitPrice: unitPrice,
      totalPrice: totalPrice
    };

    const ProductoCompra: any = {
      producto: producto,
      configuracion: configuracion,
      cantidad: defaultQuantity
    };

    this.carsingleton.addToCart(ProductoCompra);
    this.toastrService.success('Producto agregado al carrito', 'Éxito', {
      timeOut: 3000,
      positionClass: 'toast-bottom-right'
    });
  }

  /**
   * Verifica si un producto específico no tiene stock disponible
   */
  isProductStockUnavailable(producto: Producto): boolean {
    if (!producto?.disponibilidad?.inventariable) {
      return false; // Si no maneja inventario, no hay restricción
    }

    const stockDisponible = producto.disponibilidad?.cantidadDisponible || 0;
    return stockDisponible === 0;
  }

  /**
   * Obtiene la clase CSS para el indicador de stock de un producto
   */
  getProductStockClass(producto: Producto): string {
    if (!producto?.disponibilidad?.inventariable) {
      return 'text-muted';
    }

    const stockDisponible = producto.disponibilidad?.cantidadDisponible || 0;
    
    if (stockDisponible === 0) {
      return 'text-danger';
    } else if (stockDisponible <= 5) {
      return 'text-warning';
    } else {
      return 'text-success';
    }
  }

  /**
   * Obtiene el icono para el indicador de stock de un producto
   */
  getProductStockIcon(producto: Producto): string {
    if (!producto?.disponibilidad?.inventariable) {
      return 'fa fa-info-circle';
    }

    const stockDisponible = producto.disponibilidad?.cantidadDisponible || 0;
    
    if (stockDisponible === 0) {
      return 'fa fa-times-circle';
    } else if (stockDisponible <= 5) {
      return 'fa fa-exclamation-triangle';
    } else {
      return 'fa fa-check-circle';
    }
  }

  /**
   * Obtiene el texto del indicador de stock de un producto
   */
  getProductStockText(producto: Producto): string {
    if (!producto?.disponibilidad?.inventariable) {
      return 'Sin control de inventario';
    }

    const stockDisponible = producto.disponibilidad?.cantidadDisponible || 0;
    
    if (stockDisponible === 0) {
      return 'Agotado';
    } else if (stockDisponible <= 5) {
      return `${stockDisponible} disponibles`;
    } else {
      return `${stockDisponible} disponibles`;
    }
  }

  /**
   * Obtiene el mensaje de tooltip para el stock de un producto
   */
  getProductStockMessage(producto: Producto): string {
    if (!producto?.disponibilidad?.inventariable) {
      return 'Este producto no maneja control de inventario';
    }

    const stockDisponible = producto.disponibilidad?.cantidadDisponible || 0;
    
    if (stockDisponible === 0) {
      return 'Este producto está agotado';
    } else if (stockDisponible <= 5) {
      return `Stock limitado: solo ${stockDisponible} unidades disponibles`;
    } else {
      return `Stock disponible: ${stockDisponible} unidades`;
    }
  }

  /**
   * Obtiene el tooltip para el botón de quick add
   */
  getQuickAddTooltip(producto: Producto): string {
    if (this.isProductStockUnavailable(producto)) {
      return 'No se puede agregar: producto agotado';
    } else {
      return 'Agregar rápidamente al carrito';
    }
  }

  /**
   * Obtiene la lista de productos seleccionados
   */
  getSelectedProducts(): any[] {
    return this.selectedProducts;
  }

  /**
   * Establece la lista de productos seleccionados
   */
  setSelectedProducts(products: any[]): void {
    this.selectedProducts = products;
  }
}
