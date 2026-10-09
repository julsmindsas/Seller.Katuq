import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';

import { FichaDesdeFotoService } from '../../../shared/services/productos/ficha-desde-foto.service';
import { TiendaEnUnPasoService } from './tienda-en-un-paso.service';
import {
  AvanceTienda,
  ErroresFormulario,
  FormularioTienda,
  FotoDelFormulario,
  MAX_DESCRIPCION,
  MAX_FALLOS_SEGUIDOS,
  MAX_FOTOS,
  MAX_NOMBRE,
  MENSAJES,
  PasoVisible,
  ResumenFinal,
  construirSolicitud,
  debeSeguirConsultando,
  esperaAntesDeConsultar,
  etapaDelAvance,
  formatearPesos,
  huellaDelFormulario,
  mensajeDeError,
  nuevoRequestId,
  parsearPrecio,
  pasosDelAvance,
  resumenFinal,
  textoPlural,
  validarFormulario,
} from './tienda-en-un-paso.logic';

/** Las cuatro pantallas de una sola vista: cargando, el formulario, el avance y el resultado. */
type Fase = 'cargando' | 'formulario' | 'avance' | 'resultado';

/**
 * Tienda en minutos con IA, en UN solo paso (bandera `singleStepStore`).
 *
 * Una sola vista dentro de "Mis páginas": nombre del negocio, una frase de qué vende,
 * hasta 3 fotos con su precio y el botón "Crear mi tienda". Al tocarlo el servidor
 * responde al instante y el trabajo sigue en segundo plano; aquí se consulta su avance
 * cada pocos segundos y se muestra por pasos, en lenguaje de negocio. Al final: el enlace
 * de la tienda, o lo que falta para publicarla.
 *
 * Qué se garantiza desde aquí (el servidor vuelve a garantizarlo):
 *  - El precio SIEMPRE lo escribe la persona: sin precio no se manda la foto.
 *  - El mismo intento usa el mismo `requestId`: un doble clic o un reintento de red no
 *    duplica nada. Solo cambia cuando el servidor rechazó la solicitud (algo por corregir) o
 *    cuando la persona cambió el formulario desde el último intento (por ejemplo, corrigió un
 *    precio tras un error de red): con el mismo identificador el servidor reengancharía el
 *    trabajo viejo y el cambio se ignoraría.
 *  - Cerrar la ventana no cancela nada: el trabajo sigue y la tienda aparece en "Mis páginas".
 *  - Todo texto de error es para el comercio: qué pasó y qué hacer.
 *
 * Esto solo decide qué se MUESTRA. Quien manda sobre la función es el servidor
 * (`requireFeature('singleStepStore')`); quien decide cuándo mostrar este componente es
 * `SitiosListaComponent` con `CompanyFeaturesService.isEnabled('singleStepStore')`.
 */
@Component({
  selector: 'app-tienda-en-un-paso',
  templateUrl: './tienda-en-un-paso.component.html',
  styleUrls: ['./tienda-en-un-paso.component.scss'],
})
export class TiendaEnUnPasoComponent implements OnInit, OnDestroy {
  /** Un sitio de esta función que quedó sin terminar: se muestra su avance en vez del formulario. */
  @Input() sitioPendienteId = '';

  @Output() cerrar = new EventEmitter<void>();
  /** El trabajo terminó (publicado o en borrador) o se detuvo: la lista se refresca. */
  @Output() terminado = new EventEmitter<AvanceTienda>();

  readonly maxFotos = MAX_FOTOS;
  readonly maxNombre = MAX_NOMBRE;
  readonly maxDescripcion = MAX_DESCRIPCION;

  fase: Fase = 'formulario';
  formulario: FormularioTienda = { nombre: '', descripcion: '', fotos: [] };
  errores: ErroresFormulario = { fotos: {} };
  intentoDeEnvio = false;
  preparandoFotos = 0;
  avisoFotos = '';
  enviando = false;
  errorGeneral = '';

