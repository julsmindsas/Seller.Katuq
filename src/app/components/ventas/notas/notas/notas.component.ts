import {
  AfterContentInit,
  OnChanges,
  SimpleChanges,
  Component,
  Input,
  OnInit,
  Output,
  EventEmitter,
  ChangeDetectorRef,
} from "@angular/core";
import { FormGroup, FormBuilder, Validators, FormArray } from "@angular/forms";
import { CartSingletonService } from "../../../../shared/services/ventas/cart.singleton.service";
import { Notas, Pedido } from "../../modelo/pedido";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import Swal from "sweetalert2";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs/operators';

@Component({
  selector: "app-notas",
  templateUrl: "./notas.component.html",
  styleUrls: ["./notas.component.scss"],
})
export class NotasComponent implements OnInit, AfterContentInit, OnChanges {
  @Input() pedido: Pedido;
  @Input() carrito: any;
  @Input() isEdit: boolean = false;
  @Output() notasActualizadas = new EventEmitter<any>();

  fecha: Date;
  notasProduccion: any[] = [];
  notasCliente: any[] = [];

  notasDespachos: any[] = [];
  notasEntregas: any[] = [];
  notasFacturacionPagos: any[] = [];
  notasProduccionForm: FormGroup;

  notasDespachoForm: FormGroup;
  notasEntregasForm: FormGroup;
  notasFacturacionPagosForm: FormGroup;
  bandera: boolean = true;

  notasClienteOrdenadas: Notas[] = [];
  notasDespachosOrdenadas: Notas[] = [];
  notasEntregasOrdenadas: Notas[] = [];
  notasFacturacionPagosOrdenadas: Notas[] = [];
  carritoActualizado: boolean = false;

  // Propiedades para manejar archivos seleccionados
  selectedFiles: { [key: string]: File[] } = {};
  filePreviews: { [key: string]: string[] } = {};

  // Propiedades para Firebase Storage
  uploadedFiles: { [key: string]: { url: string; name: string; path: string }[] } = {};
  uploadProgress: { [key: string]: number } = {};
  isUploading: { [key: string]: boolean } = {};

  constructor(
    private singleton: CartSingletonService,
    private formBuilder: FormBuilder,
    private modalService: NgbModal,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private storage: AngularFireStorage,
  ) { }

  ngAfterContentInit(): void {
    // En modo edición, asegurar que el formulario se inicialice SIEMPRE
    if (this.isEdit && this.pedido?.carrito?.length > 0) {
      console.log(
        "🔧 MODO EDICIÓN: Inicializando formulario con",
        this.pedido.carrito.length,
        "productos",
      );
      this.initFormularios();
      return; // Salir temprano para evitar la lógica de modo creación
    }

    if (!this.isEdit) {
      // Solo inicializar notasPedido si no existe, preservando notas existentes
      if (this.pedido) {
        // Asegurarse que el pedido exista
        if (!this.pedido.notasPedido) {
          this.pedido.notasPedido = {
            notasProduccion: [],
            notasCliente: [],
            notasDespachos: [],
            notasEntregas: [],
            notasFacturacionPagos: [],
          };
        } else {
          // Asegurar que todas las categorías existan
          if (!this.pedido.notasPedido.notasProduccion) {
            this.pedido.notasPedido.notasProduccion = [];
          }
          if (!this.pedido.notasPedido.notasCliente) {
            this.pedido.notasPedido.notasCliente = [];
          }
          if (!this.pedido.notasPedido.notasDespachos) {
            this.pedido.notasPedido.notasDespachos = [];
          }
          if (!this.pedido.notasPedido.notasEntregas) {
            this.pedido.notasPedido.notasEntregas = [];
          }
          if (!this.pedido.notasPedido.notasFacturacionPagos) {
            this.pedido.notasPedido.notasFacturacionPagos = [];
          }
        }

        // CRÍTICO: En modo edición, NO modificar el carrito original
        // Solo limpiar notas de producción dentro del carrito si NO estamos en modo edición
        if (
          !this.isEdit &&
          this.pedido.carrito &&
          this.pedido.carrito.length > 0
        ) {
          this.pedido.carrito.forEach((prod) => {
            if (prod.notaProduccion) {
              delete prod.notaProduccion;
            }
          });
        } else if (this.isEdit) {
          console.log(
            "🛡️ MODO EDICIÓN: Carrito preservado con",
            this.pedido.carrito?.length || 0,
            "productos",
          );
        }
      }

      // Limpiar las propiedades locales solo si no hay notas existentes
      if (this.pedido?.notasPedido?.notasDespachos?.length > 0) {
        this.notasDespachosOrdenadas = [
          ...this.pedido.notasPedido.notasDespachos,
        ].sort(
          (a, b) =>
            new Date(b.fecha || new Date()).getTime() -
            new Date(a.fecha || new Date()).getTime(),
        );
      } else {
        this.notasDespachosOrdenadas = [];
      }

      if (this.pedido?.notasPedido?.notasEntregas?.length > 0) {
        this.notasEntregasOrdenadas = [
          ...this.pedido.notasPedido.notasEntregas,
        ].sort(
          (a, b) =>
            new Date(b.fecha || new Date()).getTime() -
            new Date(a.fecha || new Date()).getTime(),
        );
      } else {
        this.notasEntregasOrdenadas = [];
      }

      if (this.pedido?.notasPedido?.notasFacturacionPagos?.length > 0) {
        this.notasFacturacionPagosOrdenadas = [
          ...this.pedido.notasPedido.notasFacturacionPagos,
        ].sort(
          (a, b) =>
            new Date(b.fecha || new Date()).getTime() -
            new Date(a.fecha || new Date()).getTime(),
        );
      } else {
        this.notasFacturacionPagosOrdenadas = [];
      }

      // Asignar las notas existentes a las variables locales
      this.notasProduccion = this.pedido?.notasPedido?.notasProduccion || [];
      this.notasDespachos = this.pedido?.notasPedido?.notasDespachos || [];
      this.notasEntregas = this.pedido?.notasPedido?.notasEntregas || [];
      this.notasFacturacionPagos =
        this.pedido?.notasPedido?.notasFacturacionPagos || [];
    } else {
      // Modo Edición (isEdit = true)
      if (this.pedido) {
        // Solo proceder si el pedido existe
        // Si notasPedido no existe en el pedido (aunque en modo edición debería existir), inicializarlo.
        if (!this.pedido.notasPedido) {
          this.pedido.notasPedido = {
            notasProduccion: [],
            notasCliente: [],
            notasDespachos: [],
            notasEntregas: [],
            notasFacturacionPagos: [],
          };
        }

        // Cargar y ordenar notas existentes del pedido

        if (this.pedido.notasPedido?.notasDespachos?.length > 0) {
          this.notasDespachosOrdenadas = [
            ...this.pedido.notasPedido.notasDespachos,
          ].sort(
            (a, b) =>
              new Date(b.fecha || new Date()).getTime() -
              new Date(a.fecha || new Date()).getTime(),
          );
        } else {
          this.notasDespachosOrdenadas = [];
        }

        if (this.pedido.notasPedido?.notasEntregas?.length > 0) {
          this.notasEntregasOrdenadas = [
            ...this.pedido.notasPedido.notasEntregas,
          ].sort(
            (a, b) =>
              new Date(b.fecha || new Date()).getTime() -
              new Date(a.fecha || new Date()).getTime(),
          );
        } else {
          this.notasEntregasOrdenadas = [];
        }

        if (this.pedido.notasPedido?.notasFacturacionPagos?.length > 0) {
          this.notasFacturacionPagosOrdenadas = [
            ...this.pedido.notasPedido.notasFacturacionPagos,
          ].sort(
            (a, b) =>
              new Date(b.fecha || new Date()).getTime() -
              new Date(a.fecha || new Date()).getTime(),
          );
        } else {
          this.notasFacturacionPagosOrdenadas = [];
        }

        // Asignar a variables locales si estamos en modo edición
        // Estas variables se usan en el template para mostrar las notas de forma no editable o para otros propósitos.
        this.notasProduccion = this.pedido.notasPedido.notasProduccion || [];
        this.notasDespachos = this.pedido.notasPedido.notasDespachos || [];
        this.notasEntregas = this.pedido.notasPedido.notasEntregas || [];
        this.notasFacturacionPagos =
          this.pedido.notasPedido.notasFacturacionPagos || [];
      } else {
        // Si this.pedido es undefined, asegurar que las propiedades locales estén vacías
        this.notasDespachosOrdenadas = [];
        this.notasEntregasOrdenadas = [];
        this.notasFacturacionPagosOrdenadas = [];
        this.notasProduccion = [];
        this.notasDespachos = [];
        this.notasEntregas = [];
        this.notasFacturacionPagos = [];
      }
    }

    this.initFormularios(); // initFormularios construirá los forms basado en el estado ahora limpio/cargado de this.pedido
  }

  ngOnInit(): void {
    this.fecha = new Date();

    // VERIFICACIÓN CRÍTICA DE INTEGRIDAD DEL CARRITO
    if (this.isEdit && this.pedido) {
      const productosIniciales = this.pedido.carrito?.length || 0;
      console.log(
        "🛡️ INICIO COMPONENTE NOTAS - Productos en carrito:",
        productosIniciales,
      );

      if (productosIniciales === 0) {
        console.error(
          "🚨 ALERTA: Carrito vacío al inicializar componente de notas",
        );
      }
    }

    // CRÍTICO: Solo limpiar datos fantasma si NO estamos en modo edición
    if (!this.isEdit) {
      this.limpiarDatosFantasmaNotas();
    }

    this.initFormularios();

    // Suscribirse a cambios del singleton para comunicación automática con carrito
    this.singleton.productInCartChanges$.subscribe((productos) => {
      if (!this.carritoActualizado && productos && productos.length > 0) {
        console.log(
          "📝 NOTAS: Detectados cambios en carrito -",
          productos.length,
          "productos",
        );

        // Actualizar el carrito del pedido si no estamos en modo edición
        if (!this.isEdit && this.pedido) {
          // PRESERVAR notas de producción existentes antes de actualizar carrito
          const notasExistentes =
            this.pedido.notasPedido?.notasProduccion || [];

          this.pedido.carrito = productos.map((item) => ({
            producto: item.producto,
            configuracion: item.configuracion,
            cantidad: item.cantidad || item.configuracion?.cantidad || 1,
            cd: item.producto?.cd || item.producto?.crearProducto?.cd || "",
            crearProducto: item.producto?.crearProducto,
            precio: item.producto?.precio,
            disponibilidad: item.producto?.disponibilidad,
          }));

          // RESTAURAR las notas de producción existentes
          if (!this.pedido.notasPedido) {
            this.pedido.notasPedido = {
              notasProduccion: notasExistentes,
              notasCliente: [],
              notasDespachos: [],
              notasEntregas: [],
              notasFacturacionPagos: [],
            };
          } else {
            this.pedido.notasPedido.notasProduccion = notasExistentes;
          }
        }

        // Reinicializar formulario con los nuevos productos PRESERVANDO notas existentes
        this.initFormulariosPreservandoNotas();
        this.carritoActualizado = false;

        console.log(
          "✅ NOTAS: Formulario actualizado preservando",
          this.pedido?.notasPedido?.notasProduccion?.length || 0,
          "notas existentes",
        );
      }
    });
  }

