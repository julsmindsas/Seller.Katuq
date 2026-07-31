// @ts-nocheck
// Deshabilita validaciones TypeScript en este archivo debido a complejidad de migración de tipos.

import {
  Component,
  ViewEncapsulation,
  OnInit,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  SimpleChanges,
  OnChanges,
  OnDestroy,
} from "@angular/core";
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormArray,
  FormControl,
  Form,
} from "@angular/forms";
import { MaestroService } from "../../../shared/services/maestros/maestro.service";
import {
  DropzoneConfig,
  DropzoneModule,
  DropzoneConfigInterface,
} from "ngx-dropzone-wrapper";
import Swal from "sweetalert2";

import { Observable, Subscription } from "rxjs";
import { parse, stringify } from "flatted";
import { TreeNode } from "primeng/api";
import { TabView } from "primeng/tabview";
import { Router } from "@angular/router";
import {
  NgbActiveModal,
  NgbModal,
  NgbModalOptions,
} from "@ng-bootstrap/ng-bootstrap";
import { ProductDetailsComponent } from "../product-details/product-details.component";
import { Producto } from "../../../shared/models/productos/Producto";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { ProcesoConCentroTrabajo } from "../../empresas/model/produccion/procesoconcentrotrabajo";
import { UtilsService } from "../../../shared/services/utils.service";
import { KatuqintelligenceService } from "../../../shared/services/katuqintelligence/katuqintelligence.service";
import { ArchivoSubido, ImagenService } from "../../../shared/utils/image.service";
import { HttpEventType } from "@angular/common/http";
import { error } from "console";

// Dropshipping imports
import { ProveedoresService } from "../../dropshipping/services/proveedores.service";
import { Proveedor } from "../../dropshipping/interfaces";

// DANE codes imports
import { DaneCodesService } from "../../../shared/services/dane-codes.service";
import { MunicipioDane } from "../../../shared/data/colombia-dane-codes";

