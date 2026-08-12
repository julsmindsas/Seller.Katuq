import { Component, HostListener, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { environment } from "../../../../environments/environment";
import { BloqueSitio } from "../../sitio-render/sitio-render.component";
import { ContenidoSitio, Sitio, SitiosService } from "../sitios.service";
import { BodegaService } from "../../../shared/services/bodegas/bodega.service";

/** Tipos de bloque que se pueden agregar, con su nombre en cristiano. */
const CATALOGO_BLOQUES: { tipo: string; nombre: string; descripcion: string }[] = [
  { tipo: "hero", nombre: "Banner principal", descripcion: "Imagen grande con título y botón" },
  { tipo: "texto", nombre: "Texto", descripcion: "Un título y un párrafo" },
  { tipo: "galeria", nombre: "Galería", descripcion: "Varias fotos en cuadrícula" },
  { tipo: "productos", nombre: "Productos", descripcion: "Productos de tu catálogo, con precio actual" },
  { tipo: "whatsapp", nombre: "Botón de WhatsApp", descripcion: "Para que te escriban directo" },
  { tipo: "formulario", nombre: "Formulario", descripcion: "Pide nombre y contacto; los leads llegan a tu CRM" },
  { tipo: "faq", nombre: "Preguntas frecuentes", descripcion: "Lista de preguntas y respuestas" },
  { tipo: "footer", nombre: "Pie de página", descripcion: "Datos del negocio y enlaces" },
];

/** Valores iniciales de un bloque recién agregado. */
const BLOQUE_NUEVO: { [tipo: string]: any } = {
  hero: { titulo: "Título principal", subtitulo: "", ctaTexto: "", ctaUrl: "", alineacion: "centro", imagen: "" },
  texto: { titulo: "Título", cuerpo: "Escribe aquí." },
  galeria: { titulo: "Galería", imagenes: [] },
  productos: { titulo: "Productos destacados", productoIds: [], permitirCompra: false },
  whatsapp: { telefono: "", mensaje: "Hola, quiero más información", etiqueta: "Escríbenos por WhatsApp" },
  formulario: {
    titulo: "Déjanos tus datos",
    descripcion: "",
    pedirTelefono: true,
    pedirEmail: true,
    pedirMensaje: true,
    textoBoton: "Enviar",
  },
  faq: { titulo: "Preguntas frecuentes", preguntas: [{ pregunta: "¿Pregunta?", respuesta: "Respuesta." }] },
  footer: { texto: "", mostrarRedes: true, enlaces: [] },
};

/**
 * Editor visual de un sitio.
 *
 * Se trabaja siempre sobre el borrador; publicar es un acto aparte, explícito,
 * que copia el borrador a la versión que ve el público. Eso permite dejar algo
 * a medias sin romper la página que ya está en línea.
 *
 * La vista previa usa `app-sitio-render`, el mismo componente de la página
 * pública: lo que se ve editando es lo que se publica.
 */
@Component({
  selector: "app-sitio-editor",
  templateUrl: "./sitio-editor.component.html",
  styleUrls: ["./sitio-editor.component.scss"],
})
export class SitioEditorComponent implements OnInit {
  cargando = true;
  guardando = false;
  publicando = false;
  subiendo = false;
  error: string | null = null;

  sitio: Sitio | null = null;
  contenido: ContenidoSitio | null = null;

  /** Índice del bloque en edición. -1 = ninguno. */
  seleccionado = -1;
  dispositivo: "escritorio" | "movil" = "escritorio";
  panel: "bloques" | "diseno" | "tienda" | "ajustes" = "bloques";

  /** Bodegas del comercio, para el selector de despacho de la tienda. */
  bodegas: { codigo: string; nombre: string }[] = [];
  cargandoBodegas = false;
  mostrandoAgregar = false;
  mostrandoSelector = false;

  catalogoBloques = CATALOGO_BLOQUES;

  /** Hay cambios sin guardar. Se usa para avisar antes de publicar. */
  sucio = false;

  /** Bloques con los productos ya resueltos, solo para la vista previa. */
  bloquesPrevia: BloqueSitio[] = [];
  private productosPrevia = new Map<string, any>();

  // Campos de ajustes
  nombre = "";
  slug = "";
  slugMensaje: string | null = null;
  slugValido = true;

  private id = "";

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: SitiosService,
    private bodegaService: BodegaService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get("id") || "";
    if (!this.id) {
      this.cargando = false;
      this.error = "No encontramos esta página.";
      return;
    }

    this.service.obtener(this.id).subscribe({
      next: (res) => {
        this.cargando = false;
        if (!res || !res.success || !res.data) {
          this.error = "No encontramos esta página.";
          return;
        }
        this.sitio = res.data;
        this.contenido = this.completar(res.data.draft);
        this.nombre = res.data.nombre;
        this.slug = res.data.slug;
        this.resolverProductosDePrevia();
      },
      error: () => {
        this.cargando = false;
        this.error = "No encontramos esta página.";
      },
    });
  }

  /**
   * Rellena lo que pueda faltar en un borrador. Un sitio creado antes de que
   * existiera alguna parte del contenido llegaría sin ella, y el panel de
   * ajustes explotaría al enlazar `seo.titulo`.
   */
  private completar(draft: any): ContenidoSitio {
    const d = draft || {};
    const envio = (d.tienda && d.tienda.envio) || {};
    return {
      bloques: Array.isArray(d.bloques) ? d.bloques : [],
      tema: d.tema || {
        colorPrimario: "#111111",
        colorSecundario: "#ffffff",
        colorTexto: "#222222",
        tipografia: "sistema",
      },
      seo: d.seo || { titulo: "", descripcion: "", imagen: "" },
      // Un sitio creado antes de que existiera la tienda llega sin esto. Nace
      // apagada: nadie empieza a vender porque se desplegó una versión nueva.
      tienda: {
        habilitada: (d.tienda && d.tienda.habilitada) === true,
        bodegaId: (d.tienda && d.tienda.bodegaId) || "",
        envio: {
          costo: Number(envio.costo) || 0,
          gratisDesde: Number(envio.gratisDesde) || 0,
          texto: envio.texto || "",
        },
        pagoEnLinea: (d.tienda && d.tienda.pagoEnLinea) !== false,
        contraEntrega: (d.tienda && d.tienda.contraEntrega) === true,
        minimoCompra: Number(d.tienda && d.tienda.minimoCompra) || 0,
        mensajeConfirmacion: (d.tienda && d.tienda.mensajeConfirmacion) || "",
      },
      analitica: {
        ga4: (d.analitica && d.analitica.ga4) || "",
        googleAds: (d.analitica && d.analitica.googleAds) || "",
        googleAdsConversion: (d.analitica && d.analitica.googleAdsConversion) || "",
        metaPixel: (d.analitica && d.analitica.metaPixel) || "",
        gtm: (d.analitica && d.analitica.gtm) || "",
      },
    };
  }

  /**
   * Bodegas del comercio, para elegir de dónde se despacha lo que se venda.
   * Se cargan al abrir el panel de tienda, no al entrar al editor: la mayoría
   * de las páginas son landings y no necesitan esta consulta.
   */
  cargarBodegas(): void {
    if (this.bodegas.length || this.cargandoBodegas) return;
    this.cargandoBodegas = true;
    this.bodegaService.getBodegas().subscribe({
      next: (lista: any[]) => {
        this.cargandoBodegas = false;
        // `idBodega` es el código de negocio ("BOD-001"), que es lo que espera
        // inventario. El id de Firestore aquí generaría movimientos huérfanos.
        this.bodegas = (lista || [])
          .filter((b) => b && (b.idBodega || b.codigo))
          .map((b) => ({
            codigo: b.idBodega || b.codigo,
            // La colección es `warehouses`; el nombre viene en `nombre`.
            nombre: b.nombre || b.name || b.idBodega || b.codigo,
          }));
      },
      error: () => {
        this.cargandoBodegas = false;
        this.toastr.error("No pudimos cargar tus bodegas.");
      },
    });
  }

  /**
   * ¿La tienda quedaría a medias? Se avisa antes de publicar, porque una tienda
   * encendida sin bodega rechaza los pedidos y el comerciante no se entera
   * hasta que un cliente se queja.
   */
  get avisoTienda(): string | null {
    const t = this.contenido && this.contenido.tienda;
    if (!t || !t.habilitada) return null;
    if (!t.bodegaId) return "Elige la bodega desde donde despachas: sin ella la tienda no recibe pedidos.";
    const hayCompra = this.bloques.some(
      (b) => b.tipo === "productos" && b.datos && b.datos.permitirCompra === true
    );
    if (!hayCompra) {
      return "Ningún bloque de productos tiene la compra activada, así que no se puede comprar nada.";
    }
    return null;
  }

  get bloques(): BloqueSitio[] {
    return (this.contenido && this.contenido.bloques) || [];
  }

  get bloqueActual(): BloqueSitio | null {
    return this.seleccionado >= 0 ? this.bloques[this.seleccionado] || null : null;
  }

  get idBloqueActivo(): string | null {
    return this.bloqueActual ? this.bloqueActual.id : null;
  }

  nombreDeTipo(tipo: string): string {
    const encontrado = CATALOGO_BLOQUES.find((b) => b.tipo === tipo);
    return encontrado ? encontrado.nombre : tipo;
  }

  seleccionar(indice: number): void {
    this.seleccionado = indice;
    this.panel = "bloques";
  }

  seleccionarPorId(bloqueId: string): void {
    const i = this.bloques.findIndex((b) => b.id === bloqueId);
    if (i >= 0) this.seleccionar(i);
  }

  // ── Operaciones sobre bloques ──────────────────────────────────────────────

  agregar(tipo: string): void {
    if (!this.contenido) return;
    const datos = JSON.parse(JSON.stringify(BLOQUE_NUEVO[tipo] || {}));
    // El id local solo sirve para identificar el bloque en pantalla; el backend
    // lo normaliza al guardar.
    const id = `b_${Date.now()}_${tipo}`;
    this.contenido.bloques = [...this.bloques, { id, tipo, visible: true, datos }];
    this.seleccionado = this.contenido.bloques.length - 1;
    this.mostrandoAgregar = false;
    this.marcarSucio();
  }

  duplicar(i: number): void {
    if (!this.contenido) return;
    const copia = JSON.parse(JSON.stringify(this.bloques[i]));
    copia.id = `b_${Date.now()}_${copia.tipo}`;
    const nuevos = [...this.bloques];
    nuevos.splice(i + 1, 0, copia);
    this.contenido.bloques = nuevos;
    this.seleccionado = i + 1;
    this.marcarSucio();
  }

  eliminar(i: number): void {
    if (!this.contenido) return;
    const nuevos = [...this.bloques];
    nuevos.splice(i, 1);
    this.contenido.bloques = nuevos;
    if (this.seleccionado === i) this.seleccionado = -1;
    else if (this.seleccionado > i) this.seleccionado--;
    this.marcarSucio();
  }

  mover(i: number, direccion: -1 | 1): void {
    if (!this.contenido) return;
    const destino = i + direccion;
    if (destino < 0 || destino >= this.bloques.length) return;
    const nuevos = [...this.bloques];
    [nuevos[i], nuevos[destino]] = [nuevos[destino], nuevos[i]];
    this.contenido.bloques = nuevos;
    if (this.seleccionado === i) this.seleccionado = destino;
    this.marcarSucio();
  }

  alternarVisible(i: number): void {
    if (!this.contenido) return;
    const nuevos = [...this.bloques];
    nuevos[i] = { ...nuevos[i], visible: nuevos[i].visible === false };
    this.contenido.bloques = nuevos;
    this.marcarSucio();
  }

  // ── Campos con forma propia ────────────────────────────────────────────────

  /**
   * Teléfono y correo no se pueden apagar los dos.
   *
   * Sin ninguno de los dos queda un formulario que pide el nombre y rechaza el
   * envío pidiendo "un teléfono o un correo", sin campo donde escribirlos: el
   * visitante llena, manda y no pasa nada. Se vuelve a encender el que se acaba
   * de apagar y se explica por qué.
   */
  alCambiarCampoContacto(campo: "pedirTelefono" | "pedirEmail"): void {
    const b = this.bloqueActual;
    if (!b) return;
    if (!b.datos.pedirTelefono && !b.datos.pedirEmail) {
      b.datos[campo] = true;
      this.toastr.info(
        "Necesitas pedir al menos un teléfono o un correo, o no habría forma de responderle a quien te escriba.",
        "Ese campo tiene que quedar"
      );
    }
    this.marcarSucio();
  }

  agregarPregunta(): void {
    const b = this.bloqueActual;
    if (!b) return;
    b.datos.preguntas = [...(b.datos.preguntas || []), { pregunta: "", respuesta: "" }];
    this.marcarSucio();
  }

  quitarPregunta(i: number): void {
    const b = this.bloqueActual;
    if (!b) return;
    b.datos.preguntas.splice(i, 1);
    this.marcarSucio();
  }

  agregarEnlace(): void {
    const b = this.bloqueActual;
    if (!b) return;
    b.datos.enlaces = [...(b.datos.enlaces || []), { etiqueta: "", url: "" }];
    this.marcarSucio();
  }

  quitarEnlace(i: number): void {
    const b = this.bloqueActual;
    if (!b) return;
    b.datos.enlaces.splice(i, 1);
    this.marcarSucio();
  }

  quitarImagenGaleria(i: number): void {
    const b = this.bloqueActual;
    if (!b) return;
    b.datos.imagenes.splice(i, 1);
    this.marcarSucio();
  }

  // ── Selector de productos ──────────────────────────────────────────────────

  abrirSelector(): void {
    if (!this.bloqueActual) return;
    this.mostrandoSelector = true;
  }

  /** Los ids llegan ya en el orden en que el comerciante quiere mostrarlos. */
  aplicarProductos(ids: string[]): void {
    const b = this.bloqueActual;
    if (b) {
      b.datos.productoIds = ids;
      this.marcarSucio();
      this.resolverProductosDePrevia();
    }
    this.mostrandoSelector = false;
  }

  /**
   * Trae los productos elegidos para que la vista previa los muestre con foto y
   * precio, en vez de un "3 productos seleccionados".
   *
   * Es solo para ver: al guardar se manda `productoIds`, nunca estos datos. El
   * precio real lo resuelve el servidor al servir la página pública.
   */
  private resolverProductosDePrevia(): void {
    const ids = [
      ...new Set(
        this.bloques
          .filter((b) => b.tipo === "productos")
          .flatMap((b) => b.datos.productoIds || [])
      ),
    ] as string[];

    if (!ids.length) {
      this.productosPrevia.clear();
      this.recalcularPrevia();
      return;
    }

    this.service.productosPorIds(ids).subscribe({
      next: (res) => {
        this.productosPrevia.clear();
        for (const p of res.products || []) {
          const crear = p.crearProducto || {};
          const disp = p.disponibilidad || {};
          this.productosPrevia.set(p.cd, {
            productoId: p.cd,
            titulo: crear.titulo || "Producto",
            imagen: this.primeraImagen(crear),
            precioConIva: Number((p.precio || {}).precioUnitarioConIva || 0),
            disponible: disp.inventariable === false ? true : Number(disp.cantidadDisponible || 0) > 0,
          });
        }
        this.recalcularPrevia();
      },
      // Si falla, la previa cae al conteo: no vale la pena molestar al usuario.
      error: () => this.recalcularPrevia(),
    });
  }

  private primeraImagen(crear: any): string | null {
    const candidatas = [...(crear.imagenesPrincipales || []), ...(crear.imagenesSecundarias || [])];
    for (const img of candidatas) {
      const ruta = typeof img === "string" ? img : img && img.urls;
      if (!ruta || typeof ruta !== "string" || !ruta.trim()) continue;
      const limpia = ruta.trim();
      if (/^https?:\/\//i.test(limpia) || limpia.startsWith("data:") || limpia.startsWith("//")) {
        return limpia;
      }
      return `https://images2.guiacereza.com${limpia.startsWith("/") ? "" : "/"}${limpia}`;
    }
    return null;
  }

  /**
   * Bloques que se le pasan al render. Son los mismos del borrador, salvo los
   * de producto, que se clonan para inyectarles los productos resueltos —
   * el borrador nunca se contamina con esos datos.
   */
  private recalcularPrevia(): void {
    this.bloquesPrevia = this.bloques.map((b) => {
      if (b.tipo !== "productos") return b;
      const productos = (b.datos.productoIds || [])
        .map((id: string) => this.productosPrevia.get(id))
        .filter(Boolean)
        // Igual que en la página pública: los agotados no se muestran.
        .filter((p: any) => p.disponible);
      return { ...b, datos: { ...b.datos, productos } };
    });
  }

  // ── Imágenes ───────────────────────────────────────────────────────────────

  subirImagen(evento: Event, destino: "hero" | "galeria" | "seo"): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files && input.files[0];
    if (!archivo) return;

    this.subiendo = true;
    this.service.subirImagen(archivo).subscribe({
      next: (res) => {
        this.subiendo = false;
        input.value = "";
        if (!res || !res.success || !res.url) {
          this.toastr.error((res && res.error) || "No pudimos subir la imagen.");
          return;
        }
        if (destino === "seo" && this.contenido) {
          this.contenido.seo.imagen = res.url;
        } else {
          const b = this.bloqueActual;
          if (!b) return;
          if (destino === "hero") b.datos.imagen = res.url;
          if (destino === "galeria") b.datos.imagenes = [...(b.datos.imagenes || []), { url: res.url, alt: "" }];
        }
        this.marcarSucio();
      },
      error: (e) => {
        this.subiendo = false;
        input.value = "";
        this.toastr.error((e && e.error && e.error.error) || "No pudimos subir la imagen.");
      },
    });
  }

  // ── Guardar y publicar ─────────────────────────────────────────────────────

  /**
   * Cualquier cambio del editor pasa por aquí: marca que hay trabajo sin
   * guardar y refresca lo que ve la vista previa.
   */
  marcarSucio(): void {
    this.sucio = true;
    this.recalcularPrevia();
  }

  comprobarSlug(): void {
    const slug = this.slug.trim();
    if (!slug) {
      this.slugValido = false;
      this.slugMensaje = "La dirección no puede quedar vacía.";
      return;
    }
    this.service.slugDisponible(slug, this.id).subscribe({
      next: (res) => {
        const d = res && res.data;
        this.slugValido = !!(d && d.disponible);
        this.slug = (d && d.slug) || slug;
        this.slugMensaje = this.slugValido ? "Disponible" : (d && d.motivo) || "No está disponible";
      },
      error: () => {
        this.slugMensaje = null;
      },
    });
  }

  guardar(alPublicar = false): void {
    if (!this.contenido || this.guardando) return;
    if (!this.slugValido) {
      this.toastr.warning("Corrige la dirección antes de guardar.");
      return;
    }

    this.guardando = true;
    this.service
      .guardar({
        id: this.id,
        nombre: this.nombre.trim(),
        slug: this.slug.trim(),
        contenido: this.contenido,
      })
      .subscribe({
        next: (res) => {
          this.guardando = false;
          if (!res || !res.success) {
            this.toastr.error((res && res.message) || "No pudimos guardar.");
            return;
          }
          this.sucio = false;
          this.aplicarLoGuardado(res.data);
          if (res.avisos) this.toastr.info(res.avisos);
          if (!alPublicar) this.toastr.success("Cambios guardados");
          if (alPublicar) this.publicarAhora();
        },
        error: (e) => {
          this.guardando = false;
          this.toastr.error((e && e.error && e.error.message) || "No pudimos guardar.");
        },
      });
  }

  /**
   * Refleja lo que el servidor guardó de verdad.
   *
   * Al guardar, el backend descarta lo que no pasa el saneador: una dirección
   * escrita como `www.mitienda.com` (sin `https://`) se va a vacío, y un
   * WhatsApp de menos de siete dígitos también. Antes el editor seguía
   * mostrándolos puestos y el comerciante publicaba convencido de que el botón
   * estaba ahí. Ahora se ve lo que quedó, y se avisa qué se cayó.
   */
  private aplicarLoGuardado(
    data: { nombre: string; slug: string; draft: ContenidoSitio } | undefined
  ): void {
    if (!data || !data.draft) return;

    const perdidos = this.camposPerdidos(this.contenido, data.draft);

    this.contenido = this.completar(data.draft);
    if (data.slug) this.slug = data.slug;
    if (data.nombre) this.nombre = data.nombre;
    if (this.sitio) {
      this.sitio.slug = data.slug || this.sitio.slug;
      this.sitio.nombre = data.nombre || this.sitio.nombre;
    }
    this.resolverProductosDePrevia();

    if (perdidos.length) {
      this.toastr.warning(
        perdidos.join(". ") + ".",
        "Revisa estos campos: no quedaron guardados",
        { timeOut: 9000, closeButton: true }
      );
    }
  }

  /**
   * Compara lo que se mandó contra lo que volvió y arma el aviso. Solo mira los
   * campos donde el saneador puede vaciar algo sin que se note: direcciones y
   * teléfonos.
   */
  private camposPerdidos(antes: ContenidoSitio | null, despues: ContenidoSitio): string[] {
    if (!antes) return [];
    const avisos: string[] = [];
    const nuevos = despues.bloques || [];

    (antes.bloques || []).forEach((bloque, i) => {
      const guardado = nuevos[i];
      if (!guardado || guardado.tipo !== bloque.tipo) return;

      const enviado = bloque.datos || {};
      const quedo = guardado.datos || {};

      if (bloque.tipo === "hero" && enviado.ctaUrl && !quedo.ctaUrl) {
        avisos.push(
          `El destino del botón del banner ("${enviado.ctaUrl}") no es una dirección válida; ` +
            "escríbela completa, con https://, o usa #productos"
        );
      }
      if (bloque.tipo === "whatsapp" && enviado.telefono && !quedo.telefono) {
        avisos.push(
          `El número de WhatsApp ("${enviado.telefono}") no sirve; ponlo con indicativo, ` +
            "solo dígitos (ej: 573001234567)"
        );
      }
      if (bloque.tipo === "footer") {
        const perdidos = (enviado.enlaces || []).length - (quedo.enlaces || []).length;
        if (perdidos > 0) {
          avisos.push(
            `${perdidos} enlace(s) del pie se descartaron: falta el nombre o la dirección no es válida`
          );
        }
      }
    });

    return avisos;
  }

  /** Publicar guarda primero: nadie espera publicar una versión vieja. */
  publicar(): void {
    if (this.publicando) return;
    this.guardar(true);
  }

  private publicarAhora(): void {
    this.publicando = true;
    this.service.publicar(this.id).subscribe({
      next: (res) => {
        this.publicando = false;
        if (!res || !res.success) {
          this.toastr.error((res && res.message) || "No pudimos publicar.");
          return;
        }
        if (this.sitio) this.sitio.estado = "publicado";
        this.toastr.success("Tu página está en línea");
      },
      error: (e) => {
        this.publicando = false;
        this.toastr.error((e && e.error && e.error.message) || "No pudimos publicar.");
      },
    });
  }

  despublicar(): void {
    if (this.publicando) return;
    this.publicando = true;
    this.service.despublicar(this.id).subscribe({
      next: () => {
        this.publicando = false;
        if (this.sitio) this.sitio.estado = "borrador";
        this.toastr.info("Tu página ya no es visible");
      },
      error: () => {
        this.publicando = false;
        this.toastr.error("No pudimos despublicar.");
      },
    });
  }

  /**
   * Dirección pública de la página. Cada sitio se publica en su propio
   * subdominio (`flores-maria.katuq.com`), no en una ruta del panel: es el link
   * que el comerciante reparte por WhatsApp, y ahí el nombre importa.
   */
  get enlacePublico(): string {
    // El valor por defecto no sobra: los environments están en .gitignore, así
    // que una copia del repo compilada en otra máquina no trae `dominioSitios`
    // y el enlace saldría como "mi-tienda.undefined" sin que nada falle.
    return `https://${this.slug}.${environment.dominioSitios || "katuq.com"}`;
  }

  copiarEnlace(): void {
    navigator.clipboard.writeText(this.enlacePublico).then(
      () => this.toastr.success("Enlace copiado"),
      () => this.toastr.info(this.enlacePublico, "Copia el enlace")
    );
  }

  verPublicado(): void {
    window.open(this.enlacePublico, "_blank");
  }

  /**
   * Aviso del navegador al cerrar la pestaña o recargar con trabajo sin
   * guardar. El editor ya sabía que había cambios pendientes, pero no lo decía
   * en ningún lado: se cerraba la pestaña y se perdía la página a medio armar.
   */
  @HostListener("window:beforeunload", ["$event"])
  avisarAntesDeCerrar(evento: BeforeUnloadEvent): void {
    if (!this.sucio) return;
    evento.preventDefault();
    // Los navegadores muestran su propio texto; lo que importa es que el valor
    // no sea vacío para que aparezca el diálogo.
    evento.returnValue = "Tienes cambios sin guardar.";
  }

  volver(): void {
    if (this.sucio && !confirm("Tienes cambios sin guardar. ¿Salir y perderlos?")) return;
    this.router.navigate(["/sitios"]);
  }
}