  initFormularios(): void {
    // Inicializar formularios
    this.notasDespachoForm = this.formBuilder.group({
      nota: ["", Validators.required],
    });
    this.notasEntregasForm = this.formBuilder.group({
      nota: ["", Validators.required],
    });
    this.notasFacturacionPagosForm = this.formBuilder.group({
      nota: ["", Validators.required],
    });

    // SIEMPRE inicializar formulario de producción
    this.notasProduccionForm = this.formBuilder.group({
      productos: this.formBuilder.array([]),
    });

    // Llenar formulario si hay productos en el carrito
    if (this.pedido && this.pedido.carrito && this.pedido.carrito.length > 0) {
      this.llenarFormulario();
      console.log(
        "📝 NOTAS: Formulario inicializado con",
        this.pedido.carrito.length,
        "productos",
      );
    } else {
      console.log(
        "📝 NOTAS: Formulario inicializado vacío - esperando productos",
      );
    }
  }

  // Nuevo método para inicializar formularios preservando notas existentes
  initFormulariosPreservandoNotas(): void {
    // Inicializar formularios básicos (no cambian)
    this.notasDespachoForm = this.formBuilder.group({
      nota: ["", Validators.required],
    });
    this.notasEntregasForm = this.formBuilder.group({
      nota: ["", Validators.required],
    });
    this.notasFacturacionPagosForm = this.formBuilder.group({
      nota: ["", Validators.required],
    });

    // PRESERVAR formulario de producción existente o crear uno nuevo
    if (!this.notasProduccionForm) {
      this.notasProduccionForm = this.formBuilder.group({
        productos: this.formBuilder.array([]),
      });
    }

    // Llenar formulario preservando notas existentes
    if (this.pedido && this.pedido.carrito && this.pedido.carrito.length > 0) {
      this.llenarFormularioPreservandoNotas();
      console.log(
        "📝 NOTAS: Formulario actualizado preservando notas existentes con",
        this.pedido.carrito.length,
        "productos",
      );
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.carrito || changes.pedido) {
      // Si cambia el pedido o el carrito, actualizar las notas pero preservar las existentes
      if (this.pedido?.notasPedido?.notasProduccion) {
        // Ordenar las notas de producción por fecha (más recientes primero)
        this.pedido.notasPedido.notasProduccion = [
          ...this.pedido.notasPedido.notasProduccion,
        ].sort((a, b) => {
          const fechaA = a.fecha ? new Date(a.fecha) : new Date();
          const fechaB = b.fecha ? new Date(b.fecha) : new Date();
          return fechaB.getTime() - fechaA.getTime();
        });
      }

      // CRÍTICO: En modo edición, NUNCA tocar el carrito del pedido
      // Solo usar el carrito original del pedido que se está editando
      if (this.isEdit) {
        console.log(
          "🛡️ MODO EDICIÓN: Preservando carrito original con",
          this.pedido?.carrito?.length || 0,
          "productos",
        );
        // Solo reinicializar formularios con el carrito existente
        if (this.pedido?.carrito?.length > 0) {
          this.initFormularios();
        }
        return; // SALIR sin tocar el singleton
      }

      // Solo en modo creación (NO edición), usar el singleton
      if (!this.isEdit) {
        this.singleton.refreshCart().subscribe((data: any) => {
          if (data && this.pedido) {
            // Limpiar datos fantasma del carrito antes de procesarlo
            let carritoLimpio = Array.isArray(data)
              ? data.map((prod) => {
                const prodLimpio = { ...prod };
                // Eliminar propiedades obsoletas
                if (prodLimpio.notaProduccion) {
                  delete prodLimpio.notaProduccion;
                }
                return prodLimpio;
              })
              : data;

            // Asignar el carrito limpio al pedido solo si es diferente
            const carritoAnterior = JSON.stringify(this.pedido.carrito || []);
            const carritoNuevo = JSON.stringify(carritoLimpio);

            if (carritoAnterior !== carritoNuevo) {
              // PRESERVAR notas existentes antes de actualizar carrito
              const notasExistentes =
                this.pedido.notasPedido?.notasProduccion || [];

              this.pedido.carrito = carritoLimpio;

              // RESTAURAR notas después de actualizar carrito
              if (!this.pedido.notasPedido) {
                this.pedido.notasPedido = {
                  notasProduccion: notasExistentes,
                  notasCliente: [],
                  notasDespachos: [],
                  notasEntregas: [],
                  notasFacturacionPagos: [],
                };
              } else {
                this.pedido.notasPedido.notasProduccion = notasExistentes;
              }

              // Reinicializar formulario PRESERVANDO notas existentes
              this.initFormulariosPreservandoNotas();
              console.log(
                "📝 NOTAS: Formulario actualizado preservando",
                notasExistentes.length,
                "notas existentes",
              );
            }
          }
        });
      }
    }
  }

  llenarFormulario() {
    if (!this.notasProduccionForm) {
      console.log(
        "⚠️ NOTAS: No se puede llenar formulario - notasProduccionForm no inicializado",
      );
      return;
    }

    if (!this.pedido?.carrito?.length) {
      console.log(
        "📝 NOTAS: No hay productos en el carrito para llenar formulario",
      );
      // Limpiar formulario si no hay productos
      const productos = this.notasProduccionForm.get("productos") as FormArray;
      productos.clear();
      return;
    }

    const productos = this.notasProduccionForm.get("productos") as FormArray;
    productos.clear();

    this.pedido.carrito.forEach((prod, index) => {
      // Crear FormArray con un campo vacío para nueva nota
      const notasArray = this.formBuilder.array([]);

      // SIEMPRE agregar un campo vacío, independientemente del modo
      // Esto asegura que el botón guardar aparezca
      notasArray.push(this.formBuilder.control("", Validators.required));

      // Añadir al FormArray principal con el identificador del producto
      productos.push(
        this.formBuilder.group({
          notas: notasArray,
          productoId: [prod.producto?.identificacion?.referencia || ""],
          titulo: [
            this.crearNombreDistintivo(prod, index) || "Producto sin nombre",
          ],
        }),
      );

      console.log(
        "📝 NOTAS: Campo habilitado para:",
        prod.producto?.crearProducto?.titulo,
      );
    });

    console.log(
      "✅ NOTAS: Formulario llenado con",
      this.pedido.carrito.length,
      "productos",
    );
  }

  // Nuevo método para llenar formulario preservando notas existentes
  llenarFormularioPreservandoNotas() {
    if (!this.notasProduccionForm) {
      console.log(
        "⚠️ NOTAS: No se puede llenar formulario - notasProduccionForm no inicializado",
      );
      return;
    }

    if (!this.pedido?.carrito?.length) {
      console.log(
        "📝 NOTAS: No hay productos en el carrito para llenar formulario",
      );
      // Limpiar formulario si no hay productos
      const productos = this.notasProduccionForm.get("productos") as FormArray;
      productos.clear();
      return;
    }

    const productos = this.notasProduccionForm.get("productos") as FormArray;
    productos.clear();

    this.pedido.carrito.forEach((prod, index) => {
      // Crear FormArray con un campo vacío para nueva nota
      const notasArray = this.formBuilder.array([]);

      // Solo agregar un campo vacío si NO hay notas existentes para este producto
      const notasExistentesProducto = this.obtenerNotasDelProducto(prod);
      if (notasExistentesProducto.length === 0) {
        // Si no hay notas existentes, agregar campo vacío para nueva nota
        notasArray.push(this.formBuilder.control("", Validators.required));
        console.log(
          "📝 NOTAS: Campo nuevo habilitado para:",
          prod.producto?.crearProducto?.titulo,
        );
      } else {
        console.log(
          "🔒 NOTAS: Producto ya tiene",
          notasExistentesProducto.length,
          "notas existentes:",
          prod.producto?.crearProducto?.titulo,
        );
      }

      // Añadir al FormArray principal con el identificador del producto
      productos.push(
        this.formBuilder.group({
          notas: notasArray,
          productoId: [prod.producto?.identificacion?.referencia || ""],
          titulo: [
            this.crearNombreDistintivo(prod, index) || "Producto sin nombre",
          ],
        }),
      );
    });

    console.log(
      "✅ NOTAS: Formulario actualizado preservando notas existentes con",
      this.pedido.carrito.length,
      "productos",
    );
  }

  get notasFormArray() {
    return this.notasProduccionForm?.get("productos") as FormArray;
  }

  agregarNota(productoIndex: number) {
    if (!this.notasFormArray) return;

    const notasArray = this.notasFormArray
      .at(productoIndex)
      .get("notas") as FormArray;
    if (notasArray) {
      notasArray.push(this.formBuilder.control("", Validators.required));
      console.log(
        "📝 NOTAS: Campo de nota adicional agregado para producto",
        productoIndex,
      );
    }
  }

