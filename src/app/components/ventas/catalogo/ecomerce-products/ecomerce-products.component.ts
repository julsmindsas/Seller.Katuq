import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { QuickViewComponent } from '../../quick-view/quick-view.component';
import { VentasService } from '../../../../shared/services/ventas/ventas.service';
import Swal from 'sweetalert2';
import { Producto } from '../../../../shared/models/productos/Producto';
import { MaestroService } from '../../../../shared/services/maestros/maestro.service';
import { parse, stringify } from 'flatted';
import { FormGroup, FormControl, FormArray, FormBuilder, AbstractControl } from '@angular/forms';
import { ConfProductToCartComponent } from '../conf-product-to-cart/conf-product-to-cart.component';
import { After } from 'v8';
import { forkJoin } from 'rxjs';
import { PedidosUtilService } from '../../service/pedidos.util.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CartSingletonService } from '../../../../shared/services/ventas/cart.singleton.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-ecomerce-products',
  templateUrl: './ecomerce-products.component.html',
  styleUrls: ['./ecomerce-products.component.scss']
})
export class EcomerceProductsComponent implements OnInit, AfterViewInit {

  @Input() public ciudad: string;
  @Input() public bodega: string;
  @Output() onRender = new EventEmitter<void>();


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
  
  // Propiedades para la paginación
  productosCompletos: Producto[] = []; // Almacena todos los productos
  productosPaginados: Producto[] = []; // Almacena los productos de la página actual
  paginaActual: number = 1;
  productosPorPagina: number = 8; // Cantidad de productos por página
  totalPaginas: number = 0;
  Math = Math; // Exponer Math para usarlo en la plantilla
  
  constructor(
    private ventasService: VentasService, 
    private modalService: NgbModal, 
    private maestroService: MaestroService, 
    private fb: FormBuilder, 
    private pedidoUtilService: PedidosUtilService,
    private cartService: CartSingletonService,
    private toastrService: ToastrService
  ) {
    this.initForm();
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
    this.col = '2';
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


  onOccasionChange(event: any, index: number) {
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



  onDeliveryTimeChange(event: any, index: number) {
    const deliveryTimesArray = this.filterForm.get('deliveryTimes') as FormArray;

    if (event.target.checked) {
      deliveryTimesArray.push(new FormControl(event.target.value));
    } else {
      let i = 0;
      deliveryTimesArray.controls.forEach((item: AbstractControl) => {
        if ((item as FormControl).value == event.target.value) {
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
      deliveryCity: [[]]
    });

  }

  ngOnInit(): void {
    // this.listProducts();
    // this.listView = false;
    // this.col = '2';
    // this.obtenerFiltros();
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
    this.empresaActual = JSON.parse(sessionStorage.getItem("currentCompany") || '{}');

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
        console.log("productos", JSON.stringify(data));
        this.productosCompletos = data;
        this.productos = data; // Mantener esta asignación para compatibilidad

        const precios = this.productos
          .filter(p => p.precio)
          .map((producto) => producto.precio?.precioUnitarioConIva || 0);
          
        if (precios.length > 0) {
          this.minPrice = precios.reduce((min, precio) => (precio < min ? precio : min), precios[0]);
          this.maxPrice = precios.reduce((max, precio) => (precio > max ? precio : max), precios[0]);
          const priceControl = this.filterForm.get('priceRange');
          if (priceControl) {
            priceControl.setValue([this.minPrice, this.maxPrice]);
          }
        }
        
        // Configurar paginación
        this.configurarPaginacion();
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
      if (checkbox) {
        checkbox.checked = false;
      }
    });

    this.ocasiones.forEach((ocasion) => {
      const checkbox = document.getElementById("ocasion-" + ocasion.id) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = false;
      }
    });

    this.generos.forEach((genero) => {
      const checkbox = document.getElementById("genero-" + genero.id) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = false;
      }
    });
    
    const priceControl = this.filterForm.get('priceRange');
    const categoryControl = this.filterForm.get('category');
    
    if (priceControl) {
      priceControl.setValue([this.minPrice, this.maxPrice]);
    }
    
    if (categoryControl) {
      categoryControl.setValue('');
    }

    this.filtrarProductos();
  }
  
