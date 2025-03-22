import { AfterContentChecked, AfterContentInit, Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild, ElementRef } from '@angular/core';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { Producto } from 'src/app/shared/models/productos/Producto';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { CarouselLibConfig, Image } from '@ks89/angular-modal-gallery';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { Form, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { finalize, Subscription } from 'rxjs';
import { CartSingletonService } from '../../../../shared/services/ventas/cart.singleton.service';
import { POSCarrito } from '../../pos-modelo/pedido';
import { MovingDirection } from 'angular-archwizard';
import { POSPedidosUtilService } from '../../pos-service/pos-pedidos.util.service';
import { parse } from 'flatted';
import { ToastrService } from "ngx-toastr";
import { NotificationService } from 'src/app/shared/services/notification.service';

@Component({
  selector: 'app-conf-product-to-cart',
  templateUrl: './conf-product-to-cart.component.html',
  styleUrls: ['./conf-product-to-cart.component.scss']
})
export class POSConfProductToCartComponent implements OnInit, AfterContentChecked, AfterContentInit, OnDestroy {
  active = 1;
  private subs: Subscription[] = [];
  productPreference: any = [];
  temp: any[];
  adicionesrows: any[];
  productoConfiguradoForm: FormGroup;
  datosEntrega: FormGroup;
  tarjetasForm: FormGroup<{ tarjetas: FormArray<FormControl<unknown>>; }>;
  ratingForm: FormGroup<{ rating: FormControl<any>; }>;
  tiemposEntrega: any[];
  rowsiniciales: string;
  mostrarTabla: boolean = false;
  rowsinicialesSinMod: string;
  baseValorUnitarioSinIva: any;
  basePrecioTotalConIva: any;
  baseValorIva: any;
  sumaTotal: number = 0;
  resultado: number = 0;
  sumaTotalAdiciones: number = 0;
  sumaTotalProducto: number = 0;
  productos: any;
  @Input() public isRebuy: boolean = false;
  precioproducto: any;
  rangoPreciosActual: any;
  selectedFiles: any = [];
  adicionesPreferencias: any;
  scannedBarcode: any;


  ngOnDestroy(): void {
    // Limpia eventos globales para evitar memory leaks

    this.subs.forEach(sub => sub.unsubscribe());
  }

  @ViewChild("quickView", { static: false }) QuickView: TemplateRef<any>;
  @ViewChild('cantidad') cantidadControl: ElementRef;
  public closeResult: string;
  public modalOpen: boolean = false;

  public cantidadTarjetas: any = 1;
  @Input() public producto: Producto;
  @Input() public configuracionCarrito: POSCarrito
  @Input() isEdit: boolean = false;

  public cantidad: number = 1;
  public tipoEntrega: any[];
  public ocasiones: any[] = [
    { value: 'Elegir Ocasion', label: 'Elegir Ocasion' }

  ];
  formasEntrega: any;
  formulario: FormGroup;
  tarjetaForm: FormGroup;
  activeids = [];

  public destinatario: any[] = [
    { value: 'Para Quien Es', label: 'Para Quien Es' }
  ];
  public generos: any[];
  public categorias: any[];
  public horarios: any[];
  public variables: any;
  public imagesRect: Image[];
  minDate: any;
  isOnlyOneTarjeta: boolean = false;
  SinTarjeta: boolean = false;
  formasEntregaProducto: any;
  libConfigCarouselFixed: CarouselLibConfig;

  constructor(private storage: AngularFireStorage, private toastrService: ToastrService, private modalService: NgbModal, private carsingleton: CartSingletonService, private maestroService: MaestroService, private fb: FormBuilder,
    private pedidoUtilService: POSPedidosUtilService, private notificacionService: NotificationService) {


    this.libConfigCarouselFixed = {
      carouselPreviewsConfig: {
        visible: true,
        number: 6,
        width: 'auto',
        maxHeight: '100px'
      },
      carouselConfig: {
        maxWidth: '70%',
        maxHeight: '70%',
        showArrows: true,
        objectFit: 'cover',
        keyboardEnable: true,
        modalGalleryEnable: true
      }
    };
    this.productoConfiguradoForm = this.fb.group({
      producto: [ /* producto inicial */],
      datosEntrega: [],
      cantidad: [1],
      preferencias: [[]],
      adiciones: [[]],
      tarjetas: [[]]
    });
    this.ratingForm = this.fb.group({
      rating: [null]
    });
    this.tarjetasForm = this.fb.group({
      tarjetas: this.fb.array([]),
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

    this.imagesRect = [
      new Image(1, { img: 'assets/images/ecommerce/02.jpg' }, { img: 'assets/images/ecommerce/02.jpg' })];
    this.initForm();
    // this.getAdiciones();
  }

  ngAfterContentInit(): void {

  }

  inicializacionConfigurarProducto(producto: Producto) {

    if (this.generos == undefined || this.ocasiones == undefined || this.tipoEntrega == undefined) {

      this.pedidoUtilService.getAllMaestro$().subscribe((r: any) => {
        if (this.tipoEntrega == undefined && this.tiemposEntrega == undefined && this.generos == undefined && this.formasEntrega == undefined) {
          if (r.tipoEntrega && r.tiempoEntrega && r.generos && r.ocasiones && r.formaEntrega) {
            this.tipoEntrega = r.tipoEntrega;
            this.tiemposEntrega = r.tiempoEntrega;
            this.generos = r.generos?.filter((p: { id: number }) => producto.procesoComercial.genero.find((g: number) => g == p.id));
            this.ocasiones = r.ocasiones?.filter((p: { id: string }) => producto.procesoComercial.ocasion.find((g: string) => g == p.id));
            this.formasEntrega = r.formaEntrega;
            this.adicionesPreferencias = r.adiciones.filter(p => p.esPreferencia);
            this.adicionesrows = (r.adiciones as any[]).filter(p => p.esAdicion).sort((a, b) => {
              const nameA = parseInt(a.posicion); // ignore upper and lowercase
              const nameB = parseInt(b.posicion); // ignore upper and lowercase
              if (nameA < nameB) {
                return -1;
              }
              if (nameA > nameB) {
                return 1;
              }

              // names must be equal
              return 0;
            });

            this.rowsinicialesSinMod = JSON.stringify(this.adicionesrows)

            this.loadFormasEntregaConfiguracionProducto();
            this.variables = parse(producto.procesoComercial.variablesForm);
            this.configurarProducto(producto);

          }
        }
      });

    }

  }

  ngAfterContentChecked(): void {

  }
  refreshCartWithProducts(): void {
    // this.carsingleton.setProductInCart();
    const context = this;
    this.carsingleton.refreshCart().subscribe({
      next: (data) => {

        console.log("carrito:", data);
        context.productos = data;
        context.productos = [...context.productos];

      }
    });
  }
  masCantidad() {
    this.cantidad++;
    document.getElementById("cantidad").setAttribute("value", this.cantidad.toString());
    if (this.producto.precio.preciosVolumen.length > 0) {
      let rangoActual = this.producto.precio.preciosVolumen.find(x =>
        this.cantidad >= x.numeroUnidadesInicial && this.cantidad <= x.numeroUnidadesLimite
      );
      let precioFormateado
      if (rangoActual == undefined) {
        precioFormateado = this.producto.precio.precioUnitarioConIva.toLocaleString('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 2,
        });
      } else {
        precioFormateado = rangoActual.valorUnitarioPorVolumenConIVA.toLocaleString('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 2,
        });
      }
      if (rangoActual && this.rangoPreciosActual !== rangoActual) {
        this.toastrService.show('<p class="mb-0 mt-1">El nuevo precio por unidad de su producto es: ' + precioFormateado + '</p>', '', { closeButton: true, enableHtml: true, positionClass: 'toast-bottom-right', timeOut: 2000 });

        // Actualizar el rango de precios actual
        this.rangoPreciosActual = rangoActual;
      }
    }
  }
  menosCantidad1() {
    if (this.cantidad > this.producto.disponibilidad?.cantidadMinVenta) {
      this.cantidad--;
      if (this.cantidadTarjetas > this.cantidad) {
        this.tarjetaForm.removeControl(`tarjeta${this.cantidad}`);
        this.cantidadTarjetas = this.cantidad;
      }

    }
    document.getElementById("cantidad").setAttribute("value", this.cantidad.toString());

  }

  menosCantidad() {
    if (this.cantidad > this.producto.disponibilidad?.cantidadMinVenta) {
      this.cantidad--;
      if (this.cantidadTarjetas > this.cantidad) {
        this.tarjetaForm.removeControl(`tarjeta${this.cantidad}`);
        this.cantidadTarjetas = this.cantidad;
      }
      if (this.producto.precio.preciosVolumen.length > 0) {
        let rangoActual = this.producto.precio.preciosVolumen.find(x =>
          this.cantidad >= x.numeroUnidadesInicial && this.cantidad <= x.numeroUnidadesLimite
        );
        let precioFormateado
        if (rangoActual == undefined) {
          precioFormateado = this.producto.precio.precioUnitarioConIva.toLocaleString('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 2,
          });
        } else {
          precioFormateado = rangoActual.valorUnitarioPorVolumenConIVA.toLocaleString('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 2,
          });
        }

        if (rangoActual && this.rangoPreciosActual !== rangoActual) {
          this.toastrService.show('<p class="mb-0 mt-1">El nuevo precio por unidad de su producto es: ' + precioFormateado + '</p>', '', { closeButton: true, enableHtml: true, positionClass: 'toast-bottom-right', timeOut: 2000 });

          // Actualizar el rango de precios actual
          this.rangoPreciosActual = rangoActual;
        }
      }
    }
    document.getElementById("cantidad").setAttribute("value", this.cantidad.toString());

  }



  ngOnInit(): void {
  
    this.refreshCartWithProducts()
    console.log(this.productos)

    // this.initForm();
    // this.getAdiciones();
    this.datosEntrega.get('fechaEntrega').valueChanges.subscribe(valor => {
      if (!valor) return;
      const fechaEntregatoDateformat = new Date(valor.year, valor.month - 1, valor.day);
      const fechaActual = new Date()
      // Calcular la diferencia en milisegundos
      const diferenciaMilisegundos = fechaEntregatoDateformat.getTime() - fechaActual.getTime();
      // Convertir la diferencia en días
      const diferenciaDias = Math.ceil(diferenciaMilisegundos / (1000 * 60 * 60 * 24));

      if (this.rowsinicialesSinMod !== undefined) {
        this.rowsiniciales = JSON.stringify(JSON.parse(this.rowsinicialesSinMod).filter(x => parseInt(x.tiempoEntrega) <= diferenciaDias))
        // console.log(JSON.parse(this.rowsiniciales));
      }

    });


    if (this.isEdit && this.configuracionCarrito) {
      this.llenarCamposEdicion();
    }
    else if (this.producto) {
      this.addTarjeta();
      this.inicializacionConfigurarProducto(this.producto);
    }

    if (this.productos.length > 0) {
      this.datosEntrega.patchValue(
        {
          tipoEntrega: this.productos[0].configuracion.datosEntrega.tipoEntrega,
          formaEntrega: this.productos[0].configuracion.datosEntrega.formaEntrega,
          fechaEntrega: this.productos[0].configuracion.datosEntrega.fechaEntrega,
          horarioEntrega: this.productos[0].configuracion.datosEntrega.horarioEntrega
        });
    }


    this.sumar()
  }



  getAdiciones() {
    this.maestroService.getAdiciones().subscribe((r: any) => {
      // this.cargando = false;
      this.temp = [...r];
      console.log("adicion", r);
      this.adicionesrows = (r as any[]).sort((a, b) => {
        const nameA = parseInt(a.posicion); // ignore upper and lowercase
        const nameB = parseInt(b.posicion); // ignore upper and lowercase
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        // names must be equal
        return 0;
      });

      this.rowsinicialesSinMod = JSON.stringify(this.adicionesrows)
      // this.cargando = false;
    })
  }

  initForm() {
    this.formulario = this.fb.group({
      variables: this.fb.array([]),
    });

    this.tarjetaForm = this.fb.group({
      para: [''],
      mensaje: [''],
      de: ['']
    });
  }

  private crearItem(objeto: any): FormGroup {
    const grupo = this.fb.group({
      data: this.fb.group({
        imagen: [objeto.data?.imagen || ''],
        porcentajeIva: [objeto.data?.porcentajeIva || ''],
        precioTotalConIva: [objeto.data?.precioTotalConIva || ''],
        subtitulo: [objeto.data?.subtitulo || ''],
        tipoImagen: [objeto.data?.tipoImagen || ''],
        titulo: [objeto.data?.titulo || ''],
        valorIva: [objeto.data?.valorIva || ''],
        valorUnitarioSinIva: [objeto.data?.valorUnitarioSinIva || '']
      }),
      parent: [objeto.parent || null],
      children: this.fb.array([]),
      childrenSelected: [-1],
      imagenIngresado: [''],
      textoIngresado: [''],
      archivoIngresado: ['']
    });
    // Aplicar validaciones basadas en tipoImagen u otras condiciones
    this.aplicarValidacionesDinamicas(grupo, objeto);
    const childrenArray = grupo.get('children') as FormArray;
    objeto.children?.forEach((childObjeto) => {
      childrenArray.push(this.crearItem(childObjeto));
    });

    return grupo;
  }
  private aplicarValidacionesDinamicas(grupo: FormGroup, objeto: any) {
    const tipoImagen = objeto.data?.tipoImagen || '';
    switch (tipoImagen) {
      case 'texto':
        grupo.get('textoIngresado').setValidators([Validators.required]);
        grupo.get('imagenIngresado').clearValidators();
        grupo.get('archivoIngresado').clearValidators();
        break;
      case 'imagen':
        grupo.get('textoIngresado').clearValidators();
        grupo.get('imagenIngresado').setValidators([Validators.required]);
        grupo.get('archivoIngresado').clearValidators();
        break;
      case 'archivo':
        grupo.get('textoIngresado').clearValidators();
        grupo.get('imagenIngresado').clearValidators();
        grupo.get('archivoIngresado').setValidators([Validators.required]);
        break;
      // Aplica otros casos según sea necesario
    }

    // Asegúrate de actualizar la validez de los controles después de cambiar las validaciones
    grupo.get('textoIngresado').updateValueAndValidity();
    grupo.get('imagenIngresado').updateValueAndValidity();
    grupo.get('archivoIngresado').updateValueAndValidity();
  }

  get variablesControls() {
    return (this.formulario.get('variables') as FormArray).controls;
  }

  getOptionsForNgSelect(item: any) {
    const opt = (item.get('children') as FormArray).controls.map((x: any) => x.value);
    if (!opt) return [];
    // buscar en la lista de adiciones la que tenga el mismo titulo que el item
    // const adiciones = this.adicionesrows.filter(x => item.children.fil  x.titulo == item.data.titulo);
    console.log(opt);
    return opt.map((x) => { return { label: x.data.titulo, value: x.data.titulo } });
  }



  agregarItem(data: any) {
    const itemsArray = this.formulario.get('variables') as FormArray;
    itemsArray.push(this.crearItem(data));
  }

  configurarProducto(producto: Producto) {

    this.producto = producto;
    // this.adicionesrows = this.adicionesrows
    this.initForm();
    this.modalOpen = true;
    this.cantidad = producto?.disponibilidad?.cantidadMinVenta

    if (this.producto) {

      this.imagesRect = this.producto.crearProducto.imagenesPrincipales.map((x, index) => new Image(index, { img: x.urls }, { img: x.urls }));
      if (!this.producto.crearProducto.imagenesSecundarias) {
        this.producto.crearProducto.imagenesSecundarias = [];
      }
      this.producto.crearProducto.imagenesSecundarias.map((x, index) => new Image(index, { img: x.urls }, { img: x.urls })).forEach((image) => {
        this.imagesRect.push(image);
      });

      this.imagesRect = [...this.imagesRect];

      const itemsArray = this.formulario.get('variables') as FormArray;
      this.variables.forEach((objeto) => {
        itemsArray.push(this.crearItem(objeto));
      });

      const fechaOriginal = new Date();
      const tiempoEntrega = parseInt(this.producto?.disponibilidad?.tiempoEntrega); // Reemplaza con el valor correspondiente
      const fechaConTiempoEntrega = new Date(fechaOriginal.setDate(fechaOriginal.getDate() + tiempoEntrega));

      const fechaConvertida = {
        year: fechaConTiempoEntrega.getFullYear(),
        month: fechaConTiempoEntrega.getMonth() + 1,  // Los meses en JavaScript son 0-indexados
        day: fechaConTiempoEntrega.getDate()
      };

      this.minDate = fechaConvertida;

      if (!this.isEdit) {
        this.loadFormasEntregaConfiguracionProducto();
      }
    }



  }

  llenarCamposEdicion() {
    const configuracion = this.configuracionCarrito.configuracion;
    this.producto = this.configuracionCarrito.producto;
    this.inicializacionConfigurarProducto(this.producto);
    if (configuracion) {
      this.productoConfiguradoForm.patchValue(configuracion);
      setTimeout(() => {
        this.datosEntrega.patchValue(configuracion.datosEntrega);

        this.productPreference = configuracion.preferencias;

        this.adicionesrows = JSON.parse(this.rowsiniciales);
        const adiciones = this.adicionesrows.filter(x => configuracion.adiciones.find((y: any) => y.titulo == x.descripcion) != null)
        adiciones.forEach((adicion: any) => {
          this.addAdicionToProduct(adicion);
        });
        this.addOpcionesPersonalizacion();



      }, 1000);

      this.cantidadTarjetas = configuracion.tarjetas.length;
      configuracion.tarjetas.forEach((tarjeta: any) => {
        const tarjetasArray = this.tarjetasForm.get('tarjetas') as FormArray;
        tarjetasArray.push(this.crearTarjetaItem(tarjeta));
      });
    }

    this.cantidad = this.configuracionCarrito.cantidad;
    this.isOnlyOneTarjeta = this.cantidadTarjetas == 1;
    this.SinTarjeta = this.cantidadTarjetas == 0;
  }
  crearTarjetaItem(tarjeta: any): any {
    return this.fb.group({
      para: [tarjeta.para],
      mensaje: [tarjeta.mensaje],
      de: [tarjeta.de]
    });
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }

  addToCar() {
    this.producto.rating = this.ratingForm.value.rating;
    const fechaActual = new Date();
    this.datosEntrega.controls['fechaEntrega'].setValue({ year: fechaActual.getFullYear(), month: fechaActual.getMonth() + 1, day: fechaActual.getDate() });
    this.datosEntrega.controls['formaEntrega'].setValue('Recoge');
    this.datosEntrega.controls['horarioEntrega'].setValue('Recoger de 9:00am a 18:00pm');
    // this.productoConfiguradoForm.controls.producto.setValue(this.producto);
    this.productoConfiguradoForm.controls.datosEntrega.setValue(this.datosEntrega.value);
    this.productoConfiguradoForm.controls.cantidad.setValue(this.cantidad);
    this.productoConfiguradoForm.controls.preferencias.setValue(this.productPreference.filter(preference => preference.tipo === 'preferencia'));
    this.productoConfiguradoForm.controls.adiciones.setValue(this.productPreference.filter(preference => preference.tipo === 'adicion'));
    this.productoConfiguradoForm.controls.tarjetas.setValue(this.tarjetas.value);

    let ProductoCompra: POSCarrito = {
      producto: this.producto,
      configuracion: this.productoConfiguradoForm.value,
      cantidad: this.cantidad,
    };
    if (!this.isEdit && !this.isRebuy) {
      this.carsingleton.addToCart(ProductoCompra);
      this.modalService.dismissAll();
    }
    else if (this.isEdit || this.isRebuy) {
      this.modalService.dismissAll(ProductoCompra);
    }

    this.toastrService.success('Producto agregado al carrito', 'Éxito', {
      timeOut: 5000,
      progressBar: true,
      positionClass: 'toast-bottom-right'
    });

    // this.datosEntrega.reset();
    this.tarjetasForm.reset();
    this.productPreference = [];
    this.cantidadTarjetas = 1;
    this.cantidad = 1;
    this.initForm();

  }

  mostrarPrecios() {
    if (this.mostrarTabla == false) {
      this.mostrarTabla = true
    }
    else {
      this.mostrarTabla = false
    }
  }

  changeTipoEntrega(event) {
    console.log(event);
    this.adicionesrows = JSON.parse(this.rowsiniciales)
    this.producto
    let tipoEntregaComparisson = ""
    let tipoEntregaComparisson2 = ""
    this.formasEntrega.filter((p: any) => p.nombre.toLowerCase() == event.nombre.toLowerCase()).map((p: any) => {
      this.horarios = p.horariosSeleccionados;
    });
    if (this.datosEntrega.value.formaEntrega.toString().toLowerCase().includes("domicilio")) {
      tipoEntregaComparisson = "SOLO DOMICILIO"
      tipoEntregaComparisson2 = "ENVIO A DOMICILIO Y RECOGE"
      this.adicionesrows = this.adicionesrows.filter(x => { return x.tipoEntrega == tipoEntregaComparisson || x.tipoEntrega == tipoEntregaComparisson2 })
    }
    if (this.datosEntrega.value.formaEntrega.toString().toLowerCase().includes("recoge")) {

      tipoEntregaComparisson = "SOLO RECOGE"
      tipoEntregaComparisson2 = "ENVIO A DOMICILIO Y RECOGE"
      this.adicionesrows = this.adicionesrows.filter(x => { return x.tipoEntrega = tipoEntregaComparisson || x.tipoEntrega == tipoEntregaComparisson2 })
    }

  }


  loadFormasEntregaConfiguracionProducto() {
    const tipoEntrega = this.tipoEntrega.filter((p: any) => p.nombreInterno.toLowerCase() == this.producto.disponibilidad.tipoEntrega.toLowerCase())[0];
    // this.tipoEntrega = event.value;
    this.formasEntregaProducto = this.formasEntrega.filter((p: any) => tipoEntrega.formaEntrega.find((g: string) => g.toLowerCase() == p.nombre.toLowerCase()));
  }

  getTituloTiempoEntrega() {
    if (!this.producto || !this.tiemposEntrega) return '';
    const tiempoEntregaProducto = this.producto?.disponibilidad?.tiempoEntrega;
    const tiempoEntrega = this.tiemposEntrega.find((p: any) => p.minDias == tiempoEntregaProducto);
    return tiempoEntrega?.nombreExterno;
  }

  hasFechaEntrega() {
    return this.datosEntrega.value.fechaEntrega;
  }

  handleInput: any
  tieneHijos(grupo: FormGroup): boolean {
    const hijos = grupo.get('children') as FormArray;
    return hijos && hijos.length > 0;
  }

  selectedColor(event: MouseEvent, item: any) {
    const target = event.target as HTMLElement;
    const selected = target.closest('.product-color li');

    if (selected) {
      // Alternar la clase 'selected'
      selected.classList.toggle('selected');
    }

    let colores = this.datosEntrega.controls.colores.value;

    if (colores.includes(item)) {
      // Si el color ya está en la lista, lo removemos
      colores = colores.filter(color => color !== item);
    } else {
      // Si el color no está en la lista, lo agregamos
      colores.push(item);
    }

    // Actualizar la lista de colores en el control del formulario
    this.datosEntrega.controls.colores.setValue(colores);

    // Llamada a la función de personalización si es necesario
    this.addOpcionesPersonalizacion();
  }

  get tarjetas2() {
    if (!this.isOnlyOneTarjeta) {
      return new Array(this.cantidadTarjetas);
    }
    else {
      return new Array(1);
    }
  }

  removeTarjeta(index: number) {
    if (this.cantidadTarjetas > 1) {
      this.cantidadTarjetas--;
      this.tarjetaForm.removeControl(`tarjeta${index}`);
    }
  }

  onChangeTarjetas(event) {
    this.isOnlyOneTarjeta = event.target.checked;
  }
  onChangeNoTarjetas(event) {
    this.SinTarjeta = event.target.checked;


  }

  agregarTarjeta() {
    if (!this.isOnlyOneTarjeta) {
      if (this.cantidadTarjetas < this.cantidad) {
        this.cantidadTarjetas++;
        // this.agregarTarjetaForm();
        this.addTarjeta();
      }
      else {
        Swal.fire({
          title: 'Error!',
          text: 'No puede agregar más tarjetas que productos',
          icon: 'error',
          confirmButtonText: 'Ok'
        });
      }
    }
  }
  agregarTarjetaForm() {
    for (let i = 0; i < this.cantidadTarjetas; i++) {
      this.addTarjeta();
    }
  }

  // deprecado
  selectedProductPreference(event: any, item: FormControl) {
    const selectedIndex = event.target.value;
    let selectedValue = null;
    if (item.value.children.length > 0) {
      selectedValue = item.value.children[selectedIndex];
    }
    else {
      if (item.value.data.tipoImagen == "texto") {
        item.value.children.data = {
          imagen: 'assets/images/other-images/sinimagen.webp',
          porcentajeIva: 0,
          precioTotalConIva: 0,
          subtitulo: selectedIndex,
          tipoImagen: 'texto',
          titulo: selectedIndex,
          valorIva: 0,
          valorUnitarioSinIva: 0
        };

      } else if (item.value.data.tipoImagen == "imagen") {
        const file = event.target.files[0]
        if (!this.isValidFile(file)) {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Solo se aceptan archivos con extensiones .png, .jpg, .webp y .jpeg",
          });
          event.target.value = "";
          return;
        }
        this.selectedFiles.push(file);
        if (this.selectedFiles) {
          Swal.fire({
            title: "Subiendo archivo...",
            text: "Por favor espere...",
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
              Swal.showLoading();
            },
          });
          for (let index = 0; index < this.selectedFiles.length; index++) {
            const file = this.selectedFiles[index];
            const filePath = `almara/configuracionProducto/${this.producto.crearProducto.titulo.replace(/\s+/g, '')}/preferencia/${file.name}`;

            const fileRef = this.storage.ref(filePath);
            const task = this.storage.upload(filePath, file);
            task.snapshotChanges().pipe(
              finalize(() => {
                fileRef.getDownloadURL().subscribe((url) => {

                  item.value.children.data = {
                    imagen: url,
                    porcentajeIva: item.value.data.porcentajeIva,
                    precioTotalConIva: item.value.data.precioTotalConIva,
                    subtitulo: selectedIndex,
                    tipoImagen: 'imagen',
                    titulo: selectedIndex,
                    valorIva: item.value.data.valorIva,
                    valorUnitarioSinIva: item.value.data.valorUnitarioSinIva
                  };
                  Swal.close();
                  selectedValue = item.value.children
                  const preference = {
                    titulo: item.value.data.titulo,
                    subtitulo: item.value.data.titulo,
                    valorUnitarioSinIva: selectedValue.data.valorUnitarioSinIva || 0,
                    valorIva: selectedValue.data.valorIva || 0,
                    porcentajeIva: selectedValue.data.porcentajeIva || 0,
                    precioTotalConIva: selectedValue.data.precioTotalConIva || 0,
                    imagen: selectedValue.data.imagen || 'assets/images/other-images/sinimagen.webp',
                    tipo: 'preferencia',
                    cantidad: 1
                  };

                  const index = this.productPreference.findIndex(p => p.titulo === preference.titulo);
                  if (index !== -1) {
                    this.productPreference[index] = preference;
                  } else {
                    this.productPreference.push(preference);
                  }
                })
              })
            ).subscribe();
            return;
          }
        }

      }

      selectedValue = item.value.children;

    }

    const preference = {
      titulo: item.value.data.titulo,
      subtitulo: selectedValue.data.titulo,
      valorUnitarioSinIva: selectedValue.data.valorUnitarioSinIva || 0,
      valorIva: selectedValue.data.valorIva || 0,
      porcentajeIva: selectedValue.data.porcentajeIva || 0,
      precioTotalConIva: selectedValue.data.precioTotalConIva || 0,
      imagen: selectedValue.data.imagen || 'assets/images/other-images/sinimagen.webp',
      tipo: 'preferencia',
      paraProduccion: false,
      cantidad: 1
    };

    const index = this.productPreference.findIndex(p => p.titulo === preference.titulo);
    if (index !== -1) {
      this.productPreference[index] = preference;
    } else {
      this.productPreference.push(preference);
    }


  }

  getImgAdicion(adicion: any) {
    const adiciones = this.adicionesPreferencias.find(x => x.titulo == adicion);
    if (!adiciones) return 'assets/images/other-images/sinimagen.webp';
    return adiciones?.imagenPrincipal[0]?.urls;
  }


  selectedProductPreferenceForNgSelect(event: any, item: FormControl) {
    let selectedValue = event.value;


    const preference = {
      titulo: item.value.data.titulo,
      subtitulo: selectedValue.data.titulo,
      valorUnitarioSinIva: selectedValue.data.valorUnitarioSinIva || 0,
      valorIva: selectedValue.data.valorIva || 0,
      porcentajeIva: selectedValue.data.porcentajeIva || 0,
      precioTotalConIva: selectedValue.data.precioTotalConIva || 0,
      imagen: this.getImgAdicion(selectedValue.data.titulo),
      tipo: 'preferencia',
      paraProduccion: true,
      cantidad: 1
    };

    const index = this.productPreference.findIndex(p => p.titulo === preference.titulo);
    if (index !== -1) {
      this.productPreference[index] = preference;
    } else {
      this.productPreference.push(preference);
    }


  }




  isValidFile(file: File): boolean {
    const allowedExtensions = ["png", "jpg", "webp", "jpeg"];
    const fileName = file.name;
    const fileExtension = fileName.split(".").pop().toLowerCase();

    return (
      allowedExtensions.filter((extison) => extison == fileExtension).length > 0
    );
  }
  getVariablesControls() {
    return (this.formulario.get('variables') as FormArray).controls;
  }
  getTotalPrecioTotalConIva(): number {
    return this.productPreference.reduce((total, preference) => total + preference.precioTotalConIva, 0);
  }

  getTotalValorIva(): number {
    return this.productPreference.reduce((total, preference) => total + preference.valorIva, 0);
  }

  getTotalValorUnitarioSinIva(): number {
    return this.productPreference.reduce((total, preference) => total + preference.valorUnitarioSinIva, 0);
  }

  getBigTotalProductWithPreferenceAndAdictions() {
    return this.precioproducto + this.getTotalPrecioTotalConIva();
  }

  addOpcionesPersonalizacion() {
    const ocasionx = this.ocasiones.find(x => x.id == this.datosEntrega.value.ocasion)
    const generosx = this.generos.find(x => x.id == this.datosEntrega.value.genero)
    const observacionesx = this.datosEntrega.value.observaciones

    //generar texto con ocasion y genero
    if (ocasionx == null) {
      var texto = (generosx != undefined ? " <strong>Genero:</strong> " + generosx?.name : "") + "<br/>" + (observacionesx != undefined ? " <strong>Observaciones:</strong> " + observacionesx : "")
    } else if (generosx == null) {
      var texto = "<strong>Ocasión:</strong> " + ocasionx?.name + "<br/>" + "<br/>" + (observacionesx != undefined ? " <strong>Observaciones:</strong> " + observacionesx : "")
    } else if (observacionesx == null) {
      var texto = "<strong>Ocasión:</strong> " + ocasionx?.name + "<br/>" + (generosx != undefined ? " <strong>Genero:</strong> " + generosx?.name : "") + "<br/>"
    } else {
      var texto = "<strong>Ocasión:</strong> " + ocasionx?.name + "<br/>" + (generosx != undefined ? " <strong>Genero:</strong> " + generosx?.name : "") + "<br/>" + (observacionesx != undefined ? " <strong>Observaciones:</strong> " + observacionesx : "")
    }


    const preference = {
      titulo: "Opciones de personalizacion ",
      subtitulo: texto,
      valorUnitarioSinIva: 0,
      valorIva: 0,
      porcentajeIva: 0,
      precioTotalConIva: 0,
      imagen: "",
      tipo: 'opcionPersonalizacion',
      paraProduccion: true,
      cantidad: 1
    };

    let index = this.productPreference.findIndex(p => p.titulo === preference.titulo);
    if (index == undefined || index == null || index == -1) {
      if (index !== -1) {
        this.productPreference.splice(index, 1);
        return;
      }
      this.productPreference.push(preference);
    } else {
      this.productPreference[index] = preference
    }


  }


  addAdicionToProduct(adicion: any) {
    this.baseValorUnitarioSinIva = adicion.precioUnitario || 0
    this.basePrecioTotalConIva = adicion.precioTotal || 0
    this.baseValorIva = adicion.precioIva || 0
    adicion['seleccionado'] = !adicion['seleccionado'];
    const preference = {
      titulo: adicion.titulo,
      subtitulo: adicion.titulo,
      valorUnitarioSinIva: adicion.precioUnitario || 0,
      valorIva: adicion.precioIva || 0,
      porcentajeIva: adicion.porcentajeIVA || 0,
      precioTotalConIva: adicion.precioTotal || 0,
      imagen: adicion.imagenPrincipal[0]?.urls,
      tipo: 'adicion',
      cantidad: 1,
      paraProduccion: true,
      referencia: adicion
    };

    const index = this.productPreference.findIndex(p => p.titulo === adicion.titulo);
    if (index !== -1) {
      this.productPreference.splice(index, 1);
      return;
    }
    this.productPreference.push(preference);
    this.sumar()
  }

  incrementarCantidad(item: any): void {

    item.cantidad = (item.cantidad || 0) + 1;
    item.valorUnitarioSinIva = item.referencia.precioUnitario * (item.cantidad || 0);
    item.valorIva = item.referencia.precioIva * (item.cantidad || 0);
    item.precioTotalConIva = item.referencia.precioTotal * (item.cantidad || 0);
    this.sumar()
  }

  decrementarCantidad(item: any): void {

    if (item.cantidad > 0) {
      item.cantidad = (item.cantidad || 0) - 1;
      item.valorUnitarioSinIva = item.referencia.precioUnitario * (item.cantidad || 0);
      item.valorIva = item.referencia.precioIva * (item.cantidad || 0);
      item.precioTotalConIva = item.referencia.precioTotal * (item.cantidad || 0);
    } else {
      this.productPreference.splice(this.productPreference.indexOf(this.productPreference.find(x => x.titulo == item.titulo)), 1)
    }
    this.sumar()
  }
  hasAdicion(): boolean {
    return this.productPreference.some(preference => preference.tipo === 'adicion');
  }
  hasOpcionesPersonalizacion(): boolean {

    return this.productPreference.some(preference => preference.tipo === 'opcionPersonalizacion');
  }

  hasPreferencia(): boolean {
    // console.log(this.productPreference)
    return this.productPreference.some(preference => preference.tipo === 'preferencia');
  }

  get tarjetas() {
    if (!this.isOnlyOneTarjeta) {
      return this.tarjetasForm.get('tarjetas') as FormArray;
    } else {
      if ((this.tarjetasForm.get('tarjetas') as FormArray).length == 1) {
        return this.tarjetasForm.get('tarjetas') as FormArray;
      } else {
        this.tarjetasForm = this.fb.group({
          tarjetas: this.fb.array([]),
        });
        const tarjeta = this.fb.group({
          para: [''],
          mensaje: [''],
          de: [''],
        });
        const tarjetas = this.tarjetasForm.get('tarjetas') as FormArray;
        tarjetas.push(tarjeta);
        this.cantidadTarjetas = 1;
        return this.tarjetasForm.get('tarjetas') as FormArray;
      }
    }
  }

  addTarjeta() {

    const tarjeta = this.fb.group({
      para: [''],
      mensaje: [''],
      de: [''],
    });

    this.tarjetas.push(tarjeta);
  }

  removeTarjetaForm(index: number) {
    if (this.cantidadTarjetas > 1) {
      this.tarjetas.removeAt(index);
      this.cantidadTarjetas--;
    }
  }

  enterStep($event: MovingDirection, index: number) {

    if (index == 2) {
      document.getElementById("cantidad").setAttribute("value", this.cantidad.toString());
    }
    console.log($event);
    this.sumar()
  }
  sumar1(): number {
    this.checkPriceScale()
    const resultado = this.cantidadControl?.nativeElement?.value
    if (resultado == null || resultado == undefined || resultado == "") {
      return 0; // Devuelve 0 si el resultado es nulo o indefinido
    } else {
      return resultado
    }

  }

  checkPriceScale() {
    if (this.producto.precio.preciosVolumen.length > 0) {
      const cantidad = parseInt(this.cantidadControl?.nativeElement?.value);
      const precioVolumen = this.producto.precio.preciosVolumen.find(x => cantidad >= x.numeroUnidadesInicial && cantidad <= x.numeroUnidadesLimite);
      this.precioproducto = precioVolumen ? precioVolumen.valorUnitarioPorVolumenConIVA : this.producto.precio.precioUnitarioConIva;
    } else {
      this.precioproducto = this.producto.precio.precioUnitarioConIva;
    }
    return this.precioproducto;
  }

  getMultiplicador() {

    const resultadoSumar1 = this.sumar1();
    if (resultadoSumar1 !== undefined && resultadoSumar1 !== null && resultadoSumar1 !== 0) {
      return resultadoSumar1;
    } else {
      return this.producto?.disponibilidad?.cantidadMinVenta;
    }
  }
  sumar() {
    let quantity = this.cantidadControl?.nativeElement?.value
    if (quantity == undefined) {
      quantity = 1
    }

    this.sumaTotalProducto = this.producto?.precio?.precioUnitarioConIva * quantity
    this.sumaTotalAdiciones = (this.getBigTotalProductWithPreferenceAndAdictions() - this.producto?.precio?.precioUnitarioConIva) * quantity

    this.sumaTotal = (this.getBigTotalProductWithPreferenceAndAdictions()) * quantity

  }

  katuqIntelligeceResponse(event: any) {
    console.log(event)
    const tarjeta = event.objectToText as FormGroup;
    const mensaje = tarjeta.get('mensaje') as FormControl;
    mensaje.setValue(event.respuesta.message);
  }

  getKatuqPrompt() {
    const descripcion = this.producto?.crearProducto?.descripcion;

    return `haz un mesaje bonito para una tarjeta referente a la descripcion de este producto ${descripcion}`;
  }


}