  eliminarNota(notaIndex: number, tipo: string, productoIndex?: number) {
    if (tipo === "produccion") {
      if (!this.notasFormArray || productoIndex === undefined) return;

      const notasArray = this.notasFormArray
        .at(productoIndex)
        .get("notas") as FormArray;
      if (notasArray) {
        notasArray.removeAt(notaIndex);
      }
    } else {
      switch (tipo) {
        case "despachos":
          if (this.pedido?.notasPedido?.notasDespachos) {
            this.pedido.notasPedido.notasDespachos.splice(notaIndex, 1);

            // Actualizar también la lista ordenada
            this.notasDespachosOrdenadas = [
              ...this.pedido.notasPedido.notasDespachos,
            ].sort(
              (a, b) =>
                new Date(b.fecha || new Date()).getTime() -
                new Date(a.fecha || new Date()).getTime(),
            );
            // **FORZAR DETECCIÓN**
            this.cdr.detectChanges();
          }
          break;
        case "entregas":
          if (this.pedido?.notasPedido?.notasEntregas) {
            this.pedido.notasPedido.notasEntregas.splice(notaIndex, 1);

            // Actualizar también la lista ordenada
            this.notasEntregasOrdenadas = [
              ...this.pedido.notasPedido.notasEntregas,
            ].sort(
              (a, b) =>
                new Date(b.fecha || new Date()).getTime() -
                new Date(a.fecha || new Date()).getTime(),
            );
            // **FORZAR DETECCIÓN**
            this.cdr.detectChanges();
          }
          break;
        case "facturacionPagos":
          if (this.pedido?.notasPedido?.notasFacturacionPagos) {
            this.pedido.notasPedido.notasFacturacionPagos.splice(notaIndex, 1);

            // Actualizar también la lista ordenada
            this.notasFacturacionPagosOrdenadas = [
              ...this.pedido.notasPedido.notasFacturacionPagos,
            ].sort(
              (a, b) =>
                new Date(b.fecha || new Date()).getTime() -
                new Date(a.fecha || new Date()).getTime(),
            );
            // **FORZAR DETECCIÓN**
            this.cdr.detectChanges();
          }
          break;
      }

      // **FORZAR DETECCIÓN ANTES DE EMITIR**
      this.cdr.detectChanges();

      // Para cualquier tipo que no sea producción, emitir el evento
      if (tipo !== "produccion") {
        // Emitir evento al componente padre PRESERVANDO el carrito original
        this.notasActualizadas.emit({
          carrito: this.pedido.carrito,
          notasPedido: this.pedido.notasPedido,
          pedidoCompleto: this.pedido,
        });

        // Mostrar confirmación
        console.log(`✅ Nota de ${tipo} eliminada correctamente`);
      }
    }
  }

  guardarNotas() {
    if (!this.notasFormArray) {
      return;
    }

    // VERIFICACIÓN CRÍTICA ANTES DE GUARDAR
    const productosAntes = this.pedido?.carrito?.length || 0;
    console.log(
      "🛡️ VERIFICACIÓN ANTES DE GUARDAR - Productos:",
      productosAntes,
    );

    if (productosAntes === 0) {
      console.error("🚨 ABORT GUARDAR: Carrito vacío");
      if (!this.notasProduccionForm || !this.notasProduccionForm.valid) {
        Swal.fire({
          icon: "error",
          title: "Error Crítico",
          text: "El carrito está vacío. No se pueden guardar las notas.",
          confirmButtonText: "Entendido",
        });
        return;
      }

      if (!this.notasProduccionForm || !this.notasProduccionForm.valid) {
        Swal.fire({
          icon: "warning",
          title: "Formulario incompleto",
          text: "Por favor, complete todos los campos requeridos.",
          confirmButtonText: "Aceptar",
        });
        return;
      }

      if (!this.notasProduccionForm || !this.notasProduccionForm.valid) {
        Swal.fire({
          icon: "warning",
          title: "Formulario incompleto",
          text: "Por favor, complete todos los campos requeridos.",
          confirmButtonText: "Aceptar",
        });
        return;
      }
      this.carritoActualizado = true;
      const notasActualizadas = this.notasFormArray.value;

      if (this.pedido?.carrito) {
        // Inicializar notasPedido si no existe
        if (!this.pedido.notasPedido) {
          this.pedido.notasPedido = {
            notasProduccion: [],
            notasCliente: [],
            notasDespachos: [],
            notasEntregas: [],
            notasFacturacionPagos: [],
          };
        } else if (!this.pedido.notasPedido.notasProduccion) {
          this.pedido.notasPedido.notasProduccion = [];
        }
        console.log("🔍 Iniciando guardado de notas de producción...");
        console.log("📁 Estado actual de uploadedFiles:", this.uploadedFiles);

        const productos = this.notasProduccionForm.get("productos") as FormArray;
        let hayNotasValidas = false;
        let notasConArchivos: { notaTexto: string; productoIndex: number; notaIndex: number; archivos: File[] }[] = [];

        // **CRÍTICO: PRESERVAR todas las notas existentes**
        const notasExistentes = [
          ...(this.pedido.notasPedido.notasProduccion || []),
        ];

        // Solo agregar nuevas notas (no reemplazar)
        let notasAgregadas = 0;
        const nuevasNotas: any[] = [];

        notasActualizadas.forEach((producto, pIndex) => {
          if (producto.notas && producto.notas.length > 0) {
            const productoCarrito = this.pedido?.carrito?.[pIndex];
            const tituloProducto = this.crearNombreDistintivo(productoCarrito, pIndex);
            const productoId = productoCarrito?.producto?.identificacion?.referencia;
            const productoCD = productoCarrito?.producto?.cd || (productoCarrito?.producto?.crearProducto as any)?.cd;
            const productoBodegaId = productoCarrito?.producto?.bodegaId;

            // Crear identificador único para este producto
            const identificadorUnico = this.crearIdentificadorUnico(productoCarrito, pIndex);

            producto.notas.forEach((textoNota: string) => {
              if (textoNota && textoNota.trim() !== "") {
                nuevasNotas.push({
                  fecha: new Date().toISOString(),
                  descripcion: textoNota,
                  producto: tituloProducto || "Producto",
                  usuario: "Usuario",
                  productoId: productoId || "",
                  productoCD: productoCD || "",
                  productoBodegaId: productoBodegaId || "",
                  identificadorUnico: identificadorUnico,
                  fromFormulario: true,
                } as any);
                notasAgregadas++;
              }
            });
          }
        });
        // Recolectar todas las notas y archivos que necesitan ser procesados
        productos.controls.forEach((productoCtrl, productoIndex) => {
          const notasArray = productoCtrl.get("notas") as FormArray;

          notasArray.controls.forEach((notaCtrl, notaIndex) => {
            const notaTexto = notaCtrl.value;

            if (notaTexto && notaTexto.trim() !== "") {
              hayNotasValidas = true;

              // Obtener archivos seleccionados para esta nota
              const key = this.getFileKey('produccion', productoIndex, notaIndex);
              const archivosSeleccionados = this.selectedFiles[key] || [];

              if (archivosSeleccionados.length > 0) {
                notasConArchivos.push({
                  notaTexto: notaTexto.trim(),
                  productoIndex,
                  notaIndex,
                  archivos: archivosSeleccionados
                });
              } else {
                // Si no hay archivos, guardar la nota directamente
                this.guardarNotaSinArchivos(notaTexto.trim(), productoIndex, notaIndex);
              }
            }
          });
        });

        if (!hayNotasValidas) {
          Swal.fire({
            icon: "warning",
            title: "No hay notas para guardar",
            text: "Por favor, escriba al menos una nota antes de guardar.",
            confirmButtonText: "Aceptar",
          });
          return;
        }

        // Si hay notas con archivos, subir archivos primero
        if (notasConArchivos.length > 0) {
          this.subirArchivosYGuardarNotas(notasConArchivos);
        } else {
          // Si no hay archivos, finalizar guardado
          this.finalizarGuardadoNotas();
        }
      }
    }
  }

  // Método para subir archivos y guardar notas
  private subirArchivosYGuardarNotas(notasConArchivos: { notaTexto: string; productoIndex: number; notaIndex: number; archivos: File[] }[]) {
    const totalArchivos = notasConArchivos.reduce((total, item) => total + item.archivos.length, 0);
    let archivosSubidos = 0;
    const resultadosSubida: { [key: string]: { url: string; name: string; path: string }[] } = {};

    // Mostrar progreso inicial
    Swal.fire({
      title: 'Subiendo archivos...',
      html: `
        <div class="text-center">
          <div class="progress mb-3">
            <div class="progress-bar" role="progressbar" style="width: 0%" id="upload-progress-notas"></div>
          </div>
          <p>Subiendo ${totalArchivos} archivo(s) a Firebase Storage</p>
        </div>
      `,
      showConfirmButton: false,
      allowOutsideClick: false,
    });

    // Subir archivos para cada nota
    notasConArchivos.forEach((item, itemIndex) => {
      const key = this.getFileKey('produccion', item.productoIndex, item.notaIndex);
      resultadosSubida[key] = [];

      item.archivos.forEach((file, fileIndex) => {
        const timestamp = new Date().getTime();
        const fileName = `${timestamp}_${itemIndex}_${fileIndex}_${file.name}`;
        const filePath = `imagesNotas/produccion/${fileName}`;

        console.log(`📤 Subiendo archivo ${archivosSubidos + 1}/${totalArchivos}: ${file.name} -> ${filePath}`);

        const fileRef = this.storage.ref(filePath);
        const uploadTask = this.storage.upload(filePath, file);

        // Monitorear progreso
        uploadTask.percentageChanges().subscribe(percentage => {
          if (percentage !== null) {
            const progressBar = document.getElementById('upload-progress-notas');
            if (progressBar) {
              progressBar.style.width = `${percentage}%`;
            }
          }
        });

        // Manejar finalización
        uploadTask.snapshotChanges().pipe(
          finalize(() => {
            fileRef.getDownloadURL().subscribe(url => {
              console.log(`✅ Archivo subido exitosamente: ${file.name} -> ${url}`);

              resultadosSubida[key].push({
                url: url,
                name: file.name,
                path: filePath
              });

              archivosSubidos++;

              // Si todos los archivos se subieron
              if (archivosSubidos === totalArchivos) {
                Swal.close();

                // Guardar notas con las URLs de Firebase
                this.guardarNotasConArchivos(notasConArchivos, resultadosSubida);
              }
            });
          })
        ).subscribe();
      });
    });
  }

