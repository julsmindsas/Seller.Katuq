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

import { AngularFireStorage } from "@angular/fire/compat/storage";
import { Observable, Subscription } from "rxjs";
import { parse, stringify } from "flatted";
import { TreeNode } from "primeng/api";
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
import { ImagenService } from "../../../shared/utils/image.service";
import { error } from "console";

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
  marketplace: any;
  ciudad: any;
  ciudades: any;
  formGeneral: any;

  file$: Observable<File>;
  files: File | null = null;
  fileImg: { img: File; tipo: string; }[] = [];
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
  porcentajesIva: any = [
    { value: "19", label: "19%" },
    { value: "8", label: "8%" },
    { value: "5", label: "5%" },
    { value: "0", label: "0%" },
  ];

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
  filesPaths: { name: string; pathName: string; tipo: string; }[] = [];
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
  saving: boolean = false;
  private subs = new Subscription();

  getNameControl(control) {
    return control.value.nameMP;
  }

  constructor(
    private modalService: NgbModal,
    private fb: FormBuilder,
    private service: MaestroService,
    public storage: AngularFireStorage,
    private cdr: ChangeDetectorRef,
    public activeModal: NgbActiveModal,
    private router: Router,
    private utilService: UtilsService,
    private kaiService: KatuqintelligenceService,
    private imageService: ImagenService,
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
      fechaInicial: ["", [Validators.required]],
      fechaFinal: ["", [Validators.required]],
      caracAdicionales: ["", [Validators.required]],
      garantiasProducto: ["", [Validators.required]],
      restriccionesProducto: ["", [Validators.required]],
      cuidadoConsumo: ["", [Validators.required]],
      imagenesPrincipales: [""],
      imagenesSecundarias: [""],
      paraProduccion: [false, [Validators.required]],
    });
    this.precio = this.fb.group({
      precioUnitarioSinIva: ["", [Validators.required]],
      precioUnitarioIva: ["0", Validators.required],
      valorIva: ["0", Validators.required],
      precioUnitarioConIva: ["0", [Validators.required]],
      precioPorVolumenSinIva: ["", [Validators.required]],
      precioIvaPorVolumen: ["", [Validators.required]],
      precioTotalVolumenConIva: ["", [Validators.required]],
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
      cantidadDisponible: ["", Validators.required],
      cantidadMinVenta: ["", [Validators.required]],
      inventarioSeguridad: ["", [Validators.required]],
      inventariable: [true],
    });

    this.service.getTotalProducts().subscribe((x: any) => {
      this.totalProducts = x.totalItems;
      if (sessionStorage.getItem("infoForms") == null) {
        this.identificacion.controls["referencia"].setValue(
          this.ultimasLetras +
          "-" +
          (this.totalProducts + 1).toString().padStart(6, "0"),
        );
        this.identificacion.controls["codigoBarras"].setValue(
          this.ultimasLetras +
          "-" +
          (this.totalProducts + 1).toString().padStart(6, "0"),
        );
        this.generarCodigoBarras();
      }
    });

    this.identificacion = this.fb.group({
      referencia: ["", [Validators.required]],
      tipoProducto: ["propio", [Validators.required]],
      tipoReferencia: ["propio"],
      codigoBarras: ["", [Validators.required]],
      marca: ["", [Validators.required]],
    });

    this.identificacion.controls["referencia"].disable();
    this.identificacion.controls["codigoBarras"].disable();
    this.subs.add(
      this.identificacion.get("tipoReferencia").valueChanges.subscribe((tipo) => {
        if (tipo == "propio") {
          if (sessionStorage.getItem("infoForms") == null) {
            this.identificacion.controls["referencia"].disable();
            this.identificacion.controls["referencia"].setValue(
              this.ultimasLetras +
              "-" +
              (this.totalProducts + 1).toString().padStart(6, "0"),
            );
            this.generarCodigoBarras();
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
      configProcesoComercialActivo: [false, [Validators.required]] // Nuevo campo para guardar el estado de activación
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

          if (!this.preciosPorVolumen) {
            this.preciosPorVolumen = this.precio.get(
              "preciosVolumen",
            ) as FormArray;
          }

          if (this.preciosPorVolumen.length == 0) {
            var newItem = this.crearPreciosPorVolumen();
            newItem.get("numeroUnidadesInicial").setValue(1);
            newItem.get("numeroUnidadesInicial").disable();
            newItem.get("numeroUnidadesLimite").setValue(1);
            newItem.get("valorIVAPorVolumen").setValue(0);
            newItem
              .get("valorUnitarioPorVolumenSinIVA")
              .setValue(calculo + precioUnitarioSinIva);
            newItem
              .get("valorUnitarioPorVolumenConIVA")
              .setValue(calculo + precioUnitarioSinIva);
            this.preciosPorVolumen.push(newItem);
          } else {
            this.preciosPorVolumen.controls[0]
              .get("valorUnitarioPorVolumenSinIVA")
              .setValue(precioUnitarioSinIva);
          }
        })
    );

    this.subs.add(
      this.precio.get("precioUnitarioIva").valueChanges.subscribe((precioIva) => {
        if (precioIva) {
          const unitPrice = this.precio.get("precioUnitarioSinIva").value;
          const calculo = unitPrice * (precioIva / 100);
          this.precio.get("valorIva").setValue(calculo);
          this.precio.get("precioUnitarioConIva").setValue(calculo + unitPrice);
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
    });
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
        Swal.fire("Error", "Error al obtener los procesos", "error");
        console.log(err);
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
    // Confirmación al usuario
    const result = await Swal.fire({
      title:
        "¿Está seguro? estas imágenes se subirán de inmediato a la base de datos",
      text: "¡No podrás revertir esto!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, súbelas!",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) {
      // Restablecer estados si cancela
      this.fileImg = [];
      this.carrouselImg = [];
      this.filesNames = [];
      event.target.value = "";
      return;
    }

    // Procesamos archivo por archivo de forma secuencial para simplificar el uso de await
    for (let i = 0; i < selectedFiles.length; i++) {
      const originalFile = selectedFiles[i];
      // Convertir a WebP si aplica
      const processedFile = await this.convertToWebP(originalFile);

      // Guardar meta-información
      this.fileImg.push({ img: processedFile, tipo: tipoImagen });
      this.filesNames.push(processedFile.name);

      // Base64 para el carrusel de vista previa
      await new Promise((resolvePreview) => {
        const reader = new FileReader();
        reader.onload = (ev: any) => {
          this.carrouselImg.push(ev.target.result);
          resolvePreview(null);
        };
        reader.readAsDataURL(processedFile);
      });
    }

    // Una vez procesados todos los archivos lanzamos la subida
    this.uploadImgAndSave();
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
    let progressPercent: number = 0;
    let base: number = 100 / this.fileImg.length;
    for (let index = 0; index < this.fileImg.length; index++) {
      // var referencia = this.storage.storage.ref('Medios/' + `${this.filesNames[index]}`);
      if (!this.filesNames[index]) {
        console.log("Nombre de archivo no definido en el índice:", index);
        continue; // Omite la iteración actual si el nombre es undefined
      }
      var uploading = this.storage.upload(
        "Productos/" + `${this.filesNames[index]}`,
        this.fileImg[index].img,
      );
      this.filesPaths.push({
        name: this.filesNames[index],
        pathName: "Productos/" + `${this.filesNames[index]}`,
        tipo: this.fileImg[index].tipo,
      });
      var progress = (await uploading).state;

      uploading.percentageChanges().subscribe((percentage) => {
        progressPercent += percentage / this.fileImg.length;
        const progressEl = document.getElementById("progressbar");
        if (progressEl) {
          (progressEl as HTMLElement).style.width = progressPercent + "%";
        }
        this.flag.push(progress);

        if (parseInt(progressPercent.toString()) == 100) {
          this.uploadingImages = false;
          Swal.close();
          this.resultImg();
          this.cdr.detectChanges();
        }
      });
    }
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
    this.empresaActual = JSON.parse(sessionStorage.getItem("currentCompany")!);
    const texto = this.empresaActual.nomComercial.toString().replace(" ", "");
    this.ultimasLetras = texto.substring(0, 3);
    this.procesoComercial.valueChanges.subscribe((valor: any) => { });
    this.categoriasForm.valueChanges.subscribe((valor: any) => {
      this.pathParentRoute = this.construirRuta(
        valor.categorias,
        valor.categorias.label,
      );
    });

    const campos = this.marketplace?.get("campos") as FormArray;

    this.empresaActual?.marketPlace?.forEach((mp) => {
      if (mp.nombreMP) {
        campos.push(
          this.fb.group({
            nameMP: [mp.nombreMP],
            activo: [false],
          }),
        );
      }
    });

    this.variables = [
      {
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
      },
    ];

    this.service.getTipoEntrega().subscribe((r: any) => {
      this.formaEntrega = r as any[];
    });

    this.service.getCategorias().subscribe((r: any) => {
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
              children: sub.children
                ? sub.children.map((sub2) => {
                  return {
                    label: sub2.data.nombre,
                    data: sub2.data,
                    parent: sub2.parent,
                    children: sub2.children
                      ? sub2.children.map((sub2) => {
                        return {};
                      })
                      : null,
                  };
                })
                : null,
            };
          }),
        };
      });
      console.log("categorias", this.categorias);
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
    this.edit = JSON.parse(sessionStorage.getItem("infoForms"));
    if (this.edit != null) {
      this.mostrarCrear = false;
      const preciosVolumen = this.precio.get("preciosVolumen") as FormArray;

      this.cd = this.edit.cd;
      this.crearProducto.patchValue(this.edit.crearProducto);
      if (Array.isArray(this.edit.crearProducto.imagenesPrincipales)) {
        this.crearProducto
          .get("imagenesPrincipales")
          .setValue(this.edit.crearProducto.imagenesPrincipales);
        this.carrouselImg = [
          ...this.carrouselImg,
          ...this.edit.crearProducto.imagenesPrincipales.map((p) => {
            return p.urls;
          }),
        ];
      } else {
        this.edit.crearProducto.imagenesPrincipales = [];
        this.crearProducto.controls["imagenesPrincipales"].setValue([]);
      }

      this.cdr.detectChanges();
      this.crearProducto.controls["paraProduccion"].setValue(
        this.edit.crearProducto.paraProduccion,
      );
      this.paraProduccion = this.edit.crearProducto.paraProduccion;
      // this.precio.patchValue(this.edit.precio)
      this.edit.precio.preciosVolumen.forEach((precio) => {
        preciosVolumen.push(
          this.fb.group({
            numeroUnidadesInicial: [precio.numeroUnidadesInicial],
            numeroUnidadesLimite: [precio.numeroUnidadesLimite],
            valorUnitarioPorVolumenSinIVA: [
              precio.valorUnitarioPorVolumenSinIVA,
            ],
            valorUnitarioPorVolumenIva: [precio.valorUnitarioPorVolumenIva],
            valorIVAPorVolumen: [precio.valorIVAPorVolumen],
            valorUnitarioPorVolumenConIVA: [
              precio.valorUnitarioPorVolumenConIVA,
            ],
          }),
        );
      });
      this.preciosPorVolumen = preciosVolumen;
      this.precio.patchValue(this.edit.precio);

      this.Dimensiones.patchValue(this.edit.dimensiones);
      this.disponibilidad.patchValue(this.edit.disponibilidad);
      this.identificacion.patchValue(this.edit.identificacion);
      this.exposicion.patchValue(this.edit.exposicion);
      this.etiquetas = this.edit.exposicion.etiquetas;
      this.categoriasForm.patchValue({ categorias: this.edit.categorias });
      this.procesoComercial.patchValue(this.edit.procesoComercial);
      // Configurar el estado de activación desde los datos editados
      this.activar = this.edit.procesoComercial.configProcesoComercialActivo || false;
      this.productosArticulos =
        this.edit?.otrosProcesos?.modulosVariables?.produccion;

      if (!this.productosArticulos) {
        this.productosArticulos = [];
      }
      // else {
      //   this.eliminarProcesosDisponiblesRepetidos();
      // }

      if (this.edit.categorias) {
        this.categoriasForm.controls["categorias"].setValue(
          parse(this.edit.categorias),
        );
      }

      if (
        this.edit.procesoComercial.variablesForm &&
        this.edit.procesoComercial.variablesForm != "[]"
      )
        this.variables = parse(this.edit.procesoComercial.variablesForm);
      this.variables = [...this.variables];
      this.marketplace.patchValue(this.edit.marketplace);
      this.ciudades.patchValue({
        ciudadesEntrega: this.edit.ciudades.ciudadesEntrega,
        ciudadesOrigen: this.edit.ciudades.ciudadesOrigen,
      });
      if (Array.isArray(this.edit.crearProducto.imagenesPrincipales)) {
        // La variable es un array
        this.carrouselImg = this.edit.crearProducto.imagenesPrincipales.map(
          (p) => {
            return p.urls;
          },
        );

        // Aquí puedes agregar el código que deseas ejecutar si es un array
      } else {
        // La variable no es un array
        console.log("imagenesPrincipales no es un array");
        this.edit.crearProducto.imagenesPrincipales = [];
        this.crearProducto.controls["imagenesPrincipales"].setValue([]);
        // Aquí puedes agregar el código que deseas ejecutar si no es un array
      }
    }
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

    fbSub
      .get("numeroUnidadesInicial")
      .valueChanges.subscribe((valorInicial: any) => {
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
    this.filesPaths.forEach((img) => {
      this.storage
        .ref(img.pathName)
        .getDownloadURL()
        .subscribe((url) => {
          console.log("URL de descarga:", url);
          // this.images.push({
          const media = {
            urls: url,
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
              if (
                this.crearProducto.controls["imagenesPrincipales"].value
                  .length > 0
              ) {
                this.fileUrls
                  .filter((r) => r.tipo == "principal")
                  .forEach((item) => {
                    (
                      this.crearProducto.controls["imagenesPrincipales"]
                        .value as any[]
                    ).push(item);
                  });
              } else {
                this.fileUrls
                  .filter((r) => r.tipo == "principal")
                  .forEach((item) => {
                    if (
                      !this.crearProducto.controls["imagenesPrincipales"].value
                    ) {
                      this.crearProducto.controls[
                        "imagenesPrincipales"
                      ].setValue([]);
                    }
                    (
                      this.crearProducto.controls["imagenesPrincipales"]
                        .value as any[]
                    ).push(item);
                  });
              }
            }
            if (ulrSecundaria.length > 0) {
              if (
                this.crearProducto.controls["imagenesSecundarias"].value
                  .length > 0
              ) {
                this.fileUrls
                  .filter((r) => r.tipo == "secundaria")
                  .forEach((item) => {
                    (
                      this.crearProducto.controls["imagenesSecundarias"]
                        .value as any[]
                    ).push(item);
                  });
              } else {
                this.fileUrls
                  .filter((r) => r.tipo == "secundaria")
                  .forEach((item) => {
                    if (
                      !this.crearProducto.controls["imagenesSecundarias"].value
                    ) {
                      this.crearProducto.controls[
                        "imagenesSecundarias"
                      ].setValue([]);
                    }
                    (
                      this.crearProducto.controls["imagenesSecundarias"]
                        .value as any[]
                    ).push(item);
                  });
              }
            }
            this.editarProducto();
          }
        });
    });
  }

  guardarProductos() {
    // Evitar múltiples envíos y cambiar a modo editar inmediatamente
    if (this.saving) {
      return;
    }
    this.saving = true;
    this.mostrarCrear = false;
    //validar que todos los precios de volumen tengan precios

    let preciosVolumen = this.precio.get("preciosVolumen") as FormArray;
    let preciosVolumenSinPrecio = preciosVolumen.controls.filter(
      (p) => p.get("valorUnitarioPorVolumenSinIVA").value == 0,
    );
    if (preciosVolumenSinPrecio.length > 0) {
      Swal.fire(
        "Error",
        "Todos los precios por volumen deben tener un valor",
        "error",
      );
      this.saving = false;
      return;
    }

    // validar si el producto si tenga imagenes
    if (this.crearProducto.value.imagenesPrincipales.length == 0) {
      Swal.fire(
        "Error",
        "El producto debe tener obligatoriamente almenos una imagen",
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
    this.formGeneral.controls["identificacion"].setValue(
      this.identificacion.getRawValue(),
    );
    this.formGeneral.controls["exposicion"].setValue(this.exposicion.value);
    this.formGeneral.controls["procesoComercial"].setValue(
      this.procesoComercial.value,
    );
    this.formGeneral.controls["marketplace"].setValue(this.marketplace.value);
    this.formGeneral.controls["ciudades"].setValue(this.ciudades.value);
    this.formGeneral.controls["categorias"].setValue(
      stringify(this.categoriasForm.controls["categorias"].value),
    );
    this.formGeneral.controls["otrosProcesos"].controls[
      "modulosVariables"
    ].controls["produccion"].setValue(this.productosArticulos);
    this.formGeneral.controls["kaiForm"].setValue(this.kaiForm.value);
    const context = this;
    this.service.createProduct(this.formGeneral.value).subscribe({
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

        // Quedar en modo editar
        context.mostrarCrear = false;
      },
      error(error) {
        // Revertir estado para permitir reintento
        context.saving = false;
        context.mostrarCrear = true;
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
  editarProducto() {
    let preciosVolumen = this.precio.get("preciosVolumen") as FormArray;
    let preciosVolumenSinPrecio = preciosVolumen.controls.filter(
      (p) => p.get("valorUnitarioPorVolumenSinIVA").value == 0,
    );
    if (preciosVolumenSinPrecio.length > 0) {
      Swal.fire(
        "Error",
        "Todos los precios por volumen deben tener un valor",
        "error",
      );
      return;
    }

    if (this.crearProducto.value.imagenesPrincipales.length == 0) {
      Swal.fire(
        "Error",
        "El producto debe tener obligatoriamente almenos una imagen",
        "error",
      );
      return;
    }

    this.procesoComercial.controls["variablesForm"].setValue(
      stringify(this.variables),
    );
    this.identificacion.value.referencia =
      this.identificacion.get("referencia").value;
    this.formGeneral.controls["crearProducto"].setValue(
      this.crearProducto.value,
    );
    this.formGeneral.controls["precio"].setValue(this.precio.value);
    this.formGeneral.controls["dimensiones"].setValue(this.Dimensiones.value);
    this.formGeneral.controls["disponibilidad"].setValue(
      this.disponibilidad.value,
    );
    this.formGeneral.controls["identificacion"].setValue(
      this.identificacion.value,
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
    this.formGeneral.controls["marketplace"].setValue(this.marketplace.value);
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

    this.service.editProductByReference(formGeneralEditar).subscribe((res) => {
      console.log(res);
      if (res) {
        Swal.fire("Editato", "Producto editado correctamente", "success");
        sessionStorage.setItem("infoForms", JSON.stringify(this.edit));
        // this.mostrarCrear = true
      } else {
        Swal.fire("Error", "Error al editar el producto", "error");
      }
    });
    this.filesPaths = [];
    this.fileUrls = [];
    this.files = null;
    this.fileImg = [];
    this.filesNames = [];
  }
  onRadioClick() {
    if (this.opcionSeleccionada.nativeElement.value == "manual") {
      this.identificacion.get("referencia").enable();
    } else {
      this.identificacion.get("referencia").disable();
    }
  }
  generarCodigoBarrasByCodigoBarras() {
    if (sessionStorage.getItem("infoForms") == null) {
      if (this.identificacion.get("codigoBarras").value) {
        if (this.identificacion.get("codigoBarras").value.length > 5) {
          this.barCodeGen = true;
          this.valorBarCode = this.identificacion.get("codigoBarras").value;
          this.cdr.detectChanges();
        } else {
          this.barCodeGen = false;
          Swal.fire("Error", "Indique un codigo de barras valido", "error");
        }
      }
      // else {
      //   Swal.fire('Error', 'Indique una referencia valida', 'error');
      // }
    } else {
      if (this.identificacion.get("tipoProducto").value == "propio") {
        this.identificacion.controls["codigoBarras"].setValue(
          this.edit.identificacion?.referencia,
        );
        if (this.identificacion.get("codigoBarras").value) {
          if (this.identificacion.get("codigoBarras").value.length > 5) {
            this.barCodeGen = true;
            this.valorBarCode = this.edit.identificacion?.referencia;
            this.identificacion.controls["codigoBarras"].setValue(
              this.edit.identificacion?.referencia,
            );
            this.cdr.detectChanges();
          } else {
            this.barCodeGen = false;
            Swal.fire("Error", "Indique una referencia valida", "error");
          }
        }
      } else {
        if (this.identificacion.get("codigoBarras").value) {
          if (this.identificacion.get("codigoBarras").value.length > 5) {
            this.barCodeGen = true;
            this.cdr.detectChanges();
            this.valorBarCode = this.identificacion.value.codigoBarras;
            this.identificacion.controls["codigoBarras"].setValue(
              this.identificacion.value.codigoBarras,
            );
            this.cdr.detectChanges();
          } else {
            this.barCodeGen = false;
            Swal.fire("Error", "Indique una referencia valida", "error");
          }
        }
      }
    }
  }
  generarCodigoBarras() {
    if (sessionStorage.getItem("infoForms") == null) {
      if (this.identificacion.get("referencia").value) {
        if (this.identificacion.get("referencia").value.length > 5) {
          this.barCodeGen = true;
          this.valorBarCode = this.identificacion.get("referencia").value;
          this.identificacion.controls["codigoBarras"].setValue(
            this.valorBarCode,
          );
          this.cdr.detectChanges();
        } else {
          this.barCodeGen = false;
          Swal.fire("Error", "Indique una referencia valida", "error");
        }
      }
      // else {
      //   Swal.fire('Error', 'Indique una referencia valida', 'error');
      // }
    } else {
      if (this.identificacion.get("tipoReferencia").value == "propio") {
        const referencia = this.edit.identificacion?.referencia
          ? this.edit.identificacion?.referencia
          : this.ultimasLetras +
          "-" +
          (this.totalProducts + 1).toString().padStart(6, "0");

        this.identificacion.controls["referencia"].setValue(referencia);
        if (this.identificacion.get("referencia").value) {
          if (this.identificacion.get("referencia").value.length > 5) {
            this.barCodeGen = true;
            this.valorBarCode = this.identificacion.get("referencia").value;
            this.identificacion.controls["codigoBarras"].setValue(
              this.valorBarCode,
            );
            this.cdr.detectChanges();
          } else {
            this.barCodeGen = false;
            Swal.fire("Error", "Indique una referencia valida", "error");
          }
        }
      }
      // else{
      //   this.identificacion.controls['codigoBarras'].setValue(this.edit.identificacion?.referencia);
      //   if (this.identificacion.get('codigoBarras').value) {
      //     if (this.identificacion.get('codigoBarras').value.length > 5) {
      //       this.barCodeGen = true
      //       this.valorBarCode = this.identificacion.get('referencia').value
      //       this.identificacion.controls['codigoBarras'].setValue(this.identificacion.get('referencia').value)
      //     } else {
      //       this.barCodeGen = false;
      //       Swal.fire('Error', 'Indique una referencia valida', 'error')
      //     }
      //   }
      // }
    }
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
    if (this.activar == false) {
      this.activar = true;
    } else {
      this.activar = false;
    }
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
    this.formGeneral.controls["identificacion"].setValue(
      this.identificacion.value,
    );
    this.formGeneral.controls["exposicion"].setValue(this.exposicion.value);
    this.formGeneral.controls["procesoComercial"].setValue(
      this.procesoComercial.value,
    );
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
    productWithKatuq.precio.preciosVolumen.forEach((precio) => {
      preciosVolumen.push(
        this.fb.group({
          numeroUnidadesInicial: [precio.numeroUnidadesInicial],
          numeroUnidadesLimite: [precio.numeroUnidadesInicial],
          valorUnitarioPorVolumenSinIVA: [precio.valorUnitarioPorVolumenSinIVA],
          valorUnitarioPorVolumenIva: [precio.valorUnitarioPorVolumenIva],
          valorIVAPorVolumen: [precio.valorIVAPorVolumen],
          valorUnitarioPorVolumenConIVA: [precio.valorUnitarioPorVolumenConIVA],
        }),
      );
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

  getKatuqPrompt() {
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
      this.identificacion.value,
    );
    this.formGeneral.controls["exposicion"].setValue(this.exposicion.value);
    this.formGeneral.controls["procesoComercial"].setValue(
      this.procesoComercial.value,
    );
    this.formGeneral.controls["marketplace"].setValue(this.marketplace.value);
    this.formGeneral.controls["ciudades"].setValue(this.ciudades.value);
    this.formGeneral.controls["categorias"].setValue(
      stringify(this.categoriasForm.controls["categorias"].value),
    );
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

      ${JSON.stringify(this.formGeneral.value)}
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

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