  avance: AvanceTienda | null = null;
  pasos: PasoVisible[] = [];
  resumen: ResumenFinal | null = null;
  avisoLargo = '';
  copiado = false;

  /** Se genera UNA vez por intento y se reusa en los reintentos (idempotencia). */
  private requestId = nuevoRequestId();
  /** La huella del formulario tal como se mandó la última vez; vacía si todavía no se mandó nada. */
  private huellaEnviada = '';
  private siteId = '';
  private secuencia = 0;
  private temporizador: any = null;
  private temporizadorCopiado: any = null;
  private suscripcion: Subscription | null = null;
  private inicioEspera = 0;
  private fallos = 0;
  private destruido = false;

  constructor(
    private servicio: TiendaEnUnPasoService,
    private fotos: FichaDesdeFotoService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    if (this.sitioPendienteId) {
      this.fase = 'cargando';
      this.cargarPendiente(this.sitioPendienteId);
    }
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.detenerConsulta();
    if (this.temporizadorCopiado) {
      clearTimeout(this.temporizadorCopiado);
    }
  }

  // ── Cerrar ─────────────────────────────────────────────────────────────────

  /** ¿La persona ya escribió o subió algo que se perdería al cerrar? */
  get hayContenido(): boolean {
    return (
      this.formulario.nombre.trim() !== '' ||
      this.formulario.descripcion.trim() !== '' ||
      this.formulario.fotos.length > 0
    );
  }

  cerrarVentana(): void {
    if (this.enviando) {
      return;
    }
    this.cerrar.emit();
  }

  /** El clic afuera cierra solo si no se pierde nada: no durante el avance ni con el formulario a medias. */
  alClicEnVelo(): void {
    if (this.fase === 'resultado' || (this.fase === 'formulario' && !this.hayContenido)) {
      this.cerrarVentana();
    }
  }

  @HostListener('document:keydown.escape')
  alEscape(): void {
    this.alClicEnVelo();
  }

  // ── Fotos ──────────────────────────────────────────────────────────────────

  get cupoDeFotos(): number {
    return Math.max(0, MAX_FOTOS - this.formulario.fotos.length - this.preparandoFotos);
  }

  async alElegirFotos(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivos: File[] = input.files ? Array.from(input.files) : [];
    // Se limpia el campo para poder volver a elegir el mismo archivo.
    input.value = '';
    this.avisoFotos = '';
    if (archivos.length === 0) {
      return;
    }
    const cupo = this.cupoDeFotos;
    if (archivos.length > cupo) {
      this.avisoFotos = `Solo caben ${MAX_FOTOS} fotos en total. Agregamos las primeras ${textoPlural(cupo, 'foto', 'fotos')}.`;
    }
    for (const archivo of archivos.slice(0, cupo)) {
      await this.agregarFoto(archivo);
    }
  }

  /** La foto se reduce en el navegador con la misma utilidad de los formularios de producto. */
  private async agregarFoto(archivo: File): Promise<void> {
    this.preparandoFotos++;
    try {
      const preparada = await this.fotos.prepararFoto(archivo);
      const foto: FotoDelFormulario = {
        id: ++this.secuencia,
        nombreArchivo: archivo.name,
        imagen: preparada.paraIA,
        vistaPrevia: preparada.paraIA,
        precioTexto: '',
      };
      this.formulario.fotos.push(foto);
      this.errorGeneral = '';
    } catch (error) {
      const mensaje = error && (error as Error).message;
      this.avisoFotos = mensaje || 'No pudimos abrir esa foto. Pruebe con otra en formato JPG, PNG o WEBP.';
    } finally {
      this.preparandoFotos--;
    }
  }

  quitarFoto(foto: FotoDelFormulario): void {
    this.formulario.fotos = this.formulario.fotos.filter((f) => f.id !== foto.id);
    delete this.errores.fotos[foto.id];
    this.avisoFotos = '';
  }

  porId(_indice: number, foto: FotoDelFormulario): number {
    return foto.id;
  }