  // Método para guardar notas con archivos subidos
  private guardarNotasConArchivos(
    notasConArchivos: { notaTexto: string; productoIndex: number; notaIndex: number; archivos: File[] }[],
    resultadosSubida: { [key: string]: { url: string; name: string; path: string }[] }
  ) {
    notasConArchivos.forEach(item => {
      const key = this.getFileKey('produccion', item.productoIndex, item.notaIndex);
      const archivosSubidos = resultadosSubida[key] || [];

      // Crear array de archivos para la nota
      const archivosNota = archivosSubidos.map(archivo => ({
        url: archivo.url,
        nombre: archivo.name,
        path: archivo.path,
        tipo: this.getTipoArchivo(archivo.name),
        fechaSubida: new Date().toISOString()
      }));

      const nuevaNota: Notas = {
        fecha: new Date().toISOString(),
        nota: item.notaTexto,
        producto: this.pedido.carrito[item.productoIndex]?.producto?.crearProducto?.titulo || "Producto sin nombre",
        productoId: this.pedido.carrito[item.productoIndex]?.producto?.identificacion?.referencia || "",
        fromFormulario: true,
        archivos: archivosNota
      };

      // Agregar la nota al array de notas de producción
      if (!this.pedido.notasPedido.notasProduccion) {
        this.pedido.notasPedido.notasProduccion = [];
      }
      this.pedido.notasPedido.notasProduccion.push(nuevaNota);

      console.log(`📝 Nota guardada con archivos:`, nuevaNota);
    });

    // Limpiar archivos locales
    this.limpiarArchivosLocales();

    // Finalizar guardado
    this.finalizarGuardadoNotas();
  }

  // Método para guardar nota sin archivos
  private guardarNotaSinArchivos(notaTexto: string, productoIndex: number, notaIndex: number) {
    const nuevaNota: Notas = {
      fecha: new Date().toISOString(),
      nota: notaTexto,
      producto: this.pedido.carrito[productoIndex]?.producto?.crearProducto?.titulo || "Producto sin nombre",
      productoId: this.pedido.carrito[productoIndex]?.producto?.identificacion?.referencia || "",
      fromFormulario: true
    };

    if (!this.pedido.notasPedido.notasProduccion) {
      this.pedido.notasPedido.notasProduccion = [];
    }
    this.pedido.notasPedido.notasProduccion.push(nuevaNota);

    console.log(`📝 Nota guardada sin archivos:`, nuevaNota);
  }

  // Método para limpiar archivos locales
  private limpiarArchivosLocales() {
    Object.keys(this.selectedFiles).forEach(key => {
      this.selectedFiles[key] = [];
      this.filePreviews[key] = [];
    });
  }

  // Método para finalizar el guardado
  private finalizarGuardadoNotas() {
    console.log("✅ Notas de producción guardadas:");
    console.log("📋 Estado final de notasPedido:", this.pedido.notasPedido);

    // Emitir evento con las notas actualizadas
    this.notasActualizadas.emit({
      carrito: this.pedido.carrito,
      notasPedido: this.pedido.notasPedido,
      pedidoCompleto: this.pedido,
    });

    // Limpiar formulario
    this.limpiarCamposFormulario();

    // Mostrar mensaje de éxito
    Swal.fire({
      icon: "success",
      title: "Notas guardadas exitosamente",
      text: "Las notas han sido guardadas junto con sus archivos adjuntos.",
      confirmButtonText: "Aceptar",
      timer: 2000,
      timerProgressBar: true,
    });

    console.log("✅ Notas guardadas con archivos:", this.pedido.notasPedido.notasProduccion);

    // Verificar que las URLs estén correctamente guardadas
    this.verificarURLsEnNotas();
  }

  // Método para limpiar solo los campos del formulario
  private limpiarCamposFormulario(): void {
    if (!this.notasFormArray) return;

    // Limpiar solo los valores de los campos, mantener la estructura
    this.notasFormArray.controls.forEach((productoControl) => {
      const notasArray = productoControl.get("notas") as FormArray;
      if (notasArray) {
        notasArray.controls.forEach((control) => {
          control.setValue("");
          control.markAsUntouched();
        });
      }
    });

    console.log("🧹 NOTAS: Campos del formulario limpiados");
  }

  onSubmitDespachos() {
    if (!this.notasDespachoForm || !this.notasDespachoForm.valid) {
      Swal.fire({
        icon: "warning",
        title: "Formulario incompleto",
        text: "Por favor, complete todos los campos requeridos.",
        confirmButtonText: "Aceptar",
      });
      return;
    }

    const notaTexto = this.notasDespachoForm.get("nota")?.value;
    if (!notaTexto || notaTexto.trim() === "") {
      Swal.fire({
        icon: "warning",
        title: "Nota vacía",
        text: "Por favor, escriba una nota antes de guardar.",
        confirmButtonText: "Aceptar",
      });
      return;
    }

    // Verificar si hay archivos seleccionados
    const archivosSeleccionados = this.selectedFiles['despacho'] || [];

    if (archivosSeleccionados.length > 0) {
      // Subir archivos primero
      this.subirArchivosYGuardarNotaDespacho(notaTexto.trim(), archivosSeleccionados);
    } else {
      // Guardar nota sin archivos
      this.guardarNotaDespachoSinArchivos(notaTexto.trim());
    }
  }

