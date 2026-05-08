import {
  AfterContentChecked,
  AfterContentInit,
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
  ElementRef,
  Renderer2,
  ChangeDetectorRef,
} from "@angular/core";
import { NgbModal, ModalDismissReasons } from "@ng-bootstrap/ng-bootstrap";
import {
  Producto,
  ProductoCarrito,
} from "../../../../shared/models/productos/Producto";
import { AngularFireStorage } from "@angular/fire/compat/storage";
import { CarouselLibConfig, Image } from "@ks89/angular-modal-gallery";
import { MaestroService } from "../../../../shared/services/maestros/maestro.service";
import {
  AbstractControl,
  Form,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import Swal from "sweetalert2";
import { finalize, Subscription, timer, Subject } from "rxjs";
import { CartSingletonService } from "../../../../shared/services/ventas/cart.singleton.service";
import { Carrito } from "../../modelo/pedido";
import { MovingDirection } from "angular-archwizard";
import { PedidosUtilService } from "../../service/pedidos.util.service";
import { parse } from "flatted";
import { ToastrService } from "ngx-toastr";
import { NotificationService } from "../../../../shared/services/notification.service";
import { takeUntil, switchMap, tap, catchError, take } from "rxjs/operators";
import { CustomFieldsService, CustomFieldGroup, CustomFieldConfig } from "../../../../shared/services/custom-fields.service";
@Component({
  selector: "app-conf-product-to-cart",
  templateUrl: "./conf-product-to-cart.component.html",
  styleUrls: ["./conf-product-to-cart.component.scss"],
})
export class ConfProductToCartComponent
  implements
  OnInit,
  AfterContentChecked,
  AfterContentInit,
  AfterViewInit,
  OnDestroy {
  active = 1;
  private subs: Subscription[] = [];
  private destroy$ = new Subject<void>();
  productPreference: any = [];
  temp: any[];
  adicionesrows: any[];
  productoConfiguradoForm: FormGroup;
  datosEntrega: FormGroup;
  tarjetasForm: FormGroup<{ tarjetas: FormArray<FormControl<unknown>> }>;
  ratingForm: FormGroup<{ rating: FormControl<any> }>;
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
  public activeAccordionPanel: string = "datosEntregaPanel,preferenciasPanel,tarjetasPanel,adicionesPanel,cantidadPanel";

  // Propiedades para controlar el colapso de textos
  public mostrarDescripcionCompleta: boolean = false;
  public mostrarDetallesCompletos: boolean = false;
  public mostrarPersonalizacionCompleta: boolean = false;
  public tarjetaMostrada: boolean[] = [];

  // Propiedades para controlar el carrito flotante
  public isCartMinimized: boolean = false;
  public isCartExpanded: boolean = false;

  // Propiedades para controlar el estado de características del producto
  public mostrarCaracteristicas: boolean = false;
  public caracteristicasRevisadas: boolean = false;
  public garantiasRevisadas: boolean = false;
  public condicionesRevisadas: boolean = false;

  // Propiedades para validar datos maestros
  public datosMaestrosCargados: boolean = false;
  public errorCargaDatosMaestros: boolean = false;
  public maestrosCargando: boolean = false;
  public maestrosState: any = null;
  public reintentosCarga: number = 0;
  public maxReintentos: number = 3;
  public isConfigLoading: boolean = false;

  // Propiedades computadas para verificar las propiedades no definidas en la interfaz
  /**
   * Indica si este producto requiere que el usuario seleccione un género.
   * A partir de ahora únicamente nos basamos en la bandera `aceptaGenero` y
   * no en la presencia del arreglo `genero`, para evitar exigir el campo
   * cuando el negocio solo usa la lista como filtro pero no como dato
   * obligatorio.
   */
  get hasAceptaGenero(): boolean {
    return !!this.producto?.procesoComercial?.aceptaGenero;
  }

  /**
   * Indica si este producto requiere que el usuario seleccione una ocasión.
   * Solo depende de la bandera `aceptaOcasion`.
   */
  get hasAceptaOcasion(): boolean {
    return !!this.producto?.procesoComercial?.aceptaOcasion;
  }

  ngOnDestroy(): void {
    // Guardar estados en localStorage
    localStorage.setItem(
      "caracteristicasRevisadas",
      this.caracteristicasRevisadas.toString(),
    );
    localStorage.setItem(
      "garantiasRevisadas",
      this.garantiasRevisadas.toString(),
    );
    localStorage.setItem(
      "condicionesRevisadas",
      this.condicionesRevisadas.toString(),
    );
    localStorage.setItem(
      "mostrarCaracteristicas",
      this.mostrarCaracteristicas.toString(),
    );

    // Completar el Subject para cancelar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();

    this.subs.forEach((sub) => sub.unsubscribe());
  }

  @ViewChild("quickView", { static: false }) QuickView: TemplateRef<any>;
  @ViewChild("cantidad") cantidadControl: ElementRef;
  public closeResult: string;
  public modalOpen: boolean = false;

  public cantidadTarjetas: any = 1;
  @Input() public producto: Producto;
  @Input() public configuracionCarrito: Carrito;
  @Input() isEdit: boolean = false;
  @Input() public modalRef: any; // Referencia al modal para cerrarlo selectivamente

  public cantidad: number = 1;
  public tipoEntrega: any[];
  public ocasiones: any[] = [
    { value: "Elegir Ocasion", label: "Elegir Ocasion" },
  ];
  formasEntrega: any;
  formulario: FormGroup;
  tarjetaForm: FormGroup;
  activeids = [];

  public destinatario: any[] = [
    { value: "Para Quien Es", label: "Para Quien Es" },
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

  // Campos personalizados por empresa
  gruposCamposCustom: CustomFieldGroup[] = [];
  customFieldsForms: { [grupoId: string]: FormGroup } = {};

  constructor(
    private storage: AngularFireStorage,
    private toastrService: ToastrService,
    private modalService: NgbModal,
    private carsingleton: CartSingletonService,
    private maestroService: MaestroService,
    private fb: FormBuilder,
    private pedidoUtilService: PedidosUtilService,
    private notificacionService: NotificationService,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef,
    private customFieldsService: CustomFieldsService,
  ) {
    this.libConfigCarouselFixed = {
      carouselPreviewsConfig: {
        visible: true,
        number: 6,
        width: "auto",
        maxHeight: "100px",
      },
      carouselConfig: {
        maxWidth: "70%",
        maxHeight: "70%",
        showArrows: true,
        objectFit: "cover",
        keyboardEnable: true,
        modalGalleryEnable: true,
      },
    };
    this.productoConfiguradoForm = this.fb.group({
      producto: [
        /* producto inicial */
      ],
      datosEntrega: [],
      cantidad: [1],
      preferencias: [[]],
      adiciones: [[]],
      tarjetas: [[]],
    });
    this.ratingForm = this.fb.group({
      rating: [null],
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
      observaciones: [null, Validators.required],
    });

    this.imagesRect = [
      new Image(
        1,
        { img: "assets/images/other-images/sinimagen.webp" },
        { img: "assets/images/other-images/sinimagen.webp" },
      ),
    ];
    this.initForm();
    // this.getAdiciones();
  }

  ngAfterContentInit(): void { }

  /**
   * 🔄 Inicializa el monitoreo del estado de maestros
   */
  private initializeMaestrosStateMonitoring(): void {
    this.pedidoUtilService
      .getMaestrosState()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (state) => {
          this.maestrosState = state;
          this.maestrosCargando = state.loading;
          this.datosMaestrosCargados = state.loaded && !state.error;
          this.errorCargaDatosMaestros = state.error;

          // 📊 Log de estado para debugging
          console.log("🎯 Estado maestros actualizado:", {
            loading: state.loading,
            loaded: state.loaded,
            error: state.error,
            lastUpdate: state.lastUpdate,
          });
        },
        error: (error) => {
          console.error("❌ Error monitoreando estado maestros:", error);
        },
      });
  }

  inicializacionConfigurarProducto(producto: Producto) {
    // 🚀 Usar la nueva lógica mejorada del servicio
    if (
      this.generos == undefined ||
      this.ocasiones == undefined ||
      this.tipoEntrega == undefined
    ) {
      // Evitar suscripciones múltiples
      if (this.maestrosCargando) {
        console.log('⏳ Ya se están cargando los maestros, esperando...');
        return;
      }

      this.maestrosCargando = true;
      this.reintentosCarga++;

      console.log(
        `🔄 Cargando maestros (intento ${this.reintentosCarga}/${this.maxReintentos})`,
      );

      this.pedidoUtilService
        .getAllMaestro$()
        .pipe(
          tap(() => console.log("📦 Datos maestros recibidos")),
          catchError((error) => {
            console.error("❌ Error en getAllMaestro$:", error);
            this.handleMaestrosError(error, producto);
            throw error;
          }),
          takeUntil(this.destroy$),
          take(1) // Asegurar que solo se ejecute una vez
        )
        .subscribe({
          next: (r: any) => {
            this.maestrosCargando = false;

            if (
              this.tipoEntrega == undefined &&
              this.tiemposEntrega == undefined &&
              this.generos == undefined &&
              this.formasEntrega == undefined
            ) {
              // ✅ Validar que los datos maestros estén completos
              if (!this.validarDatosMaestros(r)) {
                this.errorCargaDatosMaestros = true;
                this.datosMaestrosCargados = false;
                this.mostrarErrorDatosMaestros(r);
                return;
              }

              if (
                r.tipoEntrega &&
                r.tiempoEntrega &&
                r.generos &&
                r.ocasiones &&
                r.formaEntrega
              ) {
                this.procesarDatosMaestros(r, producto);

                // 🎉 Éxito en la carga
                this.datosMaestrosCargados = true;
                this.errorCargaDatosMaestros = false;
                this.reintentosCarga = 0; // Reset contador

                console.log('✅ Datos maestros procesados exitosamente');
                
                // Solo mostrar toast si no estamos en modo edición
                if (!this.isEdit) {
                  this.toastrService.success(
                    "Configuración del producto cargada correctamente",
                    "Éxito",
                    {
                      timeOut: 3000,
                      progressBar: true,
                      positionClass: "toast-top-right",
                    },
                  );
                }
              }
            }
          },
          error: (error) => {
            this.maestrosCargando = false;
            this.handleMaestrosError(error, producto);
          },
        });
    } else {
      console.log('✅ Datos maestros ya están cargados');
    }
  }

  /**
   * 🔧 Procesa los datos maestros recibidos
   */
  private procesarDatosMaestros(r: any, producto: Producto): void {
    try {
      this.tipoEntrega = r.tipoEntrega;
      this.tiemposEntrega = r.tiempoEntrega;
      this.generos = producto.procesoComercial?.genero
        ? r.generos?.filter((p: { id: number }) =>
          producto.procesoComercial!.genero.find((g: number) => g == p.id),
        )
        : [];
      this.ocasiones = producto.procesoComercial?.ocasion
        ? r.ocasiones?.filter((p: { id: string }) =>
          producto.procesoComercial!.ocasion.find((g: string) => g == p.id),
        )
        : [];
      this.formasEntrega = r.formaEntrega;
      this.adicionesPreferencias = r.adiciones.filter((p) => p.esPreferencia);
      this.adicionesrows = (r.adiciones as any[])
        .filter((p) => p.esAdicion)
        .sort((a, b) => {
          const nameA = parseInt(a.posicion);
          const nameB = parseInt(b.posicion);
          if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }
          return 0;
        });

      console.log("🔧 Debug adiciones:", {
        totalAdiciones: r.adiciones?.length || 0,
        adicionesFiltradasPorEsAdicion: this.adicionesrows?.length || 0,
        primeraAdicion: this.adicionesrows?.[0],
        aceptaAdiciones: this.producto?.procesoComercial?.aceptaAdiciones
      });

      this.rowsinicialesSinMod = JSON.stringify(this.adicionesrows);

      this.loadFormasEntregaConfiguracionProducto();
      this.variables = producto.procesoComercial?.variablesForm
        ? parse(producto.procesoComercial.variablesForm)
        : null;
      this.configurarProducto(producto);

      // 🔧 Ajustar validadores dinámicamente según necesidad
      if (!this.hasAceptaGenero) {
        this.datosEntrega.get("genero")?.clearValidators();
        this.datosEntrega.get("genero")?.updateValueAndValidity();
      }

      if (!this.hasAceptaOcasion) {
        this.datosEntrega.get("ocasion")?.clearValidators();
        this.datosEntrega.get("ocasion")?.updateValueAndValidity();
      }

      // 🗓️ Asignar datos de entrega por defecto si el producto NO lleva calendario
      this.asignarDatosEntregaPorDefecto();

      console.log("✅ Datos maestros procesados exitosamente");
    } catch (error) {
      console.error("❌ Error procesando datos maestros:", error);
      throw error;
    }
  }

  /**
   * 🛡️ Maneja errores en la carga de maestros con lógica de reintento
   */
  private handleMaestrosError(error: any, producto: Producto): void {
    console.error("❌ Error al cargar datos maestros:", error);
    this.errorCargaDatosMaestros = true;
    this.datosMaestrosCargados = false;

    if (this.reintentosCarga < this.maxReintentos) {
      // 🔄 Reintentar automáticamente
      this.toastrService.warning(
        `Error al cargar configuración. Reintentando... (${this.reintentosCarga}/${this.maxReintentos})`,
        "Reintentando",
        {
          timeOut: 3000,
          progressBar: true,
          positionClass: "toast-top-right",
        },
      );

      // Reintentar después de un breve delay
      timer(2000).subscribe(() => {
        this.inicializacionConfigurarProducto(producto);
      });
    } else {
      // 💥 Máximo de reintentos alcanzado
      this.toastrService.error(
        "No se pudo cargar la configuración del producto después de varios intentos. Por favor, recargue la página.",
        "Error Crítico",
        {
          timeOut: 8000,
          progressBar: true,
          positionClass: "toast-top-right",
          closeButton: true,
        },
      );
    }
  }

  ngAfterContentChecked(): void { }
  refreshCartWithProducts(): void {
    // this.carsingleton.setProductInCart();
    const context = this;
    this.carsingleton.refreshCart().subscribe({
      next: (data) => {
        console.log("carrito:", data);
        context.productos = data;
        context.productos = [...context.productos];
      },
    });
  }
  masCantidad() {
    // Validar disponibilidad de stock antes de incrementar
    if (this.producto?.disponibilidad?.inventariable) {
      const stockDisponible =
        this.producto.disponibilidad.cantidadDisponible || 0;

      if (stockDisponible === 0) {
        this.toastrService.error(
          "No hay unidades disponibles para este producto",
          "Sin Stock",
          {
            timeOut: 4000,
            progressBar: true,
            positionClass: "toast-top-right",
          },
        );
        return;
      }

      if (this.cantidad >= stockDisponible) {
        this.toastrService.warning(
          `Solo hay ${stockDisponible} unidades disponibles`,
          "Stock Limitado",
          {
            timeOut: 4000,
            progressBar: true,
            positionClass: "toast-top-right",
          },
        );
        return;
      }
    }

    this.cantidad++;
    this.actualizarTodosLosInputsCantidad();

    if (
      this.producto?.precio?.preciosVolumen &&
      this.producto.precio.preciosVolumen.length > 0
    ) {
      let rangoActual = this.producto.precio.preciosVolumen.find(
        (x) =>
          this.cantidad >= x.numeroUnidadesInicial &&
          this.cantidad <= x.numeroUnidadesLimite,
      );
      let precioFormateado;
      if (rangoActual == undefined) {
        precioFormateado =
          this.producto?.precio?.precioUnitarioConIva?.toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 2,
          }) || "0";
      } else {
        precioFormateado =
          rangoActual.valorUnitarioPorVolumenConIVA.toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 2,
          });
      }
      if (rangoActual && this.rangoPreciosActual !== rangoActual) {
        this.toastrService.show(
          '<p class="mb-0 mt-1">El nuevo precio por unidad de su producto es: ' +
          precioFormateado +
          "</p>",
          "",
          {
            closeButton: true,
            enableHtml: true,
            positionClass: "toast-top-right",
            timeOut: 2000,
          },
        );

        // Actualizar el rango de precios actual
        this.rangoPreciosActual = rangoActual;
      }
    }
  }

  menosCantidad() {
    if (
      this.cantidad > (this.producto?.disponibilidad?.cantidadMinVenta || 1)
    ) {
      this.cantidad--;
      if (this.cantidadTarjetas > this.cantidad) {
        this.tarjetaForm.removeControl(`tarjeta${this.cantidad}`);
        this.cantidadTarjetas = this.cantidad;
      }

      this.actualizarTodosLosInputsCantidad();

      if (
        this.producto?.precio?.preciosVolumen &&
        this.producto.precio.preciosVolumen.length > 0
      ) {
        let rangoActual = this.producto.precio.preciosVolumen.find(
          (x) =>
            this.cantidad >= x.numeroUnidadesInicial &&
            this.cantidad <= x.numeroUnidadesLimite,
        );
        let precioFormateado;
        if (rangoActual == undefined) {
          precioFormateado =
            this.producto?.precio?.precioUnitarioConIva?.toLocaleString(
              "es-CO",
              {
                style: "currency",
                currency: "COP",
                minimumFractionDigits: 2,
              },
            );
        } else {
          precioFormateado =
            rangoActual.valorUnitarioPorVolumenConIVA.toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 2,
            });
        }

        if (rangoActual && this.rangoPreciosActual !== rangoActual) {
          this.toastrService.show(
            '<p class="mb-0 mt-1">El nuevo precio por unidad de su producto es: ' +
            precioFormateado +
            "</p>",
            "",
            {
              closeButton: true,
              enableHtml: true,
              positionClass: "toast-top-right",
              timeOut: 2000,
            },
          );

          // Actualizar el rango de precios actual
          this.rangoPreciosActual = rangoActual;
        }
      }
    }
  }

  ngOnInit(): void {
    this.refreshCartWithProducts();
    this.loadCustomFields();
    console.log(this.productos);

    // 🔄 Suscribirse al estado de los maestros para monitoreo en tiempo real
    this.initializeMaestrosStateMonitoring();

    // -------------------------------------------------------
    // HEREDAR DATOS DE ENTREGA DEL PRIMER PRODUCTO DEL PEDIDO
    // -------------------------------------------------------
    if (this.isRebuy && !this.isEdit) {
      const pedidoBase: any = this.pedidoUtilService?.pedido;

      if (pedidoBase?.carrito?.length > 0) {
        const datosEntregaBase =
          pedidoBase.carrito[0]?.configuracion?.datosEntrega;

        if (datosEntregaBase) {
          // Convertir y parchear sólo los campos que existan en el formulario
          const patch: any = {};

          if (datosEntregaBase.tipoEntrega !== undefined) {
            patch.tipoEntrega = datosEntregaBase.tipoEntrega;
          }
          if (datosEntregaBase.formaEntrega !== undefined) {
            patch.formaEntrega = datosEntregaBase.formaEntrega;
          }
          if (datosEntregaBase.fechaEntrega !== undefined) {
            patch.fechaEntrega = datosEntregaBase.fechaEntrega; // Se asume formato {year, month, day}
          }
          if (datosEntregaBase.horarioEntrega !== undefined) {
            patch.horarioEntrega = datosEntregaBase.horarioEntrega;
          }
          if (datosEntregaBase.genero !== undefined) {
            patch.genero = datosEntregaBase.genero;
          }
          if (datosEntregaBase.ocasion !== undefined) {
            patch.ocasion = datosEntregaBase.ocasion;
          }
          if (datosEntregaBase.colores !== undefined) {
            patch.colores = datosEntregaBase.colores;
          }
          if (datosEntregaBase.observaciones !== undefined) {
            patch.observaciones = datosEntregaBase.observaciones;
          }

          this.datosEntrega.patchValue(patch);
        }
      }
    }

    // this.initForm();
    // this.getAdiciones();
    this.datosEntrega.get("fechaEntrega")?.valueChanges.subscribe((valor) => {
      if (!valor) return;
      const fechaEntregatoDateformat = new Date(
        valor.year,
        valor.month - 1,
        valor.day,
      );
      const fechaActual = new Date();
      // Calcular la diferencia en milisegundos
      const diferenciaMilisegundos =
        fechaEntregatoDateformat.getTime() - fechaActual.getTime();
      // Convertir la diferencia en días
      const diferenciaDias = Math.ceil(
        diferenciaMilisegundos / (1000 * 60 * 60 * 24),
      );

      if (this.rowsinicialesSinMod !== undefined) {
        this.rowsiniciales = JSON.stringify(
          JSON.parse(this.rowsinicialesSinMod).filter(
            (x) => parseInt(x.tiempoEntrega) <= diferenciaDias,
          ),
        );
        // console.log(JSON.parse(this.rowsiniciales));
      }
    });

    // Log de datos recibidos para debugging
    console.log('🔍 Datos recibidos en ngOnInit:', {
      isEdit: this.isEdit,
      producto: this.producto?.crearProducto?.titulo,
      configuracionCarrito: !!this.configuracionCarrito,
      preferenciasEnConfiguracion: this.configuracionCarrito?.configuracion?.preferencias?.length || 0
    });

    // Manejo específico para modo edición
    if (this.isEdit && this.configuracionCarrito) {
      console.log('🔄 Iniciando modo edición...');
      // Inicializar formularios antes de llenar datos
      this.initializeFormsIfNeeded();
      this.llenarCamposEdicion();
    } else if (this.producto) {
      console.log('🔄 Iniciando modo creación...');
      this.addTarjeta();
      this.inicializacionConfigurarProducto(this.producto);
    }
    if (this.productos.length > 0) {
      this.datosEntrega.patchValue({
        tipoEntrega: this.productos[0].configuracion.datosEntrega.tipoEntrega,
        formaEntrega: this.productos[0].configuracion.datosEntrega.formaEntrega,
        fechaEntrega: this.productos[0].configuracion.datosEntrega.fechaEntrega,
        horarioEntrega:
          this.productos[0].configuracion.datosEntrega.horarioEntrega,
      });
    }

    this.sumar();
    this.activeAccordionPanel = this.determineInitialOpenSection();

    // Inicializar arreglo para controlar visibilidad de tarjetas
    if (this.tarjetas && this.tarjetas.value) {
      this.tarjetaMostrada = new Array(this.tarjetas.value.length).fill(false);
    }

    // Inicializar valores de revisión de características desde localStorage si existen
    this.caracteristicasRevisadas =
      localStorage.getItem("caracteristicasRevisadas") === "true";
    this.garantiasRevisadas =
      localStorage.getItem("garantiasRevisadas") === "true";
    this.condicionesRevisadas =
      localStorage.getItem("condicionesRevisadas") === "true";
    this.mostrarCaracteristicas =
      localStorage.getItem("mostrarCaracteristicas") === "true";

    this.sumar();

    // Asegúrate de que activeAccordionPanel tiene un valor válido
    setTimeout(() => {
      this.activeAccordionPanel = this.determineInitialOpenSection();
    });

    // Inicializar arreglo para controlar visibilidad de tarjetas
    if (this.tarjetas && this.tarjetas.value) {
      this.tarjetaMostrada = new Array(this.tarjetas.value.length).fill(false);
    }
  }

  /**
   * Actualiza el valor del input de cantidad de manera consistente
   * usando múltiples métodos para asegurar que se muestre correctamente
   */
  private updateCantidadInputValue(): void {
    // Asegurarse de que cantidad sea un número
    const cantidadNumero = Number(this.cantidad);
    const cantidadTexto = cantidadNumero.toString();

    // 1. Usar ElementRef si está disponible - acceso directo al DOM
    if (this.cantidadControl && this.cantidadControl.nativeElement) {
      this.cantidadControl.nativeElement.value = cantidadTexto;
    }
  }

  /**
   * Establece el valor del input directamente en el DOM
   * Este es un método de respaldo para asegurar que el valor se muestre
   */
  public setInputValueDirectly(): void {
    // Forzar a número para evitar objetos
    const cantidadNumero = Number(this.cantidad);
    const cantidadTexto = cantidadNumero.toString();

    // 1. Método preferido: usar ViewChild/ElementRef
    if (this.cantidadControl && this.cantidadControl.nativeElement) {
      this.renderer.setProperty(
        this.cantidadControl.nativeElement,
        "value",
        cantidadTexto,
      );
    }
  }

  /**
   * Actualiza el valor de todos los inputs con nombre 'cantidad'
   * Se llama en los puntos clave del ciclo de vida del componente
   */
  private actualizarTodosLosInputsCantidad(): void {
    // Esperar brevemente para que el DOM se actualice
    setTimeout(() => {
      try {
        // Si tenemos acceso a través de ViewChild, usarlo primero
        if (this.cantidadControl && this.cantidadControl.nativeElement) {
          this.renderer.setProperty(
            this.cantidadControl.nativeElement,
            "value",
            this.cantidad.toString(),
          );
        }
      } catch (error) {
        // Ignorar errores silenciosamente
      }
    });
  }

  ngAfterViewInit() {
    this.actualizarTodosLosInputsCantidad();
  }

  ngAfterViewChecked() {
    // Este método se llama después de cada ciclo de detección de cambios
    // Es un buen lugar para asegurarnos de que el valor del input esté actualizado
    this.actualizarTodosLosInputsCantidad();
  }

  // Eliminar el método menosCantidad1 que está duplicado y quedarse solo con menosCantidad
  // Añadir un método para determinar la sección activa inicialmente basada en campos requeridos

  /**
   * Determina qué sección del acordeón debe estar abierta inicialmente
   * Ahora retorna todos los paneles para que estén expandidos
   */
  determineInitialOpenSection(): string {
    const panels = ["datosEntregaPanel"];
    
    if (this.producto?.procesoComercial?.aceptaVariable) {
      panels.push("preferenciasPanel");
    }
    if (this.producto?.procesoComercial?.llevaTarjeta) {
      panels.push("tarjetasPanel");
    }
    if (this.producto?.procesoComercial?.aceptaAdiciones) {
      panels.push("adicionesPanel");
    }
    panels.push("cantidadPanel");
    
    return panels.join(",");
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

      this.rowsinicialesSinMod = JSON.stringify(this.adicionesrows);
      // this.cargando = false;
    });
  }

  initForm() {
    this.formulario = this.fb.group({
      variables: this.fb.array([]),
    });

    this.tarjetaForm = this.fb.group({
      para: [""],
      mensaje: [""],
      de: [""],
    });
  }

  private crearItem(objeto: any): FormGroup {
    const grupo = this.fb.group({
      data: this.fb.group({
        imagen: [objeto.data?.imagen || ""],
        porcentajeIva: [objeto.data?.porcentajeIva || ""],
        precioTotalConIva: [objeto.data?.precioTotalConIva || ""],
        subtitulo: [objeto.data?.subtitulo || ""],
        tipoImagen: [objeto.data?.tipoImagen || ""],
        titulo: [objeto.data?.titulo || ""],
        valorIva: [objeto.data?.valorIva || ""],
        valorUnitarioSinIva: [objeto.data?.valorUnitarioSinIva || ""],
      }),
      parent: [objeto.parent || null],
      children: this.fb.array([]),
      childrenSelected: [-1],
      imagenIngresado: [""],
      textoIngresado: [""],
      archivoIngresado: [""],
    });
    // Aplicar validaciones basadas en tipoImagen u otras condiciones
    this.aplicarValidacionesDinamicas(grupo, objeto);
    const childrenArray = grupo.get("children") as FormArray;
    objeto.children?.forEach((childObjeto) => {
      childrenArray.push(this.crearItem(childObjeto));
    });

    return grupo;
  }
  private aplicarValidacionesDinamicas(grupo: FormGroup, objeto: any) {
    const tipoImagen = objeto.data?.tipoImagen || "";
    switch (tipoImagen) {
      case "texto":
        grupo.get("textoIngresado")?.setValidators([Validators.required]);
        grupo.get("imagenIngresado")?.clearValidators();
        grupo.get("archivoIngresado")?.clearValidators();
        break;
      case "imagen":
        grupo.get("textoIngresado")?.clearValidators();
        grupo.get("imagenIngresado")?.setValidators([Validators.required]);
        grupo.get("archivoIngresado")?.clearValidators();
        break;
      case "archivo":
        grupo.get("textoIngresado")?.clearValidators();
        grupo.get("imagenIngresado")?.clearValidators();
        grupo.get("archivoIngresado")?.setValidators([Validators.required]);
        break;
      // Aplica otros casos según sea necesario
    }

    // Asegúrate de actualizar la validez de los controles después de cambiar las validaciones
    grupo.get("textoIngresado")?.updateValueAndValidity();
    grupo.get("imagenIngresado")?.updateValueAndValidity();
    grupo.get("archivoIngresado")?.updateValueAndValidity();
  }

  get variablesControls() {
    return (this.formulario.get("variables") as FormArray).controls;
  }

  getOptionsForNgSelect(item: any) {
    const opt = (item.get("children") as FormArray).controls.map(
      (x: any) => x.value,
    );
    if (!opt) return [];
    // buscar en la lista de adiciones la que tenga el mismo titulo que el item
    // const adiciones = this.adicionesrows.filter(x => item.children.fil  x.titulo == item.data.titulo);
    console.log(opt);
    return opt.map((x) => {
      return { label: x.data.titulo, value: x.data.titulo };
    });
  }

  /**
   * Devuelve el control hijo actualmente seleccionado (para preseleccionar en ng-select)
   */
  getSelectedChildControl(item: FormGroup): any | null {
    try {
      const children = item.get('children') as FormArray;
      if (!children || children.length === 0) return null;
      const selectedIdx = item.get('childrenSelected')?.value;
      if (typeof selectedIdx === 'number' && selectedIdx >= 0 && selectedIdx < children.length) {
        return children.at(selectedIdx);
      }
      return null;
    } catch {
      return null;
    }
  }

  agregarItem(data: any) {
    const itemsArray = this.formulario.get("variables") as FormArray;
    itemsArray.push(this.crearItem(data));
  }

  configurarProducto(producto: Producto) {
    this.producto = producto;
    this.initForm();
    this.modalOpen = true;
    this.cantidad = producto?.disponibilidad?.cantidadMinVenta || 1;

    // Programar actualización para después de la detección de cambios
    setTimeout(() => {
      this.actualizarTodosLosInputsCantidad();
    });

    if (this.producto && this.producto.crearProducto) {
      // Inicializar array de imágenes principales
      this.imagesRect =
        this.producto.crearProducto.imagenesPrincipales?.map(
          (x, index) => new Image(index, { img: x.urls }, { img: x.urls }),
        ) || [];
      
      // Agregar imágenes secundarias con índices únicos
      if (!this.producto.crearProducto.imagenesSecundarias) {
        this.producto.crearProducto.imagenesSecundarias = [];
      }
      
      const imagenesPrincipalesCount = this.imagesRect.length;
      this.producto.crearProducto.imagenesSecundarias
        ?.map((x, index) => new Image(imagenesPrincipalesCount + index, { img: x.urls }, { img: x.urls }))
        .forEach((image) => {
          this.imagesRect.push(image);
        });

      // Crear nueva referencia del array para detectar cambios
      this.imagesRect = [...this.imagesRect];

      const itemsArray = this.formulario.get("variables") as FormArray;
      if (this.variables) {
        this.variables.forEach((objeto) => {
          itemsArray.push(this.crearItem(objeto));
        });
      }

      const fechaOriginal = new Date();
      const tiempoEntregaStr = this.producto?.disponibilidad?.tiempoEntrega;
      const tiempoEntrega = tiempoEntregaStr ? parseInt(tiempoEntregaStr) : 0;
      const fechaConTiempoEntrega = new Date(
        fechaOriginal.setDate(fechaOriginal.getDate() + tiempoEntrega),
      );

      const fechaConvertida = {
        year: fechaConTiempoEntrega.getFullYear(),
        month: fechaConTiempoEntrega.getMonth() + 1, // Los meses en JavaScript son 0-indexados
        day: fechaConTiempoEntrega.getDate(),
      };

      this.minDate = fechaConvertida;

      if (!this.isEdit) {
        this.loadFormasEntregaConfiguracionProducto();
      }
    }
  }

  async llenarCamposEdicion() {
    console.log('🔄 Iniciando llenarCamposEdicion...');
    this.isConfigLoading = true;
    
    // 1. Verificar que tenemos los datos básicos
    if (!this.configuracionCarrito) {
      console.error('❌ No hay configuración de carrito disponible');
      return;
    }
    const configuracion = this.configuracionCarrito?.configuracion;
    
    // 2. Establecer el producto
    if (this.configuracionCarrito?.producto) {
      this.producto = this.configuracionCarrito.producto;
      console.log('✅ Producto establecido:', this.producto?.crearProducto?.titulo);
    }

    // 3. Inicializar formularios si no están inicializados
    this.initializeFormsIfNeeded();

    // 4. Cargar datos maestros de forma asíncrona
    // Los datos se procesarán en fillDataFromConfiguration después de cargar los maestros
    await this.loadDataWithMaestros(configuracion);
    
    this.isConfigLoading = false;
  }

  /**
   * Inicializa los formularios si no están creados
   */
  private initializeFormsIfNeeded() {
    if (!this.productoConfiguradoForm) {
      console.log('📝 Inicializando productoConfiguradoForm...');
      this.productoConfiguradoForm = this.fb.group({
        // Agregar campos según sea necesario
        variables: this.fb.array([]),
      });
    }

    if (!this.datosEntrega) {
      console.log('📝 Inicializando datosEntrega...');
      this.datosEntrega = this.fb.group({
        tipoEntrega: [''],
        formaEntrega: [''],
        fechaEntrega: [null],
        horarioEntrega: [''],
        genero: [''],
        ocasion: [''],
        colores: [''],
        observaciones: [''],
      });
    }

    if (!this.tarjetasForm) {
      console.log('📝 Inicializando tarjetasForm...');
      this.tarjetasForm = this.fb.group({
        tarjetas: this.fb.array([]),
      });
    }
  }

  /**
  /**
   * Carga los datos con manejo asíncrono de maestros
   */
  private async loadDataWithMaestros(configuracion: any) {
    console.log('🔄 Cargando datos con maestros...');

    // Verificar si los datos maestros ya están cargados
    if (this.areMaestrosFullyLoaded()) {
      console.log('✅ Datos maestros ya cargados, procediendo con llenado...');
      this.fillDataFromConfiguration(configuracion);
      return;
    }

    console.log('⏳ Datos maestros no cargados, iniciando carga...');
    
    // Usar el método existente que ya maneja la suscripción
    this.inicializacionConfigurarProducto(this.producto);
    
    // Esperar a que los datos maestros estén completamente cargados
    const maestrosLoaded = await this.waitForMaestrosToBeFullyLoaded();
    
    if (maestrosLoaded) {
      console.log('✅ Datos maestros cargados completamente, procediendo con llenado...');
      this.fillDataFromConfiguration(configuracion);
    } else {
      console.error('❌ Timeout esperando datos maestros');
      this.toastrService.error(
        'Error cargando configuración del producto. Intente nuevamente.',
        'Error',
        { timeOut: 4000 }
      );
    }
  }

  /**
   * Llena los datos desde la configuración una vez que los maestros están cargados
   */
  private fillDataFromConfiguration(configuracion: any) {
    console.log('🔄 Llenando datos desde configuración...');
    console.log('📊 Configuración recibida:', {
      adiciones: configuracion?.adiciones?.length || 0,
      tarjetas: configuracion?.tarjetas?.length || 0,
      preferencias: configuracion?.preferencias?.length || 0,
      configuracionCompleta: configuracion
    });

    if (!configuracion) {
      console.warn('⚠️ No hay configuración disponible');
      return;
    }

    try {
      // 1. Llenar formulario principal
      if (this.productoConfiguradoForm) {
        this.productoConfiguradoForm.patchValue(configuracion);
        console.log('✅ Formulario principal actualizado');
      }

      // 1.5. Procesar variables del producto (formulario dinámico)
      this.processProductVariables(configuracion);

      // 2. Llenar datos de entrega
      if (this.datosEntrega && configuracion.datosEntrega) {
        this.datosEntrega.patchValue(configuracion.datosEntrega);
        console.log('✅ Datos de entrega actualizados');
      }

      // 3. Establecer preferencias
      if (configuracion.preferencias) {
        console.log('✅ Preferencias encontradas en configuración:', configuracion.preferencias.length, 'preferencias');
        
        // Procesar preferencias existentes inmediatamente
        this.processExistingPreferences(configuracion.preferencias);
      } else {
        console.log('⚠️ No hay preferencias en la configuración');
      }

      // 4. Procesar adiciones
      this.processAdditions(configuracion.adiciones);

      // 5. Procesar tarjetas
      this.processTarjetas(configuracion.tarjetas);

      // 6. Reconstruir árbol de variables desde las preferencias guardadas
      this.reconstruirArbolDesdePedido(configuracion);
      this.addOpcionesPersonalizacion();

      // 7. Establecer cantidad
      this.cantidad = this.configuracionCarrito?.cantidad || 1;
      console.log('✅ Cantidad establecida:', this.cantidad);

      // 8. Actualizar inputs de cantidad
      setTimeout(() => {
        this.actualizarTodosLosInputsCantidad();
      }, 100);

      // 9. Configurar tarjetas (ya se configuraron en processTarjetas)
      // Las propiedades isOnlyOneTarjeta y SinTarjeta ya se establecieron en processTarjetas

      console.log('✅ Llenado de datos completado exitosamente');

    } catch (error) {
      console.error('❌ Error llenando datos:', error);
      this.toastrService.error(
        'Error al cargar la configuración del producto',
        'Error',
        { timeOut: 3000 }
      );
    }
  }

  /**
   * Procesa las adiciones del producto
   */
  private processAdditions(adiciones: any[]) {
    console.log('🔄 Procesando adiciones...', {
      adicionesRecibidas: adiciones?.length || 0,
      adicionesrowsDisponibles: this.adicionesrows?.length || 0,
      adiciones: adiciones,
      adicionesrows: this.adicionesrows
    });

    if (!adiciones || !this.adicionesrows) {
      console.warn('⚠️ No hay adiciones para procesar', {
        adiciones: !!adiciones,
        adicionesrows: !!this.adicionesrows
      });
      return;
    }

    try {
      const adicionesFiltradas = this.adicionesrows.filter(
        (x) => adiciones.find((y: any) => y.titulo === x.titulo || y.titulo === x.descripcion) != null
      );

      console.log('🔍 Adiciones filtradas:', adicionesFiltradas.length, adicionesFiltradas);

      adicionesFiltradas.forEach((adicion: any) => {
        console.log('➕ Agregando adición:', adicion);
        this.addAdicionToProduct(adicion);
      });

      console.log('✅ Adiciones procesadas:', adicionesFiltradas.length);
    } catch (error) {
      console.error('❌ Error procesando adiciones:', error);
    }
  }

  /**
   * Procesa las tarjetas del producto
   */
  private processTarjetas(tarjetas: any[]) {
    console.log('🔄 Procesando tarjetas...', {
      tarjetasRecibidas: tarjetas?.length || 0,
      tarjetas: tarjetas
    });

    if (!tarjetas || !Array.isArray(tarjetas)) {
      console.warn('⚠️ No hay tarjetas para procesar');
      // Si no hay tarjetas, configurar como "Sin Tarjeta"
      this.cantidadTarjetas = 0;
      this.isOnlyOneTarjeta = false;
      this.SinTarjeta = true;
      return;
    }

    try {
      this.cantidadTarjetas = tarjetas.length;
      
      console.log('🔧 Configurando propiedades de tarjetas:', {
        cantidadTarjetas: this.cantidadTarjetas
      });
      
      // Verificar si todas las tarjetas están vacías (para, mensaje, de están vacíos)
      const todasLasTarjetasVacias = tarjetas.every((tarjeta: any) => 
        (!tarjeta.para || tarjeta.para.trim() === '') &&
        (!tarjeta.mensaje || tarjeta.mensaje.trim() === '') &&
        (!tarjeta.de || tarjeta.de.trim() === '')
      );
      
      console.log('🔍 Verificando tarjetas vacías:', {
        todasLasTarjetasVacias,
        tarjetas: tarjetas.map(t => ({
          para: t.para,
          mensaje: t.mensaje,
          de: t.de
        }))
      });
      
      // Limpiar tarjetas existentes
      const tarjetasArray = this.tarjetasForm.get("tarjetas") as FormArray;
      while (tarjetasArray.length !== 0) {
        tarjetasArray.removeAt(0);
      }

      // Si todas las tarjetas están vacías, configurar como "Sin Tarjeta"
      if (todasLasTarjetasVacias) {
        console.log('📝 Todas las tarjetas están vacías, configurando como "Sin Tarjeta"');
        this.cantidadTarjetas = 0;
        this.isOnlyOneTarjeta = false;
        this.SinTarjeta = true;
        // Forzar detección de cambios para actualizar el HTML
        this.cdr.detectChanges();
      } else {
        // Agregar nuevas tarjetas solo si no están vacías
        tarjetas.forEach((tarjeta: any) => {
          console.log('➕ Agregando tarjeta:', tarjeta);
          tarjetasArray.push(this.crearTarjetaItem(tarjeta));
        });

        // Configurar propiedades de tarjetas DESPUÉS de agregar las tarjetas
        // para evitar conflictos con el getter tarjetas
        this.isOnlyOneTarjeta = this.cantidadTarjetas === 1;
        this.SinTarjeta = this.cantidadTarjetas === 0;
      }
      
      console.log('✅ Tarjetas procesadas:', {
        cantidad: tarjetas.length,
        isOnlyOneTarjeta: this.isOnlyOneTarjeta,
        SinTarjeta: this.SinTarjeta,
        tarjetasEnFormArray: tarjetasArray.length,
        todasLasTarjetasVacias
      });
      
      // Forzar detección de cambios para asegurar que el HTML se actualice
      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Error procesando tarjetas:', error);
    }
  }

  /**
   * Reconstruye el árbol de variables (FormArray) a partir de las preferencias guardadas en el pedido
   * para que queden seleccionadas en la UI y en productPreference.
   */
  private reconstruirArbolDesdePedido(configuracion: any): void {
    try {
      const preferencias: any[] = Array.isArray(configuracion?.preferencias)
        ? configuracion.preferencias
        : [];
      if (preferencias.length === 0) {
        return;
      }

      const variablesArray = this.formulario.get('variables') as FormArray;
      if (!variablesArray || variablesArray.length === 0) {
        // Variables aún no listas: reintentar brevemente
        setTimeout(() => this.reconstruirArbolDesdePedido(configuracion), 300);
        return;
      }

      console.debug('[CONF DEBUG] reconstruirArbolDesdePedido: inicio', {
        preferenciasCount: preferencias.length,
        variablesCount: variablesArray.length,
      });

      preferencias
        .filter((p) => p?.tipo === 'preferencia')
        .forEach((pref) => {
          const tituloVariable = pref.titulo;
          const opcionElegida = pref.subtitulo || pref.titulo;

          // Buscar el grupo de la variable por título (trimear ambos lados para evitar diferencias de espacios)
          const idxVar = variablesArray.controls.findIndex((ctrl: any) => {
            const data = ctrl.get('data')?.value;
            return data && (data.titulo || '').trim() === (tituloVariable || '').trim();
          });

          if (idxVar === -1) {
            // No se encontró el grupo: la preferencia queda tal como la cargó
            // processExistingPreferences (se muestra en pantalla sin reconstruir)
            console.debug('[CONF DEBUG] pref sin variable matching', pref);
            return;
          }

          const grupo = variablesArray.at(idxVar) as FormGroup;
          const dataGrupo = grupo.get('data')?.value || {};
          const childrenArray = grupo.get('children') as FormArray;

          // Caso: variable con hijos (opciones predefinidas)
          if (childrenArray && childrenArray.length > 0) {
            let idxChild = childrenArray.controls.findIndex((childCtrl: any) => {
              const dataChild = childCtrl.get('data')?.value;
              return dataChild && dataChild.titulo === opcionElegida;
            });

            // Si no existe la opción exacta, crear un hijo sintético para representar la selección
            if (idxChild === -1) {
              const objetoHijo = {
                data: {
                  titulo: opcionElegida,
                  subtitulo: pref.subtitulo || opcionElegida,
                  imagen: pref.imagen || 'assets/images/other-images/sinimagen.webp',
                  valorUnitarioSinIva: pref.valorUnitarioSinIva || 0,
                  valorIva: pref.valorIva || 0,
                  porcentajeIva: pref.porcentajeIva || 0,
                  precioTotalConIva: pref.precioTotalConIva || 0,
                },
                parent: dataGrupo?.titulo || null,
                children: [],
              };
              const nuevoHijo = this.crearItem(objetoHijo);
              childrenArray.push(nuevoHijo);
              idxChild = childrenArray.length - 1;
              console.debug('[CONF DEBUG] hijo sintético creado', objetoHijo);
            }

            const childCtrl = childrenArray.at(idxChild) as FormGroup;
            // Patch visual del ng-select: guardar índice seleccionado en el grupo
            grupo.get('childrenSelected')?.setValue(idxChild);
            // Marcar selección usando el handler existente (para actualizar productPreference y totales)
            this.selectedProductPreferenceForNgSelect(childCtrl, grupo as any);
            return;
          }

          // Caso: variable sin hijos (texto/imagen/archivo)
          const tipoImagen = dataGrupo?.tipoImagen || '';
          const selectedValue = {
            data: {
              titulo: opcionElegida,
              subtitulo: pref.subtitulo || opcionElegida,
              imagen: pref.imagen || 'assets/images/other-images/sinimagen.webp',
              valorUnitarioSinIva: pref.valorUnitarioSinIva || 0,
              valorIva: pref.valorIva || 0,
              porcentajeIva: pref.porcentajeIva || 0,
              precioTotalConIva: pref.precioTotalConIva || 0,
              tipoImagen,
            },
          } as any;

          if (tipoImagen === 'texto') {
            grupo.get('textoIngresado')?.setValue(opcionElegida);
          }
          if (tipoImagen === 'imagen') {
            // No subimos archivo. Solo reflejamos la imagen si existe en la preferencia
            grupo.get('imagenIngresado')?.setValue('');
          }

          // Antes de actualizar, eliminar entradas existentes con cualquiera de los dos
          // posibles títulos (el guardado y el del grupo) para evitar duplicados
          const grupoTitulo = dataGrupo?.titulo || '';
          this.productPreference = this.productPreference.filter(
            p => p.tipo !== 'preferencia' || (p.titulo !== tituloVariable && p.titulo !== grupoTitulo)
          );

          this.updateProductPreference(grupo as any, selectedValue);
        });

      console.debug('[CONF DEBUG] reconstruirArbolDesdePedido: fin', {
        productPreference: this.productPreference,
      });
    } catch (e) {
      console.error('[CONF DEBUG] reconstruirArbolDesdePedido: error', e);
    }
  }
  crearTarjetaItem(tarjeta: any): any {
    return this.fb.group({
      para: [tarjeta.para, Validators.required],
      mensaje: [tarjeta.mensaje, Validators.required],
      de: [tarjeta.de, Validators.required],
    });
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return "by pressing ESC";
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return "by clicking on a backdrop";
    } else {
      return `with: ${reason}`;
    }
  }

  /**
   * Cierra solo el modal de configuración sin cerrar el modal padre
   */
  dismissCurrentModal(result?: any) {
    if (this.modalRef) {
      this.modalRef.dismiss(result);
    } else {
      // Fallback: cerrar todos los modales si no hay referencia específica
      this.modalService.dismissAll(result);
    }
  }

  addToCar() {
    console.log("Método addToCar ejecutado");

    try {
      // Validar disponibilidad de stock antes de agregar al carrito
      if (this.producto?.disponibilidad?.inventariable) {
        const stockDisponible =
          this.producto.disponibilidad.cantidadDisponible || 0;

        if (stockDisponible === 0) {
          this.toastrService.error(
            "No hay unidades disponibles para este producto",
            "Sin Stock",
            {
              timeOut: 4000,
              progressBar: true,
              positionClass: "toast-top-right",
            },
          );
          return;
        }

        if (this.cantidad > stockDisponible) {
          this.toastrService.warning(
            `Solo hay ${stockDisponible} unidades disponibles`,
            "Stock Limitado",
            {
              timeOut: 4000,
              progressBar: true,
              positionClass: "toast-top-right",
            },
          );
          return;
        }
      }

      // Marcar todos los campos como tocados para mostrar errores de validación
      this.markAllFieldsAsTouched();

      // Siempre validar formulario antes de proceder, sin importar configProcesoComercialActivo
      if (!this.validateRequiredFields()) {
        return;
      }

      this.producto.rating = this.ratingForm.value.rating;
      this.productoConfiguradoForm.controls.datosEntrega.setValue(
        this.datosEntrega.value,
      );
      this.productoConfiguradoForm.controls.cantidad.setValue(this.cantidad);
      // Sincronizar preferencias desde los form controls antes de guardar
      this.sincronizarPreferencias();
      // Normalizar preferencias antes de guardar (como se llenaba originalmente)
      const preferenciasRaw = this.productPreference.filter(
        (preference) => preference.tipo === "preferencia",
      );
      const preferenciasNormalizadas = this.normalizeProductPreferences(preferenciasRaw);
      this.productoConfiguradoForm.controls.preferencias.setValue(
        preferenciasNormalizadas,
      );
      this.productoConfiguradoForm.controls.adiciones.setValue(
        this.productPreference.filter(
          (preference) => preference.tipo === "adicion",
        ),
      );
      this.productoConfiguradoForm.controls.tarjetas.setValue(
        this.tarjetas.value,
      );

      // Log para depuración del género y ocasión
      console.log("🔍 Debug configuración antes de crear ProductoCompra:", {
        datosEntregaForm: this.datosEntrega.value,
        datosEntregaFinal:
          this.productoConfiguradoForm.controls.datosEntrega.value,
        generoSeleccionado: this.datosEntrega.value.genero,
        ocasionSeleccionada: this.datosEntrega.value.ocasion,
        generosDisponibles: this.generos,
        ocasionesDisponibles: this.ocasiones,
      });

      // Obtener producto con precio ajustado según categoría del cliente (si aplica)
      const productoParaCarrito = this.obtenerProductoConPrecioCategoria();

      let ProductoCompra: Carrito = {
        producto: productoParaCarrito,
        configuracion: this.productoConfiguradoForm.value,
        cantidad: this.cantidad,
      };

      // Agregar campos personalizados si hay
      if (this.gruposCamposCustom.length > 0) {
        const camposPersonalizados: { [grupoId: string]: { [campoId: string]: any } } = {};
        for (const grupo of this.gruposCamposCustom) {
          const form = this.customFieldsForms[grupo.id];
          if (form) {
            // Guardar valores con etiquetas para el PDF
            const valores: any = {};
            for (const campo of (grupo.campos || [])) {
              const val = form.get(campo.id)?.value;
              if (val != null && val !== '' && val !== false) {
                valores[campo.id] = val;
              }
            }
            // Guardar etiquetas como metadata para renderizado en PDF
            valores._etiquetas = {};
            valores._grupoNombre = grupo.nombre;
            for (const campo of (grupo.campos || [])) {
              valores._etiquetas[campo.id] = campo.etiqueta;
            }
            camposPersonalizados[grupo.id] = valores;
          }
        }
        if (ProductoCompra.configuracion) {
          ProductoCompra.configuracion.camposPersonalizados = camposPersonalizados;
        }
      }

      console.log("ProductoCompra creado:", ProductoCompra);

      if (!this.isEdit && !this.isRebuy) {
        console.log("Agregar al carrito...");
        this.carsingleton.addToCart(ProductoCompra);
        this.dismissCurrentModal();
      } else if (this.isEdit || this.isRebuy) {
        console.log("Actualizar carrito...");
        this.dismissCurrentModal(ProductoCompra);
      }

      this.toastrService.success("Producto agregado al carrito", "Éxito", {
        timeOut: 5000,
        progressBar: true,
        positionClass: "toast-top-right",
      });

      this.tarjetasForm.reset();
      this.productPreference = [];
      this.cantidadTarjetas = 1;
      this.cantidad = 1;
      this.initForm();
    } catch (error) {
      console.error("Error al agregar al carrito:", error);
      this.toastrService.error(
        "Hubo un problema al agregar el producto al carrito",
        "Error",
      );
    }
  }

  /**
   * Normaliza las preferencias a la forma esperada por el backend/UI histórico
   */
  private normalizeProductPreferences(preferences: any[]): any[] {
    // Deduplicar por titulo: si hay dos entradas con el mismo titulo, conservar la última
    const deduped = new Map<string, any>();
    (preferences || []).forEach(p => {
      const key = (p?.titulo || '').trim();
      if (key) deduped.set(key, p);
    });
    return Array.from(deduped.values()).map((p) => {
      const titulo = (p?.titulo || "").trim();
      const subtitulo = p?.subtitulo || "";
      let valorUnitarioSinIva = Number(p?.valorUnitarioSinIva || 0);
      const valorIva = Number(p?.valorIva || 0);
      const porcentajeIva = Number(p?.porcentajeIva || 0);
      const precioTotalConIva = Number(p?.precioTotalConIva || 0);
      // Si valorUnitarioSinIva no fue definido pero sí precioTotalConIva, derivarlo
      if (valorUnitarioSinIva === 0 && precioTotalConIva > 0) {
        valorUnitarioSinIva = porcentajeIva > 0
          ? precioTotalConIva / (1 + porcentajeIva / 100)
          : precioTotalConIva;
      }
      // Imagen: si no viene, intentar obtenerla desde adicionesPreferencias por el subtitulo (título del hijo)
      let imagen = p?.imagen || "";
      if (!imagen && subtitulo) {
        try {
          imagen = this.getImgAdicion(subtitulo) || "assets/images/other-images/sinimagen.webp";
        } catch {
          imagen = "assets/images/other-images/sinimagen.webp";
        }
      }

      return {
        titulo,
        subtitulo,
        valorUnitarioSinIva,
        valorIva,
        porcentajeIva,
        precioTotalConIva,
        imagen,
        tipo: "preferencia",
        paraProduccion: !!p?.paraProduccion,
        cantidad: Number(p?.cantidad || 1),
      };
    });
  }

  /**
   * Marca todos los campos de los formularios como tocados para mostrar validaciones
   */
  markAllFieldsAsTouched(): void {
    // Marcar campos de datosEntrega
    Object.keys(this.datosEntrega.controls).forEach((key) => {
      const control = this.datosEntrega.get(key);
      if (control) {
        control.markAsTouched();
        control.updateValueAndValidity();
      }
    });

    // Marcar campos de tarjetas
    if (this.producto?.procesoComercial?.llevaTarjeta && !this.SinTarjeta) {
      this.tarjetas.controls.forEach((tarjetaGroup) => {
        Object.keys(tarjetaGroup["controls"]).forEach((key) => {
          const control = tarjetaGroup.get(key);
          if (control) {
            control.markAsTouched();
            control.updateValueAndValidity();
          }
        });
      });
    }

    // Actualizar UI para mostrar validaciones
    this.activeAccordionPanel = this.determineInitialOpenSection();
  }

  /**
   * Valida los campos requeridos en el formulario y marca todos como tocados
   * para mostrar mensajes de error
   * @returns true si el formulario es válido, false en caso contrario
   */
  validateRequiredFields(): boolean {
    console.log(
      "Ejecutando validateRequiredFields con configuración:",
      this.producto?.procesoComercial,
    );

    // Primero vamos a validar los campos obligatorios según la configuración del producto
    let hasValidationErrors = false;

    // Verificar si el formulario datosEntrega tiene campos obligatorios que deban validarse
    if (this.producto?.procesoComercial?.llevaCalendario) {
      // Si debe llevar calendario, estos campos son obligatorios
      if (!this.datosEntrega.get("fechaEntrega")?.value) {
        this.toastrService.warning(
          "Por favor seleccione una fecha de entrega",
          "Campo requerido",
        );
        this.activeAccordionPanel = "datosEntregaPanel";
        hasValidationErrors = true;
      }

      if (!this.datosEntrega.get("formaEntrega")?.value) {
        this.toastrService.warning(
          "Por favor seleccione una forma de entrega",
          "Campo requerido",
        );
        this.activeAccordionPanel = "datosEntregaPanel";
        hasValidationErrors = true;
      }

      if (!this.datosEntrega.get("horarioEntrega")?.value) {
        this.toastrService.warning(
          "Por favor seleccione un horario de entrega",
          "Campo requerido",
        );
        this.activeAccordionPanel = "datosEntregaPanel";
        hasValidationErrors = true;
      }
    }

    // Validar colores si son requeridos
    if (this.producto?.procesoComercial?.aceptaColorDecoracion) {
      const colores = this.datosEntrega.get("colores")?.value;
      if (!colores || colores.length === 0) {
        this.toastrService.warning(
          "Por favor seleccione al menos un color",
          "Campo requerido",
        );
        this.activeAccordionPanel = "datosEntregaPanel";
        hasValidationErrors = true;
      }
    }

    // Validar género si es requerido (usando la propiedad computada hasAceptaGenero)
    if (this.hasAceptaGenero && !this.datosEntrega.get("genero")?.value) {
      this.toastrService.warning(
        "Por favor seleccione un género",
        "Campo requerido",
      );
      this.activeAccordionPanel = "datosEntregaPanel";
      hasValidationErrors = true;
    }

    // Validar ocasión si es requerida (usando la propiedad computada hasAceptaOcasion)
    if (this.hasAceptaOcasion && !this.datosEntrega.get("ocasion")?.value) {
      this.toastrService.warning(
        "Por favor seleccione una ocasión",
        "Campo requerido",
      );
      this.activeAccordionPanel = "datosEntregaPanel";
      hasValidationErrors = true;
    }

    // Validar observaciones si son requeridas
    if (
      this.producto?.procesoComercial?.aceptaComentarios &&
      !this.datosEntrega.get("observaciones")?.value
    ) {
      this.toastrService.warning(
        "Por favor ingrese las observaciones",
        "Campo requerido",
      );
      this.activeAccordionPanel = "datosEntregaPanel";
      hasValidationErrors = true;
    }

    // Si el producto requiere tarjetas y no se ha seleccionado "Sin Tarjeta"
    if (this.producto?.procesoComercial?.llevaTarjeta && !this.SinTarjeta) {
      // Validar que al menos haya una tarjeta
      if (this.tarjetas.length === 0) {
        this.toastrService.warning(
          'Debe agregar al menos una tarjeta o seleccionar "Sin Tarjeta"',
          "Campo requerido",
        );
        this.activeAccordionPanel = "tarjetasPanel";
        return false;
      }

      // Verificar si alguna tarjeta tiene campos inválidos
      let tarjetasInvalidas = false;
      this.tarjetas.controls.forEach((tarjetaGroup) => {
        if (tarjetaGroup.invalid) {
          tarjetasInvalidas = true;
        }
      });

      if (tarjetasInvalidas) {
        this.toastrService.warning(
          "Por favor complete todos los campos de las tarjetas",
          "Campos requeridos",
        );
        this.activeAccordionPanel = "tarjetasPanel";
        hasValidationErrors = true;
      }
    }

    // Verificar si se necesitan preferencias
    if (
      this.producto?.procesoComercial?.aceptaVariable &&
      !this.hasPreferencia()
    ) {
      this.toastrService.warning(
        "Debe seleccionar al menos una preferencia",
        "Campo requerido",
      );
      this.activeAccordionPanel = "preferenciasPanel";
      hasValidationErrors = true;
    }

    console.log("Resultado validación:", !hasValidationErrors);
    return !hasValidationErrors;
  }

  mostrarPrecios() {
    if (this.mostrarTabla == false) {
      this.mostrarTabla = true;
    } else {
      this.mostrarTabla = false;
    }
  }

  changeTipoEntrega(event) {
    console.log(event);
    this.adicionesrows = JSON.parse(this.rowsiniciales);
    this.producto;
    let tipoEntregaComparisson = "";
    let tipoEntregaComparisson2 = "";
    this.formasEntrega
      .filter((p: any) => p.nombre.toLowerCase() == event.nombre.toLowerCase())
      .map((p: any) => {
        this.horarios = p.horariosSeleccionados;
      });
    if (this.datosEntrega.value.formaEntrega == "Envío a Domicilio") {
      tipoEntregaComparisson = "SOLO DOMICILIO";
      tipoEntregaComparisson2 = "ENVIO A DOMICILIO Y RECOGE";
      this.adicionesrows = this.adicionesrows.filter((x) => {
        return (
          x.tipoEntrega == tipoEntregaComparisson ||
          x.tipoEntrega == tipoEntregaComparisson2
        );
      });
    }
    if (this.datosEntrega.value.formaEntrega == "Recoge en Tienda") {
      tipoEntregaComparisson = "SOLO RECOGE";
      tipoEntregaComparisson2 = "ENVIO A DOMICILIO Y RECOGE";
      this.adicionesrows = this.adicionesrows.filter((x) => {
        return (x.tipoEntrega =
          tipoEntregaComparisson || x.tipoEntrega == tipoEntregaComparisson2);
      });
    }
  }

  loadFormasEntregaConfiguracionProducto() {
    try {
      if (!this.tipoEntrega || this.tipoEntrega.length === 0) {
        console.error("No hay tipos de entrega disponibles");
        this.toastrService.error(
          "No se encontraron tipos de entrega configurados",
          "Error de Configuración",
        );
        return;
      }

      if (!this.formasEntrega || this.formasEntrega.length === 0) {
        console.error("No hay formas de entrega disponibles");
        this.toastrService.error(
          "No se encontraron formas de entrega configuradas",
          "Error de Configuración",
        );
        return;
      }

      const tipoEntrega = this.tipoEntrega.filter(
        (p: any) =>
          p.nombreInterno.toLowerCase() ==
          this.producto?.disponibilidad?.tipoEntrega.toLowerCase(),
      )[0];

      if (!tipoEntrega) {
        console.error(
          "No se encontró el tipo de entrega del producto:",
          this.producto?.disponibilidad?.tipoEntrega,
        );
        this.toastrService.warning(
          `El tipo de entrega "${this.producto?.disponibilidad?.tipoEntrega}" no está configurado`,
          "Configuración Incompleta",
        );
        this.formasEntregaProducto = [];
        return;
      }

      this.formasEntregaProducto = this.formasEntrega.filter((p: any) =>
        tipoEntrega.formaEntrega.find(
          (g: string) => g.toLowerCase() == p.nombre.toLowerCase(),
        ),
      );

      if (
        !this.formasEntregaProducto ||
        this.formasEntregaProducto.length === 0
      ) {
        console.error(
          "No se encontraron formas de entrega para el tipo:",
          tipoEntrega.nombreInterno,
        );
        this.toastrService.warning(
          "No hay formas de entrega disponibles para este producto",
          "Sin Opciones de Entrega",
        );
      }
    } catch (error) {
      console.error("Error al cargar formas de entrega:", error);
      this.toastrService.error(
        "Error al configurar las opciones de entrega",
        "Error de Configuración",
      );
    }
  }

  getTituloTiempoEntrega() {
    if (!this.producto || !this.tiemposEntrega) return "";
    const tiempoEntregaProducto = this.producto?.disponibilidad?.tiempoEntrega;
    const tiempoEntrega = this.tiemposEntrega.find(
      (p: any) => p.minDias == tiempoEntregaProducto,
    );
    return tiempoEntrega?.nombreExterno;
  }

  hasFechaEntrega() {
    return this.datosEntrega.value.fechaEntrega;
  }

  handleInput: any;
  tieneHijos(grupo: FormGroup): boolean {
    const hijos = grupo.get("children") as FormArray;
    return hijos && hijos.length > 0;
  }

  selectedColor(event: MouseEvent, item: any) {
    const target = event.target as HTMLElement;
    const selected = target.closest(".product-color li");

    if (selected) {
      // Alternar la clase 'selected'
      selected.classList.toggle("selected");
    }

    let colores = this.datosEntrega.controls.colores.value;

    if (colores.includes(item)) {
      // Si el color ya está en la lista, lo removemos
      colores = colores.filter((color) => color !== item);
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
    } else {
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
      } else {
        Swal.fire({
          title: "Error!",
          text: "No puede agregar más tarjetas que productos",
          icon: "error",
          confirmButtonText: "Ok",
        });
      }
    }
  }
  agregarTarjetaForm() {
    for (let i = 0; i < this.cantidadTarjetas; i++) {
      this.addTarjeta();
    }
  }

  selectedProductPreference(event: any, item: FormControl) {
    const selectedIndex = event.target?.value;

    // Manejar entrada personalizada según el tipo
    if (item.value.data.tipoImagen === "texto") {
      this.handleTextInput(event, item, selectedIndex);
    } else if (item.value.data.tipoImagen === "imagen") {
      this.handleImageUpload(event, item, selectedIndex);
    }
  }

  private handleTextInput(event: any, item: FormControl, selectedIndex: string) {
    const textValue = event.target?.value || selectedIndex;

    const selectedValue = {
      data: {
        imagen: "assets/images/other-images/sinimagen.webp",
        porcentajeIva: item.value.data.porcentajeIva || 0,
        precioTotalConIva: item.value.data.precioTotalConIva || 0,
        subtitulo: textValue,
        tipoImagen: "texto",
        titulo: textValue,
        valorIva: item.value.data.valorIva || 0,
        valorUnitarioSinIva: item.value.data.valorUnitarioSinIva || 0,
      }
    };

    this.updateProductPreference(item, selectedValue);
  }

  private handleImageUpload(event: any, item: FormControl, selectedIndex: string) {
    const file = event.target?.files?.[0];
    
    if (!file) {
      console.warn('No se seleccionó ningún archivo');
      return;
    }

    if (!this.isValidFile(file)) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Solo se aceptan archivos con extensiones .png, .jpg, .webp y .jpeg",
      });
      event.target.value = "";
      return;
    }

    this.uploadSingleFile(file, item, event.target);
  }

  private uploadSingleFile(file: File, item: FormControl, inputElement: any) {
    const companyStorage = localStorage.getItem("currentCompany");
    const company = JSON.parse(companyStorage || '{}');
    
    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    
    const filePath = `${company?.nomComercial || 'katuq'}/configuracionProducto/${this.producto?.crearProducto?.titulo?.replace(/\s+/g, "") || 'producto'}/preferencia/${fileName}`;
    const fileRef = this.storage.ref(filePath);
    const task = this.storage.upload(filePath, file);

    Swal.fire({
      title: "Subiendo archivo...",
      text: "Por favor espere...",
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => {
        Swal.showLoading();
      },
    });

    task.snapshotChanges().pipe(
      finalize(() => {
        fileRef.getDownloadURL().subscribe({
          next: (url) => {
            const grupoTituloImg = item.value?.data?.titulo || '';

            // Eliminar entradas previas para evitar duplicados al subir imagen
            this.productPreference = this.productPreference.filter(p => {
              if (p.tipo !== 'preferencia') return true;
              if (grupoTituloImg && p.titulo === grupoTituloImg) return false;
              if (p.titulo && p.titulo === p.subtitulo) return false;
              return true;
            });

            const selectedValue = {
              data: {
                imagen: url,
                porcentajeIva: item.value.data.porcentajeIva || 0,
                precioTotalConIva: item.value.data.precioTotalConIva || 0,
                subtitulo: file.name,
                tipoImagen: "imagen",
                titulo: file.name,
                valorIva: item.value.data.valorIva || 0,
                valorUnitarioSinIva: item.value.data.valorUnitarioSinIva || 0,
              }
            };

            this.updateProductPreference(item, selectedValue);
            Swal.close();
          },
          error: (error) => {
            console.error('Error al obtener URL de descarga:', error);
            Swal.fire({
              icon: "error",
              title: "Error",
              text: "Error al subir el archivo. Por favor intente nuevamente.",
            });
          }
        });
      })
    ).subscribe({
      error: (error) => {
        console.error('Error en la subida del archivo:', error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Error al subir el archivo. Por favor intente nuevamente.",
        });
      }
    });
  }

  private updateProductPreference(item: FormControl, selectedValue: any) {
    const preference = {
      titulo: (item.value.data.titulo || '').trim(),
      subtitulo: selectedValue?.data?.titulo || selectedValue?.data?.subtitulo || "",
      valorUnitarioSinIva: selectedValue?.data?.valorUnitarioSinIva || 0,
      valorIva: selectedValue?.data?.valorIva || 0,
      porcentajeIva: selectedValue?.data?.porcentajeIva || 0,
      precioTotalConIva: selectedValue?.data?.precioTotalConIva || 0,
      imagen: selectedValue?.data?.imagen || "assets/images/other-images/sinimagen.webp",
      tipo: "preferencia",
      paraProduccion: false,
      cantidad: 1,
    };

    const index = this.productPreference.findIndex(
      (p) => p.titulo === preference.titulo,
    );

    if (index !== -1) {
      this.productPreference[index] = preference;
    } else {
      this.productPreference.push(preference);
    }
  }


  /**
   * Recorre los form controls de variables y sincroniza los valores ingresados
   * al array productPreference antes de agregar al carrito.
   * Cubre todos los tipos: texto (textarea), imagen, archivo y selección de hijos (ng-select).
   */
  private sincronizarPreferencias() {
    const variablesArray = this.formulario.get("variables") as FormArray;
    if (!variablesArray) return;

    variablesArray.controls.forEach((item: AbstractControl) => {
      const tipoImagen = item.get('data')?.get('tipoImagen')?.value;
      const tituloVariable = (item.get('data')?.get('titulo')?.value || '').trim();
      if (!tituloVariable) return;

      // Caso 1: Preferencia con hijos seleccionados (ng-select)
      const childrenArray = item.get('children') as FormArray;
      const childrenSelectedIdx = item.get('childrenSelected')?.value;
      if (childrenArray?.length > 0 && childrenSelectedIdx >= 0 && childrenSelectedIdx < childrenArray.length) {
        const childCtrl = childrenArray.at(childrenSelectedIdx);
        const childValue = childCtrl?.value;
        if (childValue) {
          const _pIva = Number(childValue?.data?.porcentajeIva || 0);
          const _precioConIva = Number(childValue?.data?.precioTotalConIva || 0);
          let _valorSinIva = Number(childValue?.data?.valorUnitarioSinIva || 0);
          if (_valorSinIva === 0 && _precioConIva > 0) {
            _valorSinIva = _pIva > 0 ? _precioConIva / (1 + _pIva / 100) : _precioConIva;
          }
          const preference = {
            titulo: tituloVariable,
            subtitulo: childValue?.data?.titulo || "",
            valorUnitarioSinIva: _valorSinIva,
            valorIva: Number(childValue?.data?.valorIva || 0),
            porcentajeIva: _pIva,
            precioTotalConIva: _precioConIva,
            imagen: childValue?.data?.titulo
              ? this.getImgAdicion(childValue.data.titulo)
              : "assets/images/other-images/sinimagen.webp",
            tipo: "preferencia",
            paraProduccion: true,
            cantidad: 1,
          };
          const idx = this.productPreference.findIndex(p => p.titulo === preference.titulo);
          if (idx !== -1) {
            this.productPreference[idx] = preference;
          } else {
            this.productPreference.push(preference);
          }
        }
        return;
      }

      // Caso 2: Preferencia de tipo texto (textarea)
      if (tipoImagen === 'texto') {
        const textoIngresado = item.get('textoIngresado')?.value;
        if (!textoIngresado) return;
        const selectedValue = {
          data: {
            imagen: "assets/images/other-images/sinimagen.webp",
            porcentajeIva: item.get('data')?.get('porcentajeIva')?.value || 0,
            precioTotalConIva: item.get('data')?.get('precioTotalConIva')?.value || 0,
            subtitulo: textoIngresado,
            tipoImagen: "texto",
            titulo: textoIngresado,
            valorIva: item.get('data')?.get('valorIva')?.value || 0,
            valorUnitarioSinIva: item.get('data')?.get('valorUnitarioSinIva')?.value || 0,
          }
        };
        this.updateProductPreference(item as FormControl, selectedValue);
        return;
      }

      // Caso 3: Preferencia de tipo imagen o archivo (ya subido via upload)
      // Si ya existe en productPreference (fue seteada por el callback de upload), no tocar.
      // Si no existe pero el form control tiene valor, significa que se cargó previamente.
      if (tipoImagen === 'imagen' || tipoImagen === 'archivo') {
        const yaExiste = this.productPreference.some(p => p.titulo === tituloVariable);
        if (yaExiste) return;
        // Verificar si hay una imagen/archivo previamente cargado en los datos del item
        const imagenActual = item.get('data')?.get('imagen')?.value;
        if (imagenActual && imagenActual !== 'assets/images/other-images/sinimagen.webp') {
          const selectedValue = {
            data: {
              imagen: imagenActual,
              porcentajeIva: item.get('data')?.get('porcentajeIva')?.value || 0,
              precioTotalConIva: item.get('data')?.get('precioTotalConIva')?.value || 0,
              subtitulo: item.get('data')?.get('subtitulo')?.value || tituloVariable,
              tipoImagen: tipoImagen,
              titulo: item.get('data')?.get('subtitulo')?.value || tituloVariable,
              valorIva: item.get('data')?.get('valorIva')?.value || 0,
              valorUnitarioSinIva: item.get('data')?.get('valorUnitarioSinIva')?.value || 0,
            }
          };
          this.updateProductPreference(item as FormControl, selectedValue);
        }
      }
    });
  }

  getImgAdicion(adicion: any) {
    const adiciones = this.adicionesPreferencias.find(
      (x) => x.titulo == adicion,
    );
    if (!adiciones) return "assets/images/other-images/sinimagen.webp";
    return adiciones?.imagenPrincipal[0]?.urls;
  }

  selectedProductPreferenceForNgSelect(event: any, item: FormControl) {
    // Con [bindValue]="null" event será el propio objeto control del hijo o su valor
    const selectedControl = event?.value ? event.value : event;
    const selectedValue = selectedControl?.value ? selectedControl.value : selectedControl;

    const preference = {
      titulo: item.value.data.titulo,
      subtitulo: selectedValue?.data?.titulo || "",
      valorUnitarioSinIva: selectedValue?.data?.valorUnitarioSinIva || 0,
      valorIva: selectedValue?.data?.valorIva || 0,
      porcentajeIva: selectedValue?.data?.porcentajeIva || 0,
      precioTotalConIva: selectedValue?.data?.precioTotalConIva || 0,
      imagen: selectedValue?.data?.titulo
        ? this.getImgAdicion(selectedValue.data.titulo)
        : "assets/images/other-images/sinimagen.webp",
      tipo: "preferencia",
      paraProduccion: true,
      cantidad: 1,
    };

    // Actualizar childrenSelected en el formulario para que sincronizarPreferencias()
    // lea el índice correcto al guardar
    const childrenArray = (item as any).get?.('children') as FormArray;
    if (childrenArray) {
      const selectedIdx = childrenArray.controls.findIndex(
        (ctrl) => ctrl === selectedControl || ctrl === event
      );
      if (selectedIdx !== -1) {
        (item as any).get?.('childrenSelected')?.setValue(selectedIdx);
      }
    }

    const index = this.productPreference.findIndex(
      (p) => p.titulo === preference.titulo,
    );
    if (index !== -1) {
      this.productPreference[index] = preference;
    } else {
      this.productPreference.push(preference);
    }
  }

  isValidFile(file: File): boolean {
    const allowedExtensions = ["png", "jpg", "webp", "jpeg"];
    const fileName = file.name;
    const fileExtension = fileName.split(".").pop()?.toLowerCase();

    return fileExtension
      ? allowedExtensions.filter((extension) => extension === fileExtension)
        .length > 0
      : false;
  }

  /**
   * Elimina la imagen de una preferencia específica
   * @param item - FormControl del item de preferencia
   */
  /**
   * Obtiene la imagen actual de un item de preferencia
   * Maneja tanto FormControl como FormArray en children
   */
  getCurrentImageFromItem(item: FormControl): string | null {
    try {
      const childrenControl = item.get('children');
      if (!childrenControl) return null;

      // Caso 1: children es un FormControl (una sola imagen)
      if (childrenControl instanceof FormControl) {
        const value = childrenControl.value;
        return value?.data?.imagen || null;
      }
      
      // Caso 2: children es un FormArray (múltiples imágenes)
      if (childrenControl instanceof FormArray && childrenControl.length > 0) {
        const firstChild = childrenControl.at(0) as FormControl;
        if (firstChild && firstChild.value) {
          return firstChild.value.data?.imagen || null;
        }
      }
      
      // Caso 3: children es un objeto directo (estructura antigua)
      if (item.value.children && item.value.children.data) {
        return item.value.children.data.imagen || null;
      }
    } catch (error) {
      console.error('Error al obtener imagen actual:', error);
    }
    return null;
  }

  /**
   * Obtiene el subtítulo de la imagen actual
   */
  getCurrentImageSubtitle(item: FormControl): string | null {
    try {
      const childrenControl = item.get('children');
      if (!childrenControl) return null;

      // Caso 1: children es un FormControl
      if (childrenControl instanceof FormControl) {
        const value = childrenControl.value;
        return value?.data?.subtitulo || null;
      }
      
      // Caso 2: children es un FormArray
      if (childrenControl instanceof FormArray && childrenControl.length > 0) {
        const firstChild = childrenControl.at(0) as FormControl;
        if (firstChild && firstChild.value) {
          return firstChild.value.data?.subtitulo || null;
        }
      }
      
      // Caso 3: estructura antigua
      if (item.value.children && item.value.children.data) {
        return item.value.children.data.subtitulo || null;
      }
    } catch (error) {
      console.error('Error al obtener subtítulo:', error);
    }
    return null;
  }

  deleteImageFromPreference(item: FormControl): void {
    const tituloPreferencia = item.value.data.titulo;
    
    // Confirmar eliminación
    Swal.fire({
      title: '¿Eliminar imagen?',
      text: `¿Estás seguro de que quieres eliminar la imagen de "${tituloPreferencia}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          // Obtener el FormControl de children
          const childrenControl = item.get('children') as FormControl | FormArray | null;
          
          if (childrenControl) {
            // Caso 1: children es un FormControl (una sola imagen)
            if (childrenControl instanceof FormControl) {
              const childrenValue = childrenControl.value;
              if (childrenValue && childrenValue.data) {
                childrenControl.patchValue({
                  data: {
                    ...childrenValue.data,
                    imagen: 'assets/images/other-images/sinimagen.webp',
                    subtitulo: '',
                    titulo: ''
                  }
                });
              }
            }
            // Caso 2: children es un FormArray (múltiples imágenes)
            else if (childrenControl instanceof FormArray && childrenControl.length > 0) {
              // Si hay múltiples imágenes, eliminar la imagen del primer elemento seleccionado
              // o de todos si es necesario
              const firstChild = childrenControl.at(0) as FormControl;
              if (firstChild && firstChild.value && firstChild.value.data) {
                firstChild.patchValue({
                  data: {
                    ...firstChild.value.data,
                    imagen: 'assets/images/other-images/sinimagen.webp',
                    subtitulo: '',
                    titulo: ''
                  }
                });
              }
            }
            // Caso 3: children es un objeto directo (estructura antigua)
            else if (item.value.children && item.value.children.data) {
              item.value.children.data = {
                ...item.value.children.data,
                imagen: 'assets/images/other-images/sinimagen.webp',
                subtitulo: '',
                titulo: ''
              };
            }
          }

          // Limpiar el input de imagen
          const imagenInput = item.get('imagenIngresado');
          if (imagenInput) {
            imagenInput.setValue('');
          }

          // Actualizar la preferencia en el array
          // Obtener el valor actualizado de children
          const updatedChildren = childrenControl instanceof FormControl 
            ? childrenControl.value 
            : childrenControl instanceof FormArray && childrenControl.length > 0
            ? childrenControl.at(0).value
            : item.value.children;
            
          this.updateProductPreference(item, updatedChildren);

          // Forzar detección de cambios
          this.cdr.detectChanges();

          // Mostrar confirmación
          Swal.fire({
            title: 'Imagen eliminada',
            text: 'La imagen ha sido eliminada correctamente.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });

          console.log(`🗑️ Imagen eliminada de la preferencia: ${tituloPreferencia}`);
        } catch (error) {
          console.error('Error al eliminar imagen:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo eliminar la imagen. Por favor, intenta nuevamente.',
            icon: 'error',
            timer: 3000,
            showConfirmButton: false
          });
        }
      }
    });
  }
  /**
   * Elimina la imagen de una preferencia desde la tabla de preferencias
   * @param preference - La preferencia de la cual eliminar la imagen
   */
  deleteImageFromPreferenceTable(preference: any): void {
    const tituloPreferencia = preference.titulo;
    
    // Confirmar eliminación
    Swal.fire({
      title: '¿Eliminar imagen?',
      text: `¿Estás seguro de que quieres eliminar la imagen de "${tituloPreferencia}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          // Buscar el FormControl correspondiente a esta preferencia
          const variablesArray = this.formulario.get('variables') as FormArray;
          let foundControl: FormControl | null = null;

          // Buscar en todos los controles de variables
          for (let i = 0; i < variablesArray.length; i++) {
            const variableControl = variablesArray.at(i) as FormControl;
            if (variableControl.value?.data?.titulo === tituloPreferencia) {
              foundControl = variableControl;
              break;
            }
          }

          if (foundControl) {
            // Eliminar la imagen usando el método existente
            this.deleteImageFromPreference(foundControl);
          } else {
            // Si no se encuentra el control, actualizar directamente la preferencia en el array
            const index = this.productPreference.findIndex(
              (p) => p.titulo === tituloPreferencia && p.tipo === 'preferencia'
            );

            if (index !== -1) {
              // Actualizar la preferencia sin imagen
              this.productPreference[index] = {
                ...this.productPreference[index],
                imagen: 'assets/images/other-images/sinimagen.webp',
                subtitulo: ''
              };

              // Forzar detección de cambios
              this.cdr.detectChanges();

              // Mostrar confirmación
              Swal.fire({
                title: 'Imagen eliminada',
                text: 'La imagen ha sido eliminada correctamente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
              });

              console.log(`🗑️ Imagen eliminada de la preferencia desde tabla: ${tituloPreferencia}`);
            } else {
              throw new Error('Preferencia no encontrada en el array');
            }
          }
        } catch (error) {
          console.error('Error al eliminar imagen desde tabla:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo eliminar la imagen. Por favor, intenta nuevamente.',
            icon: 'error',
            timer: 3000,
            showConfirmButton: false
          });
        }
      }
    });
  }

  getVariablesControls() {
    return (this.formulario.get("variables") as FormArray).controls;
  }
  getTotalPrecioTotalConIva(): number {
    return this.productPreference.reduce(
      (total, preference) => total + preference.precioTotalConIva,
      0,
    );
  }

  getTotalValorIva(): number {
    return this.productPreference.reduce(
      (total, preference) => total + preference.valorIva,
      0,
    );
  }

  getTotalValorUnitarioSinIva(): number {
    return this.productPreference.reduce(
      (total, preference) => total + preference.valorUnitarioSinIva,
      0,
    );
  }

  getBigTotalProductWithPreferenceAndAdictions() {
    return this.precioproducto + this.getTotalPrecioTotalConIva();
  }

  addOpcionesPersonalizacion() {
    // Verificar que los datos de entrega estén disponibles
    if (!this.datosEntrega || !this.datosEntrega.value) {
      console.warn('⚠️ Datos de entrega no disponibles para personalización');
      return;
    }

    const ocasionx = this.ocasiones?.find(
      (x) => x.id == this.datosEntrega.value.ocasion,
    );
    const generosx = this.generos?.find(
      (x) => x.id == this.datosEntrega.value.genero,
    );
    const observacionesx = this.datosEntrega.value.observaciones;

    // Log para depuración
    console.log("🔍 Debug addOpcionesPersonalizacion:", {
      datosEntrega: this.datosEntrega.value,
      ocasionId: this.datosEntrega.value.ocasion,
      generoId: this.datosEntrega.value.genero,
      ocasionx: ocasionx,
      generosx: generosx,
      observacionesx: observacionesx,
      ocasionesDisponibles: this.ocasiones,
      generosDisponibles: this.generos,
    });

    //generar texto con ocasion y genero
    if (ocasionx == null) {
      var texto =
        (generosx != undefined
          ? " <strong>Genero:</strong> " + generosx?.name
          : "") +
        "<br/>" +
        (observacionesx != undefined
          ? " <strong>Observaciones:</strong> " + observacionesx
          : "");
    } else if (generosx == null) {
      var texto =
        "<strong>Ocasión:</strong> " +
        ocasionx?.name +
        "<br/>" +
        "<br/>" +
        (observacionesx != undefined
          ? " <strong>Observaciones:</strong> " + observacionesx
          : "");
    } else if (observacionesx == null) {
      var texto =
        "<strong>Ocasión:</strong> " +
        ocasionx?.name +
        "<br/>" +
        (generosx != undefined
          ? " <strong>Genero:</strong> " + generosx?.name
          : "") +
        "<br/>";
    } else {
      var texto =
        "<strong>Ocasión:</strong> " +
        ocasionx?.name +
        "<br/>" +
        (generosx != undefined
          ? " <strong>Genero:</strong> " + generosx?.name
          : "") +
        "<br/>" +
        (observacionesx != undefined
          ? " <strong>Observaciones:</strong> " + observacionesx
          : "");
    }

    const preference = {
      titulo: "Opciones de personalizacion ",
      subtitulo: texto,
      valorUnitarioSinIva: 0,
      valorIva: 0,
      porcentajeIva: 0,
      precioTotalConIva: 0,
      imagen: "",
      tipo: "opcionPersonalizacion",
      paraProduccion: true,
      cantidad: 1,
    };

    // Buscar si ya existe una preferencia de personalización
    let index = this.productPreference.findIndex(
      (p) => p.titulo === preference.titulo,
    );
    
    if (index === -1) {
      // No existe, agregar nueva preferencia
      this.productPreference.push(preference);
      console.log('✅ Nueva preferencia de personalización agregada');
    } else {
      // Ya existe, actualizar la existente
      this.productPreference[index] = preference;
      console.log('✅ Preferencia de personalización actualizada');
    }
    
    console.log('📋 Total de preferencias después de procesar:', this.productPreference.length);
  }

  addAdicionToProduct(adicion: any) {
    this.baseValorUnitarioSinIva = adicion.precioUnitario || 0;
    this.basePrecioTotalConIva = adicion.precioTotal || 0;
    this.baseValorIva = adicion.precioIva || 0;
    adicion["seleccionado"] = !adicion["seleccionado"];
    delete adicion.descripcion;
    const preference = {
      titulo: adicion.titulo,
      subtitulo: adicion.titulo,
      valorUnitarioSinIva: adicion.precioUnitario || 0,
      valorIva: adicion.precioIva || 0,
      porcentajeIva: adicion.porcentajeIVA || 0,
      precioTotalConIva: adicion.precioTotal || 0,
      imagen: adicion.imagenPrincipal?.[0]?.urls || 'assets/images/other-images/sinimagen.webp',
      tipo: "adicion",
      cantidad: 1,
      paraProduccion: true,
      referencia: adicion,
    };

    const index = this.productPreference.findIndex(
      (p) => p.titulo === adicion.titulo,
    );
    if (index !== -1) {
      this.productPreference.splice(index, 1);
      return;
    }
    this.productPreference.push(preference);
    this.sumar();
  }

  incrementarCantidad(item: any): void {
    item.cantidad = (item.cantidad || 0) + 1;
    item.valorUnitarioSinIva =
      item.referencia.precioUnitario * (item.cantidad || 0);
    item.valorIva = item.referencia.precioIva * (item.cantidad || 0);
    item.precioTotalConIva = item.referencia.precioTotal * (item.cantidad || 0);
    this.sumar();
  }

  decrementarCantidad(item: any): void {
    if (item.cantidad > 0) {
      item.cantidad = (item.cantidad || 0) - 1;
      item.valorUnitarioSinIva =
        item.referencia.precioUnitario * (item.cantidad || 0);
      item.valorIva = item.referencia.precioIva * (item.cantidad || 0);
      item.precioTotalConIva =
        item.referencia.precioTotal * (item.cantidad || 0);
    } else {
      this.productPreference.splice(
        this.productPreference.indexOf(
          this.productPreference.find((x) => x.titulo == item.titulo),
        ),
        1,
      );
    }
    this.sumar();
  }

  // Mantener solo esta implementación del método
  hasAdicion(): boolean {
    return this.productPreference.some(
      (preference) => preference.tipo === "adicion",
    );
  }

  hasOpcionesPersonalizacion(): boolean {
    return this.productPreference.some(
      (preference) => preference.tipo === "opcionPersonalizacion",
    );
  }

  hasPreferencia(): boolean {
    // console.log(this.productPreference)
    return this.productPreference.some(
      (preference) => preference.tipo === "preferencia",
    );
  }

  get tarjetas() {
    if (!this.isOnlyOneTarjeta) {
      return this.tarjetasForm.get("tarjetas") as FormArray;
    } else {
      if ((this.tarjetasForm.get("tarjetas") as FormArray).length == 1) {
        return this.tarjetasForm.get("tarjetas") as FormArray;
      } else {
        this.tarjetasForm = this.fb.group({
          tarjetas: this.fb.array([]),
        });
        const tarjeta = this.fb.group({
          para: ["", Validators.required],
          mensaje: ["", Validators.required],
          de: ["", Validators.required],
        });
        const tarjetas = this.tarjetasForm.get("tarjetas") as FormArray;
        tarjetas.push(tarjeta);
        this.cantidadTarjetas = 1;
        return this.tarjetasForm.get("tarjetas") as FormArray;
      }
    }
  }

  addTarjeta() {
    const tarjeta = this.fb.group({
      para: ["", Validators.required],
      mensaje: ["", Validators.required],
      de: ["", Validators.required],
    });

    this.tarjetas.push(tarjeta);

    // Añadir un nuevo elemento al array de control de tarjetas mostradas
    this.tarjetaMostrada.push(false);
  }

  removeTarjetaForm(index: number) {
    if (this.cantidadTarjetas > 1) {
      this.tarjetas.removeAt(index);
      this.cantidadTarjetas--;

      // También eliminar el control de visibilidad correspondiente
      this.tarjetaMostrada.splice(index, 1);
    }
  }

  enterStep($event: MovingDirection, index: number) {
    if (index == 2) {
      this.actualizarTodosLosInputsCantidad();
    }
    console.log($event);
    this.sumar();
  }
  sumar1(): number {
    this.checkPriceScale();
    const resultado = this.cantidadControl?.nativeElement?.value;
    if (resultado == null || resultado == undefined || resultado == "") {
      return 0; // Devuelve 0 si el resultado es nulo o indefinido
    } else {
      return resultado;
    }
  }
  checkPriceScale() {
    // 🔒 PRIMERO: Verificar si hay precio por categoría de cliente (tiene prioridad y NO escala por volumen)
    const precioCategoria = this.obtenerPrecioPorCategoria();
    if (precioCategoria !== null) {
      this.precioproducto = precioCategoria;
      return this.precioproducto;
    }

    // Si no hay precio por categoría, usar lógica de precios por volumen
    if (
      this.producto?.precio?.preciosVolumen &&
      this.producto.precio.preciosVolumen.length > 0
    ) {
      const cantidad = parseInt(
        this.cantidadControl?.nativeElement?.value || "0",
      );
      const precioVolumen = this.producto.precio.preciosVolumen.find(
        (x) =>
          cantidad >= x.numeroUnidadesInicial &&
          cantidad <= x.numeroUnidadesLimite,
      );
      this.precioproducto = precioVolumen
        ? precioVolumen.valorUnitarioPorVolumenConIVA
        : this.producto.precio?.precioUnitarioConIva;
    } else {
      this.precioproducto = this.producto?.precio?.precioUnitarioConIva;
    }
    return this.precioproducto;
  }

  /**
   * Obtiene el precio por categoría de cliente si existe.
   * Retorna null si no hay categoría o no hay precio configurado.
   */
  private obtenerPrecioPorCategoria(): number | null {
    // 1. Obtener cliente desde sessionStorage
    let cliente: any = null;
    try {
      const clienteStr = sessionStorage.getItem('cliente');
      if (clienteStr) {
        cliente = JSON.parse(clienteStr);
      }
    } catch (e) {
      return null;
    }

    // 2. Verificar si el cliente tiene categoría
    const categoriaId = cliente?.categoria?.id;
    if (!categoriaId) {
      return null;
    }

    // 3. Verificar si el producto tiene precios por tipo de cliente
    const preciosPorTipo = this.producto?.preciosPorTipoCliente;
    if (!preciosPorTipo || !Array.isArray(preciosPorTipo) || preciosPorTipo.length === 0) {
      return null;
    }

    // 4. Buscar precio para la categoría del cliente
    const precioCategoria = preciosPorTipo.find(
      (p: any) => p.tipoClienteId === categoriaId && p.activo === true
    );

    // 5. Retornar precio de categoría o null
    return precioCategoria?.precioConIva || null;
  }

  getMultiplicador() {
    const resultadoSumar1 = this.sumar1();
    if (
      resultadoSumar1 !== undefined &&
      resultadoSumar1 !== null &&
      resultadoSumar1 !== 0
    ) {
      return resultadoSumar1;
    } else {
      return this.producto?.disponibilidad?.cantidadMinVenta;
    }
  }
  sumar() {
    let quantity = this.cantidadControl?.nativeElement?.value;
    if (quantity == undefined) {
      quantity = 1;
    }

    // Asegurar que precioproducto esté actualizado (considera categoría y volumen)
    this.checkPriceScale();

    this.sumaTotalProducto = (this.precioproducto || 0) * quantity;
    this.sumaTotalAdiciones =
      (this.getBigTotalProductWithPreferenceAndAdictions() -
        (this.precioproducto || 0)) *
      quantity;

    this.sumaTotal =
      this.getBigTotalProductWithPreferenceAndAdictions() * quantity;
  }

  katuqIntelligeceResponse(event: any) {
    console.log(event);
    const tarjeta = event.objectToText as FormGroup;
    const mensaje = tarjeta.get("mensaje") as FormControl;
    mensaje.setValue(event.respuesta.message);
  }

  getKatuqPrompt() {
    const descripcion = this.producto?.crearProducto?.descripcion;

    return `haz un mesaje bonito para una tarjeta referente a la descripcion de este producto ${descripcion}`;
  }

  // Método para alternar la visibilidad del mensaje de la tarjeta
  toggleTarjeta(index: number): void {
    if (!this.tarjetaMostrada[index]) {
      this.tarjetaMostrada[index] = true;
    } else {
      this.tarjetaMostrada[index] = false;
    }
  }

  /**
   * Cuenta el número de adiciones en las preferencias del producto
   * @returns Cantidad de adiciones
   */
  getAdicionesCount(): number {
    if (!this.productPreference) return 0;
    return this.productPreference.filter((p) => p.tipo === "adicion").length;
  }

  /**
   * Obtiene un resumen corto de la descripción del producto
   * @param descripcion Descripción completa del producto en HTML
   * @returns Resumen de la descripción limitado a los primeros párrafos
   */
  getDescriptionSummary(descripcion: string): string {
    if (!descripcion) return "";

    // Si la descripción es HTML, extraer solo el texto
    let plainText = "";

    try {
      // Crear un elemento temporal
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = descripcion;

      // Obtener todos los párrafos
      const paragraphs = tempDiv.querySelectorAll("p");

      // Tomar solo el primer párrafo o los primeros 150 caracteres
      if (paragraphs.length > 0) {
        plainText = paragraphs[0].textContent || "";

        // Si es muy corto, añadir algo más del segundo párrafo
        if (plainText.length < 100 && paragraphs.length > 1) {
          plainText += " " + (paragraphs[1].textContent || "");
        }
      } else {
        // Si no hay párrafos, usar el texto completo
        plainText = tempDiv.textContent || "";
      }

      // Limitar a ~150 caracteres y añadir puntos suspensivos
      if (plainText.length > 150) {
        plainText = plainText.substring(0, 150) + "...";
      }

      return plainText;
    } catch (e) {
      // Si hay algún error procesando el HTML, devolver fragmento limitado
      return descripcion.substring(0, 150) + "...";
    }
  }

  /**
   * Verifica si el botón de agregar al carrito debe estar habilitado
   * @returns true si el botón debe estar habilitado, false en caso contrario
   */
  isCartButtonDisabled(): boolean {
    // Verificar si hay error en la carga de datos maestros
    if (this.errorCargaDatosMaestros) {
      return true;
    }

    // Verificar si no hay formas de entrega disponibles
    if (
      this.producto?.procesoComercial?.llevaCalendario &&
      (!this.formasEntregaProducto || this.formasEntregaProducto.length === 0)
    ) {
      return true;
    }

    // Verificar formulario datosEntrega pero solo los campos que aplican según la configuración
    let datosEntregaInvalid = false;

    // Solo validar fechaEntrega si llevaCalendario es true
    if (this.producto?.procesoComercial?.llevaCalendario) {
      if (!this.datosEntrega.get("fechaEntrega")?.value)
        datosEntregaInvalid = true;
      if (!this.datosEntrega.get("formaEntrega")?.value)
        datosEntregaInvalid = true;
      if (!this.datosEntrega.get("horarioEntrega")?.value)
        datosEntregaInvalid = true;
    }

    // Solo validar colores si aceptaColorDecoracion es true
    if (this.producto?.procesoComercial?.aceptaColorDecoracion) {
      const colores = this.datosEntrega.get("colores")?.value;
      if (!colores || colores.length === 0) datosEntregaInvalid = true;
    }

    // Validar género si es requerido (usando la propiedad computada hasAceptaGenero)
    if (this.hasAceptaGenero) {
      if (!this.datosEntrega.get("genero")?.value) datosEntregaInvalid = true;
    }

    // Validar ocasión si es requerida (usando la propiedad computada hasAceptaOcasion)
    if (this.hasAceptaOcasion) {
      if (!this.datosEntrega.get("ocasion")?.value) datosEntregaInvalid = true;
    }

    // Validar observaciones si son requeridas (validación silenciosa para estado del botón)
    if (
      this.producto?.procesoComercial?.aceptaComentarios &&
      !this.datosEntrega.get("observaciones")?.value
    ) {
      datosEntregaInvalid = true;
    }

    // Verificar tarjetas solo si llevaTarjeta es true
    const tarjetasRequeridas =
      this.producto?.procesoComercial?.llevaTarjeta &&
      !this.SinTarjeta &&
      this.tarjetas.length === 0;

    // Si tiene tarjetas, verificar que estén completas
    let tarjetasInvalidas = false;
    if (
      this.producto?.procesoComercial?.llevaTarjeta &&
      !this.SinTarjeta &&
      this.tarjetas.length > 0
    ) {
      this.tarjetas.controls.forEach((tarjetaGroup) => {
        if (tarjetaGroup.invalid) {
          tarjetasInvalidas = true;
        }
      });
    }

    // Verificar preferencias solo si aceptaVariable es true
    const preferenciasRequeridas =
      this.producto?.procesoComercial?.aceptaVariable && !this.hasPreferencia();

    // Verificar disponibilidad de stock
    const stockNoDisponible = this.isStockUnavailable();

    // Resultado final
    const isDisabled =
      datosEntregaInvalid ||
      tarjetasRequeridas ||
      tarjetasInvalidas ||
      preferenciasRequeridas ||
      stockNoDisponible;

    return isDisabled;
  }

  /**
   * Muestra información de depuración para ayudar a identificar por qué el botón está deshabilitado
   */
  showDebugInfo(): void {
    // Construir mensaje de diagnóstico
    let debugMessage = "<strong>Diagnóstico de validación:</strong><br><br>";
    let errorEncontrado = false;

    // Verificar estado de datos maestros primero
    debugMessage += "<strong>Estado de datos maestros:</strong><br>";
    debugMessage += `- Datos maestros cargados: ${this.datosMaestrosCargados ? '<span class="text-success">Sí</span>' : '<span class="text-danger">No</span>'}<br>`;
    debugMessage += `- Error en carga: ${this.errorCargaDatosMaestros ? '<span class="text-danger">Sí</span>' : '<span class="text-success">No</span>'}<br>`;
    debugMessage += `- Tipos de entrega: ${this.tipoEntrega && this.tipoEntrega.length > 0 ? '<span class="text-success">Cargados (' + this.tipoEntrega.length + ")</span>" : '<span class="text-danger">No cargados</span>'}<br>`;
    debugMessage += `- Formas de entrega: ${this.formasEntrega && this.formasEntrega.length > 0 ? '<span class="text-success">Cargadas (' + this.formasEntrega.length + ")</span>" : '<span class="text-danger">No cargadas</span>'}<br>`;
    debugMessage += `- Formas de entrega del producto: ${this.formasEntregaProducto && this.formasEntregaProducto.length > 0 ? '<span class="text-success">Disponibles (' + this.formasEntregaProducto.length + ")</span>" : '<span class="text-danger">No disponibles</span>'}<br>`;
    debugMessage += `- Géneros: ${this.generos && this.generos.length > 0 ? '<span class="text-success">Cargados (' + this.generos.length + ")</span>" : '<span class="text-warning">No cargados</span>'}<br>`;
    debugMessage += `- Ocasiones: ${this.ocasiones && this.ocasiones.length > 0 ? '<span class="text-success">Cargadas (' + this.ocasiones.length + ")</span>" : '<span class="text-warning">No cargadas</span>'}<br><br>`;

    if (this.errorCargaDatosMaestros) {
      debugMessage +=
        '→ <span class="text-danger"><strong>Los datos maestros no se han cargado correctamente. Esto impide la configuración del producto.</strong></span><br><br>';
      errorEncontrado = true;
    }

    if (
      this.producto?.procesoComercial?.llevaCalendario &&
      (!this.formasEntregaProducto || this.formasEntregaProducto.length === 0)
    ) {
      debugMessage +=
        '→ <span class="text-danger"><strong>No hay formas de entrega disponibles para este producto.</strong></span><br><br>';
      errorEncontrado = true;
    }

    // Verificar datosEntrega pero solo campos que son realmente requeridos
    debugMessage += "<strong>Configuración del producto:</strong><br>";
    if (this.producto?.procesoComercial) {
      const pc = this.producto.procesoComercial;
      debugMessage += `- llevaCalendario: ${pc.llevaCalendario ? '<span class="text-success">Sí</span>' : '<span class="text-secondary">No</span>'}<br>`;
      debugMessage += `- aceptaColorDecoracion: ${pc.aceptaColorDecoracion ? '<span class="text-success">Sí</span>' : '<span class="text-secondary">No</span>'}<br>`;
      debugMessage += `- aceptaComentarios: ${pc.aceptaComentarios ? '<span class="text-success">Sí</span>' : '<span class="text-secondary">No</span>'}<br>`;
      debugMessage += `- aceptaGenero (computed): ${this.hasAceptaGenero ? '<span class="text-success">Sí</span>' : '<span class="text-secondary">No</span>'}<br>`;
      debugMessage += `- aceptaOcasion (computed): ${this.hasAceptaOcasion ? '<span class="text-success">Sí</span>' : '<span class="text-secondary">No</span>'}<br>`;
      debugMessage += `- llevaTarjeta: ${pc.llevaTarjeta ? '<span class="text-success">Sí</span>' : '<span class="text-secondary">No</span>'}<br>`;
      debugMessage += `- aceptaVariable: ${pc.aceptaVariable ? '<span class="text-success">Sí</span>' : '<span class="text-secondary">No</span>'}<br><br>`;
    }

    // Verificar campos que son requeridos según la configuración del producto
    debugMessage += "<strong>Estado de campos requeridos:</strong><br>";

    // Calendario, forma y horario entrega
    if (this.producto?.procesoComercial?.llevaCalendario) {
      const fechaEntrega = this.datosEntrega.get("fechaEntrega")?.value;
      const formaEntrega = this.datosEntrega.get("formaEntrega")?.value;
      const horarioEntrega = this.datosEntrega.get("horarioEntrega")?.value;

      debugMessage += `- Fecha de entrega: ${fechaEntrega ? '<span class="text-success">Completado</span>' : '<span class="text-danger">Faltante</span>'}<br>`;
      debugMessage += `- Forma de entrega: ${formaEntrega ? '<span class="text-success">Completado</span>' : '<span class="text-danger">Faltante</span>'}<br>`;
      debugMessage += `- Horario de entrega: ${horarioEntrega ? '<span class="text-success">Completado</span>' : '<span class="text-danger">Faltante</span>'}<br>`;

      if (!fechaEntrega || !formaEntrega || !horarioEntrega) {
        errorEncontrado = true;
      }
    }

    // Colores
    if (this.producto?.procesoComercial?.aceptaColorDecoracion) {
      const colores = this.datosEntrega.get("colores")?.value;
      debugMessage += `- Colores: ${colores && colores.length > 0 ? '<span class="text-success">Seleccionados</span>' : '<span class="text-danger">Faltantes</span>'}<br>`;

      if (!colores || colores.length === 0) {
        errorEncontrado = true;
      }
    }

    // Género
    if (this.hasAceptaGenero) {
      const genero = this.datosEntrega.get("genero")?.value;
      debugMessage += `- Género: ${genero ? '<span class="text-success">Seleccionado</span>' : '<span class="text-danger">Faltante</span>'}<br>`;

      if (!genero) {
        errorEncontrado = true;
      }
    }

    // Ocasión
    if (this.hasAceptaOcasion) {
      const ocasion = this.datosEntrega.get("ocasion")?.value;
      debugMessage += `- Ocasión: ${ocasion ? '<span class="text-success">Seleccionada</span>' : '<span class="text-danger">Faltante</span>'}<br>`;

      if (!ocasion) {
        errorEncontrado = true;
      }
    }

    // Observaciones
    if (this.producto?.procesoComercial?.aceptaComentarios) {
      const observaciones = this.datosEntrega.get("observaciones")?.value;
      debugMessage += `- Observaciones: ${observaciones ? '<span class="text-success">Completadas</span>' : '<span class="text-danger">Faltantes</span>'}<br>`;

      if (!observaciones) {
        errorEncontrado = true;
      }
    }

    debugMessage += "<br>";

    // Verificar tarjetas
    if (this.producto?.procesoComercial?.llevaTarjeta) {
      debugMessage += "<strong>Estado de tarjetas:</strong><br>";
      debugMessage += `- Opción "Sin Tarjeta" seleccionada: ${this.SinTarjeta ? '<span class="text-success">Sí</span>' : '<span class="text-secondary">No</span>'}<br>`;

      if (!this.SinTarjeta) {
        debugMessage += `- Número de tarjetas: ${this.tarjetas.length}<br>`;

        if (this.tarjetas.length === 0) {
          debugMessage +=
            '→ <span class="text-danger">Debe agregar al menos una tarjeta o marcar "Sin Tarjeta"</span><br>';
          errorEncontrado = true;
        } else {
          let tarjetasInvalidas = false;
          this.tarjetas.controls.forEach((tarjetaGroup, index) => {
            if (tarjetaGroup.invalid) {
              tarjetasInvalidas = true;
              errorEncontrado = true;
              debugMessage += `- Tarjeta ${index + 1} tiene campos incompletos: `;
              Object.keys(tarjetaGroup["controls"]).forEach((key) => {
                const control = tarjetaGroup.get(key);
                if (control?.invalid) {
                  debugMessage += `${key}, `;
                }
              });
              debugMessage = debugMessage.slice(0, -2) + "<br>"; // Eliminar última coma
            }
          });

          if (tarjetasInvalidas) {
            debugMessage +=
              '→ <span class="text-danger">Debe completar todos los campos de las tarjetas</span><br>';
          } else {
            debugMessage +=
              '→ <span class="text-success">Todas las tarjetas están completas</span><br>';
          }
        }
      } else {
        debugMessage +=
          '→ <span class="text-success">No requiere tarjetas (opción "Sin Tarjeta" seleccionada)</span><br>';
      }

      debugMessage += "<br>";
    }

    // Verificar preferencias
    if (this.producto?.procesoComercial?.aceptaVariable) {
      debugMessage += "<strong>Estado de preferencias:</strong><br>";
      const tienePreferencias = this.hasPreferencia();
      debugMessage += `- Tiene preferencias seleccionadas: ${tienePreferencias ? '<span class="text-success">Sí</span>' : '<span class="text-danger">No</span>'}<br>`;
      debugMessage += `- Número de preferencias: ${this.productPreference.filter((p) => p.tipo === "preferencia").length}<br>`;

      if (!tienePreferencias) {
        debugMessage +=
          '→ <span class="text-danger">Debe seleccionar al menos una preferencia</span><br>';
        errorEncontrado = true;
      }

      debugMessage += "<br>";
    }

    if (!errorEncontrado && !this.errorCargaDatosMaestros) {
      debugMessage +=
        '<br><strong class="text-success">No se encontraron errores específicos. Posible problema de validación interna.</strong><br>';
      debugMessage +=
        '<button id="swal-try-fix" class="btn btn-sm btn-primary mt-2">Intentar arreglar automáticamente</button>';
    } else if (this.errorCargaDatosMaestros) {
      debugMessage +=
        '<br><strong class="text-danger">Error principal: Datos maestros no cargados</strong><br>';
      debugMessage +=
        '<button id="swal-retry-masters" class="btn btn-sm btn-warning mt-2">Reintentar carga de datos maestros</button>';
    }

    // Agregar un resumen del estado de validación
    debugMessage += "<br><strong>Resumen de validación:</strong><br>";
    debugMessage += `- isCartButtonDisabled(): ${this.isCartButtonDisabled() ? '<span class="text-danger">Botón deshabilitado</span>' : '<span class="text-success">Botón habilitado</span>'}<br>`;

    // Mostrar mensaje usando Swal
    Swal.fire({
      title: "Información de depuración",
      html: debugMessage,
      icon: this.errorCargaDatosMaestros ? "error" : "info",
      confirmButtonText: "Cerrar",
      didOpen: () => {
        // Agregar event listener al botón de arreglo automático
        const fixButton = document.getElementById("swal-try-fix");
        if (fixButton) {
          fixButton.addEventListener("click", () => {
            this.tryToFixFormAutomatically();
            Swal.close();
          });
        }

        // Agregar event listener al botón de reintentar datos maestros
        const retryButton = document.getElementById("swal-retry-masters");
        if (retryButton) {
          retryButton.addEventListener("click", () => {
            this.reintentarCargaDatosMaestros();
            Swal.close();
          });
        }
      },
    });
  }

  /**
   * Intenta corregir automáticamente los problemas de validación del formulario
   */
  tryToFixFormAutomatically(): void {
    console.log("Intentando corregir automáticamente el formulario...");

    // 1. Revisar si tenemos problema de tarjetas
    if (
      this.producto?.procesoComercial?.llevaTarjeta &&
      this.tarjetas.length === 0
    ) {
      // Activar "Sin Tarjeta" automáticamente
      this.SinTarjeta = true;
      console.log('Se activó "Sin Tarjeta" automáticamente');
      this.toastrService.info(
        'Se activó "Sin Tarjeta" automáticamente',
        "Corrección aplicada",
      );
    }

    // 2. Si hay tarjetas incompletas, intentar llenarlas con valores predeterminados
    if (this.tarjetas.length > 0 && !this.SinTarjeta) {
      let tarjetasActualizadas = false;
      this.tarjetas.controls.forEach((tarjetaGroup) => {
        if (tarjetaGroup.invalid) {
          Object.keys(tarjetaGroup["controls"]).forEach((key) => {
            const control = tarjetaGroup.get(key);
            if (control?.invalid) {
              // Valores predeterminados según el campo
              if (key === "para") control.setValue("Cliente");
              if (key === "mensaje")
                control.setValue("¡Felicidades por tu compra!");
              if (key === "de") control.setValue("Tienda");
              control.markAsTouched();
              tarjetasActualizadas = true;
            }
          });
        }
      });

      if (tarjetasActualizadas) {
        console.log(
          "Se actualizaron tarjetas automáticamente con valores predeterminados",
        );
        this.toastrService.info(
          "Se actualizaron tarjetas con valores predeterminados",
          "Corrección aplicada",
        );
      }
    }

    // 3. Re-evaluar todas las validaciones
    this.markAllFieldsAsTouched();

    // 4. Verificar si el botón ya se puede habilitar
    const isStillDisabled = this.isCartButtonDisabled();
    if (isStillDisabled) {
      this.toastrService.warning(
        "Se realizaron algunas correcciones, pero aún faltan campos por completar",
        "Corrección parcial",
      );
    } else {
      this.toastrService.success(
        "El formulario ahora es válido, puede agregar al carrito",
        "Corrección completada",
      );
    }
  }

  /**
   * Obtiene la clase CSS para el estado del stock
   */
  getStockStatusClass(): string {
    if (!this.producto?.disponibilidad?.inventariable) {
      return "text-muted";
    }

    const stockDisponible =
      this.producto.disponibilidad?.cantidadDisponible || 0;

    if (stockDisponible === 0) {
      return "text-danger fw-bold";
    } else if (stockDisponible <= 5) {
      return "text-warning fw-bold";
    } else {
      return "text-success";
    }
  }

  /**
   * Obtiene el texto a mostrar para el stock
   */
  getStockDisplayText(): string {
    if (!this.producto?.disponibilidad?.inventariable) {
      return "No aplica control de inventario";
    }

    const stockDisponible =
      this.producto.disponibilidad?.cantidadDisponible || 0;

    if (stockDisponible === 0) {
      return "Sin stock disponible";
    } else {
      return `${stockDisponible} unidades disponibles`;
    }
  }

  /**
   * Obtiene el mensaje de tooltip para el estado del stock
   */
  getStockStatusMessage(): string {
    if (!this.producto?.disponibilidad?.inventariable) {
      return "Este producto no maneja control de inventario";
    }

    const stockDisponible =
      this.producto.disponibilidad?.cantidadDisponible || 0;

    if (stockDisponible === 0) {
      return "No hay unidades disponibles para este producto";
    } else if (stockDisponible <= 5) {
      return `Stock limitado: solo ${stockDisponible} unidades disponibles`;
    } else {
      return `Stock disponible: ${stockDisponible} unidades`;
    }
  }

  /**
   * Determina si debe mostrarse la alerta de stock
   */
  shouldShowStockAlert(): boolean {
    if (!this.producto?.disponibilidad?.inventariable) {
      return false;
    }

    const stockDisponible =
      this.producto.disponibilidad?.cantidadDisponible || 0;
    return stockDisponible <= 5; // Mostrar alerta cuando hay 5 o menos unidades
  }

  /**
   * Obtiene la clase CSS para la alerta de stock
   */
  getStockAlertClass(): string {
    const stockDisponible =
      this.producto.disponibilidad?.cantidadDisponible || 0;

    if (stockDisponible === 0) {
      return "alert alert-danger";
    } else if (stockDisponible <= 3) {
      return "alert alert-warning";
    } else {
      return "alert alert-info";
    }
  }

  /**
   * Obtiene el icono para la alerta de stock
   */
  getStockAlertIcon(): string {
    const stockDisponible =
      this.producto.disponibilidad?.cantidadDisponible || 0;

    if (stockDisponible === 0) {
      return "fa fa-exclamation-triangle";
    } else if (stockDisponible <= 3) {
      return "fa fa-exclamation-circle";
    } else {
      return "fa fa-info-circle";
    }
  }

  /**
   * Obtiene el mensaje para la alerta de stock
   */
  getStockAlertMessage(): string {
    const stockDisponible =
      this.producto.disponibilidad?.cantidadDisponible || 0;

    if (stockDisponible === 0) {
      return "Este producto está agotado. No se puede agregar al carrito.";
    } else if (stockDisponible === 1) {
      return "¡Última unidad disponible! Apresúrate antes de que se agote.";
    } else if (stockDisponible <= 3) {
      return `¡Solo quedan ${stockDisponible} unidades! Stock muy limitado.`;
    } else {
      return `Quedan ${stockDisponible} unidades disponibles.`;
    }
  }

  /**
   * Verifica si el stock no está disponible
   */
  isStockUnavailable(): boolean {
    if (!this.producto?.disponibilidad?.inventariable) {
      return false; // Si no maneja inventario, no hay restricción
    }

    const stockDisponible =
      this.producto.disponibilidad?.cantidadDisponible || 0;
    return stockDisponible === 0;
  }

  /**
   * Verifica si la cantidad actual está en el máximo del stock
   */
  isQuantityAtMaxStock(): boolean {
    if (!this.producto?.disponibilidad?.inventariable) {
      return false;
    }

    const stockDisponible =
      this.producto.disponibilidad?.cantidadDisponible || 0;
    return this.cantidad >= stockDisponible;
  }

  /**
   * Obtiene el tooltip para el botón de cantidad
   */
  getQuantityButtonTooltip(): string {
    if (this.isStockUnavailable()) {
      return "No hay stock disponible";
    } else if (this.isQuantityAtMaxStock()) {
      return "Has alcanzado el máximo stock disponible";
    }
    return "Aumentar cantidad";
  }

  /**
   * Obtiene la clase CSS para el botón del carrito
   */
  getCartButtonClass(): string {
    if (this.isStockUnavailable()) {
      return "btn btn-danger";
    } else if (this.isCartButtonDisabled()) {
      return "btn btn-secondary";
    } else {
      return "btn btn-primary";
    }
  }

  /**
   * Métodos para el carrito flotante mejorado
   */

  /**
   * Alterna entre minimizar y expandir el carrito flotante
   */
  toggleMinimizeCart(): void {
    this.isCartMinimized = !this.isCartMinimized;
    if (this.isCartMinimized) {
      this.isCartExpanded = false;
    }
  }

  /**
   * Alterna la vista expandida del carrito (mostrando desglose de precios)
   */
  toggleExpandCart(): void {
    if (!this.isCartMinimized) {
      this.isCartExpanded = !this.isCartExpanded;
    }
  }

  /**
   * Obtiene la clase CSS para el botón compacto del carrito
   */
  getCompactCartButtonClass(): string {
    if (this.isStockUnavailable()) {
      return "btn-compact-cart disabled danger";
    } else if (this.isCartButtonDisabled()) {
      return "btn-compact-cart disabled";
    } else {
      return "btn-compact-cart primary";
    }
  }

  /**
   * Valida que los datos maestros estén completos
   */
  private validarDatosMaestros(datos: any): boolean {
    // Siempre son indispensables para cualquier producto
    const camposRequeridos: string[] = [
      "tipoEntrega",
      "tiempoEntrega",
      "formaEntrega",
    ];

    // Coincidir con la misma lógica de `validarDatosMaestros`
    if (this.hasAceptaGenero) {
      camposRequeridos.push("generos");
    }
    if (this.hasAceptaOcasion) {
      camposRequeridos.push("ocasiones");
    }

    const camposFaltantes: string[] = [];

    camposRequeridos.forEach((campo) => {
      if (
        !datos[campo] ||
        (Array.isArray(datos[campo]) && datos[campo].length === 0)
      ) {
        camposFaltantes.push(campo);
      }
    });

    if (camposFaltantes.length > 0) {
      console.error("Faltan datos maestros:", camposFaltantes);
      return false;
    }

    return true;
  }

  /**
   * Muestra un error detallado cuando faltan datos maestros
   */
  private mostrarErrorDatosMaestros(datos: any): void {
    const camposRequeridos = [
      "tipoEntrega",
      "tiempoEntrega",
      "generos",
      "ocasiones",
      "formaEntrega",
    ];
    const camposFaltantes: string[] = [];

    camposRequeridos.forEach((campo) => {
      if (
        !datos[campo] ||
        (Array.isArray(datos[campo]) && datos[campo].length === 0)
      ) {
        camposFaltantes.push(campo);
      }
    });

    let mensaje =
      "No se pudieron cargar los datos de configuración necesarios. ";

    if (camposFaltantes.includes("formaEntrega")) {
      mensaje += "Las formas de entrega no están disponibles. ";
    }

    if (camposFaltantes.includes("tipoEntrega")) {
      mensaje += "Los tipos de entrega no están disponibles. ";
    }

    mensaje +=
      "Por favor, contacte al administrador o intente recargar la página.";

    this.toastrService.error(mensaje, "Error de Configuración", {
      timeOut: 8000,
      progressBar: true,
      positionClass: "toast-top-right",
      closeButton: true,
    });

    // También mostrar un Swal para mayor visibilidad
    Swal.fire({
      title: "Error de Configuración",
      html: `
        <div class="text-start">
          <p>No se pudieron cargar los datos de configuración del producto:</p>
          <ul class="text-start">
            ${camposFaltantes.map((campo) => `<li>${this.getNombreCampo(campo)}</li>`).join("")}
          </ul>
          <p class="mt-3"><strong>¿Qué puedes hacer?</strong></p>
          <ul class="text-start">
            <li>Recargar la página</li>
            <li>Contactar al administrador</li>
            <li>Intentar con otro producto</li>
          </ul>
        </div>
      `,
      icon: "error",
      confirmButtonText: "Recargar Página",
      showCancelButton: true,
      cancelButtonText: "Cerrar",
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#6c757d",
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.reload();
      }
    });
  }

  /**
   * Obtiene el nombre legible de un campo
   */
  private getNombreCampo(campo: string): string {
    const nombres = {
      tipoEntrega: "Tipos de entrega",
      tiempoEntrega: "Tiempos de entrega",
      generos: "Géneros",
      ocasiones: "Ocasiones",
      formaEntrega: "Formas de entrega",
      adiciones: "Adiciones",
    };

    return nombres[campo] || campo;
  }

  /**
   * 🔄 Método mejorado para reintentar la carga de datos maestros
   */
  public reintentarCargaDatosMaestros(): void {
    console.log("🔄 Reintentando carga de datos maestros...");

    // Reset del estado
    this.errorCargaDatosMaestros = false;
    this.datosMaestrosCargados = false;
    this.maestrosCargando = true;
    this.reintentosCarga = 0; // Reset contador

    // Limpiar caché y forzar recarga
    this.pedidoUtilService.clearMaestrosCache();

    this.toastrService.info(
      "🔄 Reintentando cargar configuración...",
      "Reintentando",
    );

    // Reinicializar variables
    this.tipoEntrega = [];
    this.tiemposEntrega = [];
    this.generos = [];
    this.formasEntrega = [];

    // Usar el método mejorado de recarga forzada
    this.pedidoUtilService
      .forceReloadMaestros()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log("✅ Recarga forzada exitosa");
          this.procesarDatosMaestros(data, this.producto);
          this.datosMaestrosCargados = true;
          this.errorCargaDatosMaestros = false;
          this.maestrosCargando = false;

          this.toastrService.success(
            "✅ Configuración recargada exitosamente",
            "Éxito",
          );
        },
        error: (error) => {
          console.error("❌ Error en recarga forzada:", error);
          this.handleMaestrosError(error, this.producto);
        },
      });
  }

  /**
   * 📊 Obtiene información de diagnóstico de los maestros
   */
  public getMaestrosDiagnosticInfo(): any {
    return {
      // Estado actual
      datosMaestrosCargados: this.datosMaestrosCargados,
      errorCargaDatosMaestros: this.errorCargaDatosMaestros,
      maestrosCargando: this.maestrosCargando,
      reintentosCarga: this.reintentosCarga,

      // Estado del servicio
      maestrosState: this.maestrosState,

      // Datos cargados
      tipoEntregaCount: this.tipoEntrega?.length || 0,
      tiemposEntregaCount: this.tiemposEntrega?.length || 0,
      generosCount: this.generos?.length || 0,
      ocasionesCount: this.ocasiones?.length || 0,
      formasEntregaCount: this.formasEntrega?.length || 0,
      formasEntregaProductoCount: this.formasEntregaProducto?.length || 0,
      adicionesCount: this.adicionesrows?.length || 0,

      // Timestamp
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 🔧 Método de debugging para mostrar información detallada
   */
  public showMaestrosDebugInfo(): void {
    const diagnosticInfo = this.getMaestrosDiagnosticInfo();

    let debugMessage = '<div class="text-start">';
    debugMessage += "<h6>🔍 Información de Diagnóstico de Maestros</h6>";
    debugMessage += "<hr>";

    // Estado actual
    debugMessage += "<strong>📊 Estado Actual:</strong><br>";
    debugMessage += `- Datos cargados: ${diagnosticInfo.datosMaestrosCargados ? '<span class="text-success">✅ Sí</span>' : '<span class="text-danger">❌ No</span>'}<br>`;
    debugMessage += `- Error de carga: ${diagnosticInfo.errorCargaDatosMaestros ? '<span class="text-danger">❌ Sí</span>' : '<span class="text-success">✅ No</span>'}<br>`;
    debugMessage += `- Cargando: ${diagnosticInfo.maestrosCargando ? '<span class="text-warning">🔄 Sí</span>' : '<span class="text-secondary">⏸️ No</span>'}<br>`;
    debugMessage += `- Reintentos: ${diagnosticInfo.reintentosCarga}/${this.maxReintentos}<br><br>`;

    // Estado del servicio
    if (diagnosticInfo.maestrosState) {
      debugMessage += "<strong>🏗️ Estado del Servicio:</strong><br>";
      debugMessage += `- Loading: ${diagnosticInfo.maestrosState.loading ? "🔄" : "⏸️"}<br>`;
      debugMessage += `- Loaded: ${diagnosticInfo.maestrosState.loaded ? "✅" : "❌"}<br>`;
      debugMessage += `- Error: ${diagnosticInfo.maestrosState.error ? "❌" : "✅"}<br>`;
      debugMessage += `- Última actualización: ${diagnosticInfo.maestrosState.lastUpdate ? new Date(diagnosticInfo.maestrosState.lastUpdate).toLocaleString() : "N/A"}<br><br>`;
    }

    // Conteo de datos
    debugMessage += "<strong>📊 Datos Disponibles:</strong><br>";
    debugMessage += `- Tipos de entrega: ${diagnosticInfo.tipoEntregaCount}<br>`;
    debugMessage += `- Tiempos de entrega: ${diagnosticInfo.tiemposEntregaCount}<br>`;
    debugMessage += `- Géneros: ${diagnosticInfo.generosCount}<br>`;
    debugMessage += `- Ocasiones: ${diagnosticInfo.ocasionesCount}<br>`;
    debugMessage += `- Formas de entrega: ${diagnosticInfo.formasEntregaCount}<br>`;
    debugMessage += `- Formas entrega producto: ${diagnosticInfo.formasEntregaProductoCount}<br>`;
    debugMessage += `- Adiciones: ${diagnosticInfo.adicionesCount}<br><br>`;

    // Acciones disponibles
    debugMessage += "<strong>🔧 Acciones Disponibles:</strong><br>";
    debugMessage +=
      '<button id="swal-force-reload" class="btn btn-sm btn-primary me-2 mb-2">🔄 Recargar Maestros</button>';
    debugMessage +=
      '<button id="swal-clear-cache" class="btn btn-sm btn-warning me-2 mb-2">🧹 Limpiar Caché</button>';
    debugMessage +=
      '<button id="swal-test-service" class="btn btn-sm btn-info mb-2">🧪 Probar Servicio</button>';

    debugMessage += "</div>";

    Swal.fire({
      title: "🔍 Debug: Maestros",
      html: debugMessage,
      icon: "info",
      confirmButtonText: "Cerrar",
      width: "600px",
      didOpen: () => {
        // Event listeners para botones
        document
          .getElementById("swal-force-reload")
          ?.addEventListener("click", () => {
            this.reintentarCargaDatosMaestros();
            Swal.close();
          });

        document
          .getElementById("swal-clear-cache")
          ?.addEventListener("click", () => {
            this.pedidoUtilService.clearMaestrosCache();
            this.toastrService.info("🧹 Caché limpiado", "Cache");
            Swal.close();
          });

        document
          .getElementById("swal-test-service")
          ?.addEventListener("click", () => {
            this.testMaestrosService();
            Swal.close();
          });
      },
    });
  }

  /**
   * 🧪 Prueba el servicio de maestros
   */
  private testMaestrosService(): void {
    this.toastrService.info("🧪 Probando servicio de maestros...", "Testing");

    this.pedidoUtilService
      .getAllMaestro$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.toastrService.success(
            "✅ Servicio funcionando correctamente",
            "Test OK",
          );
          console.log("🧪 Test del servicio exitoso:", data);
        },
        error: (error) => {
          this.toastrService.error("❌ Error en el servicio", "Test Failed");
          console.error("🧪 Test del servicio falló:", error);
        },
      });
  }

  /**
   * 🎯 Verifica si el componente está listo para usar
   */
  public isComponentReady(): boolean {
    return (
      this.datosMaestrosCargados &&
      !this.errorCargaDatosMaestros &&
      !this.maestrosCargando &&
      this.formasEntregaProducto?.length > 0
    );
  }

  /**
   * 📊 Obtiene el estado actual del componente
   */
  public getComponentStatus(): string {
    if (this.maestrosCargando) return "loading";
    if (this.errorCargaDatosMaestros) return "error";
    if (this.datosMaestrosCargados && this.formasEntregaProducto?.length > 0)
      return "ready";
    if (this.datosMaestrosCargados && this.formasEntregaProducto?.length === 0)
      return "no-delivery-options";
    return "unknown";
  }

  /**
   * Asigna valores estándar a los datos de entrega cuando el producto no requiere calendario
   * • Fecha de entrega   → hoy
   * • Forma de entrega  → "Envío a Domicilio" (o primera coincidencia disponible)
   * • Horario de entrega → primer horario que incluya 8-6 pm o, en su defecto, primer horario disponible
   */
  private asignarDatosEntregaPorDefecto(): void {
    if (this.producto?.procesoComercial?.llevaCalendario) {
      return; // solo aplica cuando NO lleva calendario
    }

    // No sobre-escribir si el usuario ya seleccionó valores
    if (
      this.datosEntrega.get("fechaEntrega")?.value ||
      this.datosEntrega.get("formaEntrega")?.value ||
      this.datosEntrega.get("horarioEntrega")?.value
    ) {
      return;
    }

    const hoy = new Date();
    const fechaObj = {
      day: hoy.getDate(),
      month: hoy.getMonth() + 1,
      year: hoy.getFullYear(),
    };

    // Buscar forma "Envío a Domicilio" (case-insensitive)
    let formaDefault = this.formasEntregaProducto?.find(
      (f: any) =>
        typeof f?.nombre === "string" &&
        f.nombre.toLowerCase().includes("domicilio"),
    );
    if (!formaDefault && this.formasEntregaProducto?.length) {
      formaDefault = this.formasEntregaProducto[0];
    }

    // Horario: "LO MAS PRONTO POSIBLE" para productos sin calendario
    let horarioDefault = "LO MAS PRONTO POSIBLE";

    this.datosEntrega.patchValue({
      fechaEntrega: fechaObj,
      formaEntrega: formaDefault?.nombre || formaDefault,
      horarioEntrega: horarioDefault, // Si no se encuentra un horario válido, será null y el select quedará en "Seleccionar"
    });
  }

  /**
   * Verifica el estado de carga y proporciona feedback al usuario
   */
  public checkLoadingStatus(): void {
    console.log('📊 Estado de carga actual:');
    console.log('- Datos maestros cargados:', this.datosMaestrosCargados);
    console.log('- Error en carga de maestros:', this.errorCargaDatosMaestros);
    console.log('- Maestros cargando:', this.maestrosCargando);
    console.log('- Producto disponible:', !!this.producto);
    console.log('- Configuración de carrito:', !!this.configuracionCarrito);
    console.log('- Modo edición:', this.isEdit);
    
    if (this.maestrosCargando) {
      this.toastrService.info(
        'Cargando configuración del producto...',
        'Cargando',
        { timeOut: 2000 }
      );
    }
    
    if (this.errorCargaDatosMaestros) {
      this.toastrService.warning(
        'Hubo un problema cargando algunos datos. Algunas opciones pueden no estar disponibles.',
        'Advertencia',
        { timeOut: 4000 }
      );
    }
  }

  /**
   * Método público para reintentar la carga de datos
   */
  public retryDataLoad(): void {
    console.log('🔄 Reintentando carga de datos...');
    this.errorCargaDatosMaestros = false;
    this.reintentosCarga = 0;
    
    if (this.isEdit && this.configuracionCarrito) {
      this.llenarCamposEdicion();
    } else if (this.producto) {
      this.inicializacionConfigurarProducto(this.producto);
    }
  }

  /**
   * Verifica si los datos maestros están completamente cargados
   */
  private areMaestrosFullyLoaded(): boolean {
    return !!(
      this.datosMaestrosCargados &&
      this.tipoEntrega &&
      this.adicionesrows &&
      this.generos &&
      this.ocasiones &&
      this.formasEntrega
    );
  }

  /**
   * Espera a que los datos maestros estén completamente cargados
   */
  private waitForMaestrosToBeFullyLoaded(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.areMaestrosFullyLoaded()) {
        resolve(true);
        return;
      }

      // Verificar cada 100ms si los datos están cargados
      const checkInterval = setInterval(() => {
        if (this.areMaestrosFullyLoaded()) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);

      // Timeout después de 10 segundos
      setTimeout(() => {
        clearInterval(checkInterval);
        console.warn('⚠️ Timeout esperando datos maestros');
        resolve(false);
      }, 10000);
    });
  }

  /**
   * Procesa las preferencias existentes del producto
   */
  private processExistingPreferences(preferencias: any[]) {
    if (!preferencias || !Array.isArray(preferencias)) {
      console.warn('⚠️ No hay preferencias para procesar');
      return;
    }

    try {
      console.log('🔄 Procesando preferencias existentes:', preferencias.length);
      
      // Limpiar preferencias existentes para evitar duplicados
      this.productPreference = [];
      
      // Procesar cada preferencia existente
      preferencias.forEach((preferencia, index) => {
        console.log(`📋 Preferencia ${index + 1}:`, preferencia);

        // Agregar la preferencia al array
        this.productPreference.push(preferencia);
        
        // Si es una preferencia de personalización, asegurar que se procese correctamente
        if (preferencia.tipo === 'opcionPersonalizacion') {
          console.log('✅ Preferencia de personalización procesada');
        }
        
        // Si es una adición, asegurar que esté marcada como seleccionada
        if (preferencia.titulo && preferencia.valorUnitarioSinIva > 0) {
          console.log('✅ Preferencia de adición procesada');
        }
      });
      
      // Verificar si ya existe una preferencia de personalización
      const tienePersonalizacion = this.productPreference.some(
        pref => pref.tipo === 'opcionPersonalizacion'
      );
      
      // Si no existe preferencia de personalización, agregarla basada en los datos de entrega
      if (!tienePersonalizacion && this.datosEntrega?.value) {
        setTimeout(() => {
          this.addOpcionesPersonalizacion();
          console.log('✅ Opciones de personalización agregadas (no existían)');
        }, 100);
      } else if (tienePersonalizacion) {
        console.log('✅ Preferencia de personalización ya existía, no se regenera');
      }
      
      console.log('📋 Total de preferencias después de procesar:', this.productPreference.length);
      
    } catch (error) {
      console.error('❌ Error procesando preferencias:', error);
    }
  }

  /**
   * Verifica el estado de las preferencias y proporciona información de debugging
   */
  public checkPreferencesStatus(): void {
    console.log('📊 Estado de preferencias:');
    console.log('- Total de preferencias:', this.productPreference?.length || 0);
    console.log('- Preferencias actuales:', this.productPreference);
    console.log('- Datos de entrega:', this.datosEntrega?.value);
    console.log('- Ocasiones disponibles:', this.ocasiones?.length || 0);
    console.log('- Géneros disponibles:', this.generos?.length || 0);
    
    if (this.productPreference && this.productPreference.length > 0) {
      this.productPreference.forEach((pref, index) => {
        console.log(`📋 Preferencia ${index + 1}:`, {
          titulo: pref.titulo,
          tipo: pref.tipo,
          valor: pref.valorUnitarioSinIva,
          subtitulo: pref.subtitulo
        });
      });
    } else {
      console.log('⚠️ No hay preferencias cargadas');
    }
  }

  /**
   * Fuerza la actualización de las opciones de personalización
   */
  public forceUpdatePersonalization(): void {
    console.log('🔄 Forzando actualización de personalización...');
    this.addOpcionesPersonalizacion();
    this.checkPreferencesStatus();
  }

  /**
   * Procesa las variables del producto (formulario dinámico)
   */
  private processProductVariables(configuracion: any) {
    console.log('🔄 Procesando variables del producto...');
    
    if (!this.producto || !this.producto.procesoComercial?.variablesForm) {
      console.warn('⚠️ No hay variables de producto para procesar');
      return;
    }

    try {
      // Inicializar variables del producto
      this.variables = this.producto.procesoComercial?.variablesForm
        ? parse(this.producto.procesoComercial.variablesForm)
        : [];

      console.log('✅ Variables del producto inicializadas:', this.variables?.length || 0);

      // Inicializar el formulario de variables si no existe
      if (!this.formulario) {
        this.initForm();
      }

      // Limpiar variables existentes
      const itemsArray = this.formulario.get("variables") as FormArray;
      while (itemsArray.length !== 0) {
        itemsArray.removeAt(0);
      }

      // Agregar variables del producto
      if (this.variables && this.variables.length > 0) {
        this.variables.forEach((objeto) => {
          itemsArray.push(this.crearItem(objeto));
        });
        console.log('✅ Variables agregadas al formulario:', this.variables.length);
      }

      // Si hay configuración de variables guardada, aplicarla
      if (configuracion.variables && Array.isArray(configuracion.variables)) {
        console.log('🔄 Aplicando configuración guardada de variables...');
        this.applySavedVariables(configuracion.variables);
      }

    } catch (error) {
      console.error('❌ Error procesando variables del producto:', error);
    }
  }

  /**
   * Aplica las variables guardadas al formulario
   */
  private applySavedVariables(savedVariables: any[]) {
    try {
      const itemsArray = this.formulario.get("variables") as FormArray;
      
      savedVariables.forEach((savedVar, index) => {
        if (index < itemsArray.length) {
          const control = itemsArray.at(index) as FormGroup;
          
          // Aplicar valores guardados SIN sobreescribir titulo.
          // El titulo del formulario viene de la definición del producto (crearItem) y nunca
          // debe ser sobreescrito con datos guardados, ya que podría contener texto del usuario.
          if (savedVar.data) {
            const { titulo: _ignorarTitulo, ...dataWithoutTitulo } = savedVar.data;
            control.patchValue({
              data: dataWithoutTitulo
            });
          }
          
          // Aplicar valores de texto, imagen o archivo según el tipo
          if (savedVar.textoIngresado) {
            control.patchValue({
              textoIngresado: savedVar.textoIngresado
            });
          }
          
          if (savedVar.imagenIngresado) {
            control.patchValue({
              imagenIngresado: savedVar.imagenIngresado
            });
          }
          
          if (savedVar.archivoIngresado) {
            control.patchValue({
              archivoIngresado: savedVar.archivoIngresado
            });
          }
          
          console.log(`✅ Variable ${index + 1} actualizada con valores guardados`);
        }
      });
      
      console.log('✅ Variables guardadas aplicadas correctamente');
      
    } catch (error) {
      console.error('❌ Error aplicando variables guardadas:', error);
    }
  }

  /**
   * Verifica el estado de las variables del producto
   */
  public checkProductVariablesStatus(): void {
    console.log('📊 Estado de variables del producto:');
    console.log('- Variables disponibles:', this.variables?.length || 0);
    console.log('- Formulario inicializado:', !!this.formulario);
    console.log('- Variables en formulario:', this.variablesControls?.length || 0);
    console.log('- Producto disponible:', !!this.producto);
    console.log('- VariablesForm del producto:', this.producto?.procesoComercial?.variablesForm);
    
    if (this.variables && this.variables.length > 0) {
      this.variables.forEach((variable, index) => {
        console.log(`📋 Variable ${index + 1}:`, {
          titulo: variable.data?.titulo,
          tipoImagen: variable.data?.tipoImagen,
          subtitulo: variable.data?.subtitulo
        });
      });
    } else {
      console.log('⚠️ No hay variables de producto disponibles');
    }
    
    if (this.variablesControls && this.variablesControls.length > 0) {
      console.log('✅ Variables cargadas en el formulario:', this.variablesControls.length);
    } else {
      console.log('⚠️ No hay variables en el formulario');
    }
  }

  /**
   * Fuerza la actualización de las variables del producto
   */
  public forceUpdateProductVariables(): void {
    console.log('🔄 Forzando actualización de variables del producto...');
    if (this.configuracionCarrito?.configuracion) {
      this.processProductVariables(this.configuracionCarrito.configuracion);
    }
    this.checkProductVariablesStatus();
  }

  /**
   * Verifica específicamente las preferencias de configuración
   */
  public checkConfigurationPreferences(): void {
    console.log('🔍 Verificando preferencias de configuración...');
    
    if (!this.configuracionCarrito?.configuracion?.preferencias) {
      console.warn('⚠️ No hay preferencias en la configuración del carrito');
      return;
    }
    
    const preferencias = this.configuracionCarrito.configuracion.preferencias;
    console.log('📋 Preferencias en configuración:', preferencias);
    
    preferencias.forEach((pref: any, index: number) => {
      console.log(`📋 Preferencia ${index + 1}:`, {
        titulo: pref.titulo,
        tipo: pref.tipo,
        subtitulo: pref.subtitulo,
        valorUnitarioSinIva: pref.valorUnitarioSinIva
      });
    });
    
    // Verificar si las preferencias están en el array actual
    console.log('📋 Preferencias actuales en productPreference:', this.productPreference);
    
    if (this.productPreference.length > 0) {
      this.productPreference.forEach((pref: any, index: number) => {
        console.log(`📋 Preferencia actual ${index + 1}:`, {
          titulo: pref.titulo,
          tipo: pref.tipo,
          subtitulo: pref.subtitulo,
          valorUnitarioSinIva: pref.valorUnitarioSinIva
        });
      });
    } else {
      console.warn('⚠️ No hay preferencias en productPreference');
    }
  }

  /**
   * Fuerza la recarga de preferencias desde la configuración
   */
  public forceReloadPreferences(): void {
    console.log('🔄 Forzando recarga de preferencias...');

    if (!this.configuracionCarrito?.configuracion?.preferencias) {
      console.warn('⚠️ No hay configuración disponible para recargar');
      return;
    }

    // Limpiar preferencias actuales
    this.productPreference = [];

    // Procesar preferencias desde la configuración
    this.processExistingPreferences(this.configuracionCarrito.configuracion.preferencias);

    console.log('✅ Preferencias recargadas exitosamente');
  }

  /**
   * Obtiene el producto con el precio ajustado según la categoría del cliente.
   *
   * IMPORTANTE: Este método NO modifica el producto original (this.producto).
   * Si el cliente tiene una categoría asignada y el producto tiene un precio
   * configurado para esa categoría, retorna una COPIA TEMPORAL del producto
   * con los precios ajustados. Si no aplica, retorna el producto original.
   *
   * La copia temporal:
   * - Solo existe en memoria para este item del carrito
   * - NO se guarda en ninguna base de datos
   * - NO afecta al producto original ni a otros lugares que lo usen
   *
   * @returns Producto con precio ajustado (copia) o producto original
   */
  private obtenerProductoConPrecioCategoria(): any {
    // 1. Obtener el cliente desde sessionStorage (donde se guarda en el paso 1)
    let cliente: any = null;
    try {
      const clienteStr = sessionStorage.getItem('cliente');
      if (clienteStr) {
        cliente = JSON.parse(clienteStr);
      }
    } catch (e) {
      console.warn('⚠️ Error al obtener cliente de sessionStorage:', e);
    }

    // 2. Verificar si el cliente tiene categoría asignada
    const categoriaId = cliente?.categoria?.id;
    if (!categoriaId) {
      console.log('💰 Cliente sin categoría - usando precio estándar');
      return this.producto; // Retorna el producto original sin modificar
    }

    // 3. Verificar si el producto tiene precios por tipo de cliente
    const preciosPorTipo = this.producto?.preciosPorTipoCliente;
    if (!preciosPorTipo || !Array.isArray(preciosPorTipo) || preciosPorTipo.length === 0) {
      console.log('💰 Producto sin precios por categoría - usando precio estándar');
      return this.producto; // Retorna el producto original sin modificar
    }

    // 4. Buscar el precio específico para la categoría del cliente
    const precioCategoria = preciosPorTipo.find(
      (p: any) => p.tipoClienteId === categoriaId && p.activo === true
    );

    if (!precioCategoria) {
      console.log(`💰 No hay precio configurado para categoría "${cliente?.categoria?.nombre || categoriaId}" - usando precio estándar`);
      return this.producto; // Retorna el producto original sin modificar
    }

    // 5. CREAR COPIA TEMPORAL del producto con el precio ajustado
    // IMPORTANTE: Usamos spread operator para crear una copia superficial
    // y luego creamos una nueva copia del objeto precio
    console.log('💰 Aplicando precio por categoría:', {
      categoria: precioCategoria.tipoClienteNombre || cliente?.categoria?.nombre,
      precioOriginal: this.producto?.precio?.precioUnitarioConIva,
      precioCategoria: precioCategoria.precioConIva,
      descuento: this.producto?.precio?.precioUnitarioConIva
        ? ((1 - (precioCategoria.precioConIva / this.producto.precio.precioUnitarioConIva)) * 100).toFixed(1) + '%'
        : 'N/A'
    });

    // Crear copia temporal del producto (NO modifica this.producto)
    const productoConPrecioAjustado = {
      ...this.producto,
      precio: {
        ...this.producto.precio,
        // Reemplazar los precios con los de la categoría
        precioUnitarioConIva: precioCategoria.precioConIva,
        precioUnitarioSinIva: precioCategoria.precio,
        valorIva: precioCategoria.valorIva
      },
      // Guardar referencia a la categoría aplicada (para auditoría/debugging)
      _precioAplicadoPorCategoria: {
        tipoClienteId: precioCategoria.tipoClienteId,
        tipoClienteNombre: precioCategoria.tipoClienteNombre,
        precioOriginalConIva: this.producto?.precio?.precioUnitarioConIva,
        precioOriginalSinIva: this.producto?.precio?.precioUnitarioSinIva
      }
    };

    return productoConPrecioAjustado;
  }

  /**
   * Obtiene el precio unitario a mostrar en la UI, considerando la categoría del cliente.
   * Este método es para VISUALIZACIÓN solamente, no modifica el producto.
   */
  public getPrecioMostrar(): number {
    // 1. Obtener cliente desde sessionStorage
    let cliente: any = null;
    try {
      const clienteStr = sessionStorage.getItem('cliente');
      if (clienteStr) {
        cliente = JSON.parse(clienteStr);
      }
    } catch (e) {
      return this.producto?.precio?.precioUnitarioConIva || 0;
    }

    // 2. Verificar si el cliente tiene categoría
    const categoriaId = cliente?.categoria?.id;
    if (!categoriaId) {
      return this.producto?.precio?.precioUnitarioConIva || 0;
    }

    // 3. Verificar si el producto tiene precios por tipo de cliente
    const preciosPorTipo = this.producto?.preciosPorTipoCliente;
    if (!preciosPorTipo || !Array.isArray(preciosPorTipo) || preciosPorTipo.length === 0) {
      return this.producto?.precio?.precioUnitarioConIva || 0;
    }

    // 4. Buscar precio para la categoría del cliente
    const precioCategoria = preciosPorTipo.find(
      (p: any) => p.tipoClienteId === categoriaId && p.activo === true
    );

    // 5. Retornar precio de categoría o precio estándar
    return precioCategoria?.precioConIva || this.producto?.precio?.precioUnitarioConIva || 0;
  }

  /**
   * Verifica si el producto tiene un precio especial aplicado por categoría de cliente
   */
  public tienePrecioCategoria(): boolean {
    let cliente: any = null;
    try {
      const clienteStr = sessionStorage.getItem('cliente');
      if (clienteStr) {
        cliente = JSON.parse(clienteStr);
      }
    } catch (e) {
      return false;
    }

    const categoriaId = cliente?.categoria?.id;
    if (!categoriaId) return false;

    const preciosPorTipo = this.producto?.preciosPorTipoCliente;
    if (!preciosPorTipo || !Array.isArray(preciosPorTipo)) return false;

    return preciosPorTipo.some(
      (p: any) => p.tipoClienteId === categoriaId && p.activo === true
    );
  }

  // ============== CAMPOS PERSONALIZADOS ==============

  /**
   * Carga los grupos de campos custom activos para el contexto "carrito".
   * Crea un FormGroup dinámico por cada grupo.
   */
  private loadCustomFields(): void {
    this.customFieldsService.getActiveGroups('carrito').subscribe(groups => {
      this.gruposCamposCustom = groups;

      // Crear FormGroup por cada grupo
      for (const grupo of groups) {
        const controls: { [key: string]: FormControl } = {};
        for (const campo of (grupo.campos || [])) {
          const defaultValue = campo.tipo === 'checkbox' ? false : campo.tipo === 'number' ? null : '';
          controls[campo.id] = new FormControl(defaultValue, campo.requerido ? Validators.required : []);
        }
        this.customFieldsForms[grupo.id] = new FormGroup(controls);
      }

      // Forzar change detection para que el template se re-renderice con los nuevos datos
      this.cdr.detectChanges();

      if (groups.length > 0) {
        for (const g of groups) {
          const form = this.customFieldsForms[g.id];
          console.log(`📋 [CustomFields] Grupo "${g.nombre}" (${g.id}): ${g.campos?.length} campos, form exists: ${!!form}, controls: ${form ? Object.keys(form.controls).join(', ') : 'N/A'}`);
          for (const c of (g.campos || [])) {
            const ctrl = form?.get(c.id);
            console.log(`  → Campo "${c.etiqueta}" (${c.id}): control exists: ${!!ctrl}, tipo: ${c.tipo}, grupo: ${c.grupo}`);
          }
        }
      }
    });
  }

  getSubgroups(grupo: CustomFieldGroup): string[] {
    return this.customFieldsService.getSubgroups(grupo);
  }

  getFieldsBySubgroup(grupo: CustomFieldGroup, subgroup: string): CustomFieldConfig[] {
    return this.customFieldsService.getFieldsBySubgroup(grupo, subgroup);
  }

  getFieldsWithoutSubgroup(grupo: CustomFieldGroup): CustomFieldConfig[] {
    return this.customFieldsService.getFieldsWithoutSubgroup(grupo);
  }

  getCustomControl(grupoId: string, campoId: string): FormControl {
    const form = this.customFieldsForms[grupoId];
    const ctrl = form?.get(campoId) as FormControl;
    if (!ctrl) {
      console.warn(`⚠️ [CustomFields] Control no encontrado: grupo=${grupoId}, campo=${campoId}, form exists=${!!form}, controls=${form ? Object.keys(form.controls) : 'N/A'}`);
    }
    return ctrl;
  }
}