  /** "$ 45.000" debajo del campo cuando el precio escrito se entiende. */
  precioEntendido(foto: FotoDelFormulario): string {
    const precio = parsearPrecio(foto.precioTexto);
    return precio === null ? '' : formatearPesos(precio);
  }

  /** Cuando la persona corrige un campo, su aviso se quita (se vuelve a revisar al enviar). */
  alEditar(): void {
    if (this.intentoDeEnvio) {
      this.errores = validarFormulario(this.formulario, { preparando: this.preparandoFotos > 0 }).errores;
    }
    this.errorGeneral = '';
  }

  // ── Crear ──────────────────────────────────────────────────────────────────

  crear(): void {
    if (this.enviando) {
      return;
    }
    this.intentoDeEnvio = true;
    const revision = validarFormulario(this.formulario, { preparando: this.preparandoFotos > 0 });
    this.errores = revision.errores;
    if (!revision.valido) {
      this.errorGeneral = revision.errores.general || '';
      return;
    }

    // Si el formulario cambió desde el último intento, es OTRA solicitud: un identificador nuevo. Con el
    // mismo contenido se reusa el mismo, así un reintento de red nunca duplica nada.
    const huella = huellaDelFormulario(this.formulario);
    if (this.huellaEnviada !== '' && this.huellaEnviada !== huella) {
      this.requestId = nuevoRequestId();
    }
    this.huellaEnviada = huella;

    this.enviando = true;
    this.errorGeneral = '';
    const solicitud = construirSolicitud(this.formulario, this.requestId);
    this.servicio.iniciar(solicitud).subscribe({
      next: (respuesta) => {
        this.enviando = false;
        this.entrarAlAvance(respuesta.data.progress);
      },
      error: (error) => {
        this.enviando = false;
        const mensaje = mensajeDeError(error);
        if (mensaje.siteIdPendiente) {
          // Ya hay una tienda a medio crear: se muestra su avance y se puede retomar.
          this.fase = 'cargando';
          this.cargarPendiente(mensaje.siteIdPendiente);
          return;
        }
        // Si el servidor rechazó la solicitud (algo por corregir), el próximo intento es OTRO.
        // Si no hubo respuesta (red, tiempo), se reusa el mismo: así nunca se duplica nada.
        if (error && typeof error.status === 'number' && error.status >= 400 && error.status < 500) {
          this.requestId = nuevoRequestId();
        }
        this.errorGeneral = mensaje.texto;
      },
    });
  }

  /** Trae el avance de una tienda que quedó a medias (de la lista o del aviso del servidor). */
  private cargarPendiente(siteId: string): void {
    this.suscripcion = this.servicio.avance(siteId).subscribe({
      next: (respuesta) => {
        if (respuesta.data.requestId) {
          this.requestId = respuesta.data.requestId;
        }
        this.entrarAlAvance(respuesta.data);
      },
      error: (error) => {
        this.fase = 'formulario';
        this.errorGeneral = mensajeDeError(error).texto;
      },
    });
  }

  /** Retoma un trabajo interrumpido: el mismo intento, sin repetir nada de lo que ya se hizo. */
  reintentar(): void {
    if (this.enviando) {
      return;
    }
    this.enviando = true;
    this.errorGeneral = '';
    this.servicio.retomar(this.requestId).subscribe({
      next: (respuesta) => {
        this.enviando = false;
        this.entrarAlAvance(respuesta.data.progress);
      },
      error: (error) => {
        this.enviando = false;
        this.errorGeneral = mensajeDeError(error).texto;
      },
    });
  }

  // ── El avance ──────────────────────────────────────────────────────────────

  private entrarAlAvance(avance: AvanceTienda): void {
    this.siteId = avance.siteId;
    this.inicioEspera = Date.now();
    this.fallos = 0;
    this.avisoLargo = '';
    this.detenerConsulta();
    this.aplicarAvance(avance);
  }