  // Método para subir archivos y guardar nota de despacho
  private subirArchivosYGuardarNotaDespacho(notaTexto: string, archivos: File[]) {
    const totalArchivos = archivos.length;
    let archivosSubidos = 0;
    const archivosSubidosResultado: { url: string; name: string; path: string }[] = [];

    // Mostrar progreso
    Swal.fire({
      title: 'Subiendo archivos...',
      html: `
        <div class="text-center">
          <div class="progress mb-3">
            <div class="progress-bar" role="progressbar" style="width: 0%" id="upload-progress-despacho"></div>
          </div>
          <p>Subiendo ${totalArchivos} archivo(s) a Firebase Storage</p>
        </div>
      `,
      showConfirmButton: false,
      allowOutsideClick: false,
    });

    // Subir cada archivo
    archivos.forEach((file, index) => {
      const timestamp = new Date().getTime();
      const fileName = `${timestamp}_${index}_${file.name}`;
      const filePath = `imagesNotas/despacho/${fileName}`;

      console.log(`📤 Subiendo archivo de despacho ${index + 1}/${totalArchivos}: ${file.name} -> ${filePath}`);

      const fileRef = this.storage.ref(filePath);
      const uploadTask = this.storage.upload(filePath, file);

      // Monitorear progreso
      uploadTask.percentageChanges().subscribe(percentage => {
        if (percentage !== null) {
          const progressBar = document.getElementById('upload-progress-despacho');
          if (progressBar) {
            progressBar.style.width = `${percentage}%`;
          }
        }
      });

      // Manejar finalización
      uploadTask.snapshotChanges().pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe(url => {
            console.log(`✅ Archivo de despacho subido exitosamente: ${file.name} -> ${url}`);

            archivosSubidosResultado.push({
              url: url,
              name: file.name,
              path: filePath
            });

            archivosSubidos++;

            // Si todos los archivos se subieron
            if (archivosSubidos === totalArchivos) {
              Swal.close();

              // Guardar nota con archivos
              this.guardarNotaDespachoConArchivos(notaTexto, archivosSubidosResultado);
            }
          });
        })
      ).subscribe();
    });
  }

  // Método para guardar nota de despacho con archivos
  private guardarNotaDespachoConArchivos(notaTexto: string, archivosSubidos: { url: string; name: string; path: string }[]) {
    // Crear array de archivos para la nota
    const archivosNota = archivosSubidos.map(archivo => ({
      url: archivo.url,
      nombre: archivo.name,
      path: archivo.path,
      tipo: this.getTipoArchivo(archivo.name),
      fechaSubida: new Date().toISOString()
    }));

    const nuevaNota: Notas = {
      fecha: new Date().toISOString(),
      nota: notaTexto,
      fromFormulario: true,
      archivos: archivosNota
    };

    // Agregar la nota al array de notas de despacho
    if (!this.pedido.notasPedido.notasDespachos) {
      this.pedido.notasPedido.notasDespachos = [];
    }
    this.pedido.notasPedido.notasDespachos.push(nuevaNota);

    console.log(`📝 Nota de despacho guardada con archivos:`, nuevaNota);

    // Limpiar archivos locales
    this.selectedFiles['despacho'] = [];
    this.filePreviews['despacho'] = [];

    // Finalizar guardado
    this.finalizarGuardadoDespacho();
  }

  // Método para guardar nota de despacho sin archivos
  private guardarNotaDespachoSinArchivos(notaTexto: string) {
    const nuevaNota: Notas = {
      fecha: new Date().toISOString(),
      nota: notaTexto,
      fromFormulario: true
    };

    if (!this.pedido.notasPedido.notasDespachos) {
      this.pedido.notasPedido.notasDespachos = [];
    }
    this.pedido.notasPedido.notasDespachos.push(nuevaNota);

    console.log(`📝 Nota de despacho guardada sin archivos:`, nuevaNota);
    this.finalizarGuardadoDespacho();
  }

  // Método para finalizar el guardado de despacho
  private finalizarGuardadoDespacho() {
    console.log("✅ Nota de despacho guardada:");
    console.log("📋 Estado final de notasDespachos:", this.pedido.notasPedido.notasDespachos);

    // Emitir evento con las notas actualizadas
    this.notasActualizadas.emit({
      carrito: this.pedido.carrito,
      notasPedido: this.pedido.notasPedido,
      pedidoCompleto: this.pedido,
    });

    // Limpiar formulario
    this.notasDespachoForm?.reset();

    // Mostrar mensaje de éxito
    Swal.fire({
      icon: "success",
      title: "Nota de despacho guardada",
      text: "La nota ha sido guardada exitosamente.",
      confirmButtonText: "Aceptar",
      timer: 2000,
      timerProgressBar: true,
    });

    console.log("✅ Nota de despacho guardada:", this.pedido.notasPedido.notasDespachos);
  }

  onSubmitEntregas() {
    if (!this.notasEntregasForm || !this.notasEntregasForm.valid) {
      Swal.fire({
        icon: "warning",
        title: "Formulario incompleto",
        text: "Por favor, complete todos los campos requeridos.",
        confirmButtonText: "Aceptar",
      });
      return;
    }

    const notaTexto = this.notasEntregasForm.get("nota")?.value;
    if (!notaTexto || notaTexto.trim() === "") {
      Swal.fire({
        icon: "warning",
        title: "Nota vacía",
        text: "Por favor, escriba una nota antes de guardar.",
        confirmButtonText: "Aceptar",
      });
      return;
    }

    // Verificar si hay archivos seleccionados
    const archivosSeleccionados = this.selectedFiles['entrega'] || [];

    if (archivosSeleccionados.length > 0) {
      // Subir archivos primero
      this.subirArchivosYGuardarNotaEntrega(notaTexto.trim(), archivosSeleccionados);
    } else {
      // Guardar nota sin archivos
      this.guardarNotaEntregaSinArchivos(notaTexto.trim());
    }
  }

  // Método para subir archivos y guardar nota de entrega
  private subirArchivosYGuardarNotaEntrega(notaTexto: string, archivos: File[]) {
    const totalArchivos = archivos.length;
    let archivosSubidos = 0;
    const archivosSubidosResultado: { url: string; name: string; path: string }[] = [];

    // Mostrar progreso
    Swal.fire({
      title: 'Subiendo archivos...',
      html: `
        <div class="text-center">
          <div class="progress mb-3">
            <div class="progress-bar" role="progressbar" style="width: 0%" id="upload-progress-entrega"></div>
          </div>
          <p>Subiendo ${totalArchivos} archivo(s) a Firebase Storage</p>
        </div>
      `,
      showConfirmButton: false,
      allowOutsideClick: false,
    });

    // Subir cada archivo
    archivos.forEach((file, index) => {
      const timestamp = new Date().getTime();
      const fileName = `${timestamp}_${index}_${file.name}`;
      const filePath = `imagesNotas/entrega/${fileName}`;

      console.log(`📤 Subiendo archivo de entrega ${index + 1}/${totalArchivos}: ${file.name} -> ${filePath}`);

      const fileRef = this.storage.ref(filePath);
      const uploadTask = this.storage.upload(filePath, file);

      // Monitorear progreso
      uploadTask.percentageChanges().subscribe(percentage => {
        if (percentage !== null) {
          const progressBar = document.getElementById('upload-progress-entrega');
          if (progressBar) {
            progressBar.style.width = `${percentage}%`;
          }
        }
      });

      // Manejar finalización
      uploadTask.snapshotChanges().pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe(url => {
            console.log(`✅ Archivo de entrega subido exitosamente: ${file.name} -> ${url}`);

            archivosSubidosResultado.push({
              url: url,
              name: file.name,
              path: filePath
            });

            archivosSubidos++;

            // Si todos los archivos se subieron
            if (archivosSubidos === totalArchivos) {
              Swal.close();

              // Guardar nota con archivos
              this.guardarNotaEntregaConArchivos(notaTexto, archivosSubidosResultado);
            }
          });
        })
      ).subscribe();
    });
  }

  // Método para guardar nota de entrega con archivos
  private guardarNotaEntregaConArchivos(notaTexto: string, archivosSubidos: { url: string; name: string; path: string }[]) {
    // Crear array de archivos para la nota
    const archivosNota = archivosSubidos.map(archivo => ({
      url: archivo.url,
      nombre: archivo.name,
      path: archivo.path,
      tipo: this.getTipoArchivo(archivo.name),
      fechaSubida: new Date().toISOString()
    }));

    const nuevaNota: Notas = {
      fecha: new Date().toISOString(),
      nota: notaTexto,
      fromFormulario: true,
      archivos: archivosNota
    };

    // Agregar la nota al array de notas de entrega
    if (!this.pedido.notasPedido.notasEntregas) {
      this.pedido.notasPedido.notasEntregas = [];
    }
    this.pedido.notasPedido.notasEntregas.push(nuevaNota);

    console.log(`📝 Nota de entrega guardada con archivos:`, nuevaNota);

    // Limpiar archivos locales
    this.selectedFiles['entrega'] = [];
    this.filePreviews['entrega'] = [];

    // Finalizar guardado
    this.finalizarGuardadoEntrega();
  }

  // Método para guardar nota de entrega sin archivos
  private guardarNotaEntregaSinArchivos(notaTexto: string) {
    const nuevaNota: Notas = {
      fecha: new Date().toISOString(),
      nota: notaTexto,
      fromFormulario: true
    };

    if (!this.pedido.notasPedido.notasEntregas) {
      this.pedido.notasPedido.notasEntregas = [];
    }
    this.pedido.notasPedido.notasEntregas.push(nuevaNota);

    console.log(`📝 Nota de entrega guardada sin archivos:`, nuevaNota);
    this.finalizarGuardadoEntrega();
  }

  // Método para finalizar el guardado de entrega
  private finalizarGuardadoEntrega() {
    console.log("✅ Nota de entrega guardada:");
    console.log("📋 Estado final de notasEntregas:", this.pedido.notasPedido.notasEntregas);

    // Emitir evento con las notas actualizadas
    this.notasActualizadas.emit({
      carrito: this.pedido.carrito,
      notasPedido: this.pedido.notasPedido,
      pedidoCompleto: this.pedido,
    });

    // Limpiar formulario
    this.notasEntregasForm?.reset();

    // Mostrar mensaje de éxito
    Swal.fire({
      icon: "success",
      title: "Nota de entrega guardada",
      text: "La nota ha sido guardada exitosamente.",
      confirmButtonText: "Aceptar",
      timer: 2000,
      timerProgressBar: true,
    });

    console.log("✅ Nota de entrega guardada:", this.pedido.notasPedido.notasEntregas);
  }

  onSubmitFacturacionPagos() {
    if (!this.notasFacturacionPagosForm || !this.notasFacturacionPagosForm.valid) {
      Swal.fire({
        icon: "warning",
        title: "Formulario incompleto",
        text: "Por favor, complete todos los campos requeridos.",
        confirmButtonText: "Aceptar",
      });
      return;
    }

    const notaTexto = this.notasFacturacionPagosForm.get("nota")?.value;
    if (!notaTexto || notaTexto.trim() === "") {
      Swal.fire({
        icon: "warning",
        title: "Nota vacía",
        text: "Por favor, escriba una nota antes de guardar.",
        confirmButtonText: "Aceptar",
      });
      return;
    }

    // Verificar si hay archivos seleccionados
    const archivosSeleccionados = this.selectedFiles['facturacion'] || [];

    if (archivosSeleccionados.length > 0) {
      // Subir archivos primero
      this.subirArchivosYGuardarNotaFacturacion(notaTexto.trim(), archivosSeleccionados);
    } else {
      // Guardar nota sin archivos
      this.guardarNotaFacturacionSinArchivos(notaTexto.trim());
    }
  }

  // Método para subir archivos y guardar nota de facturación
  private subirArchivosYGuardarNotaFacturacion(notaTexto: string, archivos: File[]) {
    const totalArchivos = archivos.length;
    let archivosSubidos = 0;
    const archivosSubidosResultado: { url: string; name: string; path: string }[] = [];

    // Mostrar progreso
    Swal.fire({
      title: 'Subiendo archivos...',
      html: `
        <div class="text-center">
          <div class="progress mb-3">
            <div class="progress-bar" role="progressbar" style="width: 0%" id="upload-progress-facturacion"></div>
          </div>
          <p>Subiendo ${totalArchivos} archivo(s) a Firebase Storage</p>
        </div>
      `,
      showConfirmButton: false,
      allowOutsideClick: false,
    });

    // Subir cada archivo
    archivos.forEach((file, index) => {
      const timestamp = new Date().getTime();
      const fileName = `${timestamp}_${index}_${file.name}`;
      const filePath = `imagesNotas/facturacion/${fileName}`;

      console.log(`📤 Subiendo archivo de facturación ${index + 1}/${totalArchivos}: ${file.name} -> ${filePath}`);

      const fileRef = this.storage.ref(filePath);
      const uploadTask = this.storage.upload(filePath, file);

      // Monitorear progreso
      uploadTask.percentageChanges().subscribe(percentage => {
        if (percentage !== null) {
          const progressBar = document.getElementById('upload-progress-facturacion');
          if (progressBar) {
            progressBar.style.width = `${percentage}%`;
          }
        }
      });

      // Manejar finalización
      uploadTask.snapshotChanges().pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe(url => {
            console.log(`✅ Archivo de facturación subido exitosamente: ${file.name} -> ${url}`);

            archivosSubidosResultado.push({
              url: url,
              name: file.name,
              path: filePath
            });

            archivosSubidos++;

            // Si todos los archivos se subieron
            if (archivosSubidos === totalArchivos) {
              Swal.close();

              // Guardar nota con archivos
              this.guardarNotaFacturacionConArchivos(notaTexto, archivosSubidosResultado);
            }
          });
        })
      ).subscribe();
    });
  }

  // Método para guardar nota de facturación con archivos
  private guardarNotaFacturacionConArchivos(notaTexto: string, archivosSubidos: { url: string; name: string; path: string }[]) {
    // Crear array de archivos para la nota
    const archivosNota = archivosSubidos.map(archivo => ({
      url: archivo.url,
      nombre: archivo.name,
      path: archivo.path,
      tipo: this.getTipoArchivo(archivo.name),
      fechaSubida: new Date().toISOString()
    }));

    const nuevaNota: Notas = {
      fecha: new Date().toISOString(),
      nota: notaTexto,
      fromFormulario: true,
      archivos: archivosNota
    };

    // Agregar la nota al array de notas de facturación
    if (!this.pedido.notasPedido.notasFacturacionPagos) {
      this.pedido.notasPedido.notasFacturacionPagos = [];
    }
    this.pedido.notasPedido.notasFacturacionPagos.push(nuevaNota);

    console.log(`📝 Nota de facturación guardada con archivos:`, nuevaNota);

    // Limpiar archivos locales
    this.selectedFiles['facturacion'] = [];
    this.filePreviews['facturacion'] = [];

    // Finalizar guardado
    this.finalizarGuardadoFacturacion();
  }

  // Método para guardar nota de facturación sin archivos
  private guardarNotaFacturacionSinArchivos(notaTexto: string) {
    const nuevaNota: Notas = {
      fecha: new Date().toISOString(),
      nota: notaTexto,
      fromFormulario: true
    };

    if (!this.pedido.notasPedido.notasFacturacionPagos) {
      this.pedido.notasPedido.notasFacturacionPagos = [];
    }
    this.pedido.notasPedido.notasFacturacionPagos.push(nuevaNota);

    console.log(`📝 Nota de facturación guardada sin archivos:`, nuevaNota);
    this.finalizarGuardadoFacturacion();
  }

  // Método para finalizar el guardado de facturación
  private finalizarGuardadoFacturacion() {
    console.log("✅ Nota de facturación guardada:");
    console.log("📋 Estado final de notasFacturacionPagos:", this.pedido.notasPedido.notasFacturacionPagos);

    // Emitir evento con las notas actualizadas
    this.notasActualizadas.emit({
      carrito: this.pedido.carrito,
      notasPedido: this.pedido.notasPedido,
      pedidoCompleto: this.pedido,
    });

    // Limpiar formulario
    this.notasFacturacionPagosForm?.reset();

    // Mostrar mensaje de éxito
    Swal.fire({
      icon: "success",
      title: "Nota de facturación guardada",
      text: "La nota ha sido guardada exitosamente.",
      confirmButtonText: "Aceptar",
      timer: 2000,
      timerProgressBar: true,
    });

    console.log("✅ Nota de facturación guardada:", this.pedido.notasPedido.notasFacturacionPagos);
  }

  // Verificar si hay notas nuevas para guardar
  hayNotasParaGuardar(): boolean {
    if (!this.notasFormArray) return false;

    return this.notasFormArray.controls.some((productoControl) => {
      const notasArray = productoControl.get("notas") as FormArray;
      return (
        notasArray &&
        notasArray.controls.some(
          (nota) => nota.value && nota.value.trim() !== "",
        )
      );
    });
  }

  // Método para limpiar el formulario sin perder las notas ya guardadas
  private limpiarFormularioMantenendoNotas(): void {
    if (!this.notasProduccionForm || !this.pedido?.carrito?.length) {
      this.initFormularios();
      return;
    }

    const productos = this.notasProduccionForm.get("productos") as FormArray;
    productos.clear();

    // Recrear el formulario preservando la lógica de notas existentes
    this.pedido.carrito.forEach((prod, index) => {
      // Crear FormArray para nuevas notas
      const notasArray = this.formBuilder.array([]);

      // Solo agregar un campo vacío si NO hay notas existentes para este producto
      const notasExistentesProducto = this.obtenerNotasDelProducto(prod);
      if (notasExistentesProducto.length === 0) {
        // Si no hay notas existentes, agregar campo vacío para nueva nota
        notasArray.push(this.formBuilder.control("", Validators.required));
      }
      // Si hay notas existentes, no agregar campos vacíos (se mostrarán las existentes)

      // Añadir al FormArray principal con la información del producto
      productos.push(
        this.formBuilder.group({
          notas: notasArray,
          productoId: [prod.producto?.identificacion?.referencia || ""],
          titulo: [
            this.crearNombreDistintivo(prod, index) || "Producto sin nombre",
          ],
        }),
      );
    });

    console.log("🧹 NOTAS: Formulario limpiado preservando notas existentes");
  }

  // Obtener notas específicas de un producto desde la fuente centralizada
  obtenerNotasDelProducto(producto: any): any[] {
    if (!this.pedido?.notasPedido?.notasProduccion) {
      return [];
    }

    // ESTRATEGIA ROBUSTA DE IDENTIFICACIÓN DE PRODUCTOS
    // 1. Obtener todos los identificadores posibles del producto
    const productoId = producto?.producto?.identificacion?.referencia;
    const productoTitulo = producto?.producto?.crearProducto?.titulo;
    const productoCD = producto?.producto?.cd || (producto?.producto?.crearProducto as any)?.cd;
    const productoBodegaId = producto?.producto?.bodegaId;

    // 2. Obtener la posición del producto en el carrito (índice único)
    const indiceProducto = this.pedido.carrito?.findIndex(p => p === producto) ?? -1;

    // 3. Crear un identificador único combinando múltiples campos
    const identificadorUnico = this.crearIdentificadorUnico(producto, indiceProducto);

    const notasEncontradas = this.pedido.notasPedido.notasProduccion.filter(
      (nota) => {
        // ESTRATEGIA DE FILTRADO JERÁRQUICO:

        // 1. PRIORIDAD MÁXIMA: Si la nota tiene identificador único, usarlo
        if ((nota as any).identificadorUnico && identificadorUnico) {
          return (nota as any).identificadorUnico === identificadorUnico;
        }

        // 2. PRIORIDAD ALTA: Si ambos tienen productoId, comparar por ID
        if (productoId && (nota as any).productoId) {
          return (nota as any).productoId === productoId;
        }

        // 3. PRIORIDAD MEDIA: Si ambos tienen CD, comparar por CD
        if (productoCD && (nota as any).productoCD) {
          return (nota as any).productoCD === productoCD;
        }

        // 4. PRIORIDAD BAJA: Si ambos tienen bodegaId, comparar por bodega + título
        if (productoBodegaId && (nota as any).productoBodegaId && productoTitulo) {
          return (nota as any).productoBodegaId === productoBodegaId &&
            (nota as any).producto === productoTitulo;
        }

        // 5. ÚLTIMO RECURSO: Solo usar título si no hay otros identificadores
        // PERO solo si es el único producto con ese título en el carrito
        if (productoTitulo && (nota as any).producto === productoTitulo) {
          // Verificar que no haya otros productos con el mismo título
          const productosConMismoTitulo = this.pedido.carrito?.filter(p =>
            p.producto?.crearProducto?.titulo === productoTitulo
          ) || [];

          // Solo usar título si es el único producto con ese nombre
          if (productosConMismoTitulo.length === 1) {
            return true;
          }
        }

        return false;
      },
    );

    return notasEncontradas;
  }

  // Método para crear un identificador único para cada producto
  private crearIdentificadorUnico(producto: any, indiceProducto: number): string {
    const productoId = producto?.producto?.identificacion?.referencia;
    const productoTitulo = producto?.producto?.crearProducto?.titulo;
    const productoCD = producto?.producto?.cd || (producto?.producto?.crearProducto as any)?.cd;
    const productoBodegaId = producto?.producto?.bodegaId;

    // Crear un hash único combinando múltiples identificadores
    const identificadores = [
      productoId || '',
      productoTitulo || '',
      productoCD || '',
      productoBodegaId || '',
      indiceProducto.toString()
    ].filter(id => id !== '');

    return identificadores.join('|');
  }

  // Método auxiliar para comparar si dos productos son el mismo
  private sonElMismoProducto(producto1: any, producto2: any): boolean {
    const p1Id = producto1?.producto?.identificacion?.referencia;
    const p1Titulo = producto1?.producto?.crearProducto?.titulo;
    const p1CD = producto1?.producto?.cd || (producto1?.producto?.crearProducto as any)?.cd;
    const p1BodegaId = producto1?.producto?.bodegaId;

    const p2Id = producto2?.producto?.identificacion?.referencia;
    const p2Titulo = producto2?.producto?.crearProducto?.titulo;
    const p2CD = producto2?.producto?.cd || (producto2?.producto?.crearProducto as any)?.cd;
    const p2BodegaId = producto2?.producto?.bodegaId;

    // Estrategia jerárquica de comparación
    if (p1Id && p2Id) return p1Id === p2Id;
    if (p1CD && p2CD) return p1CD === p2CD;
    if (p1BodegaId && p2BodegaId && p1Titulo && p2Titulo) {
      return p1BodegaId === p2BodegaId && p1Titulo === p2Titulo;
    }
    return p1Titulo === p2Titulo;
  }

  // Método para crear un nombre distintivo del producto
  private crearNombreDistintivo(producto: any, indiceProducto: number): string {
    const titulo = producto?.producto?.crearProducto?.titulo || 'Producto';
    const productoId = producto?.producto?.identificacion?.referencia;
    const productoCD = producto?.producto?.cd || (producto?.producto?.crearProducto as any)?.cd;
    const productoBodegaId = producto?.producto?.bodegaId;

    // Array para almacenar los distintivos
    const distintivos: string[] = [];

    // Agregar código del producto si existe
    if (productoCD) {
      distintivos.push(`Código: ${productoCD}`);
    }

    // Agregar ID del producto si existe
    if (productoId) {
      distintivos.push(`ID: ${productoId}`);
    }

    // Agregar bodega si existe
    if (productoBodegaId) {
      distintivos.push(`Bodega: ${productoBodegaId}`);
    }

    // Agregar posición en carrito si hay múltiples productos con mismo nombre
    const productosConMismoTitulo = this.pedido.carrito?.filter(p =>
      p.producto?.crearProducto?.titulo === titulo
    ) || [];

    if (productosConMismoTitulo.length > 1) {
      distintivos.push(`Posición: ${indiceProducto + 1}`);
    }

    // Si no hay distintivos, devolver solo el título
    if (distintivos.length === 0) {
      return titulo;
    }

    // Crear el nombre distintivo
    return `${titulo} (${distintivos.join(', ')})`;
  }

  // Método para limpiar datos fantasma de sessionStorage y localStorage
  private limpiarDatosFantasmaNotas(): void {
    // CRÍTICO: NO limpiar nada en modo edición para preservar datos
    if (this.isEdit) {
      console.log(
        "🛡️ MODO EDICIÓN: Omitiendo limpieza de datos fantasma para preservar carrito",
      );
      return;
    }

    // Limpiar sessionStorage si tiene datos corruptos SOLO en modo creación
    try {
      const pedidoTemporal = sessionStorage.getItem("pedidoTemporal");
      if (pedidoTemporal) {
        const pedido = JSON.parse(pedidoTemporal);
        if (pedido && pedido.carrito && Array.isArray(pedido.carrito)) {
          let huboLimpieza = false;

          // Limpiar propiedades obsoletas del carrito en sessionStorage
          pedido.carrito.forEach((producto: any) => {
            if (producto.notaProduccion) {
              delete producto.notaProduccion;
              huboLimpieza = true;
            }
          });

          if (huboLimpieza) {
            sessionStorage.setItem("pedidoTemporal", JSON.stringify(pedido));
          }
        }
      }
    } catch (error) {
      console.error("Error al limpiar datos fantasma:", error);
      if (!this.isEdit) {
        sessionStorage.removeItem("pedidoTemporal");
      }
    }
  }

  // Agregar métodos auxiliares para usar en la plantilla
  getFechaFormateada(nota: any): string {
    if (nota.fecha) {
      return nota.fecha;
    } else if (nota.hasOwnProperty("fecha")) {
      return nota.fecha;
    }
    return new Date().toISOString();
  }

  getProductoNombre(nota: any): string {
    if (nota.hasOwnProperty("producto")) {
      return nota.producto || "General";
    }
    return "General";
  }

  getDescripcionNota(nota: any): string {
    if (nota.hasOwnProperty("descripcion")) {
      return nota.descripcion;
    } else if (nota.hasOwnProperty("nota")) {
      return nota.nota;
    }
    return "Sin descripción";
  }

  // Método para eliminar una nota existente específica de un producto
  eliminarNotaExistente(producto: any, indiceNota: number): void {
    const notasDelProducto = this.obtenerNotasDelProducto(producto);
    if (indiceNota < 0 || indiceNota >= notasDelProducto.length) return;

    const notaAEliminar = notasDelProducto[indiceNota];
    const nombreProducto = this.crearNombreDistintivo(producto, this.pedido.carrito?.findIndex(p => this.sonElMismoProducto(p, producto)) ?? -1) || 'Producto';
    const descripcionNota = this.getDescripcionNota(notaAEliminar);

    // Confirmar eliminación con información específica
    Swal.fire({
      title: "¿Eliminar nota de producción?",
      html: `
        <div class="text-start">
          <p><strong>Producto:</strong> ${nombreProducto}</p>
          <p><strong>Nota:</strong> ${descripcionNota}</p>
          <p class="text-warning mt-2">
            <i class="fa fa-exclamation-triangle me-1"></i>
            Esta acción no se puede deshacer.
          </p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        // Encontrar el índice real en el array completo de notas de producción
        const indiceRealEnPedido =
          this.pedido.notasPedido.notasProduccion.findIndex(
            (nota) => nota === notaAEliminar,
          );

        if (indiceRealEnPedido !== -1) {
          // Eliminar la nota específica
          this.pedido.notasPedido.notasProduccion.splice(indiceRealEnPedido, 1);

          // Forzar detección de cambios
          this.cdr.detectChanges();

          // Emitir evento de actualización
          this.notasActualizadas.emit({
            carrito: this.pedido.carrito,
            notasPedido: this.pedido.notasPedido,
            pedidoCompleto: this.pedido,
          });

          // Mostrar mensaje de éxito
          Swal.fire({
            icon: "success",
            title: "Nota eliminada",
            text: `La nota de producción para "${nombreProducto}" ha sido eliminada correctamente.`,
            confirmButtonText: "Aceptar",
            timer: 2000,
            timerProgressBar: true
          });

          console.log("✅ Nota de producción eliminada correctamente");

          // Si después de eliminar no quedan notas para este producto, habilitar campo para nueva nota
          const notasRestantes = this.obtenerNotasDelProducto(producto);
          if (notasRestantes.length === 0) {
            // Buscar el índice del producto en el carrito usando el método auxiliar
            const indiceProducto = this.pedido.carrito?.findIndex(p =>
              this.sonElMismoProducto(p, producto)
            ) ?? -1;

            if (indiceProducto !== -1) {
              // Agregar un campo vacío para nueva nota
              this.agregarNota(indiceProducto);
            }
          }
        } else {
          // Si no se encuentra la nota, mostrar error
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo encontrar la nota para eliminar.",
            confirmButtonText: "Aceptar"
          });
        }
      }
    });
  }

  // Método para manejar la selección de archivos
  onFileSelected(event: any, tipo: string, productoIndex?: number, notaIndex?: number): void {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }

    // Convertir FileList a Array de Files con tipo correcto
    const fileArray = Array.from(files) as File[];

    // Guardar los archivos seleccionados localmente
    const key = this.getFileKey(tipo, productoIndex, notaIndex);
    this.selectedFiles[key] = fileArray;

    // Generar vistas previas para imágenes y videos
    this.filePreviews[key] = [];
    fileArray.forEach(file => {
      if (this.isImageFile(file) || this.isVideoFile(file)) {
        this.filePreviews[key].push(URL.createObjectURL(file));
      } else {
        this.filePreviews[key].push('');
      }
    });

    // Mostrar información sobre los archivos seleccionados
    const fileNames = fileArray.map(file => file.name).join(', ');

    Swal.fire({
      title: 'Archivos seleccionados',
      html: `
        <div class="text-start">
          <p><strong>Archivos:</strong></p>
          <ul class="text-start">
            ${fileArray.map(file => `<li>${file.name} (${this.formatFileSize(file.size)})</li>`).join('')}
          </ul>
          <p class="text-info mt-2">
            <i class="fa fa-info-circle me-1"></i>
            Los archivos se subirán a Firebase cuando guardes las notas.
          </p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Aceptar',
      showCancelButton: false
    });

    console.log(`📁 Archivos seleccionados para ${tipo}:`, fileArray);

    // Forzar detección de cambios para mostrar las vistas previas
    this.cdr.detectChanges();
  }

  // Método para subir archivos a Firebase Storage
  private uploadFilesToFirebase(files: File[], tipo: string, productoIndex?: number, notaIndex?: number): void {
    const key = this.getFileKey(tipo, productoIndex, notaIndex);
    const timestamp = new Date().getTime();
    let uploadedCount = 0;
    const totalFiles = files.length;

    // Mostrar progreso inicial
    Swal.fire({
      title: 'Subiendo archivos...',
      html: `
        <div class="text-center">
          <div class="progress mb-3">
            <div class="progress-bar" role="progressbar" style="width: 0%" id="upload-progress"></div>
          </div>
          <p>Subiendo ${totalFiles} archivo(s) a Firebase Storage</p>
        </div>
      `,
      showConfirmButton: false,
      allowOutsideClick: false,
    });

    files.forEach((file, index) => {
      // Crear nombre único para el archivo
      const fileName = `${timestamp}_${index}_${file.name}`;
      const filePath = `imagesNotas/${tipo}/${fileName}`;

      // Crear referencia al archivo en Firebase Storage
      const fileRef = this.storage.ref(filePath);
      const uploadTask = this.storage.upload(filePath, file);

      // Monitorear progreso
      uploadTask.percentageChanges().subscribe(percentage => {
        if (percentage !== null) {
          this.uploadProgress[key] = percentage;

          // Actualizar barra de progreso
          const progressBar = document.getElementById('upload-progress');
          if (progressBar) {
            progressBar.style.width = `${percentage}%`;
          }
        }
      });

      // Manejar finalización de la subida
      uploadTask.snapshotChanges().pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe(url => {
            // Agregar archivo subido al array
            this.uploadedFiles[key].push({
              url: url,
              name: file.name,
              path: filePath
            });

            uploadedCount++;

            // Si todos los archivos se subieron
            if (uploadedCount === totalFiles) {
              this.isUploading[key] = false;
              this.uploadProgress[key] = 100;

              // Cerrar modal de progreso
              Swal.close();

              // Mostrar mensaje de éxito
              Swal.fire({
                icon: 'success',
                title: 'Archivos subidos exitosamente',
                text: `Se subieron ${totalFiles} archivo(s) a Firebase Storage`,
                timer: 2000,
                showConfirmButton: false
              });

              console.log(`✅ Archivos subidos a Firebase Storage:`, this.uploadedFiles[key]);
            }
          });
        })
      ).subscribe();
    });
  }

  // Método para limpiar la selección de archivos
  clearFileSelection(tipo: string, productoIndex?: number, notaIndex?: number): void {
    let fileInput: HTMLInputElement | null = null;

    if (productoIndex !== undefined && notaIndex !== undefined) {
      // Para notas de producción
      fileInput = document.getElementById(`file-produccion-${productoIndex}-${notaIndex}`) as HTMLInputElement;
    } else {
      // Para otras pestañas
      fileInput = document.getElementById(`file-${tipo}`) as HTMLInputElement;
    }

    if (fileInput) {
      fileInput.value = '';

      Swal.fire({
        icon: 'success',
        title: 'Selección limpiada',
        text: 'Los archivos seleccionados han sido eliminados.',
        timer: 1500,
        timerProgressBar: true,
        showConfirmButton: false
      });
    }
  }

  // Método auxiliar para formatear el tamaño de archivo
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Métodos para manejar vistas previas de archivos
  getSelectedFiles(tipo: string, productoIndex?: number, notaIndex?: number): File[] {
    const key = this.getFileKey(tipo, productoIndex, notaIndex);
    return this.selectedFiles[key] || [];
  }

  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  isVideoFile(file: File): boolean {
    return file.type.startsWith('video/');
  }

  getFilePreview(file: File): string {
    return this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file)) as string;
  }

  // Método para obtener URL de Firebase si está disponible
  getFirebaseUrl(tipo: string, fileIndex: number, productoIndex?: number, notaIndex?: number): string {
    const key = this.getFileKey(tipo, productoIndex, notaIndex);

    if (this.uploadedFiles[key] && this.uploadedFiles[key][fileIndex]) {
      return this.uploadedFiles[key][fileIndex].url;
    }

    // Si no está en Firebase, usar URL local
    const files = this.selectedFiles[key];
    if (files && files[fileIndex]) {
      return this.getFilePreview(files[fileIndex]);
    }

    return '';
  }

  // Método para verificar si un archivo está subido a Firebase
  isFileUploaded(tipo: string, fileIndex: number, productoIndex?: number, notaIndex?: number): boolean {
    const key = this.getFileKey(tipo, productoIndex, notaIndex);
    return !!(this.uploadedFiles[key] && this.uploadedFiles[key][fileIndex]);
  }

  getFileIcon(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'pdf':
        return 'fa fa-file-pdf-o';
      case 'doc':
      case 'docx':
        return 'fa fa-file-word-o';
      case 'xls':
      case 'xlsx':
        return 'fa fa-file-excel-o';
      case 'ppt':
      case 'pptx':
        return 'fa fa-file-powerpoint-o';
      case 'txt':
        return 'fa fa-file-text-o';
      case 'zip':
      case 'rar':
        return 'fa fa-file-archive-o';
      default:
        return 'fa fa-file-o';
    }
  }

  removeFile(tipo: string, fileIndex: number, productoIndex?: number, notaIndex?: number): void {
    const key = this.getFileKey(tipo, productoIndex, notaIndex);
    const files = this.selectedFiles[key];

    if (files && fileIndex >= 0 && fileIndex < files.length) {
      // Eliminar archivo local
      files.splice(fileIndex, 1);

      // Limpiar la URL del objeto si existe
      if (this.filePreviews[key] && this.filePreviews[key][fileIndex]) {
        URL.revokeObjectURL(this.filePreviews[key][fileIndex]);
        this.filePreviews[key].splice(fileIndex, 1);
      }

      // Eliminar archivo de Firebase Storage si ya fue subido
      if (this.uploadedFiles[key] && this.uploadedFiles[key][fileIndex]) {
        const uploadedFile = this.uploadedFiles[key][fileIndex];

        // Eliminar de Firebase Storage
        this.storage.ref(uploadedFile.path).delete().subscribe({
          next: () => {
            console.log(`✅ Archivo eliminado de Firebase Storage: ${uploadedFile.name}`);
          },
          error: (error) => {
            console.error(`❌ Error al eliminar archivo de Firebase Storage: ${uploadedFile.name}`, error);
          }
        });

        // Eliminar del array de archivos subidos
        this.uploadedFiles[key].splice(fileIndex, 1);
      }

      // Forzar detección de cambios
      this.cdr.detectChanges();
    }
  }

  private getFileKey(tipo: string, productoIndex?: number, notaIndex?: number): string {
    if (productoIndex !== undefined && notaIndex !== undefined) {
      return `${tipo}-${productoIndex}-${notaIndex}`;
    }
    return tipo;
  }

  // Método auxiliar para determinar el tipo de archivo
  private getTipoArchivo(nombreArchivo: string): string {
    const extension = nombreArchivo.split('.').pop()?.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension || '')) {
      return 'imagen';
    } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '')) {
      return 'video';
    } else {
      return 'documento';
    }
  }

  // Método para mostrar notas guardadas con archivos
  mostrarNotasGuardadas() {
    const notasConArchivos = this.pedido.notasPedido.notasProduccion?.filter(nota => nota.archivos && nota.archivos.length > 0) || [];

    if (notasConArchivos.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No hay notas con archivos',
        text: 'Aún no se han guardado notas con archivos adjuntos.',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    let htmlContent = '<div class="text-start">';
    notasConArchivos.forEach((nota, index) => {
      htmlContent += `
        <div class="mb-3 p-2 border rounded">
          <h6 class="text-primary">Nota ${index + 1}</h6>
          <p><strong>Fecha:</strong> ${new Date(nota.fecha || '').toLocaleString()}</p>
          <p><strong>Producto:</strong> ${nota.producto || 'N/A'}</p>
          <p><strong>Nota:</strong> ${nota.nota}</p>
          <div class="mt-2">
            <strong>Archivos adjuntos:</strong>
            <ul class="list-unstyled mt-1">
      `;

      nota.archivos?.forEach(archivo => {
        htmlContent += `
          <li class="mb-1">
            <i class="fa fa-file me-1"></i>
            <a href="${archivo.url}" target="_blank" class="text-decoration-none">
              ${archivo.nombre}
            </a>
            <span class="badge bg-secondary ms-1">${archivo.tipo}</span>
          </li>
        `;
      });

      htmlContent += `
            </ul>
          </div>
        </div>
      `;
    });

    htmlContent += '</div>';

    Swal.fire({
      title: 'Notas con archivos adjuntos',
      html: htmlContent,
      width: '600px',
      confirmButtonText: 'Cerrar',
      showCloseButton: true
    });
  }

  // Método para guardar archivos adjuntos por separado
  guardarArchivosAdjuntos(tipo: string, productoIndex?: number, notaIndex?: number): void {
    const key = this.getFileKey(tipo, productoIndex, notaIndex);
    const archivosSeleccionados = this.selectedFiles[key] || [];

    if (archivosSeleccionados.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No hay archivos para subir',
        text: 'Por favor, selecciona archivos antes de intentar subirlos.',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Verificar que haya una nota escrita
    if (!this.tieneNotaEscrita(tipo, productoIndex, notaIndex)) {
      Swal.fire({
        icon: 'warning',
        title: 'Nota requerida',
        text: 'Debes escribir una nota antes de subir archivos adjuntos.',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    console.log(`🚀 Iniciando subida de archivos para ${tipo}:`, archivosSeleccionados);

    // Marcar como subiendo
    this.isUploading[key] = true;

    // Mostrar progreso
    Swal.fire({
      title: 'Subiendo archivos...',
      html: `
        <div class="text-center">
          <div class="progress mb-3">
            <div class="progress-bar" role="progressbar" style="width: 0%" id="upload-progress-${tipo}"></div>
          </div>
          <p>Subiendo ${archivosSeleccionados.length} archivo(s) a Firebase Storage</p>
        </div>
      `,
      showConfirmButton: false,
      allowOutsideClick: false,
    });

    let archivosSubidos = 0;
    const archivosSubidosResultado: { url: string; name: string; path: string }[] = [];

    // Subir archivos uno por uno
    archivosSeleccionados.forEach((file, index) => {
      const timestamp = new Date().getTime();
      const fileName = `${timestamp}_${index}_${file.name}`;
      const filePath = `imagesNotas/${tipo}/${fileName}`;

      console.log(`📤 Subiendo archivo ${index + 1}/${archivosSeleccionados.length}: ${file.name} -> ${filePath}`);

      const fileRef = this.storage.ref(filePath);
      const uploadTask = this.storage.upload(filePath, file);

      // Monitorear progreso
      uploadTask.percentageChanges().subscribe(percentage => {
        if (percentage !== null) {
          const progressBar = document.getElementById(`upload-progress-${tipo}`);
          if (progressBar) {
            progressBar.style.width = `${percentage}%`;
          }
        }
      });

      // Manejar finalización
      uploadTask.snapshotChanges().pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe(url => {
            console.log(`✅ Archivo subido exitosamente: ${file.name} -> ${url}`);

            archivosSubidosResultado.push({
              url: url,
              name: file.name,
              path: filePath
            });

            archivosSubidos++;

            // Si todos los archivos se subieron
            if (archivosSubidos === archivosSeleccionados.length) {
              Swal.close();

              // Guardar URLs en el array de archivos subidos
              this.uploadedFiles[key] = archivosSubidosResultado;

              console.log(`🎉 Todos los archivos subidos para ${tipo}:`, archivosSubidosResultado);
              console.log(`📁 Estado actual de uploadedFiles:`, this.uploadedFiles);

              // Limpiar archivos locales
              this.selectedFiles[key] = [];
              this.filePreviews[key] = [];

              // Marcar como no subiendo
              this.isUploading[key] = false;

              // Mostrar mensaje de éxito
              Swal.fire({
                icon: 'success',
                title: 'Archivos subidos exitosamente',
                text: `Se subieron ${archivosSubidos} archivo(s) a Firebase Storage`,
                timer: 2000,
                showConfirmButton: false
              });

              console.log(`✅ Archivos subidos a Firebase Storage para ${tipo}:`, archivosSubidosResultado);
            }
          });
        })
      ).subscribe();
    });
  }

  // Método para verificar el estado de las URLs en las notas
  verificarURLsEnNotas(): void {
    console.log("🔍 === VERIFICACIÓN DE URLS EN NOTAS ===");

    // Verificar uploadedFiles
    console.log("📁 Estado de uploadedFiles:", this.uploadedFiles);

    // Verificar notas de producción
    if (this.pedido.notasPedido.notasProduccion) {
      console.log("📋 Notas de producción:");
      this.pedido.notasPedido.notasProduccion.forEach((nota, index) => {
        console.log(`   Nota ${index + 1}:`, {
          texto: nota.nota,
          fecha: nota.fecha,
          producto: nota.producto,
          archivos: nota.archivos
        });
      });
    }

    // Verificar notas de despacho
    if (this.pedido.notasPedido.notasDespachos) {
      console.log("📋 Notas de despacho:");
      this.pedido.notasPedido.notasDespachos.forEach((nota, index) => {
        console.log(`   Nota ${index + 1}:`, {
          texto: nota.nota,
          fecha: nota.fecha,
          archivos: nota.archivos
        });
      });
    }

    // Verificar notas de entrega
    if (this.pedido.notasPedido.notasEntregas) {
      console.log("📋 Notas de entrega:");
      this.pedido.notasPedido.notasEntregas.forEach((nota, index) => {
        console.log(`   Nota ${index + 1}:`, {
          texto: nota.nota,
          fecha: nota.fecha,
          archivos: nota.archivos
        });
      });
    }

    // Verificar notas de facturación
    if (this.pedido.notasPedido.notasFacturacionPagos) {
      console.log("📋 Notas de facturación:");
      this.pedido.notasPedido.notasFacturacionPagos.forEach((nota, index) => {
        console.log(`   Nota ${index + 1}:`, {
          texto: nota.nota,
          fecha: nota.fecha,
          archivos: nota.archivos
        });
      });
    }

    console.log("✅ === FIN DE VERIFICACIÓN ===");
  }

  // Método para verificar si hay una nota escrita
  tieneNotaEscrita(tipo: string, productoIndex?: number, notaIndex?: number): boolean {
    if (tipo === 'produccion') {
      // Para producción, verificar en el formulario de notas
      if (productoIndex !== undefined && notaIndex !== undefined) {
        const productos = this.notasProduccionForm?.get("productos") as FormArray;
        if (productos && productos.at(productoIndex)) {
          const notasArray = productos.at(productoIndex).get("notas") as FormArray;
          if (notasArray && notasArray.at(notaIndex)) {
            const notaTexto = notasArray.at(notaIndex).value;
            return notaTexto && notaTexto.trim() !== "";
          }
        }
      }
      return false;
    } else {
      // Para otras pestañas, verificar en sus formularios respectivos
      let formControl: any = null;

      switch (tipo) {
        case 'despacho':
          formControl = this.notasDespachoForm?.get("nota");
          break;
        case 'entrega':
          formControl = this.notasEntregasForm?.get("nota");
          break;
        case 'facturacion':
          formControl = this.notasFacturacionPagosForm?.get("nota");
          break;
      }

      if (formControl) {
        const notaTexto = formControl.value;
        return notaTexto && notaTexto.trim() !== "";
      }

      return false;
    }
  }
}