@Component({
  selector: "app-crear-productos",
  templateUrl: "./crear-productos.component.html",
  styleUrls: ["./crear-productos.component.scss"],
})
export class CrearProductosComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild("opcionSeleccionada") opcionSeleccionada: ElementRef;
  @ViewChild("referencia") referencia: ElementRef;
  @ViewChild("codigoBarra") codigoBarra: ElementRef;
  activar: boolean = false;
  crearProducto: any;
  precio: any;
  Dimensiones: any;
  disponibilidad: any;
  preciosPorVolumen: FormArray;
  variablesAgregadas: FormArray;
  public ClassicEditor = ClassicEditor;
  identificacion: any;
  exposicion: any;
  procesoComercial: FormGroup;
  dropshippingConfig: FormGroup;
  marketplace: any;
  ciudad: any;
  ciudades: any;
  formGeneral: any;

  file$: Observable<File>;
  files: File | null = null;
  fileImg: { img: File; tipo: string; preview?: string; }[] = [];
  filesNames: string[] = [];
  croppedImage: any = "";
  carrouselImg: any[] = [];
  edit: any;
  barCodeGen: boolean = false;
  ciudadesOrigen = [
    { value: "Medellin", label: "Medellin" },
    { value: "Bogota", label: "Bogota" },
    { value: "Barranquilla", label: "Barranquilla" },
    { value: "Cali", label: "Cali" },
    { value: "Cartagena", label: "Cartagena" },
  ];
  ciudadesEntrega = [
    { value: "Medellin", label: "Medellin" },
    { value: "Bogota", label: "Bogota" },
    { value: "Barranquilla", label: "Barranquilla" },
    { value: "Cali", label: "Cali" },
    { value: "Cartagena", label: "Cartagena" },
  ];

  // Propiedades para DANE codes
  departamentosDane: string[] = [];
  municipiosDaneOrigen: MunicipioDane[] = [];
  municipiosDaneEntrega: MunicipioDane[] = [];
  searchQueryDaneOrigen: string = '';
  searchQueryDaneEntrega: string = '';
  cargandoDaneOrigen: boolean = false;
  cargandoDaneEntrega: boolean = false;
  usarDaneCiudades: boolean = false;
  departamentoDaneOrigenSeleccionado: string = '';
  departamentoDaneEntregaSeleccionado: string = '';
  ciudadesDaneOrigenSeleccionadas: MunicipioDane[] = [];
  ciudadesDaneEntregaSeleccionadas: MunicipioDane[] = [];

  // Propiedades para Cobertura Nacional
  coberturaNacionalOrigen: boolean = false;
  coberturaNacionalEntrega: boolean = false;

  porcentajesIva: any = [
    { value: "19", label: "19%" },
    { value: "8", label: "8%" },
    { value: "5", label: "5%" },
    { value: "0", label: "0%" },
  ];
  
  tiposMargenDropshipping = [
    { value: 'porcentaje', label: 'Porcentaje (%)' },
    { value: 'fijo', label: 'Valor Fijo ($)' }
  ];
  
  // Variables para integración con proveedores
  proveedoresActivos: Proveedor[] = [];
  loadingProveedores = false;

  mostrarCrear: boolean = true;
  valorBarCode: any;
  formaEntrega: any[] = [];
  tiempoEntrega: any[] = [];
  totalProducts = 0;
  etiquetas: string[] = [];
  generos: any[] = [];
  ocasiones: any[] = [];
  formasPago: any[] = [];
  empresaActual: any;
  categorias: any[];
  variables: TreeNode[];
  categoriasForm: any;
  cd: any;
  flag: any = [];
  filesPaths: { name: string; pathName: string; tipo: string; url?: string; }[] = [];
  fileUrls: { urls: string; nombreImagen: string; path: string; tipo: string; }[] = [];
  pathParentRoute: any;
  moduloVariable: FormGroup;
  productosArticulos: any[] = [];
  procesosProduccion: ProcesoConCentroTrabajo[] = [];
  procesosProduccionSeleccionados: ProcesoConCentroTrabajo[] = [];
  procesoSeleccionado: any;
  adicionesPreferencias: any[] = [];
  ultimasLetras: string = "";
  kaiForm: FormGroup;
  kaiProductPrompt: any;
  uploadingImages: boolean = false;
  procesandoImagenes: boolean = false;
  saving: boolean = false;
  referenciaError: string = '';
  validandoReferencia: boolean = false;
  private subs = new Subscription();
  
  // Control de tabs y modo dropshipping
  activeTabIndex = 0;
  isDropshippingConfigMode = false;

  /**
   * Referencia al p-tabView para resolver pestañas por NOMBRE.
   *
   * Los índices no se pueden cablear: "Dropshipping", "Pedidos relacionados" e
   * "Historial de cambios" son condicionales, así que el índice de todo lo que
   * viene después cambia según el producto. Ya había dos índices desfasados por
   * esto (`activateDropshippingTab` apuntaba a Identificación, y el retorno de
   * "producto no activado" caía en Dimensiones en vez de Exposición).
   */
  @ViewChild(TabView) private tabView?: TabView;

  /** Secciones con obligatorios, en el orden en que aparecen en el tabView. */
  private readonly seccionesObligatorias: { tab: string; grupo: () => FormGroup }[] = [
    { tab: 'Datos básicos', grupo: () => this.crearProducto },
    { tab: 'Precio', grupo: () => this.precio },
    { tab: 'Dimensiones', grupo: () => this.Dimensiones },
    { tab: 'Disponibilidad', grupo: () => this.disponibilidad },
    { tab: 'Identificación', grupo: () => this.identificacion },
    { tab: 'Categorías', grupo: () => this.categoriasForm },
  ];

  // Pestaña: Pedidos relacionados
  pedidosRelacionados: any[] = [];
  loadingPedidos = false;
  pedidosCargados = false;
  pedidosPage = 1;
  pedidosPageSize = 10;
  pedidosTotal = 0;
  pedidosTotalPages = 0;

  // Pestaña: Historial de cambios
  historialCambios: any[] = [];
  loadingHistorial = false;
  historialCargado = false;

  getNameControl(control) {
    return control.value.nameMP;
  }

  constructor(
    private modalService: NgbModal,
    private fb: FormBuilder,
    private service: MaestroService,
    private cdr: ChangeDetectorRef,
    public activeModal: NgbActiveModal,
    private router: Router,
    private utilService: UtilsService,
    private kaiService: KatuqintelligenceService,
    private imageService: ImagenService,
    private proveedoresService: ProveedoresService,
    private daneCodesService: DaneCodesService,
  ) {
    this.kaiService.getKatuqPrompt().subscribe((res) => {
      this.kaiProductPrompt = res.promptProduct;
    });

    this.getMaestrosIniciales();

    this.kaiForm = this.fb.group({
      tituloKai: [""],
      textoBase: [""],
      response: [""],
      photoToAnalize: [""],
      isAnalizeImageForPrompt: [true],
      isGenerateImage: [false],
    });

    this.moduloVariable = this.fb.group({
      titulo: ["", Validators.required],
      // unidadMedida: '',
      // cantidadTotal: '',
      cantidadUnitaria: [1, Validators.required],
      // medidaUnitaria: '',
      procesos: this.fb.array([]),
      articuloProduccionAdicion: [false],
      adicion: [{}],
    });

    //chkeditor sin insercion de imagenes
    ClassicEditor.defaultConfig = {
      toolbar: {
        items: [
          "heading",
          "|",
          "bold",
          "italic",
          "link",
          "bulletedList",
          "numberedList",
          "blockQuote",
          "insertTable",
          "undo",
          "redo",
        ],
      },
      language: "es",
      table: {
        contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
      },
      image: {
        toolbar: ["imageTextAlternative", "imageStyle:full", "imageStyle:side"],
      },
    };

    this.formGeneral = this.fb.group({
      crearProducto: [[]],
      precio: [[]],
      dimensiones: [[]],
      disponibilidad: [[]],
      identificacion: [[]],
      exposicion: [[]],
      categorias: [],
      procesoComercial: [[]],
      dropshippingConfig: [[]],
      marketplace: [[]],
      ciudades: [[]],
      otrosProcesos: this.fb.group({
        modulosfijos: this.fb.array([]),
        modulosVariables: this.fb.group({
          produccion: [[]],
        }),
        moduloComplementarios: this.fb.array([]),
      }),
      kaiForm: [[]],
    });
    this.crearProducto = this.fb.group({
      titulo: ["", Validators.required],
      descripcion: ["", Validators.required],
      // Las fechas de vigencia NO son obligatorias: la etiqueta no lleva
      // asterisco y su mensaje de error está comentado en el template desde
      // siempre. Con `Validators.required` invalidaban "Datos básicos" en
      // silencio — el usuario llenaba todo lo marcado con * y la sección
      // seguía apareciendo como pendiente sin ningún campo en rojo.
      fechaInicial: [""],
      fechaFinal: [""],
      caracAdicionales: ["", [Validators.required]],
      garantiasProducto: ["", [Validators.required]],
      restriccionesProducto: ["", [Validators.required]],
      cuidadoConsumo: ["", [Validators.required]],
      imagenesPrincipales: [""],
      imagenesSecundarias: [""],
      paraProduccion: [false, [Validators.required]],
    });
    this.precio = this.fb.group({
      precioUnitarioSinIva: ["0"],
      precioUnitarioIva: ["0"],
      valorIva: ["0"],
      precioUnitarioConIva: ["0"],
      precioPorVolumenSinIva: ["0"],
      precioIvaPorVolumen: ["0"],
      precioTotalVolumenConIva: ["0"],
      preciosVolumen: this.fb.array([]),
    });

    this.Dimensiones = this.fb.group({
      largoProductoCm: ["", [Validators.required]],
      altoProductoCm: ["", Validators.required],
      anchoProductoCm: ["", [Validators.required]],
      pesoUnitarioProductoKg: ["", [Validators.required]],
    });

    this.disponibilidad = this.fb.group({
      tipoEntrega: ["seleccione", [Validators.required]],
      tiempoEntrega: ["seleccione", [Validators.required]],
      // Sin `Validators.required`: el campo se quitó de la UI (ahora es un input
      // hidden — el stock se gestiona desde /inventario/inventario-catalogo) y
      // NADIE lo asigna en el código. Con el validador puesto, el grupo
      // "Disponibilidad" quedaba inválido para siempre y era imposible
      // completar la sección: no hay ningún control donde llenarlo.
      cantidadDisponible: [""],
      cantidadMinVenta: ["", [Validators.required]],
      inventarioSeguridad: ["", [Validators.required]],
      inventariable: [true],
    });

    this.service.getTotalProducts().subscribe((x: any) => {
      this.totalProducts = x.totalItems;
      // Solo generar referencias automáticas si no estamos en modo edición
      if (!this.isEditMode()) {
        this.generateAutoReference();
      }
    });

    this.identificacion = this.fb.group({
      referencia: ["", [Validators.required]],
      tipoProducto: ["propio", [Validators.required]], // propio, externo, dropshipping
      tipoReferencia: ["propio"],
      codigoBarras: ["", [Validators.required]],
      marca: ["", [Validators.required]],
    });

    this.identificacion.controls["referencia"].disable();
    this.identificacion.controls["codigoBarras"].disable();
    this.subs.add(
      this.identificacion.get("tipoReferencia").valueChanges.subscribe((tipo) => {
        if (tipo == "propio") {
          if (!this.isEditMode()) {
            this.identificacion.controls["referencia"].disable();
            this.generateAutoReference();
          } else {
            this.identificacion.controls["referencia"].disable();
            const referencia = this.edit.identificacion?.referencia
              ? this.edit.identificacion?.referencia
              : this.ultimasLetras +
              "-" +
              (this.totalProducts + 1).toString().padStart(6, "0");
            this.identificacion.controls["referencia"].setValue(referencia);
            this.generarCodigoBarras();
          }
        } else {
          if (this.edit.identificacion?.referencia) {
            this.identificacion.controls["referencia"].setValue(
              this.edit.identificacion?.referencia,
            );
          } else {
            this.identificacion.controls["referencia"].setValue("");
          }
          this.identificacion.controls["referencia"].enable();
        }
      })
    );

    this.subs.add(
      this.identificacion.get("tipoProducto").valueChanges.subscribe((tipo) => {
        if (tipo == "propio") {
          if (sessionStorage.getItem("infoForms") == null) {
            this.identificacion.controls["codigoBarras"].disable();
            if (this.identificacion.controls["codigoBarras"].value == "") {
              this.identificacion.controls["codigoBarras"].setValue(
                this.ultimasLetras +
                "-" +
                (this.totalProducts + 1).toString().padStart(6, "0"),
              );
            }
            this.generarCodigoBarras();
          } else {
            this.identificacion.controls["codigoBarras"].disable();
            this.identificacion.controls["codigoBarras"].setValue(
              this.edit.identificacion?.referencia,
            );
            this.generarCodigoBarras();
          }
        } else {
          this.identificacion.controls["codigoBarras"].setValue("");
          this.identificacion.controls["codigoBarras"].enable();
          this.generarCodigoBarras();
        }
      })
    );

    this.categoriasForm = this.fb.group({
      categorias: ["", Validators.required],
    });
    this.exposicion = this.fb.group({
      activar: [false, [Validators.required]],
      posicion: ["", Validators.required],
      disponible: [false, [Validators.required]],
      recomendado: [false, [Validators.required]],
      destacado: [false, [Validators.required]],
      oferta: [false, [Validators.required]],
      nuevo: [false, [Validators.required]],
      masvendido: [false, [Validators.required]],
      etiquetas: [[], [Validators.required]],
    });
    this.procesoComercial = this.fb.group({
      aceptaOcasion: [false, [Validators.required]],
      ocasion: [[], Validators.required],
      aceptaGenero: [false, [Validators.required]],
      genero: [[], [Validators.required]],
      generoMap: [null, [Validators.required]],
      ocasionesMap: [null, [Validators.required]],
      aceptaComentarios: [false, [Validators.required]],
      aceptaColorDecoracion: [false, [Validators.required]],
      colorDecoracion: [[], [Validators.required]],
      llevaTarjeta: [false, [Validators.required]],
      llevaArchivo: [false, [Validators.required]],
      aceptaVariable: [false, [Validators.required]],
      aceptaAdiciones: [false, [Validators.required]],
      pago: [[], [Validators.required]],
      variablesForm: [""],
      llevaCalendario: [false, [Validators.required]],
      configProcesoComercialActivo: [false, [Validators.required]], // Nuevo campo para guardar el estado de activación
      permitePrecioManual: [false]
    });

    this.subs.add(
      this.precio
        .get("precioUnitarioSinIva")
        .valueChanges.subscribe((precioUnitarioSinIva) => {
          let calculo = 0;
          if (precioUnitarioSinIva) {
            let precioIva = this.precio.get("precioUnitarioIva").value;
            if (isNaN(precioUnitarioSinIva)) {
              precioUnitarioSinIva = precioUnitarioSinIva
                .replace(",", "")
                .replace(".", "");
              precioUnitarioSinIva = parseFloat(precioUnitarioSinIva);
            } else {
              precioUnitarioSinIva = parseFloat(precioUnitarioSinIva);
              precioIva = parseFloat(precioIva);
            }
            calculo = precioUnitarioSinIva * (precioIva / 100);
            this.precio.get("valorIva").setValue(calculo);
            this.precio
              .get("precioUnitarioConIva")
              .setValue(calculo + precioUnitarioSinIva);
          } else {
            this.precio.get("valorIva").setValue("0");
            this.precio.get("precioUnitarioConIva").setValue("0");
          }

          this.initializePreciosPorVolumenIfNeeded(precioUnitarioSinIva, calculo);
        })
    );

    this.subs.add(
      this.precio.get("precioUnitarioIva").valueChanges.subscribe((precioIva) => {
        if (precioIva) {
          const unitPrice = this.precio.get("precioUnitarioSinIva").value;
          const calculo = unitPrice * (precioIva / 100);
          this.precio.get("valorIva").setValue(calculo);
          this.precio.get("precioUnitarioConIva").setValue(calculo + unitPrice);
          
          // Sincronizar el porcentaje de IVA con la primera fila de la tabla
          this.syncIvaPercentageToFirstRow(precioIva);
        } else {
          this.precio.get("valorIva").setValue("");
        }
      })
    );

    this.marketplace = this.fb.group({
      campos: new FormArray([]),
      sellerCenter: [false, [Validators.required]],
      paginaWeb: [false, [Validators.required]],
      puntoDeVenta: [false, [Validators.required]],
    });

    this.ciudades = this.fb.group({
      ciudadesOrigen: [[], [Validators.required]],
      ciudadesEntrega: [[], Validators.required],
      coberturaNacionalOrigen: [false],
      coberturaNacionalEntrega: [false],
    });

    // Inicializar FormGroup para configuración de dropshipping
    this.dropshippingConfig = this.fb.group({
      enabled: [false],
      supplierId: [''],
      supplierName: [''],
      supplierSku: [''],
      supplierProductUrl: [''],
      leadTimeDays: [7, [Validators.min(1)]],
      tipoMargen: ['porcentaje'],
      margenPorcentaje: [0, [Validators.min(0)]],
      margenFijo: [0, [Validators.min(0)]],
      proveedorContacto: [''],
      proveedorTelefono: [''],
      proveedorEmail: ['', [Validators.email]],
      costoProveedor: [0, [Validators.min(0)]],
      monedaProveedor: ['COP'],
      condicionesEspeciales: [''],
      activo: [true]
    });

    // Validación condicional del margen dropshipping
    this.subs.add(
      this.dropshippingConfig.get('tipoMargen')?.valueChanges.subscribe(tipo => {
        const margenPorcentajeControl = this.dropshippingConfig.get('margenPorcentaje');
        const margenFijoControl = this.dropshippingConfig.get('margenFijo');
        
        if (tipo === 'porcentaje') {
          margenPorcentajeControl?.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
          margenFijoControl?.clearValidators();
        } else {
          margenFijoControl?.setValidators([Validators.required, Validators.min(0)]);
          margenPorcentajeControl?.clearValidators();
        }
        
        margenPorcentajeControl?.updateValueAndValidity();
        margenFijoControl?.updateValueAndValidity();
      })
    );
  }
  getMaestrosIniciales() {
    const context = this;
    this.service.getProcesos().subscribe({
      next(value: any) {
        if ((value as any[]).length > 0) {
          const primerProceso = value[0];
          const nodes = parse(primerProceso.procesos) as TreeNode<ProcesoConCentroTrabajo>[];
          const allChildren = nodes.flatMap(node => node.children ?? []);
          context.procesosProduccion = allChildren.map(child => child.data);
          context.eliminarProcesosDisponiblesRepetidos();
        }
      },
      error(err) {
        // Maestro opcional: los procesos de producción solo alimentan el selector
        // del módulo variable. Si fallan, crear/editar producto sigue funcionando,
        // así que no se bloquea el modal con un Swal en cada apertura.
        context.procesosProduccion = [];
        console.warn(
          `[crear-productos] No se pudieron cargar los procesos de producción (HTTP ${err?.status ?? "?"} en /v1/procesos/all). El formulario continúa sin ellos.`,
          err,
        );
      },
    });

    this.service.getAdiciones().subscribe({
      next(value: any) {
        if ((value as any[]).length > 0) {
          context.adicionesPreferencias = value.filter((p) => p.esPreferencia);
          console.log("adicionesproducto", context.adicionesPreferencias);
        }
      },
      error(err) {
        Swal.fire("Error", "Error al obtener las adiciones", "error");
        console.log(err);
      },
    });
  }
  fileChangeEventForKAI(event: any, tipoImagen: string): void {
    for (let index = 0; index < event.target.files.length; index++) {
      const files = event.target.files && event.target.files[index];

      let fileReader = new FileReader();
      fileReader.readAsDataURL(files);

      fileReader.onload = (event2: any) => {
        this.kaiForm.get("photoToAnalize")!.setValue((event2.target as FileReader).result);
      };
    }
  }

  // UTILIDAD: Convierte una imagen a formato WebP si no lo está ya
  private convertToWebP(original: File): Promise<File> {
    return new Promise((resolve, reject) => {
      // Si ya es WebP no hacemos nada
      if (original.type === "image/webp") {
        resolve(original);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx!.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                // Fallback: si falla la conversión devolvemos el original
                resolve(original);
                return;
              }
              const newName = original.name.replace(/\.[^.]+$/, "") + ".webp";
              const webpFile = new File([blob], newName, { type: "image/webp" });
              resolve(webpFile);
            },
            "image/webp",
            0.8,
          );
        } catch (error) {
          // En caso de cualquier error continuamos con la imagen original
          resolve(original);
        }
      };
      img.onerror = () => resolve(original);
      img.src = URL.createObjectURL(original);
    });
  }

  async fileChangeEvent(event: any, tipoImagen: string): Promise<void> {
    const selectedFiles: FileList = event.target.files;

    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    const confirmed = await this.confirmImageUpload();
    if (!confirmed) {
      this.resetImageStates(event);
      return;
    }

    this.procesandoImagenes = true;
    try {
      await this.processSelectedFiles(selectedFiles, tipoImagen);
    } finally {
      this.procesandoImagenes = false;
    }
    this.cdr.detectChanges();
  }

  async uploadImgAndSave() {
    if (this.carrouselImg.length <= 0) {
      return;
    }
    this.uploadingImages = true;
    Swal.fire({
      title: "Subiendo...",
      html: `
        <h6>Por favor espere mientras se suben las imagenes</h6>
        <br>
        <div class="progress">
          <div class="progress-bar progress-bar-striped progress-bar-animated" id="progressbar" style="width:0%"></div>
        </div>`,
      showConfirmButton: false,
      allowOutsideClick: false,
    });
    const total = this.fileImg.length;
    for (let index = 0; index < this.fileImg.length; index++) {
      if (!this.filesNames[index]) {
        console.log("Nombre de archivo no definido en el índice:", index);
        continue; // Omite la iteración actual si el nombre es undefined
      }

      try {
        const subida = await this.subirImagenConBarra(
          this.fileImg[index].img,
          this.filesNames[index],
          (pct) => {
            const progressEl = document.getElementById("progressbar");
            if (progressEl) {
              progressEl.style.width = Math.round(((index + pct / 100) / total) * 100) + "%";
            }
          },
        );

        this.filesPaths.push({
          name: this.filesNames[index],
          pathName: subida.path,
          tipo: this.fileImg[index].tipo,
          url: subida.url,
        });
        this.flag.push("success");
      } catch (error) {
        console.error("Error subiendo imagen", error);
        this.flag.push("error");
      }
    }

    this.uploadingImages = false;
    Swal.close();
    this.resultImg();
    this.cdr.detectChanges();
  }

  /**
   * Sube una imagen a través del backend (`/v1/media/upload`) reportando avance.
   * La subida directa a Firebase Storage desde el navegador responde 403 porque
   * la app no tiene sesión de Firebase Auth.
   */
  private subirImagenConBarra(
    file: File,
    nombre: string,
    onProgress: (porcentaje: number) => void,
  ): Promise<ArchivoSubido> {
    return new Promise<ArchivoSubido>((resolve, reject) => {
      this.imageService.subirImagenConProgreso(file, nombre).subscribe({
        next: (event) => {
          const pct = ImagenService.porcentaje(event);
          if (pct !== null) {
            onProgress(pct);
            return;
          }
          if (event.type === HttpEventType.Response) {
            onProgress(100);
            const body = event.body;
            if (!body?.url) {
              reject(new Error("El backend no devolvió la URL de la imagen"));
              return;
            }
            resolve(body);
          }
        },
        error: (error) => reject(error),
      });
    });
  }

  private async uploadPendingImages(): Promise<void> {
    if (this.fileImg.length === 0) return;

    this.uploadingImages = true;
    const total = this.fileImg.length;

    Swal.fire({
      title: 'Subiendo imágenes...',
      html: `<h6>Por favor espere</h6><br>
             <div class="progress">
               <div class="progress-bar progress-bar-striped progress-bar-animated"
                    id="progressbar" style="width:0%"></div>
             </div>`,
      showConfirmButton: false,
      allowOutsideClick: false,
    });

    const nuevosFilesPaths: { name: string; pathName: string; tipo: string; url: string }[] = [];
    // El backend responde con la URL de descarga, no hace falta pedirla aparte.
    const nuevosUrls: { urls: string; nombreImagen: string; path: string; tipo: string }[] = [];

    try {
      for (let i = 0; i < this.fileImg.length; i++) {
        if (!this.filesNames[i]) continue;

        const subida = await this.subirImagenConBarra(
          this.fileImg[i].img,
          this.filesNames[i],
          (pct) => {
            const progreso = ((i + pct / 100) / total) * 100;
            const el = document.getElementById('progressbar');
            if (el) el.style.width = Math.round(progreso) + '%';
          },
        );

        nuevosFilesPaths.push({ name: this.filesNames[i], pathName: subida.path, tipo: this.fileImg[i].tipo, url: subida.url });
        nuevosUrls.push({
          urls: subida.url,
          nombreImagen: this.filesNames[i],
          path: subida.path,
          tipo: this.fileImg[i].tipo,
        });
      }
    } catch (error: any) {
      this.uploadingImages = false;
      Swal.close();
      throw new Error(error?.error?.error || error?.message || 'error desconocido');
    }

    this.filesPaths = [...this.filesPaths, ...nuevosFilesPaths];
    this.fileUrls = [...this.fileUrls, ...nuevosUrls];

    const principales = nuevosUrls.filter(u => u.tipo === 'principal');
    const secundarias = nuevosUrls.filter(u => u.tipo === 'secundaria');

    if (principales.length > 0) {
      const current = this.crearProducto.controls['imagenesPrincipales'].value || [];
      this.crearProducto.controls['imagenesPrincipales'].setValue([...current, ...principales]);
    }
    if (secundarias.length > 0) {
      const current = this.crearProducto.controls['imagenesSecundarias'].value || [];
      this.crearProducto.controls['imagenesSecundarias'].setValue([...current, ...secundarias]);
    }

    this.fileImg = [];
    this.filesNames = [];
    this.flag = [];
    this.uploadingImages = false;
    Swal.close();
  }

  isValidUrl(url: string): boolean {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const parts = url.split("://")[1].split("/");
      if (parts.length > 1 && parts[0] !== "") {
        return true;
      }
    }
    return false;
  }

  // Función para validar imágenes Base64
  isValidBase64Image(data: string): boolean {
    if (data.startsWith("data:image/")) {
      const regex =
        /^data:image\/(png|jpeg|jpg|gif|webp);base64,([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/;
      if (regex.test(data)) {
        return true;
      }
    }
    return false;
  }

  deleteImg(imgToDelete: string, index: number): void {
    Swal.fire({
      title: "¿Estás seguro?",
      text: `Se eliminará la imágen `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "No, cancelar",
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      showCloseButton: true,
    }).then((result) => {
      if (result.isConfirmed) {
        // this.filesPaths[index].delete();
        this.imageService.eliminarImagen(imgToDelete);
        Swal.fire("Eliminada!", "La imágen ha sido eliminada.", "success");
        var values = this.crearProducto.controls["imagenesPrincipales"].value;
        values = values.filter((p) => p.path != imgToDelete);
        this.crearProducto.controls["imagenesPrincipales"].setValue(values);
      } else if (result.isDismissed) {
        Swal.fire({
          title: "Cancelado",
          text: `La imágen  no se eliminó`,
          icon: "success",
          showCloseButton: true,
        });
        this.cdr.detectChanges();
        return;
      }
    });
  }

  async resultImg() {
    if (this.flag.includes("error")) {
      Swal.fire({
        title: "Atención!",
        text: "Ocurrió un error al subir una imágen, inténtalo nuevamente",
        icon: "warning",
        showConfirmButton: false,
        timer: 3000,
      });
      this.activeModal.close("creado");
      // this.carrouselImg = [];
      this.files = null;
      this.uploadingImages = false;
    } else {
      Swal.fire({
        title: "¡Subida exitosa!",
        text: "Imagenes guardadas en la base de datos",
        icon: "success",
        showConfirmButton: false,
        timer: 3000,
      });
      this.activeModal.close("creado");
      // this.carrouselImg = [];
      this.files = null;
      this.flag = [];

      this.guardarRegistrosEnFirebase();
    }
  }

  // guardarRegistrosEnFirebase() {
  //   throw new Error('Method not implemented.');
  // }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["variables"]) {
      this.variables = [...changes["variables"].currentValue];
    }
  }

  public f: FormGroup;
  public config: DropzoneConfigInterface = {
    url: "",
    maxFiles: 1,
    clickable: true,
    accept: (file: any) => {
      return file.type === "image/jpeg" || file.type === "image/png";
    },
    autoReset: null,
    errorReset: null,
  };

  config2: DropzoneConfigInterface = {
    url: "",
    maxFiles: 1,
    clickable: true,
    accept: (file: any) => {
      return file.type === "image/jpeg" || file.type === "image/png";
    },
    autoReset: null,
    errorReset: null,
  };

  ngOnInit(): void {
    this.initializeCompanyData();
    this.setupFormSubscriptions();
    this.initializeVariables();
    this.loadMasterData();
    this.cargarDepartamentosDane();
    this.handleEditMode();
    this.checkDropshippingMode();
  }

  checkDropshippingMode(): void {
    // Verificar si se debe abrir tab de dropshipping
    const openDropshippingTab = sessionStorage.getItem('openDropshippingTab');
    if (openDropshippingTab === 'true') {
      sessionStorage.removeItem('openDropshippingTab');
      this.isDropshippingConfigMode = true;
      
      // Configurar automáticamente como producto dropshipping
      setTimeout(() => {
        this.identificacion.get('tipoProducto')?.setValue('dropshipping');
        this.onTipoProductoChange();
        this.activateDropshippingTab();
      }, 100);
    }
  }

  activateDropshippingTab(): void {
    this.irATab('Dropshipping');
  }

  // ============== NAVEGACIÓN Y VALIDACIÓN DEL TABVIEW ==============

  /** Índice actual de una pestaña por su header. -1 si no está renderizada. */
  private indiceTab(header: string): number {
    const objetivo = header.trim().toLowerCase();
    const tabs = this.tabView?.tabs || [];
    return tabs.findIndex(
      (t) => (t.header || '').trim().toLowerCase() === objetivo,
    );
  }

  /** Lleva al usuario a la pestaña indicada. No hace nada si no existe. */
  private irATab(header: string): void {
    const i = this.indiceTab(header);
    if (i >= 0) {
      this.activeTabIndex = i;
      this.cdr.detectChanges();
    }
  }

  /**
   * Etiquetas legibles de los campos inválidos de un FormGroup. Se usan para
   * decirle al usuario QUÉ le falta, no solo que "algo" falta.
   */
  private camposInvalidos(grupo: FormGroup): string[] {
    if (!grupo) { return []; }
    return Object.keys(grupo.controls)
      .filter((nombre) => grupo.get(nombre)?.invalid)
      .map((nombre) => this.etiquetaCampo(nombre));
  }

  /** camelCase del formControlName → texto legible ("caracAdicionales" → "Carac adicionales"). */
  private etiquetaCampo(nombre: string): string {
    const legibles: Record<string, string> = {
      titulo: 'Título',
      caracAdicionales: 'Características adicionales',
      precioUnitarioSinIva: 'Precio unitario (sin IVA)',
      precioUnitarioIva: 'Porcentaje IVA',
      imagenesPrincipales: 'Imagen principal',
    };
    if (legibles[nombre]) { return legibles[nombre]; }
    const conEspacios = nombre.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
    return conEspacios.charAt(0).toUpperCase() + conEspacios.slice(1);
  }

  /**
   * True si hay al menos una imagen principal, ya subida o pendiente de subir.
   * Lee el control directo (no `.value` del grupo, que reconstruye el objeto
   * completo) porque esto se evalúa desde el template en cada ciclo.
   */
  private tieneImagenPrincipal(): boolean {
    const yaSubidas = this.crearProducto?.get('imagenesPrincipales')?.value;
    const pendientes = this.fileImg.some((f) => f.tipo === 'principal');
    return (Array.isArray(yaSubidas) && yaSubidas.length > 0) || pendientes;
  }

  /**
   * ¿Falta la referencia del producto?
   *
   * Va por fuera de la validez del formGroup porque `referencia` es un control
   * DESHABILITADO (`disable()` al construir `identificacion`: en modo automático
   * la genera el sistema), y Angular excluye los controles deshabilitados de la
   * validez del grupo. Su `Validators.required` no protege nada — `identificacion`
   * daba válido con la referencia vacía, y el backend recibía `undefined` y
   * reventaba con un 500 al usarla en un `.where()` de Firestore.
   *
   * Se lee con `getRawValue()`, que sí incluye los deshabilitados.
   *
   * Es una lectura PURA a propósito: la llama el template en cada ciclo de
   * detección de cambios, así que no puede tener efectos secundarios. Generar la
   * referencia acá (setValue) provocaría un bucle de detección de cambios.
   */
  private faltaReferencia(): boolean {
    return !this.identificacion?.getRawValue()?.referencia;
  }

  /**
   * Genera la referencia automática si falta. Se llama SOLO desde el guardado,
   * no desde el template, por lo dicho en `faltaReferencia`.
   *
   * Existe para no dejar un obligatorio imposible de llenar: en modo automático
   * el input está deshabilitado y el usuario no tendría dónde escribir nada.
   */
  private asegurarReferencia(): void {
    if (
      this.faltaReferencia() &&
      this.identificacion?.get('tipoReferencia')?.value === 'propio'
    ) {
      this.generateAutoReference();
    }
  }

  /**
   * Prefijo + consecutivo de la referencia automática, en un solo lugar.
   *
   * Antes esta expresión estaba repetida en cuatro sitios y `generateAutoReference`
   * la envolvía en un `if (this.ultimasLetras && ...)` que, cuando el prefijo aún
   * no estaba cargado, NO generaba nada y tampoco avisaba: la referencia quedaba
   * vacía en silencio. Acá el prefijo se resuelve con respaldo, así que siempre
   * devuelve una referencia utilizable.
   *
   * OJO: el consecutivo es `cantidad de productos + 1`, no una secuencia de
   * emisión. Si se borra un producto el contador retrocede y puede repetir una
   * referencia ya usada; en ese caso el backend asigna una aleatoria. Arreglarlo
   * de raíz requiere un contador persistente y va aparte.
   */
  private construirReferenciaAutomatica(): string {
    const prefijo =
      this.ultimasLetras ||
      (JSON.parse(localStorage.getItem('currentCompany') || '{}')?.nomComercial || 'PRD')
        .toString()
        .replace(' ', '')
        .substring(0, 3);
    return `${prefijo}-${(this.totalProducts + 1).toString().padStart(6, '0')}`;
  }

  /**
   * `identificacion` lista para mandar al backend.
   *
   * `referencia` y `codigoBarras` son controles DESHABILITADOS. `getRawValue()`
   * sí los incluye, pero con el valor que tengan — y si ese valor es `undefined`
   * (pasa cuando alguno de los `setValue(this.edit.identificacion?.referencia)`
   * corre sin `edit` cargado, que es el caso de un producto nuevo)
   * `JSON.stringify` BORRA la clave al serializar el POST. El backend recibía el
   * producto sin referencia y respondía 400 MISSING_PRODUCT_REFERENCE aunque la
   * pantalla mostrara la referencia bien puesta.
   *
   * Se notaba como "no guarda al primer click": ese primer intento fallaba, pero
   * de paso poblaba la referencia, así que el segundo click sí pasaba.
   */
  private identificacionParaGuardar(): any {
    const raw = this.identificacion.getRawValue();
    if (!raw.referencia) {
      this.asegurarReferencia();
      raw.referencia =
        this.identificacion.getRawValue()?.referencia || this.construirReferenciaAutomatica();
    }
    if (!raw.codigoBarras) {
      raw.codigoBarras = raw.referencia;
    }
    return raw;
  }

  /**
   * Secciones obligatorias incompletas, en el orden en que aparecen en el
   * tabView. Alimenta la barra de progreso del encabezado, que ahora sí incluye
   * la imagen principal y la referencia: antes contaba solo los 6 formGroup y
   * podía decir "Todo listo para publicar" mientras el guardado fallaba.
   */
  get seccionesPendientes(): string[] {
    const pendientes = this.seccionesObligatorias
      .filter((s) => {
        const grupo = s.grupo();
        return grupo && grupo.invalid;
      })
      .map((s) => s.tab);

    if (!this.tieneImagenPrincipal()) {
      pendientes.push('Imágenes');
    }
    if (this.faltaReferencia() && pendientes.indexOf('Identificación') === -1) {
      pendientes.push('Identificación');
    }

    return pendientes.sort((a, b) => this.indiceTab(a) - this.indiceTab(b));
  }

  /**
   * Total de secciones obligatorias: los formGroup + la imagen principal.
   * La referencia no suma una unidad aparte porque cuenta dentro de
   * "Identificación", que ya está en `seccionesObligatorias`.
   */
  get totalSeccionesObligatorias(): number {
    return this.seccionesObligatorias.length + 1;
  }

  /** Handler del template: salta a una sección pendiente desde el encabezado. */
  irASeccion(header: string): void {
    this.irATab(header);
  }

  /**
   * Valida TODO el formulario de una vez y, si falta algo, lleva al usuario a la
   * sección con problemas listando todas las pendientes.
   *
   * Antes cada validación se hacía suelta y solo mostraba el mensaje: si estabas
   * en "Datos básicos" y faltaba la imagen (sección 3), el error no te decía
   * dónde estaba ni te llevaba — tocaba salir a buscarla a mano.
   *
   * Rigor distinto según el modo, a propósito:
   *
   * - `crear`: bloquea. Un producto nuevo nace completo.
   * - `editar`: avisa y deja decidir. El guardado original NUNCA validó la
   *   validez de los formGroup (solo la imagen), así que hay productos vivos en
   *   la base que no cumplen los obligatorios de hoy. Bloquear al editar los
   *   volvería intocables: no podrías corregirle el precio a un producto viejo
   *   sin antes llenarle campos que no existían cuando se creó.
   *
   * La imagen principal sí bloquea en los dos modos, porque eso ya era así.
   *
   * @returns true si se puede continuar con el guardado.
   */
  private async validarAntesDeGuardar(modo: 'crear' | 'editar'): Promise<boolean> {
    // Última oportunidad de generar la referencia automática antes de decidir
    // si falta. Acá sí se puede: no estamos dentro de la detección de cambios.
    this.asegurarReferencia();

    const pendientes: { tab: string; detalle: string[] }[] = [];

    for (const seccion of this.seccionesObligatorias) {
      const grupo = seccion.grupo();
      if (!grupo || grupo.valid) { continue; }
      // Marca los controles como "touched" para que se pinten los campos y se
      // muestren sus mensajes de error al volver a la sección.
      grupo.markAllAsTouched();
      pendientes.push({ tab: seccion.tab, detalle: this.camposInvalidos(grupo) });
    }

    // La imagen principal no vive en un validador del form: se valida aparte
    // porque puede estar subida o solo encolada en `fileImg`.
    const faltaImagen = !this.tieneImagenPrincipal();
    if (faltaImagen) {
      pendientes.push({ tab: 'Imágenes', detalle: ['Al menos una imagen principal'] });
    }

    // La referencia se valida aparte (ver faltaReferencia). Si falta, se anexa
    // al detalle de "Identificación" en vez de crear una segunda entrada.
    if (this.faltaReferencia()) {
      const yaListada = pendientes.find((p) => p.tab === 'Identificación');
      const detalle = 'Referencia (en modo automático se genera sola; si no aparece, '
        + 'poné Tipo Referencia en "Manual" y escribila)';
      if (yaListada) {
        yaListada.detalle.push(detalle);
      } else {
        pendientes.push({ tab: 'Identificación', detalle: [detalle] });
      }
    }

    if (pendientes.length === 0) { return true; }

    // Se ordenan como aparecen en el tabView para que "la primera pendiente"
    // sea de verdad la primera que el usuario ve.
    pendientes.sort((a, b) => this.indiceTab(a.tab) - this.indiceTab(b.tab));

    const listado = pendientes
      .map(
        (p) =>
          `<li style="margin-bottom:6px"><strong>${p.tab}</strong>` +
          (p.detalle.length ? `<br><span style="color:#8b879f">${p.detalle.join(', ')}</span>` : '') +
          `</li>`,
      )
      .join('');

    const cuerpo = `<ul style="text-align:left;padding-left:20px;margin:0">${listado}</ul>`;
    const bloquea = modo === 'crear' || faltaImagen;

    if (bloquea) {
      const encabezado = faltaImagen && modo === 'editar'
        ? 'Falta la imagen principal'
        : 'No se puede guardar todavía. Revisá estas secciones:';
      await Swal.fire({
        title: 'Faltan datos obligatorios',
        html: `<p style="margin-bottom:10px">${encabezado}</p>${cuerpo}`,
        icon: 'warning',
        confirmButtonText: `Ir a "${pendientes[0].tab}"`,
        confirmButtonColor: '#6a4dfb',
      });
      this.irATab(pendientes[0].tab);
      return false;
    }

    // Modo editar sin problemas de imagen: se avisa pero la decisión es del usuario.
    const respuesta = await Swal.fire({
      title: 'Hay datos obligatorios sin llenar',
      html:
        `<p style="margin-bottom:10px">Podés guardar los cambios igual, o completar estas secciones primero:</p>${cuerpo}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Guardar cambios igual',
      cancelButtonText: `Ir a "${pendientes[0].tab}"`,
      confirmButtonColor: '#6a4dfb',
      cancelButtonColor: '#8b879f',
      reverseButtons: true,
    });

    if (!respuesta.isConfirmed) {
      this.irATab(pendientes[0].tab);
      return false;
    }
    return true;
  }

  getPageTitle(): string {
    if (this.isDropshippingConfigMode) return 'Configurar Dropshipping';
    return this.edit ? 'Editar Producto' : 'Crear Producto';
  }

  getBreadcrumbActiveItem(): string {
    if (this.isDropshippingConfigMode) return 'Configurar Dropshipping';
    return this.edit ? 'Editar Producto' : 'Crear Producto';
  }

  eliminarProcesosDisponiblesRepetidos() {
    if (this.procesoSeleccionado) {
      // Eliminar de procesosProduccion los procesos que ya están en productosArticulos para no repetirlos
      this.procesosProduccion = this.procesosProduccion.filter((p) => {
        return !this.procesoSeleccionado.procesos.some(
          (pa) => pa.nombre == p.nombre,
        );
      });
    }
  }
  construirRuta(objeto, ruta = ""): string {
    if (objeto.parent && objeto.parent.label) {
      let nuevaRuta = objeto.parent.label + (ruta ? " > " : "") + ruta;
      return this.construirRuta(objeto.parent, nuevaRuta);
    } else {
      return ruta;
    }
  }
  onFileSelectedByNode(event: Event, node: any): void {
    const file = (event.target as HTMLInputElement).files?.item(0);

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        node.data.imagen = reader.result;
      };
      reader.readAsDataURL(file);
    } else {
      node.data.imagen = null;
    }
  }

  getVariablesFormDetails(index: number) {
    const variablesForm = this.procesoComercial.get(
      "variablesForm",
    ) as FormArray;
    return variablesForm.controls[index]["controls"];
  }

  crearPreciosPorVolumen(): FormGroup {
    const fbSub = this.fb.group({
      numeroUnidadesInicial: [0, [Validators.required]],
      numeroUnidadesLimite: [0, [Validators.required]],
      valorUnitarioPorVolumenSinIVA: [0, [Validators.required]],
      valorUnitarioPorVolumenIva: [0, [Validators.required]],
      valorIVAPorVolumen: [19, [Validators.required]],
      valorUnitarioPorVolumenConIVA: [0, [Validators.required]],
    });

    fbSub
      .get("valorUnitarioPorVolumenSinIVA")
      .valueChanges.subscribe((precioUnitarioSinIva: any) => {
        if (precioUnitarioSinIva !== null && precioUnitarioSinIva !== undefined && precioUnitarioSinIva !== '') {
          // Convertir a número si es necesario
          let precioSinIvaNum = precioUnitarioSinIva;
          if (typeof precioUnitarioSinIva === 'string') {
            precioSinIvaNum = parseFloat(precioUnitarioSinIva) || 0;
          }
          
          const precioIva = fbSub.get("valorIVAPorVolumen").value;
          // Convertir precioIva a número si es necesario
          let precioIvaNum = precioIva;
          if (typeof precioIva === 'string') {
            precioIvaNum = parseFloat(precioIva) || 0;
          } else if (precioIva === null || precioIva === undefined) {
            precioIvaNum = 0;
          }
          
          // Calcular el IVA
          const calculo = precioSinIvaNum * (precioIvaNum / 100);
          const precioTotalConIva = calculo + precioSinIvaNum;
          
          // Actualizar los valores calculados
          fbSub.get("valorUnitarioPorVolumenIva").setValue(calculo);
          fbSub.get("valorUnitarioPorVolumenConIVA").setValue(precioTotalConIva);
        } else {
          fbSub.get("valorUnitarioPorVolumenIva").setValue(0);
          fbSub.get("valorUnitarioPorVolumenConIVA").setValue(0);
        }
      });

    fbSub.get("valorIVAPorVolumen").valueChanges.subscribe((precioIva: any) => {
      if (precioIva !== null && precioIva !== undefined && precioIva !== '') {
        const unitPrice = fbSub.get("valorUnitarioPorVolumenSinIVA").value;
        
        // Convertir a número si es necesario
        let unitPriceNum = unitPrice;
        if (typeof unitPrice === 'string') {
          unitPriceNum = parseFloat(unitPrice) || 0;
        } else if (unitPrice === null || unitPrice === undefined) {
          unitPriceNum = 0;
        }
        
        // Convertir precioIva a número si es necesario
        let precioIvaNum = precioIva;
        if (typeof precioIva === 'string') {
          precioIvaNum = parseFloat(precioIva) || 0;
        }
        
        // Calcular el IVA
        const calculo = unitPriceNum * (precioIvaNum / 100);
        const precioTotalConIva = calculo + unitPriceNum;
        
        // Actualizar los valores calculados
        fbSub.get("valorUnitarioPorVolumenIva").setValue(calculo);
        fbSub.get("valorUnitarioPorVolumenConIVA").setValue(precioTotalConIva);
      } else {
        fbSub.get("valorUnitarioPorVolumenIva").setValue(0);
        fbSub.get("valorUnitarioPorVolumenConIVA").setValue(0);
      }
    });

    fbSub
      .get("numeroUnidadesInicial")
      .valueChanges.subscribe((valorInicial: any) => {
        // Verificar si es la primera fila (índice 0)
        const preciosPorVolumen = this.precio.get("preciosVolumen") as FormArray;
        const currentIndex = preciosPorVolumen.controls.indexOf(fbSub);
        
        // Si es la primera fila, forzar el valor a 1
        if (currentIndex === 0) {
          if (valorInicial !== 1 && valorInicial !== null && valorInicial !== undefined) {
            fbSub.get("numeroUnidadesInicial").setValue(1, { emitEvent: false });
            return;
          }
        }
        
        const valorLimite = fbSub.get("numeroUnidadesLimite").value;

        if (valorInicial && valorLimite && valorInicial > valorLimite) {
          // Establecer un error en numeroUnidadesInicial si es mayor que numeroUnidadesLimite
          fbSub
            .get("numeroUnidadesInicial")
            .setErrors({ greaterThanLimit: true });
        } else {
          fbSub.get("numeroUnidadesInicial").setErrors(null);
        }
      });

    fbSub
      .get("numeroUnidadesLimite")
      .valueChanges.subscribe((valorLimite: any) => {
        // Verificar si es la primera fila (índice 0)
        const preciosPorVolumen = this.precio.get("preciosVolumen") as FormArray;
        const currentIndex = preciosPorVolumen.controls.indexOf(fbSub);
        
        // Si es la primera fila, forzar el valor a 1
        if (currentIndex === 0) {
          if (valorLimite !== 1 && valorLimite !== null && valorLimite !== undefined) {
            fbSub.get("numeroUnidadesLimite").setValue(1, { emitEvent: false });
            return;
          }
        }
        
        const valorInicial = fbSub.get("numeroUnidadesInicial").value;

        if (valorLimite && valorInicial && valorInicial > valorLimite) {
          // Establecer un error en numeroUnidadesInicial si es mayor que numeroUnidadesLimite
          fbSub
            .get("numeroUnidadesInicial")
            .setErrors({ greaterThanLimit: true });
        } else {
          fbSub.get("numeroUnidadesInicial").setErrors(null);
        }
      });

    return fbSub;
  }

  crearVariable(): FormGroup {
    const fbSub = this.fb.group({
      titulo: ["", [Validators.required]],
      subtitulo: ["", [Validators.required]],
      imagen: ["", [Validators.required]],
      valorUnitarioPorVolumenSinIVA: [0, [Validators.required]],
      valorUnitarioPorVolumenIva: [0, [Validators.required]],
      valorIVAPorVolumen: [19, [Validators.required]],
      valorUnitarioPorVolumenConIVA: [0, [Validators.required]],
    });

    fbSub
      .get("valorUnitarioPorVolumenSinIVA")
      .valueChanges.subscribe((precioUnitarioSinIva: any) => {
        if (precioUnitarioSinIva) {
          const precioIva = fbSub.get("valorIVAPorVolumen").value;
          const calculo = parseInt(precioUnitarioSinIva) * (precioIva / 100);
          fbSub.get("valorUnitarioPorVolumenIva").setValue(calculo);
          fbSub
            .get("valorUnitarioPorVolumenConIVA")
            .setValue(calculo + precioUnitarioSinIva);
        } else {
          fbSub.get("valorUnitarioPorVolumenIva").setValue(0);
          fbSub.get("valorUnitarioPorVolumenConIVA").setValue(0);
        }
      });

    fbSub.get("valorIVAPorVolumen").valueChanges.subscribe((precioIva: any) => {
      if (precioIva) {
        const unitPrice = fbSub.get("valorUnitarioPorVolumenSinIVA").value;
        const calculo = unitPrice * (precioIva / 100);
        fbSub.get("valorUnitarioPorVolumenIva").setValue(calculo);
        fbSub
          .get("valorUnitarioPorVolumenConIVA")
          .setValue(calculo + unitPrice);
      } else {
        fbSub.get("valorUnitarioPorVolumenIva").setValue(0);
        fbSub.get("valorUnitarioPorVolumenConIVA").setValue(0);
      }
    });

    return fbSub;
  }

  guardarRegistrosEnFirebase() {
    // this.carrouselImg = [];
    // La URL la devuelve el backend al subir; ya no se consulta a Storage.
    this.filesPaths
      .filter((img) => !!img.url)
      .forEach((img) => {
          const media = {
            urls: img.url,
            nombreImagen: img.name,
            path: img.pathName,
            tipo: img.tipo,
          };

          this.fileUrls.push(media);
          // this.carrouselImg.push(url);

          if (this.fileUrls.length == this.filesPaths.length) {
            const ulrPrincipal = this.fileUrls.filter(
              (r) => r.tipo == "principal",
            );
            const ulrSecundaria = this.fileUrls.filter(
              (r) => r.tipo == "secundaria",
            );
            if (ulrPrincipal.length > 0) {
              // Obtener imágenes actuales y nuevas
              const currentPrincipalImages = this.crearProducto.controls["imagenesPrincipales"].value || [];
              const newPrincipalImages = this.fileUrls.filter((r) => r.tipo == "principal");
              // Usar setValue para actualizar correctamente el FormControl
              this.crearProducto.controls["imagenesPrincipales"].setValue([
                ...currentPrincipalImages,
                ...newPrincipalImages
              ]);
            }
            if (ulrSecundaria.length > 0) {
              // Obtener imágenes actuales y nuevas
              const currentSecondaryImages = this.crearProducto.controls["imagenesSecundarias"].value || [];
              const newSecondaryImages = this.fileUrls.filter((r) => r.tipo == "secundaria");
              // Usar setValue para actualizar correctamente el FormControl
              this.crearProducto.controls["imagenesSecundarias"].setValue([
                ...currentSecondaryImages,
                ...newSecondaryImages
              ]);
            }
            this.editarProducto();
          }
      });
  }

  validarReferenciaEnBlur(): void {
    const tipoRef = this.identificacion.get('tipoReferencia')?.value;
    if (tipoRef === 'propio') return;
    const ref = this.identificacion.getRawValue().referencia;
    if (!ref) { this.referenciaError = ''; return; }
    this.validarReferenciaUnica().then(() => {});
  }

  private validarReferenciaUnica(): Promise<boolean> {
    const tipoRef = this.identificacion.get('tipoReferencia')?.value;
    // Referencias automáticas ('propio') son únicas por diseño — no validar
    if (tipoRef === 'propio') return Promise.resolve(true);

    const ref = this.identificacion.getRawValue().referencia;
    if (!ref) return Promise.resolve(true);

    const excludeId = this.isEditMode() ? (this.edit?.cd || this.edit?.id || this.cd) : undefined;

    return new Promise((resolve) => {
      this.validandoReferencia = true;
      this.service.checkReferenciaUnica(ref, excludeId).subscribe({
        next: (response: any) => {
          this.validandoReferencia = false;
          if (response?.exists) {
            const nombreConflicto = response.producto?.crearProducto?.titulo || 'otro producto';
            this.referenciaError = `Esta referencia ya está en uso por: "${nombreConflicto}". Por favor usa una diferente.`;
            resolve(false);
          } else {
            this.referenciaError = '';
            resolve(true);
          }
        },
        error: () => {
          // Si el endpoint aún no existe en backend, permitir guardar (graceful degradation)
          this.validandoReferencia = false;
          this.referenciaError = '';
          resolve(true);
        }
      });
    });
  }

  async guardarProductos() {
    // Evitar múltiples envíos
    if (this.saving) {
      return;
    }
    this.saving = true;
    // Validación de precios por volumen deshabilitada para permitir precios en 0
    // let preciosVolumen = this.precio.get("preciosVolumen") as FormArray;
    // let preciosVolumenSinPrecio = preciosVolumen.controls.filter(
    //   (p) => p.get("valorUnitarioPorVolumenSinIVA").value == 0,
    // );
    // if (preciosVolumenSinPrecio.length > 0) {
    //   Swal.fire(
    //     "Error",
    //     "Todos los precios por volumen deben tener un valor",
    //     "error",
    //   );
    //   this.saving = false;
    //   return;
    // }

    // Valida todas las secciones de una vez y navega a la primera pendiente.
    // Al crear se exige todo: el producto nace completo.
    if (!(await this.validarAntesDeGuardar('crear'))) {
      this.saving = false;
      return;
    }

    // Validar unicidad de referencia (solo referencias manuales)
    const referenciaValida = await this.validarReferenciaUnica();
    if (!referenciaValida) {
      this.saving = false;
      // Hacer scroll al campo de referencia para que el usuario lo vea
      setTimeout(() => {
        this.referencia?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    // Confirmación no bloqueante si el producto no está activado (spec 023
    // T-09): el usuario puede continuar igual, o volver a activarlo. No se
    // fuerza `activar:true` — hay comercios que precargan catálogo antes de
    // lanzar y sí quieren crear productos inactivos a propósito.
    if (this.exposicion.value.activar !== true) {
      const confirmacion = await Swal.fire({
        title: "Producto no activado",
        text: "Este producto no será visible en el catálogo hasta que lo actives. ¿Deseas continuar de todas formas?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Continuar sin activar",
        cancelButtonText: "Volver y activar",
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        showCloseButton: true,
      });
      if (!confirmacion.isConfirmed) {
        this.saving = false;
        this.irATab('Exposición');
        return;
      }
    }

    this.procesoComercial.controls["variablesForm"].setValue(
      stringify(this.variables),
    );
    this.formGeneral.controls["crearProducto"].setValue(
      this.crearProducto.value,
    );
    this.formGeneral.controls["precio"].setValue(this.precio.value);
    this.formGeneral.controls["dimensiones"].setValue(this.Dimensiones.value);
    this.formGeneral.controls["disponibilidad"].setValue(
      this.disponibilidad.value,
    );
    this.formGeneral.controls["identificacion"].setValue(
      this.identificacionParaGuardar(),
    );
    this.formGeneral.controls["exposicion"].setValue(this.exposicion.value);
    this.formGeneral.controls["procesoComercial"].setValue(
      this.procesoComercial.value,
    );
    this.formGeneral.controls["dropshippingConfig"].setValue(this.dropshippingConfig.value);
    this.formGeneral.controls["marketplace"].setValue(this.marketplace.value);
    // Sincronizar cobertura nacional antes de guardar
    this.ciudades.patchValue({
      coberturaNacionalOrigen: this.coberturaNacionalOrigen,
      coberturaNacionalEntrega: this.coberturaNacionalEntrega,
    });
    this.formGeneral.controls["ciudades"].setValue(this.ciudades.value);
    this.formGeneral.controls["categorias"].setValue(
      stringify(this.categoriasForm.controls["categorias"].value),
    );
    this.formGeneral.controls["otrosProcesos"].controls[
      "modulosVariables"
    ].controls["produccion"].setValue(this.productosArticulos);
    this.formGeneral.controls["kaiForm"].setValue(this.kaiForm.value);

    // Subir imágenes pendientes antes de crear el producto
    try {
      await this.uploadPendingImages();
    } catch (e: any) {
      Swal.fire(
        "Error",
        `No se pudieron subir las imágenes: ${e?.message || 'error desconocido'}. Intente de nuevo.`,
        "error",
      );
      this.saving = false;
      return;
    }

    // Sincronizar imagenesPrincipales ya subidas al formGeneral
    this.formGeneral.controls["crearProducto"].setValue(this.crearProducto.value);

    // El payload se arma en el ÚLTIMO momento, después del await de imágenes.
    // En ese hueco corre detección de cambios, y cualquier binding del template
    // con efectos secundarios puede pisar `formGeneral` — es exactamente lo que
    // hacía `getKatuqPrompt()`. Tomar acá la identificación directo del
    // formulario deja el guardado a salvo de eso, aunque aparezca otro caso.
    const payload = {
      ...this.formGeneral.value,
      identificacion: this.identificacionParaGuardar(),
    };

    const context = this;
    this.service.createProduct(payload).subscribe({
      next(r: any) {
        // Pasamos a modo edición con el objeto retornado
        context.edit = r;
        context.cd = r.cd;
        sessionStorage.setItem("infoForms", JSON.stringify(context.edit));
        context.saving = false;
        console.log(r);
        Swal.fire({
          title: "Guardado!",
          text: "Guardado con exito",
          icon: "success",
          confirmButtonText: "Ok",
        });

        // Cambiar a modo editar solo DESPUÉS de guardar exitosamente
        context.mostrarCrear = false;
      },
      error(error) {
        // Revertir estado para permitir reintento
        context.saving = false;
        // No cambiar mostrarCrear aquí, ya que nunca se cambió antes
        console.error(error);
        Swal.fire({
          title: "Error guardando!",
          text: error.error.msg,
          icon: "error",
          confirmButtonText: "Ok",
        });
      },
    });
  }
  async editarProducto() {
    // Evitar múltiples envíos (mismo guard que guardarProductos)
    if (this.saving) {
      return;
    }
    this.saving = true;

    // Precios por volumen en 0: NO bloquea, igual que al crear.
    //
    // `guardarProductos` tiene esta misma validación comentada a propósito
    // ("permitir precios en 0"), así que un producto nace perfectamente válido
    // con sus precios por volumen en 0. Dejarla viva sólo acá volvía el editar
    // MÁS estricto que el crear: el producto quedaba intocable — no se podía
    // corregir ni un campo de Datos básicos sin antes llenar unos precios por
    // volumen que nunca se pidieron. Es justo lo contrario de la regla acordada
    // (estricto al crear, permisivo al editar).
    //
    // Si algún día los precios por volumen deben ser obligatorios, va en el
    // ALTA y con el campo marcado, no como bloqueo sorpresa al editar.

    // Al editar avisa pero no bloquea (salvo la imagen), para no dejar
    // intocables los productos viejos que no cumplen los obligatorios de hoy.
    if (!(await this.validarAntesDeGuardar('editar'))) {
      this.saving = false;
      return;
    }

    // Subir imágenes pendientes antes de editar
    try {
      await this.uploadPendingImages();
    } catch (e: any) {
      Swal.fire(
        "Error",
        `No se pudieron subir las imágenes: ${e?.message || 'error desconocido'}. Intente de nuevo.`,
        "error",
      );
      this.saving = false;
      return;
    }

    this.procesoComercial.controls["variablesForm"].setValue(
      stringify(this.variables),
    );
    this.formGeneral.controls["crearProducto"].setValue(
      this.crearProducto.value,
    );
    this.formGeneral.controls["precio"].setValue(this.precio.value);
    this.formGeneral.controls["dimensiones"].setValue(this.Dimensiones.value);
    this.formGeneral.controls["disponibilidad"].setValue(
      this.disponibilidad.value,
    );
    // Antes acá se inyectaba la referencia a mano sobre `this.identificacion.value`
    // (que excluye los controles deshabilitados). Se reemplaza por el helper, que
    // además cubre el caso `undefined` que borraba la clave al serializar.
    this.formGeneral.controls["identificacion"].setValue(
      this.identificacionParaGuardar(),
    );
    this.formGeneral.controls["exposicion"].setValue(this.exposicion.value);
    this.formGeneral.controls["otrosProcesos"].controls[
      "modulosVariables"
    ].controls["produccion"].setValue(this.productosArticulos);
    let generosArray = this.procesoComercial.value.genero;
    let generosMap = {};
    for (let i = 0; i < generosArray.length; i++) {
      generosMap[generosArray[i]] = true;
    }

    let ocasionesArray = this.procesoComercial.value.ocasion;
    let ocasionesMap = {};
    for (let i = 0; i < ocasionesArray.length; i++) {
      ocasionesMap[ocasionesArray[i]] = true;
    }
    this.procesoComercial.value.generoMap = generosMap;
    this.procesoComercial.value.ocasionesMap = ocasionesMap;
    this.formGeneral.controls["procesoComercial"].setValue(
      this.procesoComercial.value,
    );
    this.formGeneral.controls["dropshippingConfig"].setValue(this.dropshippingConfig.value);
    this.formGeneral.controls["marketplace"].setValue(this.marketplace.value);
    // Sincronizar cobertura nacional antes de editar
    this.ciudades.patchValue({
      coberturaNacionalOrigen: this.coberturaNacionalOrigen,
      coberturaNacionalEntrega: this.coberturaNacionalEntrega,
    });
    this.formGeneral.controls["ciudades"].setValue(this.ciudades.value);
    if (this.categoriasForm.controls["categorias"].value != null) {
      delete this.categoriasForm.controls["categorias"].value[
        "partialSelected"
      ];
    }
    this.formGeneral.controls["categorias"].setValue(
      stringify(this.categoriasForm.controls["categorias"].value),
    );

    const formGeneralEditar = this.formGeneral.value;
    formGeneralEditar["cd"] = this.cd;

    this.edit = formGeneralEditar;
    sessionStorage.setItem("infoForms", JSON.stringify(this.edit));

    this.service.editProductByReference(formGeneralEditar).subscribe({
      next: (res) => {
        this.saving = false;
        if (res) {
          Swal.fire("Editado", "Producto editado correctamente", "success");
          // Limpiar arrays DESPUÉS de que el servidor confirme éxito
          this.filesPaths = [];
          this.fileUrls = [];
          this.files = null;
          this.fileImg = [];
          this.filesNames = [];
        } else {
          Swal.fire("Error", "Error al editar el producto", "error");
        }
      },
      error: (error) => {
        this.saving = false;
        console.error(error);
        Swal.fire("Error guardando!", error?.error?.error || error?.error?.msg || "No se pudo editar el producto. Intente de nuevo.", "error");
      },
    });
  }
  onRadioClick() {
    if (this.opcionSeleccionada.nativeElement.value == "manual") {
      this.identificacion.get("referencia").enable();
    } else {
      this.identificacion.get("referencia").disable();
    }
  }
  generarCodigoBarrasByCodigoBarras() {
    const codigoBarras = this.identificacion.get("codigoBarras").value;
    this.generateBarcode(codigoBarras);
  }
  generarCodigoBarras() {
    let referencia: string;

    if (!this.isEditMode()) {
      // Modo crear: usar referencia actual
      referencia = this.identificacion.get("referencia").value;
    } else {
      // Modo editar: usar referencia existente o generar nueva
      if (this.identificacion.get("tipoReferencia").value === "propio") {
        referencia = this.edit.identificacion?.referencia || 
                    this.ultimasLetras + "-" + (this.totalProducts + 1).toString().padStart(6, "0");
        this.identificacion.controls["referencia"].setValue(referencia);
      } else {
        referencia = this.identificacion.get("referencia").value;
      }
    }

    // Sincronizar código de barras con referencia y generar
    this.identificacion.controls["codigoBarras"].setValue(referencia);
    this.generateBarcode(referencia);
  }

  onFileChange(event) {
    const file: File = event[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      this.file$ = new Observable((observer) => {
        observer.next(reader.result);
        observer.complete();
      });
    };
  }
  public onUploadInit(args: any): void {
    console.log("onUploadInit:", args);
  }

  onParaProduccionChanged(node, event) {
    // node.data.paraProduccion = event.checked;
    // debe aparecer en los articulos a producir
    if (event) {
      this.productosArticulos.push({
        titulo: node.data.titulo,
        cantidadUnitaria: 1,
        procesos: [],
      });
    } else {
      const index = this.productosArticulos.findIndex(
        (p) => p.titulo == node.data.titulo,
      );
      if (index > -1) {
        this.productosArticulos.splice(index, 1);
      }
    }
  }

  getNombreVariable(titulo: string) {
    const variable = this.variables.find(
      (v) => v.children.find(c => c.data.titulo == titulo) !== undefined  
    );
    return variable ?  'Proceso comercial ' + variable.data.titulo + ': ' : "";
  }

  addChild(node: TreeNode) {
    //Aquí podría ir la logica para agregar un hijo a la categoria seleccionada
    if (node.children == undefined) {
      node.children = [];
    }
    const hijo = Object.assign(
      {},
      {
        data: {
          titulo: "",
          tipoImagen: "",
          subtitulo: "",
          imagen: "",
          valorUnitarioSinIva: 0,
          porcentajeIva: 0,
          valorIva: 0,
          precioTotalConIva: 0,
          paraProduccion: false,
        },
      },
    );
    node.children.push(hijo);
    this.cdr.detectChanges();
    this.cdr.markForCheck();
    this.variables = [...this.variables];
  }

  deleteChild(node) {
    //Aquí podría ir la lógica para eliminar un hijo seleccionado
    if (node.parent == null) {
      const index = this.variables.indexOf(node);
      this.variables.splice(index, 1);
    } else if (node.children == undefined) {
      const index = node.parent.children.indexOf(node);
      node.parent.children.splice(index, 1);
    } else {
      const index = node.children.indexOf(node);
      node.children.splice(index, 1);
    }

    this.variables = [...this.variables];

    this.cdr.detectChanges();
    this.cdr.markForCheck();
  }

  paraProduccion: boolean = false;

  producirProducto() {
    // this.paraProduccion = this.paraProduccion ? false : true;
    this.crearProducto.get("paraProduccion").setValue(this.paraProduccion);
  }

  addRow() {
    this.preciosPorVolumen = this.precio.get("preciosVolumen") as FormArray;
    let newItem = this.crearPreciosPorVolumen();
    // Si hay al menos un item en el array
    if (this.preciosPorVolumen.length > 0) {
      let lastItem = this.preciosPorVolumen.at(
        this.preciosPorVolumen.length - 1,
      );
      let lastLimitInit = lastItem.get("numeroUnidadesInicial").value;
      let lastLimitSecond = lastItem.get("numeroUnidadesLimite").value;
      let newValueLimit = lastLimitSecond + 1;
      let newValueLimitSecond =
        newValueLimit + Math.abs(lastLimitInit - lastLimitSecond);
      newItem.get("numeroUnidadesInicial").setValue(newValueLimit);
      newItem.get("numeroUnidadesLimite").setValue(newValueLimitSecond);
    } else {
      newItem.get("numeroUnidadesInicial").setValue(2);
      newItem.get("numeroUnidadesLimite").setValue(10);
      //una validacion para que no deje ingresar el valor 1
      // newItem.get('numeroUnidadesInicial').setValidators([Validators.min(2), Validators.required]);
    }

    this.preciosPorVolumen.push(newItem);
  }
  addVariable() {
    // this.variablesAgregadas = this.procesoComercial.get('variables') as FormArray;
    // this.variablesAgregadas.push(this.crearVariable());
    if (this.variables.length == 0) {
      this.variables = [
        {
          data: {
            titulo: "",
            index: this.variables.length,
            subtitulo: "",
            imagen: "",
            valorUnitarioSinIva: 0,
            porcentajeIva: 0,
            valorIva: 0,
            precioTotalConIva: 0,
            paraProduccion: false,
          },
          children: [],
        },
      ];
    } else {
      this.variables.push({
        data: {
          titulo: "",
          index: this.variables.length + 1,
          subtitulo: "",
          imagen: "",
          valorUnitarioSinIva: 0,
          porcentajeIva: 0,
          valorIva: 0,
          precioTotalConIva: 0,
          paraProduccion: false,
        },
        children: [],
      });
    }
    this.variables = [...this.variables];
    this.cdr.detectChanges();
    this.cdr.markForCheck();
  }

  addSibling(node, rowIndex) {
    const newNode = {
      data: {
        titulo: "",
        subtitulo: "",
        imagen: "",
        valorUnitarioSinIva: 0,
        porcentajeIva: 0,
        valorIva: 0,
        precioTotalConIva: 0,
        paraProduccion: false,
      },
      children: [],
    };

    if (node.parent) {
      // Agrega una nueva fila al mismo nivel que la fila actual (como hermana)
      let parentChildren = node.parent.children;
      let currentIndex = parentChildren.findIndex((child) => child === node);
      parentChildren.splice(currentIndex + 1, 0, newNode);
    } else {
      // En el caso de que la fila actual sea de nivel superior
      const index = this.variables.indexOf(node);
      this.variables.splice(index + 1, 0, newNode);
    }

    this.variables = [...this.variables]; // Actualiza la referencia para que Angular detecte el cambio
    this.cdr.detectChanges();
    this.cdr.markForCheck();
  }

  lessRow(index) {
    this.preciosPorVolumen.removeAt(index);
  }
  lessRowVariable(index) {
    this.variablesAgregadas.removeAt(index);
  }

  activarProcesoComercial() {
    this.activar = !this.activar;
    // Actualizar el valor en el formulario para guardarlo en la BD
    this.procesoComercial.get('configProcesoComercialActivo').setValue(this.activar);
  }

  guardar() {
    Swal.fire({
      title: "Guardado!",
      text: "Guardado con exito",
      icon: "success",
      confirmButtonText: "Ok",
    });
  }

  onEnter(value: string) {
    if (!this.etiquetas.includes(value)) {
      this.etiquetas.push(value);
    }
    this.exposicion.get("etiquetas").setValue(this.etiquetas);
    (document.getElementById("etiqueta") as HTMLInputElement).value = "";
  }

  onValorUnitarioSinIvaChanged(node: any, newValue: number) {
    if (newValue) {
      const porcentajeIva = node.data.porcentajeIva;
      const calculo = newValue * (porcentajeIva / 100);
      node.data.valorIva = calculo;
      node.data.precioTotalConIva = calculo + newValue;
    } else {
      node.data.valorIva = 0;
      node.data.precioTotalConIva = 0;
    }
    this.cdr.detectChanges();
  }

  onPrecioUnitarioIvaChanged(node: any, newValue: number) {
    if (newValue) {
      const unitPrice = node.data.valorUnitarioSinIva;
      const calculo = unitPrice * (newValue / 100);
      node.data.valorIva = calculo;
      node.data.precioTotalConIva = calculo + unitPrice;
    } else {
      node.data.valorIva = 0;
    }
    this.cdr.detectChanges();
  }

  addColor() {
    const colorValue = (
      document.getElementById("colorescogido") as HTMLInputElement
    ).value;
    const colors = this.procesoComercial.get("colorDecoracion");
    const currentColors = colors.value || [];
    if (!currentColors.includes(colorValue)) {
      colors.setValue([...currentColors, colorValue]);
    } else {
      Swal.fire({
        title: "Atención!",
        text: "El color ya fue agregado",
        icon: "warning",
        showConfirmButton: false,
        timer: 3000,
      });
    }
  }

  removeColor(color: string) {
    const colorDecoracion = this.procesoComercial.get(
      "colorDecoracion",
    ) as FormArray;
    const index = colorDecoracion.value.indexOf(color);
    if (index >= 0) {
      colorDecoracion.value.splice(index, 1);
      colorDecoracion.setValue(
        colorDecoracion.value.map((control) => control.value),
      );
    }
  }
  viewProduct() {
    this.procesoComercial.controls["variablesForm"].setValue(
      stringify(this.variables),
    );
    this.formGeneral.controls["crearProducto"].setValue(
      this.crearProducto.value,
    );
    this.formGeneral.controls["precio"].setValue(this.precio.value);
    this.formGeneral.controls["dimensiones"].setValue(this.Dimensiones.value);
    this.formGeneral.controls["disponibilidad"].setValue(
      this.disponibilidad.value,
    );
    // getRawValue y no `.value`: `.value` deja fuera `referencia` y
    // `codigoBarras` (deshabilitados) y dejaba `formGeneral` sin referencia.
    this.formGeneral.controls["identificacion"].setValue(
      this.identificacion.getRawValue(),
    );
    this.formGeneral.controls["exposicion"].setValue(this.exposicion.value);
    this.formGeneral.controls["procesoComercial"].setValue(
      this.procesoComercial.value,
    );
    this.formGeneral.controls["dropshippingConfig"].setValue(this.dropshippingConfig.value);
    this.formGeneral.controls["marketplace"].setValue(this.marketplace.value);
    this.formGeneral.controls["ciudades"].setValue(this.ciudades.value);
    this.formGeneral.controls["categorias"].setValue(
      stringify(this.categoriasForm.controls["categorias"].value),
    );
    // función que permite ver el producto en una ventana emergente;
    const config: NgbModalOptions = {
      backdrop: "static",
      size: "xl",
      keyboard: true,
      centered: true,
      animation: true,
      fullscreen: true,
      scrollable: true,
      windowClass: "modal-fullscreen",
    };
    const modalRef = this.modalService.open(ProductDetailsComponent, config);
    modalRef.componentInstance.producto = this.formGeneral.value as Producto;
    modalRef.componentInstance.fromProductCreate = true;
    modalRef.componentInstance.isView = true;
  }

  addArticuloOfProduct() {
    const adicionSelected = this.moduloVariable.value.adicion;
    if (adicionSelected && !(typeof adicionSelected === 'object' && Object.keys(adicionSelected).length === 0)) {
      this.moduloVariable.controls["titulo"].setValue(adicionSelected);
    }

    if (!this.moduloVariable.valid) {
      Swal.fire({
        title: "Atención!",
        text: "El campo es requerido",
        icon: "warning",
        showConfirmButton: false,
        timer: 3000,
      });
      return;
    }

    if (this.procesosProduccion && this.procesosProduccion.length > 0) {
      this.productosArticulos.push(this.moduloVariable.value);

      this.moduloVariable.reset();
    } else {
      Swal.fire({
        title: "Atención!",
        text: "No hay procesos de producción disponibles",
        icon: "warning",
        showConfirmButton: false,
        timer: 3000,
      });
    }
  }
  limpiarProcesoProduccion() {
    this.moduloVariable.reset();
  }

  deleteArticuloOfProduct(item) {
    Swal.fire({
      title: "Eliminar artículo",
      text: "¿Está seguro de eliminar el artículo?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí",
      cancelButtonText: "No",
    }).then((result) => {
      if (result.isConfirmed) {
        const index = this.productosArticulos.indexOf(item);

        //devolver los procesos  de item a la lista de procesos disponibles y validar que no se repitan
        this.procesosProduccion = this.procesosProduccion.concat(item.procesos);
        this.productosArticulos.splice(index, 1);
      }
    });
  }

  mostrarAvisoEliminado() {
    Swal.fire("Eliminado", "El artículo ha sido eliminado", "success");
  }

  openModal(content, proceso) {
    this.procesosProduccion = [];
    this.getMaestrosIniciales();
    this.modalService.open(content, {
      size: "xl",
      fullscreen: true,
      scrollable: true,
      windowClass: "modal-fullscreen",
    });
    this.procesoSeleccionado = proceso;
    if (proceso.procesos && proceso.procesos.length > 0) {
      this.procesosProduccionSeleccionados = this.utilService.deepClone(
        proceso.procesos,
      );
    } else {
      this.procesosProduccionSeleccionados = [];
    }
  }

  guardarProcesoParaArticulo() {
    this.procesoSeleccionado.procesos = this.utilService.deepClone(
      this.procesosProduccionSeleccionados,
    );
    this.procesosProduccionSeleccionados = [];
    this.modalService.dismissAll();
  }

  katuqIntelligeceResponse(event: any) {
    console.log(event.respuesta.message);
    console.log(event.respuesta.photo);
    const productWithKatuq = event.respuesta.message;
    productWithKatuq.crearProducto.imagenesPrincipales = [];
    productWithKatuq.crearProducto.imagenesSecundarias = [];

    this.crearProducto.patchValue(productWithKatuq.crearProducto);
    if (event.respuesta.photo) {
      this.crearProducto.controls["imagenesPrincipales"].setValue([
        {
          urls: event.respuesta.photo,
          nombreImagen: "principal",
        },
      ]);
    } 
    this.crearProducto.controls["paraProduccion"].setValue(
      productWithKatuq.crearProducto.paraProduccion,
    );
    // this.paraProduccion = productWithKatuq.crearProducto.paraProduccion;
    const preciosVolumen = this.precio.get("preciosVolumen") as FormArray;
    // this.precio.patchValue(productWithKatuq.precio)
    productWithKatuq.precio.preciosVolumen.forEach((precio, index) => {
      // Usar crearPreciosPorVolumen() para que se configuren los listeners de valueChanges
      const newItem = this.crearPreciosPorVolumen();
      
      // Establecer los valores con emitEvent: false para evitar disparar los listeners durante la carga
      newItem.patchValue({
        numeroUnidadesInicial: index === 0 ? 1 : precio.numeroUnidadesInicial,
        numeroUnidadesLimite: index === 0 ? 1 : precio.numeroUnidadesLimite,
        valorUnitarioPorVolumenSinIVA: precio.valorUnitarioPorVolumenSinIVA,
        valorUnitarioPorVolumenIva: precio.valorUnitarioPorVolumenIva,
        valorIVAPorVolumen: precio.valorIVAPorVolumen,
        valorUnitarioPorVolumenConIVA: precio.valorUnitarioPorVolumenConIVA,
      }, { emitEvent: false });
      
      // Si es la primera fila, deshabilitar los campos de cantidad
      if (index === 0) {
        newItem.get("numeroUnidadesInicial").disable();
        newItem.get("numeroUnidadesLimite").disable();
      }
      
      preciosVolumen.push(newItem);
    });
    this.preciosPorVolumen = preciosVolumen;
    this.precio.patchValue(productWithKatuq.precio);

    this.Dimensiones.patchValue(productWithKatuq.dimensiones);
    this.disponibilidad.patchValue(productWithKatuq.disponibilidad);
    this.identificacion.patchValue(productWithKatuq.identificacion);
    this.exposicion.patchValue(productWithKatuq.exposicion);
    this.etiquetas = productWithKatuq.exposicion.etiquetas;
    // this.categoriasForm.patchValue({ categorias: productWithKatuq.categorias })
    // this.procesoComercial.patchValue(productWithKatuq.procesoComercial);
    // this.productosArticulos = productWithKatuq?.otrosProcesos?.modulosVariables?.produccion;

    // if (!this.productosArticulos) {
    //   this.productosArticulos = [];
    // }

    // if (productWithKatuq.categorias) {

    //   this.categoriasForm.controls['categorias'].setValue(parse(productWithKatuq.categorias));
    // }

    //TODO: para mas adelante
    // if (productWithKatuq.procesoComercial.variablesForm && productWithKatuq.procesoComercial.variablesForm != '[]')
    //   this.variables = parse(productWithKatuq.procesoComercial.variablesForm);
    // this.variables = [...this.variables];
    // this.marketplace.patchValue(productWithKatuq.marketplace)
    // this.ciudades.patchValue({ ciudadesEntrega: productWithKatuq.ciudades.ciudadesEntrega, ciudadesOrigen: productWithKatuq.ciudades.ciudadesOrigen })
    // console.log(this.ciudades.value);
    if (this.crearProducto.controls["imagenesPrincipales"].value)
      this.carrouselImg = this.crearProducto.controls[
        "imagenesPrincipales"
      ].value.map((p) => {
        return "data:image/jpeg;base64," + p.urls;
      });
    // if (productWithKatuq.crearProducto.imagenesSecundarias)
    //   this.carrouselImg = [...this.carrouselImg, ...productWithKatuq.crearProducto.imagenesSecundarias.map(p => { return p.urls; })];
  }

  /**
   * Arma el prompt de KAI. **No debe tener efectos secundarios**: el template lo
   * invoca con `[katuqIntelligencePrompt]="getKatuqPrompt()"`, o sea que corre
   * en CADA ciclo de detección de cambios, en momentos que nadie controla.
   *
   * Antes volcaba todos los subformularios dentro de `formGeneral` con
   * `setValue`. El daño lo hacía esta línea:
   *
   *     formGeneral.controls['identificacion'].setValue(this.identificacion.value)
   *
   * `.value` EXCLUYE los controles deshabilitados (`referencia`, `codigoBarras`),
   * así que dejaba la identificación sin referencia. Como `guardarProductos`
   * tiene un `await uploadPendingImages()` entre que arma el payload y que lo
   * envía, la detección de cambios corría en ese hueco y borraba la referencia
   * recién puesta → 400 MISSING_PRODUCT_REFERENCE en el primer click. El
   * segundo click funcionaba porque para entonces `referencia` ya había quedado
   * habilitada y `.value` sí la incluía.
   *
   * Ahora arma una copia local y `formGeneral` no se toca.
   */
  getKatuqPrompt() {
    const snapshotProducto = {
      ...this.formGeneral.value,
      crearProducto: this.crearProducto.value,
      precio: this.precio.value,
      dimensiones: this.Dimensiones.value,
      disponibilidad: this.disponibilidad.value,
      // getRawValue: la referencia también le sirve al prompt.
      identificacion: this.identificacion.getRawValue(),
      exposicion: this.exposicion.value,
      procesoComercial: {
        ...this.procesoComercial.value,
        variablesForm: stringify(this.variables),
      },
      dropshippingConfig: this.dropshippingConfig.value,
      marketplace: this.marketplace.value,
      ciudades: this.ciudades.value,
      categorias: stringify(this.categoriasForm.controls["categorias"].value),
    };
    // ${this.kaiForm?.get('photoToAnalize')?.value != '' ? 'DescripcionImagen:' + '{descripcionImagen}' : ''}

    // ${this.kaiForm?.get('photoToAnalize')?.value != '' ? 'Debes generar todo basado en donde dice "DescripcionImagen"' : ''}

    const kaiInput = `
      Entrada:
      Título del Producto: ${this.kaiForm?.get("tituloKai")?.value}
      Texto Base: ${this.kaiForm?.get("textoBase")?.value}
      ${this.kaiForm?.get("photoToAnalize")?.value != "" ? "DescripcionImagen:" + "{descripcionImagen}" : ""}

      Salida esperada: Un texto completo y optimizado que cubra todos los puntos mencionados, diseñado para maximizar la visibilidad en motores de búsqueda, mejorar la experiencia de lectura y convertir a los visitantes en compradores.

      Para los precios deben ser sin puntos ni comas, solo decimales
      y me debes devolver solamente el json con la siguiente estructura llenos:

      ${JSON.stringify(snapshotProducto)}
      `;

    const kaiInstructions = this.kaiProductPrompt?.replace(
      "{entradas}",
      kaiInput,
    );

    return kaiInstructions;
  }

  // ...

  eliminarEtiqueta(index: number) {
    this.etiquetas.splice(index, 1);
  }

  private generateAutoReference() {
    const autoReference = this.construirReferenciaAutomatica();
    this.identificacion.controls["referencia"].setValue(autoReference);
    this.identificacion.controls["codigoBarras"].setValue(autoReference);
    this.generarCodigoBarras();
  }

  private isEditMode(): boolean {
    return sessionStorage.getItem("infoForms") !== null;
  }

  // ---- Pestaña Pedidos relacionados ----
  onTabChange(event: any): void {
    const tabIndex = event.index ?? event;
    // Lazy load cuando se activa la pestaña de pedidos
    const productoId = this.edit?.cd || this.cd;
    if (!productoId) return;

    // Se identifica la pestaña por su header (no por índice: hay pestañas
    // condicionales que corren la numeración). Antes se leía del DOM con
    // querySelectorAll; el tabView ya tiene la lista renderizada.
    const header = (this.tabView?.tabs?.[tabIndex]?.header || '').trim();
    if (header.includes('Pedidos') && !this.pedidosCargados) {
      this.cargarPedidosRelacionados(productoId);
    }
    if (header.includes('Historial') && !this.historialCargado) {
      this.cargarHistorial(productoId);
    }
  }

  cargarPedidosRelacionados(productoId?: string, page = 1): void {
    const id = productoId || this.edit?.cd || this.cd;
    if (!id) return;
    if (page === 1 && this.pedidosCargados) return; // guard para carga inicial, no para paginación
    this.loadingPedidos = true;
    this.pedidosPage = page;
    this.service.getPedidosByProducto(id, page, this.pedidosPageSize).subscribe({
      next: (response: any) => {
        this.pedidosRelacionados = response?.orders || response?.pedidos || response?.data || [];
        this.pedidosTotal = response?.total || this.pedidosRelacionados.length;
        this.pedidosTotalPages = response?.totalPages || Math.ceil(this.pedidosTotal / this.pedidosPageSize);
        this.loadingPedidos = false;
        this.pedidosCargados = true;
      },
      error: () => {
        this.pedidosRelacionados = [];
        this.loadingPedidos = false;
        this.pedidosCargados = true;
      }
    });
  }

  trackById(index: number, item: any): string {
    return item?.cd || item?.id || item?.referencia || index;
  }

  cargarHistorial(productoId?: string): void {
    const id = productoId || this.edit?.cd || this.cd;
    if (!id || this.historialCargado) return;
    this.loadingHistorial = true;
    this.service.getProductoHistorial(id).subscribe({
      next: (response: any) => {
        this.historialCambios = response?.historial || response?.data || [];
        this.loadingHistorial = false;
        this.historialCargado = true;
      },
      error: () => {
        this.historialCambios = [];
        this.loadingHistorial = false;
        this.historialCargado = true;
      }
    });
  }

  private generateBarcode(code: string) {
    if (!code) {
      this.barCodeGen = false;
      return;
    }

    if (code.length < 6) {
      this.barCodeGen = false;
      Swal.fire("Error", "El código debe tener al menos 6 caracteres", "error");
      return;
    }

    this.valorBarCode = code;
    this.barCodeGen = true;
    this.cdr.detectChanges();
  }

  private async confirmImageUpload(): Promise<boolean> {
    const result = await Swal.fire({
      title: "¿Agregar imágenes?",
      text: "Las imágenes se subirán al guardar el producto.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, agregar",
      cancelButtonText: "Cancelar",
    });
    return result.isConfirmed;
  }

  removePendingImage(index: number) {
    this.fileImg.splice(index, 1);
    this.filesNames.splice(index, 1);
    this.cdr.detectChanges();
  }

  private resetImageStates(event: any) {
    this.fileImg = [];
    this.filesNames = [];
    event.target.value = "";
  }

  private async processSelectedFiles(selectedFiles: FileList, tipoImagen: string) {
    for (let i = 0; i < selectedFiles.length; i++) {
      const originalFile = selectedFiles[i];
      const processedFile = await this.convertToWebP(originalFile);

      const entry = { img: processedFile, tipo: tipoImagen, preview: undefined };
      this.fileImg.push(entry);
      // Nombre único para el path de Storage: dos imágenes con el mismo nombre
      // original (muy común al subir varias fotos de golpe, ej. re-subir todas
      // las imágenes de un producto recién duplicado) pisaban el mismo archivo
      // en Storage y quedaban con el mismo `path` en el array — deleteImg()
      // filtra por `path`, así que no podía distinguir cuál borrar.
      this.filesNames.push(this.buildUniqueFileName(processedFile.name));

      await this.generatePreviewImage(processedFile, entry);
    }
  }

  private buildUniqueFileName(originalName: string): string {
    const dotIndex = originalName.lastIndexOf('.');
    const base = dotIndex > -1 ? originalName.substring(0, dotIndex) : originalName;
    const ext = dotIndex > -1 ? originalName.substring(dotIndex) : '';
    const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return `${base}-${uniqueSuffix}${ext}`;
  }

  private async generatePreviewImage(
    file: File,
    entry: { img: File; tipo: string; preview?: string },
  ): Promise<void> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev: any) => {
        entry.preview = ev.target.result;
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }

  private initializeCompanyData() {
    this.empresaActual = JSON.parse(localStorage.getItem("currentCompany")!);
    const texto = this.empresaActual?.nomComercial?.toString().replace(" ", "") || "PRD";
    this.ultimasLetras = texto.substring(0, 3);
    this.setupMarketplaceFields();
  }

  private setupFormSubscriptions() {
    this.procesoComercial.valueChanges.subscribe((valor: any) => { });
    this.categoriasForm.valueChanges.subscribe((valor: any) => {
      this.pathParentRoute = this.construirRuta(valor.categorias, valor.categorias.label);
    });
  }

  private setupMarketplaceFields() {
    const campos = this.marketplace?.get("campos") as FormArray;
    this.empresaActual?.marketPlace?.forEach((mp) => {
      if (mp.nombreMP) {
        campos.push(this.fb.group({
          nameMP: [mp.nombreMP],
          activo: [false],
        }));
      }
    });
  }

  private initializeVariables() {
    this.variables = [{
      data: {
        titulo: "",
        subtitulo: "",
        imagen: "",
        valorUnitarioSinIva: 0,
        porcentajeIva: 0,
        valorIva: 0,
        precioTotalConIva: 0,
      },
      children: [],
    }];
  }

  private loadMasterData() {
    this.service.getTipoEntrega().subscribe((r: any) => {
      this.formaEntrega = r as any[];
    });

    this.service.getCategorias().subscribe((r: any) => {
      this.processCategorias(r);
    });

    this.service.getTiempoEntrega().subscribe((r: any) => {
      this.tiempoEntrega = r as any[];

    });

    this.service.consultarOcasion().subscribe((r: any) => {
      this.ocasiones = r as any[];
    });

    this.service.consultarGenero().subscribe((r: any) => {
      this.generos = r as any[];
    });

    this.service.consultarFormaPago().subscribe((r: any) => {
      this.formasPago = r as any[];
    });
    
    // Cargar proveedores activos para dropshipping
    this.loadProveedoresActivos();
  }

  private loadProveedoresActivos(): void {
    this.loadingProveedores = true;
    this.proveedoresService.getProveedoresActivos().subscribe({
      next: (proveedores) => {
        this.proveedoresActivos = proveedores;
        this.loadingProveedores = false;
      },
      error: (error) => {
        console.error('Error cargando proveedores:', error);
        this.loadingProveedores = false;
      }
    });
  }

  private processCategorias(r: any) {
    this.categorias = parse((r as any[])[0].categoria).map((p) => {
      return {
        label: p.data.nombre,
        data: p.data,
        parent: p.parent,
        children: p.children.map((sub) => {
          return {
            label: sub.data.nombre,
            data: sub.data,
            parent: sub.parent,
            children: sub.children ? sub.children.map((sub2) => {
              return {
                label: sub2.data.nombre,
                data: sub2.data,
                parent: sub2.parent,
                children: sub2.children ? sub2.children.map((sub2) => {
                  return {};
                }) : null,
              };
            }) : null,
          };
        }),
      };
    });
  }

  private handleEditMode() {
    this.edit = JSON.parse(sessionStorage.getItem("infoForms"));
    if (this.edit) {
      this.mostrarCrear = false;
      this.loadEditData();
    }
  }

  private loadEditData() {
    this.cd = this.edit.cd;
    this.loadBasicData();
    this.loadPricingData();
    this.loadProductionData();
    this.loadImageData();
  }

  private loadBasicData() {
    this.crearProducto.patchValue(this.edit.crearProducto);
    this.Dimensiones.patchValue(this.edit.dimensiones);
    const disp = { ...this.edit.disponibilidad };
    // Si tiempoEntrega es un número (minDias legacy), convertir al nombreInterno correspondiente
    const teVal = disp.tiempoEntrega;
    const isLegacyNumeric = teVal !== null && teVal !== undefined && !isNaN(Number(teVal)) &&
      !this.tiempoEntrega.some(i => i.nombreInterno === teVal);
    if (isLegacyNumeric && this.tiempoEntrega.length > 0) {
      const match = this.tiempoEntrega.find(i => String(i.minDias) === String(teVal));
      if (match) disp.tiempoEntrega = match.nombreInterno;
    }
    this.disponibilidad.patchValue(disp);
    this.identificacion.patchValue(this.edit.identificacion);
    this.exposicion.patchValue(this.edit.exposicion);
    this.etiquetas = this.edit.exposicion.etiquetas;
    this.categoriasForm.patchValue({ categorias: this.edit.categorias });
    this.procesoComercial.patchValue(this.edit.procesoComercial);
    this.activar = this.edit.procesoComercial.configProcesoComercialActivo || false;
    
    // Cargar configuración de dropshipping si existe
    if (this.edit.dropshippingConfig) {
      this.dropshippingConfig.patchValue(this.edit.dropshippingConfig);
    }
  }

  private loadPricingData() {
    const preciosVolumen = this.precio.get("preciosVolumen") as FormArray;
    this.edit.precio.preciosVolumen.forEach((precio, index) => {
      // Usar crearPreciosPorVolumen() para que se configuren los listeners de valueChanges
      const newItem = this.crearPreciosPorVolumen();
      
      // Establecer los valores con emitEvent: false para evitar disparar los listeners durante la carga
      newItem.patchValue({
        numeroUnidadesInicial: index === 0 ? 1 : precio.numeroUnidadesInicial,
        numeroUnidadesLimite: index === 0 ? 1 : precio.numeroUnidadesLimite,
        valorUnitarioPorVolumenSinIVA: precio.valorUnitarioPorVolumenSinIVA,
        valorUnitarioPorVolumenIva: precio.valorUnitarioPorVolumenIva,
        valorIVAPorVolumen: precio.valorIVAPorVolumen,
        valorUnitarioPorVolumenConIVA: precio.valorUnitarioPorVolumenConIVA,
      }, { emitEvent: false });
      
      // Si es la primera fila, deshabilitar los campos de cantidad
      if (index === 0) {
        newItem.get("numeroUnidadesInicial").disable();
        newItem.get("numeroUnidadesLimite").disable();
      }
      
      preciosVolumen.push(newItem);
    });
    this.preciosPorVolumen = preciosVolumen;
    this.precio.patchValue(this.edit.precio);
  }

  private loadProductionData() {
    this.crearProducto.controls["paraProduccion"].setValue(this.edit.crearProducto.paraProduccion);
    this.paraProduccion = this.edit.crearProducto.paraProduccion;
    this.productosArticulos = this.edit?.otrosProcesos?.modulosVariables?.produccion || [];

    if (this.edit.categorias) {
      try {
        const cats = typeof this.edit.categorias === 'string' ? parse(this.edit.categorias) : this.edit.categorias;
        this.categoriasForm.controls["categorias"].setValue(cats);
      } catch (e) {
        this.categoriasForm.controls["categorias"].setValue(this.edit.categorias);
      }
    }

    if (this.edit.procesoComercial?.variablesForm && this.edit.procesoComercial.variablesForm !== "[]") {
      try {
        this.variables = typeof this.edit.procesoComercial.variablesForm === 'string'
          ? parse(this.edit.procesoComercial.variablesForm)
          : this.edit.procesoComercial.variablesForm;
      } catch (e) {
        this.variables = [];
      }
    }
    this.variables = [...this.variables];
    this.marketplace.patchValue(this.edit.marketplace);
    this.ciudades.patchValue({
      ciudadesEntrega: this.edit.ciudades.ciudadesEntrega,
      ciudadesOrigen: this.edit.ciudades.ciudadesOrigen,
    });
    // Cargar cobertura nacional
    this.coberturaNacionalOrigen = this.edit.ciudades?.coberturaNacionalOrigen || false;
    this.coberturaNacionalEntrega = this.edit.ciudades?.coberturaNacionalEntrega || false;
  }

  private loadImageData() {
    if (Array.isArray(this.edit.crearProducto.imagenesPrincipales)) {
      this.crearProducto.get("imagenesPrincipales").setValue(this.edit.crearProducto.imagenesPrincipales);
    } else {
      this.edit.crearProducto.imagenesPrincipales = [];
      this.crearProducto.controls["imagenesPrincipales"].setValue([]);
    }
    this.cdr.detectChanges();
  }

  /**
   * Sincroniza el porcentaje de IVA de la parte superior con la primera fila de la tabla
   * y recalcula los valores de IVA y total con IVA
   */
  private syncIvaPercentageToFirstRow(precioIva: number) {
    if (!this.preciosPorVolumen) {
      this.preciosPorVolumen = this.precio.get("preciosVolumen") as FormArray;
    }

    // Solo actualizar si existe al menos una fila
    if (this.preciosPorVolumen.length > 0) {
      const firstItem = this.preciosPorVolumen.controls[0];
      let precioUnitarioSinIva = firstItem.get("valorUnitarioPorVolumenSinIVA").value || 0;
      
      // Convertir a número si es necesario
      if (typeof precioUnitarioSinIva === 'string') {
        precioUnitarioSinIva = parseFloat(precioUnitarioSinIva) || 0;
      }
      
      // Convertir precioIva a número si es necesario
      let precioIvaNum = precioIva;
      if (typeof precioIva === 'string') {
        precioIvaNum = parseFloat(precioIva) || 0;
      }
      
      // Actualizar el porcentaje de IVA de la primera fila (sin emitir evento para evitar bucle)
      firstItem.get("valorIVAPorVolumen").setValue(precioIvaNum, { emitEvent: false });
      
      // Recalcular el IVA y el total con IVA
      const calculoIva = precioUnitarioSinIva * (precioIvaNum / 100);
      const precioTotalConIva = calculoIva + precioUnitarioSinIva;
      
      // Actualizar los valores calculados
      firstItem.get("valorUnitarioPorVolumenIva").setValue(calculoIva);
      firstItem.get("valorUnitarioPorVolumenConIVA").setValue(precioTotalConIva);
    }
  }

  private initializePreciosPorVolumenIfNeeded(precioUnitarioSinIva: number, valorIva: number) {
    if (!this.preciosPorVolumen) {
      this.preciosPorVolumen = this.precio.get("preciosVolumen") as FormArray;
    }

    // Solo inicializar si está completamente vacío
    if (this.preciosPorVolumen.length === 0) {
      const newItem = this.crearPreciosPorVolumen();
      newItem.get("numeroUnidadesInicial").setValue(1);
      newItem.get("numeroUnidadesInicial").disable();
      newItem.get("numeroUnidadesLimite").setValue(1);
      newItem.get("numeroUnidadesLimite").disable();
      newItem.get("valorIVAPorVolumen").setValue(this.precio.get("precioUnitarioIva").value || 0);
      newItem.get("valorUnitarioPorVolumenSinIVA").setValue(precioUnitarioSinIva);
      newItem.get("valorUnitarioPorVolumenConIVA").setValue(valorIva + precioUnitarioSinIva);
      this.preciosPorVolumen.push(newItem);
    } else {
      // Actualizar el primer elemento si ya existe
      const firstItem = this.preciosPorVolumen.controls[0];
      const porcentajeIvaTabla = firstItem.get("valorIVAPorVolumen").value || 0;
      
      // Asegurar que la primera fila siempre tenga cantidad inicial y final en 1
      firstItem.get("numeroUnidadesInicial").setValue(1, { emitEvent: false });
      firstItem.get("numeroUnidadesLimite").setValue(1, { emitEvent: false });
      
      // Deshabilitar los campos de cantidad en la primera fila si no están deshabilitados
      if (!firstItem.get("numeroUnidadesInicial").disabled) {
        firstItem.get("numeroUnidadesInicial").disable();
      }
      if (!firstItem.get("numeroUnidadesLimite").disabled) {
        firstItem.get("numeroUnidadesLimite").disable();
      }
      
      // Recalcular el IVA basado en el porcentaje de IVA de la tabla
      const calculoIva = precioUnitarioSinIva * (porcentajeIvaTabla / 100);
      const precioTotalConIva = calculoIva + precioUnitarioSinIva;
      
      // Actualizar todos los campos relacionados
      firstItem.get("valorUnitarioPorVolumenSinIVA").setValue(precioUnitarioSinIva);
      firstItem.get("valorUnitarioPorVolumenIva").setValue(calculoIva);
      firstItem.get("valorUnitarioPorVolumenConIVA").setValue(precioTotalConIva);
    }
  }

  // Funciones para Dropshipping

  /**
   * Verifica si el tipo de producto seleccionado es dropshipping
   */
  isDropshippingTypeSelected(): boolean {
    return this.identificacion?.get('tipoProducto')?.value === 'dropshipping';
  }

  /**
   * Verifica si dropshipping está habilitado para la empresa actual
   */
  isDropshippingEnabled(): boolean {
    try {
      // Verificar si el dropshipping está habilitado para la empresa actual desde localStorage
      const currentCompany = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      const companyId = currentCompany.id || currentCompany._id || 'default';
      const configKey = `dropshippingConfig_${companyId}`;
      
      const savedConfig = localStorage.getItem(configKey);
      if (savedConfig) {
        const dropshippingConfig = JSON.parse(savedConfig);
        return dropshippingConfig.habilitado === true;
      }
      
      // Si no hay configuración guardada, devolver false (no está habilitado)
      return false;
    } catch (error) {
      console.error('Error checking dropshipping status:', error);
      return false;
    }
  }

  /**
   * Calcula el precio de venta basado en el costo del proveedor y el margen configurado
   */
  calcularPrecioVentaDropshipping(): number {
    const costo = this.dropshippingConfig?.get('costoProveedor')?.value || 0;
    const tipoMargen = this.dropshippingConfig?.get('tipoMargen')?.value;
    const margenPorcentaje = this.dropshippingConfig?.get('margenPorcentaje')?.value || 0;
    const margenFijo = this.dropshippingConfig?.get('margenFijo')?.value || 0;

    if (tipoMargen === 'porcentaje') {
      return costo * (1 + margenPorcentaje / 100);
    } else {
      return costo + margenFijo;
    }
  }

  /**
   * Calcula la ganancia estimada del producto dropshipping
   */
  calcularGananciaDropshipping(): number {
    const costo = this.dropshippingConfig?.get('costoProveedor')?.value || 0;
    return this.calcularPrecioVentaDropshipping() - costo;
  }

  // Métodos para manejo de proveedores
  onProveedorSelected(event: any): void {
    const proveedorId = event.value;
    if (proveedorId) {
      const proveedor = this.proveedoresActivos.find(p => p.id === proveedorId);
      if (proveedor) {
        // Auto-poblar campos del formulario con datos del proveedor
        this.dropshippingConfig.patchValue({
          supplierName: proveedor.nombre,
          proveedorContacto: proveedor.contacto,
          proveedorTelefono: proveedor.telefono || '',
          proveedorEmail: proveedor.email,
          leadTimeDays: proveedor.tiempo_procesamiento_dias,
          
          // Nuevos campos de integración
          proveedorComisionPorcentaje: proveedor.comision_porcentaje,
          tipoIntegracion: proveedor.api_config?.tipo_integracion || 'manual',
          configuracionApi: proveedor.api_config || null,
          stockSincronizado: proveedor.api_config?.tipo_integracion === 'api',
          preciosSincronizados: proveedor.api_config?.tipo_integracion === 'api'
        });
        
        // Si existe comisión, usar como margen por defecto
        if (proveedor.comision_porcentaje > 0) {
          this.dropshippingConfig.patchValue({
            tipoMargen: 'porcentaje',
            margenPorcentaje: proveedor.comision_porcentaje
          });
        }
        
        // Mostrar información sobre el tipo de integración
        if (proveedor.api_config?.tipo_integracion === 'api') {
          Swal.fire({
            title: 'Integración API Detectada',
            html: `
              <p>Este proveedor tiene configuración de API.</p>
              <p><strong>Beneficios:</strong></p>
              <ul style="text-align: left; margin: 10px 20px;">
                <li>Sincronización automática de stock</li>
                <li>Actualización automática de precios</li>
                <li>Procesamiento automático de pedidos</li>
              </ul>
            `,
            icon: 'info',
            confirmButtonText: 'Entendido'
          });
        }
      }
    }
  }

  getSelectedProveedor(): Proveedor | null {
    const proveedorId = this.dropshippingConfig?.get('supplierId')?.value;
    if (proveedorId) {
      return this.proveedoresActivos.find(p => p.id === proveedorId) || null;
    }
    return null;
  }

  crearNuevoProveedor(): void {
    // Abrir modal o navegar a la creación de proveedor
    Swal.fire({
      title: 'Crear Nuevo Proveedor',
      html: `
        <p>¿Desea crear un nuevo proveedor de dropshipping?</p>
        <p class="text-muted">Será redirigido al módulo de gestión de proveedores.</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, crear proveedor',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Abrir en nueva pestaña para no perder el progreso del producto
        window.open('/dropshipping/proveedores/crear', '_blank');
        
        // Mostrar información sobre cómo refrescar la lista
        Swal.fire({
          title: 'Información',
          html: `
            <p>Se ha abierto la creación de proveedor en una nueva pestaña.</p>
            <p>Una vez creado el proveedor, <strong>refresque esta página</strong> para que aparezca en la lista.</p>
          `,
          icon: 'info',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  // Validaciones y lógica de negocio para proveedores
  validateProveedorConfiguration(): boolean {
    if (!this.isDropshippingTypeSelected()) {
      return true; // No es dropshipping, no necesita validación de proveedor
    }

    const supplierId = this.dropshippingConfig?.get('supplierId')?.value;
    const costoProveedor = this.dropshippingConfig?.get('costoProveedor')?.value;
    
    if (!supplierId) {
      Swal.fire({
        title: 'Proveedor Requerido',
        text: 'Debe seleccionar un proveedor para productos dropshipping.',
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return false;
    }

    if (!costoProveedor || costoProveedor <= 0) {
      Swal.fire({
        title: 'Costo del Proveedor Requerido',
        text: 'Debe especificar el costo del proveedor para calcular precios correctamente.',
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return false;
    }

    return true;
  }

  refreshProveedoresList(): void {
    this.loadProveedoresActivos();
    Swal.fire({
      title: 'Lista Actualizada',
      text: 'La lista de proveedores ha sido actualizada.',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
  }

  calcularComisionProveedor(): number {
    const proveedor = this.getSelectedProveedor();
    const costoProveedor = this.dropshippingConfig?.get('costoProveedor')?.value || 0;
    
    if (proveedor && costoProveedor > 0) {
      return (costoProveedor * proveedor.comision_porcentaje) / 100;
    }
    return 0;
  }

  /**
   * Maneja el cambio de tipo de producto para configurar validaciones condicionales
   */
  onTipoProductoChange(): void {
    const tipoProducto = this.identificacion?.get('tipoProducto')?.value;
    
    if (tipoProducto === 'dropshipping') {
      // Verificar si dropshipping está habilitado para la empresa
      if (!this.isDropshippingEnabled()) {
        // Si no está habilitado, revertir la selección y mostrar advertencia
        this.identificacion.get('tipoProducto')?.setValue('propio');
        
        Swal.fire({
          title: 'Dropshipping no disponible',
          html: `
            <p>Para crear productos dropshipping, primero debe habilitar el módulo para su empresa.</p>
            <p>¿Desea ir a la configuración ahora?</p>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Ir a Configuración',
          cancelButtonText: 'Cancelar'
        }).then((result) => {
          if (result.isConfirmed) {
            window.open('/empresas/modulovariable/dropshipping/configuracion', '_blank');
          }
        });
        return;
      }
      
      // Auto-asignar currentCompany como proveedor
      this.autoAsignarCurrentCompanyComoProveedor();
      
      // Activar validaciones simplificadas para dropshipping
      this.dropshippingConfig.get('costoProveedor')?.setValidators([Validators.required, Validators.min(0.01)]);
      
      // Habilitar la configuración de dropshipping
      this.dropshippingConfig.get('enabled')?.setValue(true);
    } else {
      // Limpiar validaciones cuando no es dropshipping
      this.dropshippingConfig.get('supplierId')?.clearValidators();
      this.dropshippingConfig.get('supplierName')?.clearValidators();
      this.dropshippingConfig.get('costoProveedor')?.clearValidators();
      
      // Deshabilitar la configuración de dropshipping
      this.dropshippingConfig.get('enabled')?.setValue(false);
    }
    
    // Actualizar validaciones
    this.dropshippingConfig.get('supplierId')?.updateValueAndValidity();
    this.dropshippingConfig.get('supplierName')?.updateValueAndValidity();
    this.dropshippingConfig.get('costoProveedor')?.updateValueAndValidity();
  }

  /**
   * Método para habilitar dropshipping de manera temporal para pruebas
   * (solo para debugging y desarrollo)
   */
  enableDropshippingForTesting(): void {
    try {
      const currentCompany = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      const companyId = currentCompany.id || currentCompany._id || 'default';
      const configKey = `dropshippingConfig_${companyId}`;
      
      const testConfig = {
        habilitado: true,
        fechaActivacion: new Date().toISOString(),
        configuracion: {
          margenMinimoPermitido: 10,
          automatizacionActivada: false,
          notificacionesActivadas: true,
          tiempoLimiteOrden: 7,
          proveedoresPermitidos: []
        },
        lastUpdated: new Date().toISOString(),
        companyId: companyId,
        companyName: currentCompany.nomComercial || 'Empresa de Prueba'
      };
      
      localStorage.setItem(configKey, JSON.stringify(testConfig));
      
      // También guardar en la lista general
      const allConfigs = JSON.parse(localStorage.getItem('allDropshippingConfigs') || '{}');
      allConfigs[companyId] = testConfig;
      localStorage.setItem('allDropshippingConfigs', JSON.stringify(allConfigs));
      
      console.log('✅ Dropshipping habilitado temporalmente para pruebas');
      console.log('📍 Configuración guardada en:', configKey);
      console.log('🔄 Recarga la página para ver los cambios');
      
      // Forzar detección de cambios
      this.cdr.detectChanges();
      
    } catch (error) {
      console.error('❌ Error habilitando dropshipping para pruebas:', error);
    }
  }

  /**
   * Auto-asigna la empresa actual (currentCompany) como proveedor para dropshipping
   * Esto simplifica el proceso eliminando la necesidad de seleccionar proveedores externos
   */
  private autoAsignarCurrentCompanyComoProveedor(): void {
    try {
      const currentCompany = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      
      if (currentCompany && currentCompany.nomComercial) {
        // Auto-poblar campos del formulario con datos de la empresa actual
        this.dropshippingConfig.patchValue({
          supplierId: currentCompany.id || currentCompany._id || 'current-company',
          supplierName: currentCompany.nomComercial,
          proveedorContacto: currentCompany.contactoPrincipal || currentCompany.representanteLegal || 'Empresa',
          proveedorTelefono: currentCompany.telefono || currentCompany.celular || '',
          proveedorEmail: currentCompany.email || currentCompany.correoElectronico || '',
          leadTimeDays: 7, // Tiempo de procesamiento por defecto
          
          // Configuración predeterminada para auto-proveedor
          tipoMargen: 'porcentaje',
          margenPorcentaje: 25, // Margen por defecto del 25%
          monedaProveedor: 'COP',
          activo: true
        });

        console.log('✅ CurrentCompany auto-asignada como proveedor:', currentCompany.nomComercial);
      } else {
        console.warn('⚠️ No se pudo obtener currentCompany para auto-asignar como proveedor');
        
        // Fallback: usar datos genéricos
        this.dropshippingConfig.patchValue({
          supplierId: 'self-provider',
          supplierName: 'Mi Empresa (Dropshipping)',
          proveedorContacto: 'Administrador',
          leadTimeDays: 7,
          tipoMargen: 'porcentaje',
          margenPorcentaje: 25,
          monedaProveedor: 'COP',
          activo: true
        });
      }
    } catch (error) {
      console.error('❌ Error auto-asignando currentCompany como proveedor:', error);
    }
  }

  // ========== MÉTODOS DANE CODES ==========

  /**
   * Carga departamentos DANE
   */
  cargarDepartamentosDane(): void {
    this.daneCodesService.getDepartamentos().subscribe(deptos => {
      this.departamentosDane = deptos;
    });
  }

  /**
   * Cambia departamento y carga municipios DANE para origen
   */
  onDepartamentoDaneOrigenChange(departamento: string): void {
    this.departamentoDaneOrigenSeleccionado = departamento;
    if (!departamento) {
      this.municipiosDaneOrigen = [];
      return;
    }
    this.cargandoDaneOrigen = true;
    this.daneCodesService.getMunicipiosByDepartamento(departamento).subscribe(municipios => {
      this.municipiosDaneOrigen = municipios;
      this.cargandoDaneOrigen = false;
    });
  }

  /**
   * Cambia departamento y carga municipios DANE para entrega
   */
  onDepartamentoDaneEntregaChange(departamento: string): void {
    this.departamentoDaneEntregaSeleccionado = departamento;
    if (!departamento) {
      this.municipiosDaneEntrega = [];
      return;
    }
    this.cargandoDaneEntrega = true;
    this.daneCodesService.getMunicipiosByDepartamento(departamento).subscribe(municipios => {
      this.municipiosDaneEntrega = municipios;
      this.cargandoDaneEntrega = false;
    });
  }

  /**
   * Busca municipios DANE para origen
   */
  buscarMunicipioDaneOrigen(query: string): void {
    if (!query || query.length < 2) {
      if (this.departamentoDaneOrigenSeleccionado) {
        this.onDepartamentoDaneOrigenChange(this.departamentoDaneOrigenSeleccionado);
      } else {
        this.municipiosDaneOrigen = [];
      }
      return;
    }
    this.cargandoDaneOrigen = true;
    this.daneCodesService.searchMunicipios(query, this.departamentoDaneOrigenSeleccionado || undefined).subscribe(resultados => {
      this.municipiosDaneOrigen = resultados;
      this.cargandoDaneOrigen = false;
    });
  }

  /**
   * Busca municipios DANE para entrega
   */
  buscarMunicipioDaneEntrega(query: string): void {
    if (!query || query.length < 2) {
      if (this.departamentoDaneEntregaSeleccionado) {
        this.onDepartamentoDaneEntregaChange(this.departamentoDaneEntregaSeleccionado);
      } else {
        this.municipiosDaneEntrega = [];
      }
      return;
    }
    this.cargandoDaneEntrega = true;
    this.daneCodesService.searchMunicipios(query, this.departamentoDaneEntregaSeleccionado || undefined).subscribe(resultados => {
      this.municipiosDaneEntrega = resultados;
      this.cargandoDaneEntrega = false;
    });
  }

  /**
   * Selecciona un municipio DANE para origen
   */
  seleccionarMunicipioDaneOrigen(municipio: MunicipioDane): void {
    // Evitar duplicados
    if (!this.ciudadesDaneOrigenSeleccionadas.find(m => m.codigo === municipio.codigo)) {
      this.ciudadesDaneOrigenSeleccionadas.push(municipio);
      this.daneCodesService.addMunicipioFrecuente(municipio);
      // Actualizar el formulario
      const ciudadesValue = this.ciudadesDaneOrigenSeleccionadas.map(m => ({ value: m.nombre, label: m.nombre }));
      this.ciudades.patchValue({ ciudadesOrigen: ciudadesValue });
    }
  }

  /**
   * Selecciona un municipio DANE para entrega
   */
  seleccionarMunicipioDaneEntrega(municipio: MunicipioDane): void {
    // Evitar duplicados
    if (!this.ciudadesDaneEntregaSeleccionadas.find(m => m.codigo === municipio.codigo)) {
      this.ciudadesDaneEntregaSeleccionadas.push(municipio);
      this.daneCodesService.addMunicipioFrecuente(municipio);
      // Actualizar el formulario
      const ciudadesValue = this.ciudadesDaneEntregaSeleccionadas.map(m => ({ value: m.nombre, label: m.nombre }));
      this.ciudades.patchValue({ ciudadesEntrega: ciudadesValue });
    }
  }

  /**
   * Elimina un municipio DANE de origen
   */
  eliminarMunicipioDaneOrigen(municipio: MunicipioDane): void {
    this.ciudadesDaneOrigenSeleccionadas = this.ciudadesDaneOrigenSeleccionadas.filter(m => m.codigo !== municipio.codigo);
    const ciudadesValue = this.ciudadesDaneOrigenSeleccionadas.map(m => ({ value: m.nombre, label: m.nombre }));
    this.ciudades.patchValue({ ciudadesOrigen: ciudadesValue });
  }

  /**
   * Elimina un municipio DANE de entrega
   */
  eliminarMunicipioDaneEntrega(municipio: MunicipioDane): void {
    this.ciudadesDaneEntregaSeleccionadas = this.ciudadesDaneEntregaSeleccionadas.filter(m => m.codigo !== municipio.codigo);
    const ciudadesValue = this.ciudadesDaneEntregaSeleccionadas.map(m => ({ value: m.nombre, label: m.nombre }));
    this.ciudades.patchValue({ ciudadesEntrega: ciudadesValue });
  }

  /**
   * Maneja el cambio de cobertura nacional para origen
   */
  onCoberturaNacionalOrigenChange(): void {
    if (this.coberturaNacionalOrigen) {
      // Limpiar ciudades seleccionadas cuando se activa cobertura nacional
      this.ciudadesDaneOrigenSeleccionadas = [];
      this.ciudades.patchValue({ ciudadesOrigen: [] });
    }
  }

  /**
   * Maneja el cambio de cobertura nacional para entrega
   */
  onCoberturaNacionalEntregaChange(): void {
    if (this.coberturaNacionalEntrega) {
      // Limpiar ciudades seleccionadas cuando se activa cobertura nacional
      this.ciudadesDaneEntregaSeleccionadas = [];
      this.ciudades.patchValue({ ciudadesEntrega: [] });
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