  private aplicarAvance(avance: AvanceTienda): void {
    if (this.destruido) {
      return;
    }
    this.avance = avance;
    this.pasos = pasosDelAvance(avance, avance.productsTotal > 0);

    if (etapaDelAvance(avance) !== 'trabajando') {
      this.mostrarResultado(avance);
      return;
    }
    this.fase = 'avance';
    if (debeSeguirConsultando(avance, Date.now() - this.inicioEspera, 0)) {
      this.programarConsulta();
    } else {
      this.avisoLargo = MENSAJES.muchoTiempo;
    }
  }

  private mostrarResultado(avance: AvanceTienda): void {
    this.detenerConsulta();
    this.resumen = resumenFinal(avance);
    this.fase = 'resultado';
    this.terminado.emit(avance);
  }

  private programarConsulta(): void {
    this.detenerConsulta();
    const espera = esperaAntesDeConsultar(Date.now() - this.inicioEspera);
    this.temporizador = setTimeout(() => this.consultar(), espera);
  }

  private consultar(): void {
    if (this.destruido || !this.siteId) {
      return;
    }
    this.suscripcion = this.servicio.avance(this.siteId).subscribe({
      next: (respuesta) => {
        this.fallos = 0;
        this.aplicarAvance(respuesta.data);
      },
      error: (error) => this.alFallarLaConsulta(error),
    });
  }

  private alFallarLaConsulta(error: any): void {
    if (this.destruido) {
      return;
    }
    // La tienda no existe o la sesión ya no sirve: seguir consultando no arregla nada.
    if (error && (error.status === 404 || error.status === 401 || error.status === 403)) {
      this.detenerConsulta();
      this.avisoLargo = mensajeDeError(error).texto;
      return;
    }
    this.fallos++;
    if (debeSeguirConsultando(this.avance, Date.now() - this.inicioEspera, this.fallos)) {
      this.programarConsulta();
    } else {
      this.detenerConsulta();
      this.avisoLargo = this.fallos >= MAX_FALLOS_SEGUIDOS ? MENSAJES.seCortoLaConsulta : MENSAJES.muchoTiempo;
    }
  }

  private detenerConsulta(): void {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
    if (this.suscripcion) {
      this.suscripcion.unsubscribe();
      this.suscripcion = null;
    }
  }

  /** Cuántas fotos se dejaron por fuera, para el resumen. */
  get omitidas(): number {
    return this.avance ? this.avance.items.filter((i) => i.state === 'skipped').length : 0;
  }

  textoProductos(n: number): string {
    return textoPlural(n, 'producto creado', 'productos creados');
  }

  etiquetaFoto(estado: string): string {
    switch (estado) {
      case 'ready':
        return 'Listo';
      case 'processing':
        return 'Leyendo…';
      case 'skipped':
        return 'Quedó por fuera';
      default:
        return 'En espera';
    }
  }

  // ── Lo que se hace al final ────────────────────────────────────────────────

  verTienda(): void {
    if (this.avance && this.avance.siteUrl) {
      window.open(this.avance.siteUrl, '_blank', 'noopener');
    }
  }

  verVistaPrevia(): void {
    if (this.avance && this.avance.previewUrl) {
      window.open(this.avance.previewUrl, '_blank', 'noopener');
    }
  }

  copiarEnlace(): void {
    const url = this.avance ? this.avance.siteUrl : '';
    if (!url) {
      return;
    }
    const avisar = () => {
      this.copiado = true;
      clearTimeout(this.temporizadorCopiado);
      this.temporizadorCopiado = setTimeout(() => (this.copiado = false), 1800);
    };
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    if (nav && nav.clipboard && nav.clipboard.writeText) {
      nav.clipboard.writeText(url).then(avisar, () => this.toastr.info(url, 'Copia el enlace'));
    } else {
      this.toastr.info(url, 'Copia el enlace');
    }
  }

  irAlEditor(): void {
    if (!this.siteId) {
      return;
    }
    this.router.navigate(['/sitios/editor', this.siteId]);
    this.cerrar.emit();
  }

  agregarProducto(): void {
    this.router.navigate(['/productos/crear-rapido']);
    this.cerrar.emit();
  }
}
