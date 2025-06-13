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

  constructor(
    private singleton: CartSingletonService,
    private formBuilder: FormBuilder,
    private modalService: NgbModal,
    private cdr: ChangeDetectorRef,
  ) {}

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
            prod.producto?.crearProducto?.titulo || "Producto sin nombre",
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
            prod.producto?.crearProducto?.titulo || "Producto sin nombre",
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
      Swal.fire({
        icon: "error",
        title: "Error Crítico",
        text: "El carrito está vacío. No se pueden guardar las notas.",
        confirmButtonText: "Entendido",
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

      // **CRÍTICO: PRESERVAR todas las notas existentes**
      const notasExistentes = [
        ...(this.pedido.notasPedido.notasProduccion || []),
      ];

      // Solo agregar nuevas notas (no reemplazar)
      let notasAgregadas = 0;
      const nuevasNotas: any[] = [];

      notasActualizadas.forEach((producto, pIndex) => {
        if (producto.notas && producto.notas.length > 0) {
          const tituloProducto =
            this.pedido?.carrito?.[pIndex]?.producto?.crearProducto?.titulo;
          const productoId =
            this.pedido?.carrito?.[pIndex]?.producto?.identificacion
              ?.referencia;

          producto.notas.forEach((textoNota: string) => {
            if (textoNota && textoNota.trim() !== "") {
              nuevasNotas.push({
                fecha: new Date().toISOString(),
                descripcion: textoNota,
                producto: tituloProducto || "Producto",
                usuario: "Usuario",
                productoId: productoId || "",
                fromFormulario: true,
              } as any);
              notasAgregadas++;
            }
          });
        }
      });

      // **MANTENER las notas existentes + agregar las nuevas**
      this.pedido.notasPedido.notasProduccion = [
        ...notasExistentes,
        ...nuevasNotas,
      ];

      // **FORZAR DETECCIÓN DE CAMBIOS**
      this.cdr.detectChanges();

      // VERIFICACIÓN CRÍTICA DESPUÉS DE PROCESAR
      const productosDespues = this.pedido?.carrito?.length || 0;
      console.log(
        "🛡️ VERIFICACIÓN DESPUÉS DE PROCESAR - Productos:",
        productosDespues,
      );

      if (productosDespues === 0 || productosDespues !== productosAntes) {
        console.error("🚨 PÉRDIDA DE PRODUCTOS DETECTADA EN GUARDAR");
        Swal.fire({
          icon: "error",
          title: "¡PRODUCTOS PERDIDOS!",
          text: `Se perdieron productos durante el guardado: Antes ${productosAntes}, Después ${productosDespues}`,
          confirmButtonText: "Recargar página",
          preConfirm: () => window.location.reload(),
        });
        return;
      }

      // Emitir el pedido actualizado
      this.notasActualizadas.emit({
        carrito: this.pedido.carrito,
        notasPedido: this.pedido.notasPedido,
        pedidoCompleto: this.pedido,
      });

      // **FORZAR DETECCIÓN NUEVAMENTE**
      this.cdr.detectChanges();

      // Limpiar solo los campos del formulario, no las notas guardadas
      this.limpiarCamposFormulario();

      // **FORZAR DETECCIÓN FINAL**
      this.cdr.detectChanges();

      if (notasAgregadas > 0) {
        Swal.fire({
          icon: "success",
          title: "Notas Agregadas",
          text: `Se agregaron ${notasAgregadas} nueva(s) nota(s). Total: ${this.pedido.notasPedido.notasProduccion.length}`,
          confirmButtonText: "Aceptar",
        });
      } else {
        Swal.fire({
          icon: "info",
          title: "Sin Nuevas Notas",
          text: "No se escribieron nuevas notas para guardar.",
          confirmButtonText: "Aceptar",
        });
      }
    }
  }

  // Nuevo método para limpiar solo los campos del formulario
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
    const notaDespachos = this.notasDespachoForm.value;
    notaDespachos.fecha = new Date();

    if (!this.pedido?.notasPedido?.notasDespachos) {
      if (this.pedido?.notasPedido) {
        this.pedido.notasPedido.notasDespachos = [];
      }
    }

    if (this.pedido?.notasPedido?.notasDespachos) {
      this.pedido.notasPedido.notasDespachos.unshift(notaDespachos);

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

      // Emitir evento al componente padre
      this.notasActualizadas.emit({
        carrito: this.pedido.carrito,
        notasPedido: this.pedido.notasPedido,
        pedidoCompleto: this.pedido,
      });
    }
    this.notasDespachoForm.reset();
  }

  onSubmitEntregas() {
    const notaEntrega = this.notasEntregasForm.value;
    notaEntrega.fecha = new Date();

    if (!this.pedido?.notasPedido?.notasEntregas) {
      if (this.pedido?.notasPedido) {
        this.pedido.notasPedido.notasEntregas = [];
      }
    }

    if (this.pedido?.notasPedido?.notasEntregas) {
      this.pedido.notasPedido.notasEntregas.unshift(notaEntrega);

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

      // Emitir evento al componente padre
      this.notasActualizadas.emit({
        carrito: this.pedido.carrito,
        notasPedido: this.pedido.notasPedido,
        pedidoCompleto: this.pedido,
      });
    }
    this.notasEntregasForm.reset();
  }

  onSubmitFacturacionPagos() {
    const notaFacturacionPagos = this.notasFacturacionPagosForm.value;
    notaFacturacionPagos.fecha = new Date();

    if (!this.pedido?.notasPedido?.notasFacturacionPagos) {
      if (this.pedido?.notasPedido) {
        this.pedido.notasPedido.notasFacturacionPagos = [];
      }
    }

    if (this.pedido?.notasPedido?.notasFacturacionPagos) {
      this.pedido.notasPedido.notasFacturacionPagos.unshift(
        notaFacturacionPagos,
      );

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

      // Emitir evento al componente padre
      this.notasActualizadas.emit({
        carrito: this.pedido.carrito,
        notasPedido: this.pedido.notasPedido,
        pedidoCompleto: this.pedido,
      });
    }
    this.notasFacturacionPagosForm.reset();
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
    this.pedido.carrito.forEach((prod) => {
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
            prod.producto?.crearProducto?.titulo || "Producto sin nombre",
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

    const productoId = producto?.producto?.identificacion?.referencia;
    const productoTitulo = producto?.producto?.crearProducto?.titulo;

    const notasEncontradas = this.pedido.notasPedido.notasProduccion.filter(
      (nota) => {
        // Priorizar filtrado por ID del producto, y solo usar título como fallback
        if (productoId && (nota as any).productoId) {
          return (nota as any).productoId === productoId;
        }
        // Solo usar título si no hay ID disponible
        return (nota as any).producto === productoTitulo;
      },
    );

    return notasEncontradas;
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

    // Confirmar eliminación
    Swal.fire({
      title: "¿Eliminar nota existente?",
      text: "¿Está seguro de que desea eliminar esta nota de producción?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        // Encontrar el índice real en el array completo de notas de producción
        const notaAEliminar = notasDelProducto[indiceNota];
        const indiceRealEnPedido =
          this.pedido.notasPedido.notasProduccion.findIndex(
            (nota) => nota === notaAEliminar,
          );

        if (indiceRealEnPedido !== -1) {
          // Eliminar la nota específica
          this.pedido.notasPedido.notasProduccion.splice(indiceRealEnPedido, 1);

          // Emitir evento de actualización
          this.notasActualizadas.emit({
            carrito: this.pedido.carrito,
            notasPedido: this.pedido.notasPedido,
            pedidoCompleto: this.pedido,
          });

          // Mostrar mensaje de éxito
          console.log("✅ Nota de producción eliminada correctamente");

          // Si después de eliminar no quedan notas para este producto, habilitar campo para nueva nota
          const notasRestantes = this.obtenerNotasDelProducto(producto);
          if (notasRestantes.length === 0) {
            // Buscar el índice del producto en el carrito
            const indiceProducto = this.pedido.carrito.findIndex(
              (p) =>
                p.producto?.identificacion?.referencia ===
                  producto.producto?.identificacion?.referencia ||
                p.producto?.crearProducto?.titulo ===
                  producto.producto?.crearProducto?.titulo,
            );

            if (indiceProducto !== -1) {
              // Agregar un campo vacío para nueva nota
              this.agregarNota(indiceProducto);
            }
          }
        }
      }
    });
  }
}
