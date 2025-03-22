import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { QuickViewComponent } from '../../quick-view/quick-view.component';
import { VentasService } from '../../../../shared/services/ventas/ventas.service';
import Swal from 'sweetalert2';
import { Producto } from 'src/app/shared/models/productos/Producto';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { parse, stringify } from 'flatted';
import { FormGroup, FormControl, FormArray, FormBuilder } from '@angular/forms';
import { ConfProductToCartComponent } from '../conf-product-to-cart/conf-product-to-cart.component';
import { After } from 'v8';
import { forkJoin } from 'rxjs';
import { PedidosUtilService } from '../../service/pedidos.util.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-ecomerce-products',
  templateUrl: './ecomerce-products.component.html',
  styleUrls: ['./ecomerce-products.component.scss']
})
export class EcomerceProductsComponent implements OnInit, AfterViewInit {

  @Input() public ciudad: string;
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
  constructor(private ventasService: VentasService, private modalService: NgbModal, private maestroService: MaestroService, private fb: FormBuilder, private pedidoUtilService: PedidosUtilService) {
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
    this.empresaActual = JSON.parse(sessionStorage.getItem("currentCompany"));

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

        this.filterForm.get('priceRange').setValue([this.minPrice, this.maxPrice]);
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
    this.filterForm.get('priceRange').setValue([this.minPrice, this.maxPrice]);
    this.filterForm.get('category').setValue('');

    this.filtrarProductos();
  }
  filtrarProductos() {
    const filter = this.filterForm.value;
    filter.deliveryCity = { label: this.ciudad, value: this.ciudad };
    filter.category = stringify(filter.category);
    this.ventasService.getProductsByFilter(filter).subscribe({
      next: (data) => {
        console.log(data);
        this.productos = data;
        this.temp = [...data];
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
}