  filtrarProductos() {
    const filter = this.filterForm.value;
    filter.deliveryCity = { label: this.ciudad, value: this.ciudad };
    filter.category = stringify(filter.category);
    filter.bodega = this.bodega;
    filter.isChannelManual = true;
    this.ventasService.getProductsByFilter(filter).subscribe({
      next: (data) => {
        console.log(data);
        console.log("productos", JSON.stringify([data[0], data[1], data[2]]));
        this.productosCompletos = data;
        this.productos = data; // Mantener para compatibilidad
        this.temp = [...data];
        
        // Reiniciar paginación y actualizar los productos paginados
        this.paginaActual = 1;
        this.configurarPaginacion();
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
  @ViewChild("confProduct") confProduct: ConfProductToCartComponent;
  @ViewChild("confProductToCartModal", { static: false }) confProductToCartModal: TemplateRef<any>;

  /**
   * Maneja la acción de comprar un producto
   * Si el proceso comercial está activo, muestra el modal de configuración
   * Si no, añade directamente al carrito
   * @param producto Producto a comprar
   */
  comprarProducto(producto: Producto) {
    // if (producto.procesoComercial?.configProcesoComercialActivo) {
    if(true) {
      // Abrir modal de configuración
      this.configurarProducto(producto);
    } else {
      // Añadir directamente al carrito
      const cantidadMinima = producto.disponibilidad?.cantidadMinVenta || 1;
      
      // Crear un objeto básico para añadir al carrito
      const productoCompra = {
        producto: producto,
        configuracion: {
          producto: producto,
          datosEntrega: null,
          cantidad: cantidadMinima,
          preferencias: [],
          adiciones: [],
          tarjetas: []
        },
        cantidad: cantidadMinima,
      };
      
      this.cartService.addToCart(productoCompra);
      
      this.toastrService.success('Producto agregado al carrito', 'Éxito', {
        timeOut: 5000,
        progressBar: true,
        positionClass: 'toast-bottom-right'
      });
    }
  }

  // Mantener el método configurarProducto ya que se sigue utilizando cuando se requiere configuración
  configurarProducto(producto: Producto) {
    this.productoSeleccionado = producto;

    this.modalService.open(this.confProductToCartModal, {
      centered: true,
      size: 'xl',
      keyboard: true,
      animation: true,
      scrollable: true,
      fullscreen: false,
      windowClass: 'modal-fullscreen',
    }).result.then((result) => {
      `Result ${result}`
    }, (reason) => {
      if (this.isRebuy) {
        this.modalService.dismissAll(reason);
      }
    });
  }

  updateFilter(event: any) {
    const val = event.target.value.toLowerCase();

    // Filtrar productos
    const productosFiltrados = this.temp.filter((d) => {
      return (
        (d.crearProducto?.titulo?.toLowerCase().includes(val) ?? false) ||
        (d.crearProducto?.descripcion?.toLowerCase().includes(val) ?? false) ||
        (d.identificacion?.referencia?.toString().toLowerCase().includes(val) ?? false) ||
        (d.disponibilidad?.cantidadDisponible?.toString().toLowerCase().includes(val) ?? false) ||
        (d.precio?.precioUnitarioSinIva?.toString().toLowerCase().includes(val) ?? false) ||
        (d.date_edit?.toLowerCase().includes(val) ?? false)
      );
    });
    
    // Actualizar productos y paginación
    this.productosCompletos = productosFiltrados;
    this.productos = productosFiltrados; // Para mantener compatibilidad
    this.paginaActual = 1;
    this.configurarPaginacion();
  }
  
  // Métodos nuevos para paginación
  
  /**
   * Configura la paginación
   */
  configurarPaginacion() {
    this.totalPaginas = Math.ceil(this.productosCompletos.length / this.productosPorPagina);
    this.cambiarPagina(this.paginaActual);
  }
  
  /**
   * Cambia a la página especificada
   * @param pagina Número de página
   */
  cambiarPagina(pagina: number) {
    if (pagina < 1) pagina = 1;
    if (pagina > this.totalPaginas) pagina = this.totalPaginas;
    
    this.paginaActual = pagina;
    
    // Calcular índices para la página actual
    const indiceInicial = (pagina - 1) * this.productosPorPagina;
    const indiceFinal = Math.min(indiceInicial + this.productosPorPagina, this.productosCompletos.length);
    
    // Actualizar productos paginados
    this.productosPaginados = this.productosCompletos.slice(indiceInicial, indiceFinal);
  }
  
  /**
   * Avanza a la siguiente página
   */
  paginaSiguiente() {
    if (this.paginaActual < this.totalPaginas) {
      this.cambiarPagina(this.paginaActual + 1);
    }
  }
  
  /**
   * Retrocede a la página anterior
   */
  paginaAnterior() {
    if (this.paginaActual > 1) {
      this.cambiarPagina(this.paginaActual - 1);
    }
  }
  
  /**
   * Cambia la cantidad de productos por página
   * @param cantidad Nueva cantidad de productos por página
   */
  cambiarProductosPorPagina(cantidad: number) {
    this.productosPorPagina = cantidad;
    this.configurarPaginacion();
  }
}
