import { Component, OnDestroy, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { HttpEventType } from "@angular/common/http";
import { Subscription } from "rxjs";
import { parse, stringify } from "flatted";
import { NgbModal, NgbModalOptions } from "@ng-bootstrap/ng-bootstrap";
import Swal from "sweetalert2";

import { ProductDetailsComponent } from "../product-details/product-details.component";
import { MaestroService } from "../../../shared/services/maestros/maestro.service";
import { KatuqintelligenceService } from "../../../shared/services/katuqintelligence/katuqintelligence.service";
import { LoaderService } from "../../../shared/services/loader.service";
import { ArchivoSubido, ImagenService } from "../../../shared/utils/image.service";
import { urlImagenAbsoluta } from "../../../shared/utils/imagen-producto";

/**
 * Creación rápida de productos.
 *
 * El formulario completo (`crear-productos`) abre 13 pestañas y exige ~17
 * campos repartidos en 6 secciones. Para una empresa chica la mayoría no
 * aplica, pero igual hay que llenarlos para poder guardar.
 *
 * Acá se piden CINCO obligatorios — título, descripción, precio, IVA y
 * categoría — y se dejan a la vista, ya resueltos por defecto, las secciones
 * que el formulario completo también muestra: disponibilidad, identificación,
 * exposición y canales de venta. Los campos son los MISMOS de `crear-productos`
 * (mismas etiquetas, mismos maestros, mismos valores), solo que sin `required`
 * donde el formulario completo sí lo exige: acá se puede guardar y completar
 * después.
 *
 * Lo que no aparece se guarda con los mismos valores por defecto que usa el
 * importador de productos (`import-modal.component.ts`, constante
 * `PRODUCT_DEFAULTS`), que llevan meses creando productos que funcionan en
 * producción. No se inventan datos de relleno: lo que no se pide queda VACÍO.
 * Unas dimensiones inventadas cotizan mal el flete y el problema aparece
 * semanas después sin que nadie lo relacione con esta pantalla.
 *
 * El producto que sale de acá es un producto normal: se puede terminar de
 * completar en el formulario de siempre, que es a donde lleva "Ver todos los
 * campos".
 */

/** Un nodo del árbol de categorías, aplanado para poder mostrarlo en un select. */
interface OpcionCategoria {
  etiqueta: string;
  nodo: any;
}

@Component({
  selector: "app-crear-producto-lite",
  templateUrl: "./crear-producto-lite.component.html",
  styleUrls: ["./crear-producto-lite.component.scss"],
})
export class CrearProductoLiteComponent implements OnInit, OnDestroy {

  /** Llave con la que el listado deja el producto a editar. */
  static readonly LLAVE_EDICION = "productoLiteEditar";

  formulario: FormGroup;

  /**
   * Entrada de K.A.I. Va en su propio FormGroup, igual que en el formulario
   * completo: no es parte del producto, es lo que se le dicta a la IA.
   */
  kaiForm: FormGroup;
  /** Plantilla de instrucciones que devuelve el backend (promptProduct). */
  private kaiProductPrompt = "";

  categorias: OpcionCategoria[] = [];
  cargandoCategorias = true;
  errorCategorias = false;

  /**
   * Mismas tarifas y mismo orden que el <select> de la pestaña "Precio" del
   * formulario completo (19 / 8 / 5 / 0). Al 0 se le deja el texto largo: hay
   * empresas que venden exclusivamente productos exentos y sin la aclaración
   * el cero parece un campo sin llenar en vez de una respuesta válida.
   */
  tarifasIva = [
    { valor: 19, texto: "19 %" },
    { valor: 8, texto: "8 %" },
    { valor: 5, texto: "5 %" },
    { valor: 0, texto: "0 % — exento o excluido" },
  ];

  /** Maestros de la pestaña "Disponibilidad" del formulario completo. */
  tiposEntrega: any[] = [];
  tiemposEntrega: any[] = [];
  /**
   * Los maestros son POR EMPRESA y hay empresas que no tienen ninguno cargado.
   * Sin estas banderas, "todavía no llega", "falló la petición" y "esta empresa
   * no tiene tipos de entrega" se ven exactamente igual: un desplegable vacío.
   */
  cargandoTiposEntrega = true;
  cargandoTiemposEntrega = true;

  /**
   * La referencia llega calculada y en solo lectura. Se puede escribir a mano
   * porque cambiarla DESPUÉS es riesgoso: `inventory` guarda espejos legacy con
   * `productoId = referencia` (ver `services/inventoryService.js`), así que un
   * producto que ya tiene inventario y le cambian la referencia queda con ese
   * inventario huérfano. Crear es el único momento seguro para elegirla.
   */
  referenciaManual = false;
  /** El consecutivo todavía viene en camino; el campo lo dice en vez de verse vacío. */
  cargandoReferencia = false;
  private prefijoEmpresa = "PRD";
  private totalProductos = 0;

  /**
   * Producto que se está editando, tal cual vino del listado. Se guarda ENTERO
   * porque al editar hay que devolver los sub-objetos completos: el backend
   * fusiona solo el primer nivel (`{ ...loGuardado, ...loQueLlega }`), así que
   * mandar un `precio` a medias borraría los precios por volumen.
   */
  productoOriginal: any = null;
  get editando(): boolean { return !!this.productoOriginal; }

  /**
   * El producto tiene rangos de volumen de verdad (de 2 unidades en adelante).
   * Importa avisarlo: al vender, el rango de volumen LE GANA al precio unitario
   * (`orderCalculationService.js`), así que cambiar acá el precio base no
   * cambia lo que paga el cliente por esas cantidades.
   */
  tienePreciosVolumen = false;

  /** URL de la imagen que ya tenía el producto, cuando no se cambió. */
  imagenActual: string | null = null;

  /**
   * El usuario quitó la imagen que el producto YA tenía, y no puso otra.
   *
   * Hace falta distinguirlo de "no tocó la imagen": los dos casos dejan
   * `imagenSubida` en null, y al guardar una edición se caía al valor original
   * —o sea, se volvía a mandar la imagen que acababan de borrar—. Quitar la
   * imagen se veía en pantalla pero no se guardaba nunca.
   */
  private imagenEliminada = false;

  archivo: File | null = null;
  vistaPrevia: string | null = null;
  private imagenSubida: ArchivoSubido | null = null;

  guardando = false;
  progresoImagen = 0;

  private subs = new Subscription();

  constructor(
    private fb: FormBuilder,
    private service: MaestroService,
    private kaiService: KatuqintelligenceService,
    private imageService: ImagenService,
    private router: Router,
    private loader: LoaderService,
    private modalService: NgbModal,
  ) {
    this.formulario = this.fb.group({
      // Datos básicos
      titulo: ["", Validators.required],
      descripcion: ["", Validators.required],
      // El precio
      precioSinIva: [null, [Validators.required, Validators.min(0)]],
      porcentajeIva: [19, Validators.required],
      // Categorías
      categoria: [null, Validators.required],
      // Disponibilidad: los mismos campos de la pestaña del formulario completo
      // MENOS `cantidadDisponible`, que allá también quedó fuera de la UI (es un
      // input hidden) porque el stock se gestiona desde el catálogo de
      // inventario. Van SIN `required`, al revés que en el formulario completo:
      // esta pantalla existe para crear rápido y un tipo de entrega sin definir
      // no impide vender.
      tipoEntrega: [""],
      tiempoEntrega: [""],
      cantidadMinVenta: [1, Validators.min(1)],
      inventarioSeguridad: [0, Validators.min(0)],
      inventariable: [true],
      // Identificación
      referencia: [{ value: "", disabled: true }, Validators.required],
      marca: [""],
      codigoBarras: [""],
      // Exposición
      activar: [true],
      // Canales de venta
      sellerCenter: [true],
      paginaWeb: [true],
      puntoDeVenta: [true],
    });

    // Mismos campos que el kaiForm del formulario completo, para que el prompt
    // sea el mismo y KAI responda con la misma estructura.
    this.kaiForm = this.fb.group({
      tituloKai: [""],
      textoBase: [""],
      response: [""],
      photoToAnalize: [""],
      isAnalizeImageForPrompt: [true],
      isGenerateImage: [false],
    });
  }

  ngOnInit(): void {
    // El overlay global tapa la pantalla completa mientras haya CUALQUIER
    // petición en vuelo (`LoaderInterceptor`). Al entrar acá salen dos —
    // categorías y el total de productos para la referencia — y ninguna de las
    // dos impide empezar a escribir: título, precio, IVA e imagen están listos
    // desde el primer momento. Bloquear la pantalla hasta que respondan hacía
    // que la creación "rápida" tardara casi un segundo en dejarse usar.
    //
    // Los dos campos que sí dependen de esas peticiones muestran su propio
    // estado de carga en línea (`cargandoCategorias` y el aviso de referencia),
    // y el guardado tampoco necesita el overlay: el botón se deshabilita, gira
    // y reporta el porcentaje de subida de la imagen.
    this.loader.suppressGlobalLoader();

    this.arrancar();
  }

  /**
   * Arranque del formulario, con cada paso AISLADO.
   *
   * Antes iban encadenados en el `ngOnInit`, y eso tenía una falla fea: si el
   * primero reventaba —un `currentCompany` con forma inesperada, un
   * `sessionStorage` corrupto— los siguientes ni se lanzaban. La pantalla se
   * pintaba entera pero sin una sola petición en vuelo, así que las categorías
   * y los maestros de entrega se quedaban en "Cargando..." PARA SIEMPRE. Visto
   * desde afuera es idéntico a un backend caído, y no lo es.
   *
   * Ahora un paso que falle se registra con su nombre y los demás siguen.
   */
  private arrancar(): void {
    this.paso("prefijo de la empresa", () => this.cargarPrefijoEmpresa());
    // Los marketplaces salen de `currentCompany` (localStorage) y la lista ya
    // tiene que estar armada cuando se vuelque el producto a editar.
    this.paso("canales de marketplace", () => this.cargarMarketplaces());
    this.paso("producto a editar", () => this.cargarProductoAEditar());
    if (!this.editando) {
      this.paso("consecutivo de la referencia", () => this.cargarConsecutivo());
    }
    this.paso("categorías", () => this.cargarCategorias());
    this.paso("maestros de entrega", () => this.cargarMaestrosEntrega());
    this.paso("plantilla de K.A.I.", () => this.cargarPromptKai());
  }

  /** Ejecuta un paso del arranque sin dejar que tumbe a los demás. */
  private paso(nombre: string, accion: () => void): void {
    try {
      accion();
    } catch (e) {
      console.error(`[ProductoLite] Falló el paso "${nombre}" al abrir la pantalla`, e);
    }
  }

  // ─── K.A.I. ────────────────────────────────────────────────────────────────

  /** Sin prompt no hay nada que mandarle a la IA. */
  get kaiListo(): boolean {
    return !!this.kaiForm.get("tituloKai").value?.trim() && !!this.kaiProductPrompt;
  }

  private cargarPromptKai(): void {
    this.subs.add(
      this.kaiService.getKatuqPrompt().subscribe({
        next: (r: any) => { this.kaiProductPrompt = r?.promptProduct || ""; },
        error: (e) => console.error("[ProductoLite] Error cargando el prompt de K.A.I.", e),
      }),
    );
  }

  /** Imagen que KAI analiza para deducir el producto. Viaja en base64. */
  fileChangeEventForKAI(evento: any): void {
    const archivo = evento?.target?.files?.[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = (e: any) => this.kaiForm.get("photoToAnalize").setValue(e.target.result);
    lector.readAsDataURL(archivo);
  }

  /**
   * Arma el prompt que se le manda a K.A.I.
   *
   * **No puede tener efectos secundarios.** La plantilla lo invoca con
   * [katuqIntelligencePrompt]="getKatuqPrompt()", así que corre en CADA ciclo de
   * detección de cambios. En el formulario completo esta misma función escribía
   * en `formGeneral` y borraba la referencia entre que se armaba el payload y
   * que se enviaba: un 400 en el primer click imposible de rastrear. Acá solo se
   * leen valores y se devuelve un string.
   *
   * El snapshot es el payload completo del producto (`armarPayload`) para que
   * KAI conteste con la MISMA estructura que ya sabe llenar en el formulario
   * grande, y así la respuesta se pueda volcar sin traducciones.
   */
  getKatuqPrompt(): string {
    const entrada = "\n      Entrada:\n" +
      "      Título del Producto: " + this.kaiForm.get("tituloKai").value + "\n" +
      "      Texto Base: " + this.kaiForm.get("textoBase").value + "\n" +
      (this.kaiForm.get("photoToAnalize").value ? "      DescripcionImagen:{descripcionImagen}\n" : "") +
      "\n      Salida esperada: Un texto completo y optimizado que cubra todos los puntos mencionados, " +
      "diseñado para maximizar la visibilidad en motores de búsqueda, mejorar la experiencia de lectura " +
      "y convertir a los visitantes en compradores.\n" +
      "      Para los precios deben ser sin puntos ni comas, solo decimales\n" +
      "      y me debes devolver solamente el json con la siguiente estructura llenos:\n\n      " +
      JSON.stringify(this.armarPayload());

    return this.kaiProductPrompt?.replace("{entradas}", entrada) || "";
  }

  /**
   * Vuelca la respuesta de K.A.I. en el formulario.
   *
   * Solo se tocan los campos que ESTA pantalla muestra, y dos quedan fuera a
   * propósito: la `referencia`, que es el consecutivo de la empresa y tiene que
   * ser única —dejar que la invente la IA rompería el enlace con el inventario—,
   * y la imagen que el usuario ya haya elegido, que le gana a la sugerida.
   *
   * No guarda nada: deja todo en pantalla para revisar y corregir.
   */
  katuqIntelligeceResponse(evento: any): void {
    const sugerido = evento?.respuesta?.message;
    if (!sugerido) {
      Swal.fire("K.A.I. no devolvió información", "Intente de nuevo con una descripción más detallada.", "warning");
      return;
    }

    try {
      this.formulario.patchValue({
        titulo: sugerido?.crearProducto?.titulo || this.formulario.get("titulo").value,
        descripcion: sugerido?.crearProducto?.descripcion || this.formulario.get("descripcion").value,
        marca: sugerido?.identificacion?.marca || this.formulario.get("marca").value,
        codigoBarras: sugerido?.identificacion?.codigoBarras || this.formulario.get("codigoBarras").value,
      });

      // El precio solo se pisa si KAI mandó un número usable: un 0 sugerido
      // encima de un precio ya escrito a mano sería una pérdida silenciosa.
      const precioBase = Number(sugerido?.precio?.precioUnitarioSinIva);
      if (!isNaN(precioBase) && precioBase > 0) {
        this.formulario.get("precioSinIva").setValue(precioBase);
      }
      const pct = Number(sugerido?.precio?.precioUnitarioIva);
      if (!isNaN(pct) && this.tarifasIva.some((t) => t.valor === pct)) {
        this.formulario.get("porcentajeIva").setValue(pct);
      }

      const disp = sugerido?.disponibilidad;
      if (disp) {
        this.formulario.patchValue({
          cantidadMinVenta: Number(disp.cantidadMinVenta) || this.formulario.get("cantidadMinVenta").value,
          inventarioSeguridad: Number(disp.inventarioSeguridad) || this.formulario.get("inventarioSeguridad").value,
        });
        // Los de entrega, solo si coinciden con el maestro de la empresa.
        if (this.tiposEntrega.some((t) => t.nombreInterno === disp.tipoEntrega)) {
          this.formulario.get("tipoEntrega").setValue(disp.tipoEntrega);
        }
        if (this.tiemposEntrega.some((t) => t.nombreInterno === disp.tiempoEntrega)) {
          this.formulario.get("tiempoEntrega").setValue(disp.tiempoEntrega);
        }
      }

      this.aplicarCategoriaSugerida(sugerido?.categorias);

      // Imagen generada por KAI, solo si el usuario no puso una suya.
      const foto = evento?.respuesta?.photo;
      if (foto && !this.archivo && !this.vistaPrevia) {
        this.vistaPrevia = foto;
        this.imagenSubida = { success: true, url: foto, path: "", name: "kai" };
      }

      Swal.fire({
        title: "Listo",
        text: "K.A.I. llenó el formulario. Revise los datos y corrija lo que haga falta antes de guardar.",
        icon: "success",
        confirmButtonText: "Entendido",
      });
    } catch (e) {
      console.error("[ProductoLite] No se pudo volcar la respuesta de K.A.I.", e);
      Swal.fire("No se pudo leer la respuesta de K.A.I.", "El formulario quedó como estaba.", "error");
    }
  }

  // ─── Canales de venta ──────────────────────────────────────────────────────

  /**
   * Marketplaces de la empresa, igual que `setupMarketplaceFields()` del
   * formulario completo: salen de `currentCompany.marketPlace` y cada uno
   * entra apagado.
   *
   * Es una lista suelta y NO un `FormArray`: son tres booleanos sin validación
   * ni estado de formulario, y montarlos como FormArray obligaba a
   * `formArrayName` + `formGroupName` en la plantilla y a reconstruirlos a mano
   * después de cada `reset()`. Mucho andamiaje para una fila de casillas.
   */
  marketplaces: { nameMP: string; activo: boolean }[] = [];

  private cargarMarketplaces(): void {
    const empresa = JSON.parse(localStorage.getItem("currentCompany") || "{}");
    this.marketplaces = (empresa?.marketPlace || [])
      .filter((mp: any) => mp?.nombreMP)
      .map((mp: any) => ({ nameMP: mp.nombreMP, activo: false }));
  }

  // ─── Disponibilidad ────────────────────────────────────────────────────────

  /**
   * Los mismos dos maestros que carga el formulario completo:
   * `/v1/tipoentrega/all` y `/v1/tiemposentrega/all`.
   */
  private cargarMaestrosEntrega(): void {
    this.subs.add(
      this.service.getTipoEntrega().subscribe({
        next: (r: any) => {
          this.tiposEntrega = (r as any[]) || [];
          this.cargandoTiposEntrega = false;
          this.conservarValorFueraDelMaestro(this.tiposEntrega, "tipoEntrega");
        },
        error: (e) => {
          this.cargandoTiposEntrega = false;
          console.error("[ProductoLite] Error cargando tipos de entrega", e);
        },
      }),
    );
    this.subs.add(
      this.service.getTiempoEntrega().subscribe({
        next: (r: any) => {
          this.tiemposEntrega = (r as any[]) || [];
          this.cargandoTiemposEntrega = false;
          // El maestro llega DESPUÉS de volcar el producto al formulario, así
          // que la traducción del valor legacy tiene que hacerse también acá.
          this.normalizarTiempoEntrega();
          this.conservarValorFueraDelMaestro(this.tiemposEntrega, "tiempoEntrega");
        },
        error: (e) => {
          this.cargandoTiemposEntrega = false;
          console.error("[ProductoLite] Error cargando tiempos de entrega", e);
        },
      }),
    );
  }

  /**
   * Un producto puede tener guardado un tipo/tiempo de entrega que ya NO está
   * en el maestro (lo renombraron, lo desactivaron, o viene de una importación).
   * El `<select>` no encuentra ninguna opción con ese value y se queda en
   * BLANCO — y como el formulario manda lo que ve el control, al guardar
   * escribiría "" y borraría el dato sin que nadie se entere.
   *
   * Se agrega el valor guardado como una opción más, marcada, igual que se hace
   * con una tarifa de IVA fuera de las habituales.
   */
  private conservarValorFueraDelMaestro(lista: any[], campo: string): void {
    const valor = this.formulario.get(campo)?.value;
    if (!valor || typeof valor !== "string") return;
    if (lista.some((i) => i?.nombreInterno === valor)) return;
    lista.push({ nombreInterno: valor, fueraDelMaestro: true });
  }

  /**
   * Traduce el `tiempoEntrega` guardado al `nombreInterno` que espera el
   * <select>. Es la misma lógica de `normalizarTiempoEntregaGuardado()` del
   * formulario completo: los productos viejos guardan un NÚMERO de días y, al
   * no existir ningún <option> con ese value, el campo se ve VACÍO aunque el
   * dato exista. `posicion` resuelve mejor que `minDias`, que tiene empates.
   *
   * Si nada resuelve, se deja como está: mejor el campo vacío que mostrar un
   * tiempo de entrega que el producto no tiene.
   */
  private normalizarTiempoEntrega(): void {
    const control = this.formulario.get("tiempoEntrega");
    if (!control || !this.tiemposEntrega.length) return;

    const valor = control.value;
    if (valor === null || valor === undefined || valor === "" || valor === "seleccione") return;
    if (this.tiemposEntrega.some((i) => i.nombreInterno === valor)) return;
    if (isNaN(Number(valor))) return;

    const dias = String(Number(valor));
    const porMinDias = this.tiemposEntrega.filter((i) => String(i.minDias) === dias);
    const match = porMinDias.length === 1
      ? porMinDias[0]
      : this.tiemposEntrega.find((i) => String(i.posicion) === dias);

    if (match) control.setValue(match.nombreInterno);
  }

  /**
   * El listado deja el producto en `sessionStorage` con una llave propia. NO se
   * reusa `infoForms`, que es la del formulario completo: si compartieran llave,
   * salir de una pantalla dejaría a la otra en un modo que no le corresponde.
   */
  private cargarProductoAEditar(): void {
    const crudo = sessionStorage.getItem(CrearProductoLiteComponent.LLAVE_EDICION);
    if (!crudo) return;

    try {
      const prod = JSON.parse(crudo);
      if (!prod?.cd) throw new Error("el producto no trae cd");
      this.productoOriginal = prod;
      this.precargar(prod);
    } catch (e) {
      console.error("[ProductoLite] No se pudo leer el producto a editar", e);
      sessionStorage.removeItem(CrearProductoLiteComponent.LLAVE_EDICION);
    }
  }

  private precargar(prod: any): void {
    const pct = Number(prod?.precio?.precioUnitarioIva) || 0;
    // Una tarifa fuera de las tres habituales no se puede perder en silencio:
    // se agrega al select para que se vea y se conserve si no se toca.
    if (!this.tarifasIva.some((t) => t.valor === pct)) {
      this.tarifasIva = [...this.tarifasIva, { valor: pct, texto: `${pct} %` }];
    }

    this.formulario.patchValue({
      titulo: prod?.crearProducto?.titulo || "",
      descripcion: prod?.crearProducto?.descripcion || "",
      precioSinIva: Number(prod?.precio?.precioUnitarioSinIva) || 0,
      porcentajeIva: pct,
      tipoEntrega: prod?.disponibilidad?.tipoEntrega || "",
      tiempoEntrega: prod?.disponibilidad?.tiempoEntrega ?? "",
      cantidadMinVenta: Number(prod?.disponibilidad?.cantidadMinVenta) || 1,
      inventarioSeguridad: Number(prod?.disponibilidad?.inventarioSeguridad) || 0,
      // Los booleanos van con `!== false` y no con `|| true`: uno guardado en
      // false tiene que llegar en false, y uno viejo al que le falta la llave
      // se asume encendido, que es como se venía creando hasta ahora.
      inventariable: prod?.disponibilidad?.inventariable !== false,
      marca: prod?.identificacion?.marca || "",
      codigoBarras: prod?.identificacion?.codigoBarras || "",
      referencia: prod?.identificacion?.referencia || "",
      activar: prod?.exposicion?.activar !== false,
      sellerCenter: prod?.marketplace?.sellerCenter !== false,
      paginaWeb: prod?.marketplace?.paginaWeb !== false,
      puntoDeVenta: prod?.marketplace?.puntoDeVenta !== false,
    });

    // "seleccione" es el placeholder del <select> del formulario completo, no
    // un valor: si llegó guardado, acá equivale a "sin definir".
    ["tipoEntrega", "tiempoEntrega"].forEach((campo) => {
      if (this.formulario.get(campo).value === "seleccione") {
        this.formulario.get(campo).setValue("");
      }
    });
    // Por si el maestro alcanzó a llegar antes que el producto.
    this.normalizarTiempoEntrega();

    // Los marketplaces se marcan por NOMBRE: la lista se armó desde
    // `currentCompany` y el producto puede traer otros, o ninguno.
    const canalesGuardados = prod?.marketplace?.campos || [];
    this.marketplaces.forEach((canal) => {
      const guardado = canalesGuardados.find((c: any) => c?.nameMP === canal.nameMP);
      if (guardado) canal.activo = !!guardado.activo;
    });

    // Al editar la referencia queda bloqueada a propósito: cambiarla deja
    // huérfano el inventario que ya está guardado con el código viejo.
    this.formulario.get("referencia").disable();

    this.imagenActual = prod?.crearProducto?.imagenesPrincipales?.[0]?.urls || null;
    // Para MOSTRARLA hay que volverla absoluta: buena parte del catálogo tiene
    // la ruta relativa que devuelve Osmosis (`/osmosis/products/…`) y puesta
    // tal cual el navegador la resuelve contra nuestro dominio, donde el
    // rewrite de Firebase responde el HTML de la app. La imagen fallaba en
    // silencio y al editar parecía que el producto no tenía foto (D-141).
    // `imagenActual` se guarda CRUDA: es el valor original, no el de pantalla.
    if (this.imagenActual) this.vistaPrevia = urlImagenAbsoluta(this.imagenActual);

    const rangos = prod?.precio?.preciosVolumen || [];
    this.tienePreciosVolumen = Array.isArray(rangos)
      && rangos.some((r: any) => Number(r?.numeroUnidadesInicial) > 1);
  }

  ngOnDestroy(): void {
    // Emparejado obligatorio con el suppress del ngOnInit: el contador es
    // global y dejarlo levantado apagaría el overlay del resto de la app.
    this.loader.releaseGlobalLoader();
    this.subs.unsubscribe();
    this.salirDeEdicion();
  }

  // ─── Referencia ────────────────────────────────────────────────────────────

  private cargarPrefijoEmpresa(): void {
    const empresa = JSON.parse(localStorage.getItem("currentCompany") || "{}");
    const nombre = (empresa?.nomComercial || "PRD").toString().replace(" ", "");
    this.prefijoEmpresa = nombre.substring(0, 3).toUpperCase();
  }

  /**
   * Mismo consecutivo que el formulario completo
   * (`crear-productos.component.ts`, `construirReferenciaAutomatica`): prefijo
   * de la empresa + total de productos + 1, a seis dígitos.
   */
  private cargarConsecutivo(): void {
    this.cargandoReferencia = true;
    this.subs.add(
      this.service.getTotalProducts().subscribe({
        next: (r: any) => {
          this.cargandoReferencia = false;
          this.totalProductos = r?.totalItems || 0;
          this.formulario.get("referencia").setValue(this.construirReferencia());
        },
        error: () => {
          // Sin el total no se puede numerar. Se habilita el campo para que el
          // usuario la escriba en vez de dejarlo bloqueado sin salida.
          this.cargandoReferencia = false;
          this.referenciaManual = true;
          this.formulario.get("referencia").enable();
        },
      }),
    );
  }

  private construirReferencia(): string {
    return `${this.prefijoEmpresa}-${(this.totalProductos + 1).toString().padStart(6, "0")}`;
  }

  cambiarReferencia(): void {
    this.referenciaManual = true;
    this.formulario.get("referencia").enable();
  }

  volverAReferenciaAutomatica(): void {
    this.referenciaManual = false;
    this.formulario.get("referencia").setValue(this.construirReferencia());
    this.formulario.get("referencia").disable();
  }

  // ─── Categorías ────────────────────────────────────────────────────────────

  /**
   * El árbol de categorías se aplana a "Padre › Hijo › Nieto" para que quepa en
   * un select. El formulario completo usa un árbol desplegable; acá interesa
   * elegir rápido, no explorar.
   */
  private cargarCategorias(): void {
    this.cargandoCategorias = true;
    this.subs.add(
      this.service.getCategorias().subscribe({
        next: (r: any) => {
          try {
            this.categorias = this.aplanarCategorias(r);
            this.errorCategorias = this.categorias.length === 0;
            this.seleccionarCategoriaDelProducto();
          } catch (e) {
            console.error("[ProductoLite] No se pudo leer el árbol de categorías", e);
            this.errorCategorias = true;
          }
          this.cargandoCategorias = false;
        },
        error: (e) => {
          console.error("[ProductoLite] Error cargando categorías", e);
          this.errorCategorias = true;
          this.cargandoCategorias = false;
        },
      }),
    );
  }

  /**
   * Deja marcada la categoría que ya tiene el producto que se edita.
   *
   * Se busca por NOMBRE y no por referencia de objeto: el árbol se vuelve a
   * pedir al servidor en cada entrada, así que los nodos nunca son el mismo
   * objeto que quedó guardado en el producto.
   */
  private seleccionarCategoriaDelProducto(): void {
    if (!this.editando) return;
    this.aplicarCategoriaSugerida(this.productoOriginal?.categorias);
  }

  /**
   * Marca la categoría que trae un producto guardado o una sugerencia de K.A.I.
   * Si no hay coincidencia no se toca nada: mejor que el usuario elija a
   * inventarle una categoría que no existe en su árbol.
   */
  private aplicarCategoriaSugerida(guardada: any): void {
    if (!guardada || !this.categorias.length) return;

    let nombre: string | null = null;
    try {
      const nodo = typeof guardada === "string" ? this.parsearArbol(guardada) : guardada;
      nombre = nodo?.label || nodo?.data?.nombre || null;
    } catch {
      nombre = null;
    }
    if (!nombre) return;

    const opcion = this.categorias.find(
      (c) => c.nodo?.label === nombre || c.etiqueta.endsWith(nombre),
    );
    if (opcion) this.formulario.get("categoria").setValue(opcion.nodo);
  }

  private aplanarCategorias(respuesta: any): OpcionCategoria[] {
    const crudo = Array.isArray(respuesta) ? respuesta[0]?.categoria : respuesta?.categoria;
    if (!crudo) return [];

    // El backend puede devolver el árbol ya como objeto o serializado con
    // `flatted` (así lo guarda el formulario completo). Se aceptan las dos.
    const arbol = typeof crudo === "string" ? this.parsearArbol(crudo) : crudo;
    if (!Array.isArray(arbol)) return [];

    const opciones: OpcionCategoria[] = [];
    const recorrer = (nodos: any[], ruta: string[]) => {
      nodos.forEach((n) => {
        const nombre = n?.data?.nombre;
        if (!nombre) return;
        const rutaActual = [...ruta, nombre];
        opciones.push({
          etiqueta: rutaActual.join(" › "),
          nodo: { label: nombre, data: n.data, parent: n.parent ?? null, children: n.children ?? [] },
        });
        if (Array.isArray(n.children) && n.children.length) {
          recorrer(n.children, rutaActual);
        }
      });
    };
    recorrer(arbol, []);
    return opciones;
  }

  private parsearArbol(texto: string): any {
    // `flatted` es el formato en que lo guarda el módulo de productos, pero hay
    // empresas viejas con JSON plano. Se intentan los dos antes de rendirse.
    try {
      return parse(texto);
    } catch {
      return JSON.parse(texto);
    }
  }

  // ─── Imagen ────────────────────────────────────────────────────────────────

  /**
   * La imagen es opcional a propósito. Quien carga 30 productos rara vez tiene
   * las 30 fotos a mano, y un campo bloqueante ahí hace que abandonen el
   * formulario a la mitad. Va primera y con espacio porque en el listado la
   * empresa reconoce sus productos por la foto antes que por la referencia.
   */
  seleccionarArchivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      Swal.fire(
        "El archivo no es una imagen",
        "Seleccione un archivo .jpg, .png o .webp.",
        "warning",
      );
      input.value = "";
      return;
    }

    const MAX_MB = 5;
    if (archivo.size > MAX_MB * 1024 * 1024) {
      Swal.fire(
        "La imagen supera el tamaño permitido",
        `El máximo permitido son ${MAX_MB} MB y esta pesa ${(archivo.size / 1048576).toFixed(1)} MB. Redúzcala e intente nuevamente.`,
        "warning",
      );
      input.value = "";
      return;
    }

    this.archivo = archivo;
    // Si ya se había subido otra, deja de valer.
    this.imagenSubida = null;
    // Eligió una nueva: ya no es un borrado, es un reemplazo.
    this.imagenEliminada = false;

    // OJO: `URL.createObjectURL()` NO sirve para mostrar la miniatura.
    //
    // Devuelve una URL `blob:` y el sanitizador de Angular solo deja pasar
    // `https? | mailto | data | ftp | tel | file | sms` (`SAFE_URL_PATTERN` en
    // `@angular/core`). Un `blob:` en un `[src]` se reescribe a `unsafe:blob:`
    // y la imagen NUNCA carga: se veía el recuadro con el nombre del archivo
    // pero sin foto, y solo aparecía después de guardar, cuando la URL ya era
    // la `https://` del storage. Quien la subía no tenía cómo saber si había
    // quedado.
    //
    // `data:` sí está en la lista blanca, sirve igual en la vista previa (el
    // modal la pasa por `urlImagenAbsoluta`, que también lo respeta) y no deja
    // nada que revocar después.
    const lector = new FileReader();
    lector.onload = () => {
      // Puede llegar después de que el usuario la quitó o eligió otra.
      if (this.archivo !== archivo) return;
      this.vistaPrevia = lector.result as string;
    };
    lector.readAsDataURL(archivo);
  }

  quitarImagen(): void {
    this.archivo = null;
    this.vistaPrevia = null;
    this.imagenSubida = null;
    this.progresoImagen = 0;
    // Solo cuenta como borrado si había una imagen GUARDADA. Descartar una que
    // se acababa de elegir y todavía no se ha guardado no borra nada.
    if (this.imagenActual) this.imagenEliminada = true;
  }

  /**
   * Sube por `/v1/media/upload` igual que el formulario completo: la subida
   * directa a Firebase Storage desde el navegador responde 403 porque la app no
   * tiene sesión de Firebase Auth.
   */
  private subirImagen(): Promise<ArchivoSubido> {
    return new Promise((resolve, reject) => {
      this.imageService.subirImagenConProgreso(this.archivo, this.archivo.name).subscribe({
        next: (evento) => {
          const pct = ImagenService.porcentaje(evento);
          if (pct !== null) {
            this.progresoImagen = pct;
            return;
          }
          if (evento.type === HttpEventType.Response) {
            this.progresoImagen = 100;
            const body = evento.body;
            if (!body?.url) {
              reject(new Error("El servidor no devolvió la dirección de la imagen"));
              return;
            }
            resolve(body);
          }
        },
        error: (e) => reject(e),
      });
    });
  }

  // ─── Precio ────────────────────────────────────────────────────────────────

  /**
   * Monto del IVA en pesos: el campo "Valor IVA" del formulario completo.
   * OJO con los nombres del producto guardado, están al revés de lo que
   * parecen: `precioUnitarioIva` es el PORCENTAJE y `valorIva` este monto.
   */
  get valorIva(): number {
    const base = Number(this.formulario.get("precioSinIva").value) || 0;
    const pct = Number(this.formulario.get("porcentajeIva").value) || 0;
    return base * (pct / 100);
  }

  /** Precio con IVA, para mostrarlo mientras se escribe. */
  get precioConIva(): number {
    return (Number(this.formulario.get("precioSinIva").value) || 0) + this.valorIva;
  }

  // ─── Vista previa ──────────────────────────────────────────────────────────

  /**
   * Muestra el producto como lo verá el cliente, sin guardar nada.
   *
   * Reusa el MISMO modal del formulario completo (`ProductDetailsComponent` con
   * `fromProductCreate`), a propósito: si esta pantalla dibujara su propia
   * previa, la creación rápida y la larga mostrarían cosas distintas del mismo
   * producto y la previa dejaría de ser una referencia confiable.
   *
   * El componente vive en `ProductosModule` y NO hace falta importarlo acá: el
   * compilador de Angular le deja resuelto su propio alcance de directivas, y
   * `NgbModal` lo instancia contra el injector RAÍZ (es `providedIn: 'root'`),
   * así que los servicios que inyecta salen del root y no del injector lazy.
   * Por eso tampoco hay que agregar nada a `providers` — que es justo lo que el
   * docblock del módulo prohíbe para no repetir el 401 de D-251. `NgbActiveModal`
   * lo provee el propio modal al abrirse.
   */
  abrirVistaPrevia(): void {
    const producto: any = this.editando
      ? { ...(this.productoOriginal || {}), ...this.armarPayloadEdicion() }
      : this.armarPayload();

    // La imagen recién elegida todavía no se ha subido (eso pasa al guardar),
    // así que el payload no la trae. Para la previa se usa la `data:` URL que
    // dejó armada `seleccionarArchivo`, que `urlImagenAbsoluta` respeta.
    if (this.archivo && this.vistaPrevia) {
      producto.crearProducto = {
        ...(producto.crearProducto || {}),
        imagenesPrincipales: [{
          urls: this.vistaPrevia,
          nombreImagen: this.archivo.name,
          path: "",
          tipo: "principal",
        }],
      };
    }

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
    modalRef.componentInstance.producto = producto;
    modalRef.componentInstance.fromProductCreate = true;
    modalRef.componentInstance.isView = true;
    // Se abre DESDE la edición rápida: ofrecer "Editar rápido" acá sería un
    // botón que lleva a donde ya se está.
    modalRef.componentInstance.permiteEdicionRapida = false;
  }

  // ─── Guardado ──────────────────────────────────────────────────────────────

  get invalido(): boolean {
    return this.formulario.invalid;
  }

  async guardar(): Promise<void> {
    if (this.guardando) return;

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardando = true;

    try {
      // La referencia manual tiene que ser única dentro de la empresa; el
      // backend genera una nueva en silencio si choca, y el usuario terminaría
      // con una referencia distinta de la que escribió sin enterarse.
      if (this.referenciaManual) {
        const libre = await this.referenciaEstaLibre();
        if (!libre) {
          this.guardando = false;
          return;
        }
      }

      if (this.archivo && !this.imagenSubida) {
        this.imagenSubida = await this.subirImagen();
      }

      if (this.editando) {
        await this.guardarEdicion();
        return;
      }

      const creado: any = await this.service.createProduct(this.armarPayload()).toPromise();

      await Swal.fire({
        title: "Producto creado",
        text: `${this.formulario.get("titulo").value} quedó registrado con la referencia ${this.formulario.getRawValue().referencia}.`,
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "Registrar otro",
        cancelButtonText: "Ir al listado",
      }).then((r) => {
        if (r.isConfirmed) {
          this.limpiar();
        } else {
          this.router.navigate(["/productos"]);
        }
      });

      // El consecutivo avanzó: hay que pedirlo de nuevo o el siguiente producto
      // nacería con la misma referencia y el backend la cambiaría en silencio.
      this.totalProductos += 1;
      if (!this.referenciaManual) {
        this.formulario.get("referencia").setValue(this.construirReferencia());
      }
      console.log("[ProductoLite] creado", creado?.cd);
    } catch (e: any) {
      console.error("[ProductoLite] Error creando el producto", e);
      Swal.fire(
        "No se pudo crear el producto",
        e?.error?.msg || e?.error?.error || e?.message || "Intente nuevamente en unos momentos.",
        "error",
      );
    } finally {
      this.guardando = false;
      this.progresoImagen = 0;
    }
  }

  private referenciaEstaLibre(): Promise<boolean> {
    const referencia = this.formulario.getRawValue().referencia;
    return new Promise((resolve) => {
      this.service.checkReferenciaUnica(referencia).subscribe({
        next: (r: any) => {
          // El backend responde `{ success, exists, referencia }` — la llave es
          // `exists`, en inglés, igual que la lee el formulario completo.
          const libre = !r?.exists;
          if (!libre) {
            Swal.fire(
              "La referencia ya está en uso",
              `Ya existe un producto con la referencia ${referencia} en esta empresa. Ingrese una diferente.`,
              "warning",
            );
          }
          resolve(!!libre);
        },
        // Si la verificación falla, no se bloquea el guardado: el backend
        // vuelve a validar y en el peor caso genera una referencia nueva.
        error: () => resolve(true),
      });
    });
  }

  /**
   * Guarda una edición SIN tocar lo que esta pantalla no muestra.
   *
   * El backend fusiona por el primer nivel, así que solo se envían las llaves
   * que cambian — y cada una completa, partiendo de lo que ya tenía el
   * producto. Las dimensiones, las ciudades, el proceso comercial y los precios
   * por volumen ni se mencionan: se conservan intactos.
   *
   * Disponibilidad, exposición y canales de venta SÍ viajan, ahora que se
   * pueden editar desde acá — pero también partiendo del original, para no
   * perder las llaves que esta pantalla no muestra (`posicion`, `etiquetas`,
   * `destacado`, `cantidadDisponible`…).
   */
  private async guardarEdicion(): Promise<void> {
    const payload = this.armarPayloadEdicion();

    await this.service.editProductByReference(payload).toPromise();

    await Swal.fire({
      title: "Cambios guardados",
      text: `${this.formulario.getRawValue().titulo} quedó actualizado.`,
      icon: "success",
      confirmButtonText: "Ir al listado",
    });
    this.salirDeEdicion();
    this.router.navigate(["/productos"]);
  }

  /**
   * Arma el payload de EDICIÓN sin enviarlo.
   *
   * Está separado del guardado porque la vista previa necesita exactamente el
   * mismo objeto: si lo armara por su cuenta, mostraría un producto que no es
   * el que se va a guardar y la previa dejaría de servir para revisar.
   */
  private armarPayloadEdicion(): any {
    const v = this.formulario.getRawValue();
    const orig = this.productoOriginal;

    const precioSinIva = Number(v.precioSinIva) || 0;
    const porcentajeIva = Number(v.porcentajeIva) || 0;
    const montoIva = precioSinIva * (porcentajeIva / 100);

    // Tres casos distintos, y el del medio es el que faltaba:
    //  - eligió una nueva  -> se reemplaza
    //  - la quitó          -> se manda VACÍO, que es lo que la borra
    //  - no tocó nada      -> se conserva la que ya tenía
    const imagenes = this.imagenSubida
      ? [{
          urls: this.imagenSubida.url,
          nombreImagen: this.archivo?.name || "",
          path: this.imagenSubida.path,
          tipo: "principal",
        }]
      : this.imagenEliminada
        ? []
        : orig?.crearProducto?.imagenesPrincipales || [];

    const payload: any = {
      cd: orig.cd,
      crearProducto: {
        ...(orig.crearProducto || {}),
        titulo: v.titulo?.trim(),
        descripcion: v.descripcion?.trim() || "",
        imagenesPrincipales: imagenes,
      },
      precio: {
        ...(orig.precio || {}),
        precioUnitarioSinIva: precioSinIva,
        precioUnitarioIva: String(porcentajeIva),
        valorIva: montoIva,
        precioUnitarioConIva: precioSinIva + montoIva,
      },
      identificacion: {
        ...(orig.identificacion || {}),
        marca: v.marca?.trim() || "",
        codigoBarras: v.codigoBarras?.trim() || orig?.identificacion?.codigoBarras || "",
      },
      disponibilidad: {
        ...(orig.disponibilidad || {}),
        tipoEntrega: v.tipoEntrega || "",
        // Un `tiempoEntrega` legacy (un número de días) que el maestro no supo
        // traducir deja el <select> vacío. Mandarlo así BORRARÍA el dato, así
        // que en ese caso se conserva el que ya tenía el producto.
        tiempoEntrega: v.tiempoEntrega || orig?.disponibilidad?.tiempoEntrega || "",
        cantidadMinVenta: Number(v.cantidadMinVenta) || 1,
        inventarioSeguridad: Number(v.inventarioSeguridad) || 0,
        inventariable: !!v.inventariable,
      },
      exposicion: {
        ...(orig.exposicion || {}),
        activar: !!v.activar,
      },
      marketplace: {
        ...(orig.marketplace || {}),
        sellerCenter: !!v.sellerCenter,
        paginaWeb: !!v.paginaWeb,
        puntoDeVenta: !!v.puntoDeVenta,
      },
    };

    // La categoría solo viaja si el usuario eligió una; si no, se conserva.
    if (v.categoria) {
      payload.categorias = stringify(v.categoria);
    }

    // Los marketplaces solo se reemplazan si la empresa tiene alguno
    // configurado. Con la lista vacía se mandaría `campos: []` y se borrarían
    // los canales que el producto ya tuviera guardados.
    if (this.marketplaces.length) {
      payload.marketplace.campos = this.marketplaces;
    }

    return payload;
  }

  private salirDeEdicion(): void {
    sessionStorage.removeItem(CrearProductoLiteComponent.LLAVE_EDICION);
  }

  cancelarEdicion(): void {
    this.salirDeEdicion();
    this.router.navigate(["/productos"]);
  }

  /**
   * Arma el producto COMPLETO a partir de lo que se llenó en pantalla.
   *
   * La estructura tiene que venir entera aunque casi todo vaya vacío: el
   * backend lee `crearProducto.titulo`, `precio.precioUnitarioConIva`,
   * `exposicion.etiquetas.join()` e `identificacion.referencia` sin protegerse,
   * así que si falta alguno de esos objetos el create revienta con un 500 crudo.
   *
   * ── OBSERVACIÓN: cómo se llenan los campos que esta pantalla NO muestra ───
   *
   * Quien entra por la creación rápida es porque no necesita el formulario
   * largo, pero el producto igual se guarda con TODAS las llaves. Los valores
   * de abajo son los mismos de `PRODUCT_DEFAULTS` en
   * `shared/components/import-modal/import-modal.component.ts`, que llevan
   * meses creando productos que funcionan en producción. **Esa paridad es
   * intencional: un producto creado acá y uno importado por Excel deben quedar
   * idénticos por dentro.** Si algún día cambia uno, hay que cambiar el otro.
   *
   * La regla al elegir un valor por defecto es una sola: **vacío ("") no es lo
   * mismo que cero.** El vacío dice "no se sabe" y el sistema lo respeta; el
   * cero es un DATO y se usa para calcular. Por eso las dimensiones y el peso
   * van en "" y no en 0 — un peso 0 cotiza mal el flete y el problema aparece
   * semanas después sin que nadie lo relacione con esta pantalla.
   *
   * Las que sí son de cuidado, y por qué se dejan como se dejan:
   *
   *  - `identificacion.referencia`: es el consecutivo de la empresa y debe ser
   *    ÚNICA. `inventory` guarda espejos legacy con `productoId = referencia`,
   *    así que una referencia repetida o cambiada después deja inventario
   *    huérfano. Nunca se inventa ni se autogenera dos veces.
   *  - `disponibilidad.cantidadDisponible`: queda en 0 A PROPÓSITO. El stock se
   *    gestiona desde /inventario/inventario-catalogo; sembrarlo desde acá
   *    crearía existencias que nadie contó.
   *  - `precio.precioUnitarioIva` es el PORCENTAJE y `precio.valorIva` el MONTO
   *    en pesos. Los nombres están al revés de lo que parecen y así los lee
   *    `orderCalculationService.js`. Invertirlos cobra mal el IVA.
   *  - `exposicion.activar` + `exposicion.disponible`: son los dos que decide el
   *    mapper de Shopify para publicar ACTIVE o DRAFT
   *    (`services/shopify/mappers/product.js`). `activar` sale de la casilla
   *    "Activar" de esta pantalla; `disponible` entra en true.
   *  - `preciosVolumen: []`: vacío, no un rango de una unidad. Al vender, el
   *    rango de volumen LE GANA al precio unitario, así que un rango inventado
   *    cambiaría lo que paga el cliente.
   *  - `ciudades.coberturaNacional*`: en true, que es "vendo a todo el país" —
   *    lo más permisivo. Restringir sin que nadie lo pida escondería el
   *    producto en ciudades donde sí se vende.
   *
   * Lo que NO se rellena queda VACÍO y se completa cuando haga falta en el
   * formulario largo. No se inventan datos de relleno.
   */
  private armarPayload(): any {
    const v = this.formulario.getRawValue();

    const precioSinIva = Number(v.precioSinIva) || 0;
    const porcentajeIva = Number(v.porcentajeIva) || 0;
    // OJO con los nombres, están al revés de lo que parecen:
    //   `precioUnitarioIva` = PORCENTAJE (así lo lee orderCalculationService.js)
    //   `valorIva`          = MONTO en pesos
    const montoIva = precioSinIva * (porcentajeIva / 100);

    const hoy = new Date();
    const enUnAnio = new Date(new Date().setFullYear(hoy.getFullYear() + 1));
    const aFecha = (d: Date) => d.toISOString().split("T")[0];

    const imagenes = this.imagenSubida
      ? [{
          urls: this.imagenSubida.url,
          nombreImagen: this.archivo?.name || "",
          path: this.imagenSubida.path,
          tipo: "principal",
        }]
      : [];

    return {
      crearProducto: {
        titulo: v.titulo?.trim(),
        descripcion: v.descripcion?.trim() || "",
        fechaInicial: aFecha(hoy),
        fechaFinal: aFecha(enUnAnio),
        caracAdicionales: "",
        garantiasProducto: "",
        restriccionesProducto: "",
        cuidadoConsumo: "",
        imagenesPrincipales: imagenes,
        imagenesSecundarias: [],
        paraProduccion: false,
      },
      precio: {
        precioUnitarioSinIva: precioSinIva,
        precioUnitarioIva: String(porcentajeIva),
        valorIva: montoIva,
        precioUnitarioConIva: precioSinIva + montoIva,
        precioPorVolumenSinIva: "",
        precioIvaPorVolumen: "",
        precioTotalVolumenConIva: "",
        preciosVolumen: [],
      },
      // Vacías, NO en cero: el cero es un dato y se usaría para cotizar flete.
      dimensiones: {
        largoProductoCm: "",
        altoProductoCm: "",
        anchoProductoCm: "",
        pesoUnitarioProductoKg: "",
      },
      disponibilidad: {
        tipoEntrega: v.tipoEntrega || "",
        tiempoEntrega: v.tiempoEntrega || "",
        // No se pide: el stock se gestiona desde /inventario/inventario-catalogo.
        cantidadDisponible: 0,
        cantidadMinVenta: Number(v.cantidadMinVenta) || 1,
        inventarioSeguridad: Number(v.inventarioSeguridad) || 0,
        inventariable: !!v.inventariable,
      },
      identificacion: {
        referencia: v.referencia,
        tipoProducto: "propio",
        tipoReferencia: this.referenciaManual ? "externo" : "propio",
        // Cuando no lo escriben, el formulario completo copia la referencia acá.
        // Solo importa de verdad para quien escanea productos de reventa.
        codigoBarras: v.codigoBarras?.trim() || v.referencia,
        marca: v.marca?.trim() || "",
      },
      exposicion: {
        activar: !!v.activar,
        posicion: 0,
        disponible: true,
        recomendado: false,
        destacado: false,
        oferta: false,
        nuevo: true,
        masvendido: false,
        etiquetas: [],
      },
      categorias: stringify(v.categoria),
      procesoComercial: {
        aceptaOcasion: false,
        ocasion: [],
        aceptaGenero: false,
        genero: [],
        generoMap: null,
        ocasionesMap: null,
        aceptaComentarios: false,
        aceptaColorDecoracion: false,
        colorDecoracion: [],
        llevaTarjeta: false,
        llevaArchivo: false,
        aceptaVariable: false,
        aceptaAdiciones: false,
        pago: [],
        variablesForm: "",
        llevaCalendario: false,
        configProcesoComercialActivo: false,
      },
      marketplace: {
        campos: this.marketplaces,
        sellerCenter: !!v.sellerCenter,
        paginaWeb: !!v.paginaWeb,
        puntoDeVenta: !!v.puntoDeVenta,
      },
      ciudades: {
        ciudadesOrigen: [],
        ciudadesEntrega: [],
        coberturaNacionalOrigen: true,
        coberturaNacionalEntrega: true,
      },
      dropshippingConfig: { enabled: false },
      otrosProcesos: {
        modulosfijos: [],
        modulosVariables: { produccion: [] },
        moduloComplementarios: [],
      },
      kaiForm: [],
    };
  }

  private limpiar(): void {
    this.quitarImagen();
    this.imagenActual = null;
    this.imagenEliminada = false;
    this.formulario.reset({
      titulo: "",
      descripcion: "",
      precioSinIva: null,
      porcentajeIva: 19,
      categoria: null,
      tipoEntrega: "",
      tiempoEntrega: "",
      cantidadMinVenta: 1,
      inventarioSeguridad: 0,
      inventariable: true,
      referencia: this.referenciaManual ? "" : this.construirReferencia(),
      marca: "",
      codigoBarras: "",
      activar: true,
      sellerCenter: true,
      paginaWeb: true,
      puntoDeVenta: true,
    });
    this.marketplaces.forEach((c) => { c.activo = false; });
    if (!this.referenciaManual) {
      this.formulario.get("referencia").disable();
    }
  }

  /**
   * Lleva al importador masivo, que vive en el LISTADO de productos.
   *
   * No se monta una segunda copia acá a propósito: el importador ya define el
   * mapeo de columnas, la plantilla descargable y los valores por defecto
   * (`PRODUCT_DEFAULTS`) que esta pantalla espeja en `armarPayload()`. Tenerlo
   * dos veces sería tener dos sitios donde mantener lo mismo, y el día que
   * cambie uno se desincroniza del otro en silencio.
   *
   * El listado lo abre solo al ver `abrirImportador=productos` y consume el
   * parámetro; es el mismo handshake que ya usaba el onboarding.
   */
  irAlImportador(): void {
    this.salirDeEdicion();
    this.router.navigate(["/productos"], { queryParams: { abrirImportador: "productos" } });
  }

  /**
   * Lleva al formulario de siempre. No es otro producto ni otro flujo: es la
   * misma pantalla completa, para terminar de llenar lo que acá no se pide.
   */
  irAFormularioCompleto(): void {
    // `infoForms` es la llave con la que `crear-productos` decide si edita o
    // crea. Editando se le pasa el producto para que abra en el mismo; creando
    // se limpia para que abra en blanco.
    if (this.editando) {
      sessionStorage.setItem("infoForms", JSON.stringify(this.productoOriginal));
    } else {
      sessionStorage.removeItem("infoForms");
    }
    this.salirDeEdicion();
    this.router.navigate(["/productos/crearProductos"]);
  }
}
