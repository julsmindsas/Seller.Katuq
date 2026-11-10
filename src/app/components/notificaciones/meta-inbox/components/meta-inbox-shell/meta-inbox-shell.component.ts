import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { LoaderService } from 'src/app/shared/services/loader.service';
import { TranslateService } from '@ngx-translate/core';

import { MetaInboxService } from '../../meta-inbox.service';
import {
  META_CANAL_LABEL,
  MetaCanal,
  MetaConexion,
  MetaHilo,
  MetaImagenAdjunta,
  MetaMensaje,
  MetaVentana,
} from '../../models/meta-thread.model';

/** Imágenes que se pueden adjuntar a una respuesta de TikTok (D-709). */
const TIPOS_IMAGEN = ['image/jpeg', 'image/png'];
const MAX_IMAGEN_MB = 3;

/**
 * Buzón de Meta — una sola implementación para Instagram, Messenger y TikTok (D-709).
 *
 * Las entradas de menú montan este mismo componente y el canal se deriva de
 * la URL. Para el usuario son buzones distintos; para el código es uno solo.
 *
 * TikTok se diferencia en tres cosas: la ventana cuenta mensajes (10 al inicio, sin límite mientras el
 * cliente responde, 3 si pasan 48 horas), solo se contesta a quien ya escribió (no hay forma de iniciar
 * una conversación) y la imagen se ofrece únicamente si el país del cliente la permite.
 */
@Component({
  selector: 'app-meta-inbox-shell',
  templateUrl: './meta-inbox-shell.component.html',
  styleUrls: ['./meta-inbox-shell.component.scss'],
})
export class MetaInboxShellComponent implements OnInit, OnDestroy {
  canal: MetaCanal = 'instagram';
  canalLabel = '';

  conexion: MetaConexion | null = null;
  cargandoConexion = true;

  hilos: MetaHilo[] = [];
  cargandoHilos = false;

  hiloActivo: MetaHilo | null = null;
  mensajes: MetaMensaje[] = [];
  ventana: MetaVentana | null = null;
  cargandoMensajes = false;

  borrador = '';
  enviando = false;
  avisoEnvio: string | null = null;

  /** TikTok: imagen elegida para la próxima respuesta y su error de validación. */
  imagen: MetaImagenAdjunta | null = null;
  errorImagen: string | null = null;
  /** TikTok: el servidor dice si el país del cliente deja mandar imágenes en esta conversación. */
  permiteImagen = false;

  /**
   * TikTok: imágenes que escribió el cliente, ya descargadas (id del mensaje → dirección `blob:`). El
   * servidor las entrega por una ruta que pide la sesión, así que no se pueden mostrar con un `<img src>`
   * directo. `generacionImagenes` descarta respuestas que llegan después de cambiar de conversación.
   */
  private imagenesEntrantes = new Map<string, string>();
  private imagenesEnCurso = new Set<string>();
  private imagenesFallidas = new Set<string>();
  private generacionImagenes = 0;

  private destroy$ = new Subject<void>();

  /**
   * Fecha del entrante más nuevo que ya vimos. Sirve para distinguir "llegó algo
   * nuevo" de "sigue lo mismo". En null mientras no se haya cargado nada, para
   * que la campana no suene al abrir el buzón con conversaciones viejas.
   */
  private ultimoEntranteConocido: string | null = null;

  /** Se crea al primer sonido; los navegadores no dejan antes de interactuar. */
  private audio: AudioContext | null = null;

  constructor(
    private router: Router,
    private servicio: MetaInboxService,
    private loader: LoaderService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    // Sin el overlay global: esta pantalla se refresca sola cada 8 segundos y
    // el overlay tapa todo en cada vuelta, que es peor que no tener refresco.
    // El buzón ya avisa por su cuenta con "Cargando conversaciones…" donde toca.
    this.loader.suppressGlobalLoader();

    this.aplicarCanalDeLaUrl();

    // Las dos rutas montan ESTE mismo componente desde el mismo módulo, así que
    // comparten el objeto de configuración de ruta. Angular ve que es la misma
    // ruta y REUSA la instancia: al pasar de un buzón al otro `ngOnInit` no
    // vuelve a correr y la pantalla se queda mostrando el canal anterior. Por
    // eso hay que escuchar la navegación, no solo el arranque.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.aplicarCanalDeLaUrl());

    this.arrancarRefrescoAutomatico();
  }

  /**
   * Deriva el canal de la URL y recarga si cambió.
   *
   * El canal sale de la ruta (`/notificaciones/instagram/inbox`) y no de una
   * config aparte: así no puede quedar desincronizado con el menú.
   */
  private aplicarCanalDeLaUrl(): void {
    const url = this.router.url;
    const canal: MetaCanal = url.includes('/tiktok/')
      ? 'tiktok'
      : url.includes('/facebook/')
        ? 'facebook'
        : 'instagram';

    if (canal === this.canal && this.canalLabel) return;

    this.canal = canal;
    this.canalLabel = META_CANAL_LABEL[canal];
    // Campana en silencio hasta la próxima carga: los mensajes que ya existían
    // en el buzón al que acabo de entrar no son novedades.
    this.ultimoEntranteConocido = null;
    this.reiniciar();
    this.cargarConexion();
    this.cargarHilos();
  }

  ngOnDestroy(): void {
    // Emparejado con el suppress del ngOnInit: si no se libera, el resto de la
    // aplicación se queda sin overlay.
    this.loader.releaseGlobalLoader();
    this.destroy$.next();
    this.destroy$.complete();
    this.soltarImagenAdjunta();
    this.soltarImagenesEntrantes();
  }

  /**
   * Refresco automático, el mismo patrón que el buzón de WhatsApp.
   *
   * Cada 8 segundos se relee la lista y, si hay un hilo abierto, sus mensajes.
   * No es tiempo real de verdad, pero para una conversación por chat la
   * diferencia es imperceptible y no exige mantener una conexión abierta por
   * cada operador.
   *
   * Con la pestaña oculta baja a cada 32 segundos y solo relee la lista, no la
   * conversación abierta. El canal de WhatsApp directamente no pollea escondido
   * (D-117) porque cada tick cuesta lecturas de Firestore; aquí hay campana, y
   * una campana que solo suena cuando ya estás mirando la pantalla no sirve de
   * nada. Bajar la frecuencia y leer la mitad conserva casi todo ese ahorro.
   *
   * Dos frenos más, siempre:
   *  - **Enviando**: no se pisa la pantalla en mitad de un envío.
   *  - **Escribiendo**: si el operador tiene texto a medias, no se le refresca
   *    la conversación debajo.
   */
  private arrancarRefrescoAutomatico(): void {
    let tick = 0;

    interval(8000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        tick += 1;
        if (this.enviando) return;
        if ((this.borrador || '').trim().length > 0 || this.imagen) return;

        if (document.hidden) {
          if (tick % 4 !== 0) return;
          this.refrescarHilosEnSilencio();
          return;
        }

        this.refrescarHilosEnSilencio();
        if (this.hiloActivo) this.refrescarMensajesEnSilencio();
      });
  }

  /** Igual que cargar, pero sin spinner: el refresco no debe parpadear. */
  private refrescarHilosEnSilencio(): void {
    this.servicio
      .listarHilos(this.canal)
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => {
        this.hilos = items;
        this.avisarSiLlegoAlgoNuevo(items);
      });
  }

  /**
   * Suena la campana cuando entra un mensaje que no habíamos visto.
   *
   * Se compara contra el entrante más nuevo conocido, no contra la cantidad de
   * hilos: así también avisa cuando alguien que ya había escrito vuelve a
   * escribir. Solo cuentan los entrantes — que salga una respuesta nuestra no
   * es una novedad.
   */
  private avisarSiLlegoAlgoNuevo(items: MetaHilo[]): void {
    const masNuevo = items
      .filter((h) => h.ultimaDireccion === 'inbound')
      .map((h) => h.ultimoMensajeEn)
      .sort()
      .pop();

    if (!masNuevo) return;

    // Primera carga: se toma nota sin sonar. Lo que ya estaba ahí no es nuevo.
    if (this.ultimoEntranteConocido === null) {
      this.ultimoEntranteConocido = masNuevo;
      return;
    }

    if (masNuevo > this.ultimoEntranteConocido) {
      this.ultimoEntranteConocido = masNuevo;
      this.sonarCampana();
    }
  }

  /**
   * Dos notas cortas, generadas en el navegador.
   *
   * Sin archivo de audio a propósito: no hay que descargar nada, no depende de
   * un recurso que se pueda perder en un despliegue, y suena igual en todos los
   * navegadores. Falla en silencio — quedarse sin sonido es molesto, romper el
   * buzón por un sonido sería absurdo.
   */
  private sonarCampana(): void {
    try {
      const Ctx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;

      if (!this.audio) this.audio = new Ctx();
      const ctx = this.audio as AudioContext;
      // Si el navegador la dejó suspendida por falta de interacción, se intenta
      // despertar; si no se puede, simplemente no suena.
      if (ctx.state === 'suspended') ctx.resume();

      const ahora = ctx.currentTime;
      [
        { hz: 880, en: 0 },
        { hz: 1170, en: 0.12 },
      ].forEach(({ hz, en }) => {
        const osc = ctx.createOscillator();
        const vol = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = hz;
        // Ataque y caída suaves: un tono cuadrado seco suena a error, no a aviso.
        vol.gain.setValueAtTime(0.0001, ahora + en);
        vol.gain.exponentialRampToValueAtTime(0.12, ahora + en + 0.02);
        vol.gain.exponentialRampToValueAtTime(0.0001, ahora + en + 0.28);
        osc.connect(vol).connect(ctx.destination);
        osc.start(ahora + en);
        osc.stop(ahora + en + 0.3);
      });
    } catch (_) {
      // sin sonido, pero el buzón sigue funcionando
    }
  }

  private refrescarMensajesEnSilencio(): void {
    const hilo = this.hiloActivo;
    if (!hilo) return;

    this.servicio
      .mensajesDeHilo(this.canal, hilo.identidadHash)
      .pipe(takeUntil(this.destroy$))
      .subscribe((r) => {
        // El operador pudo cambiar de conversación mientras la respuesta venía
        // en camino: si ya no es la misma, se descarta en vez de pintar los
        // mensajes de un hilo sobre otro.
        if (this.hiloActivo?.identidadHash !== hilo.identidadHash) return;
        this.mensajes = r.items;
        this.ventana = r.ventana;
        this.fijarPermiteImagen(hilo, r.permiteImagen);
        this.cargarImagenesEntrantes(r.items);
      });
  }

  private reiniciar(): void {
    this.hilos = [];
    this.hiloActivo = null;
    this.mensajes = [];
    this.ventana = null;
    this.borrador = '';
    this.avisoEnvio = null;
    this.soltarImagenAdjunta();
    this.errorImagen = null;
    this.permiteImagen = false;
    this.soltarImagenesEntrantes();
  }

  private cargarConexion(): void {
    this.cargandoConexion = true;
    this.servicio
      .obtenerConexiones()
      .pipe(takeUntil(this.destroy$))
      .subscribe((c) => {
        this.conexion = c ? c[this.canal] : null;
        this.cargandoConexion = false;
      });
  }

  private cargarHilos(): void {
    this.cargandoHilos = true;
    this.servicio
      .listarHilos(this.canal)
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => {
        this.hilos = items;
        this.cargandoHilos = false;
      });
  }

  get conectado(): boolean {
    return this.conexion?.estado === 'conectado';
  }

  get necesitaReconectar(): boolean {
    return this.conexion?.estado === 'reconectar';
  }

  abrirHilo(hilo: MetaHilo): void {
    // Otra conversación: lo que se descargó de la anterior ya no sirve.
    if (this.hiloActivo?.identidadHash !== hilo.identidadHash) this.soltarImagenesEntrantes();
    this.hiloActivo = hilo;
    this.avisoEnvio = null;
    this.borrador = '';
    this.soltarImagenAdjunta();
    this.errorImagen = null;
    this.fijarPermiteImagen(hilo, undefined);
    this.cargandoMensajes = true;

    this.servicio
      .mensajesDeHilo(this.canal, hilo.identidadHash)
      .pipe(takeUntil(this.destroy$))
      .subscribe((r) => {
        this.mensajes = r.items;
        this.ventana = r.ventana;
        this.fijarPermiteImagen(hilo, r.permiteImagen);
        this.cargarImagenesEntrantes(r.items);
        this.cargandoMensajes = false;
      });
  }

  /**
   * ¿Se ofrece adjuntar imagen? Solo en TikTok y solo si el servidor lo permite para este cliente. Sin
   * dato (o con `false`) no se ofrece: es lo seguro, porque TikTok rechaza la imagen donde no se puede.
   * El dato de la conversación abierta manda sobre el del listado.
   */
  private fijarPermiteImagen(hilo: MetaHilo, desdeConversacion: boolean | undefined): void {
    const permite = typeof desdeConversacion === 'boolean' ? desdeConversacion : hilo.permiteImagen === true;
    this.permiteImagen = this.esTiktok && permite;
    if (!this.permiteImagen) {
      this.soltarImagenAdjunta();
      this.errorImagen = null;
    }
  }

  // ─── Imágenes que escribió el cliente (TikTok) ─────────────────────────

  /**
   * Trae las imágenes del cliente que todavía no están: son rutas del propio servidor (`/v1/meta/...`)
   * que piden la sesión, así que se descargan como blob y se muestran con una dirección local. Un mensaje
   * ya descargado, en curso o fallido no se vuelve a pedir en cada refresco.
   */
  private cargarImagenesEntrantes(items: MetaMensaje[]): void {
    if (!this.esTiktok) return;
    const generacion = this.generacionImagenes;

    for (const m of items) {
      const ruta = m.mediaUrl;
      if (m.tipo !== 'image' || !ruta || !ruta.startsWith('/')) continue;
      if (this.imagenesEntrantes.has(m.id) || this.imagenesEnCurso.has(m.id) || this.imagenesFallidas.has(m.id)) continue;

      this.imagenesEnCurso.add(m.id);
      this.servicio
        .imagenEntrante(ruta)
        .pipe(takeUntil(this.destroy$))
        .subscribe((blob) => {
          if (generacion !== this.generacionImagenes) return;
          this.imagenesEnCurso.delete(m.id);
          if (blob) this.imagenesEntrantes.set(m.id, URL.createObjectURL(blob));
          else this.imagenesFallidas.add(m.id);
        });
    }
  }

  private soltarImagenesEntrantes(): void {
    this.imagenesEntrantes.forEach((url) => URL.revokeObjectURL(url));
    this.imagenesEntrantes.clear();
    this.imagenesEnCurso.clear();
    this.imagenesFallidas.clear();
    this.generacionImagenes += 1;
  }

  /** La imagen del cliente ya descargada, lista para el `<img>`; null mientras llega o si no se pudo. */
  imagenDe(m: MetaMensaje): string | null {
    return this.esTiktok ? this.imagenesEntrantes.get(m.id) || null : null;
  }

  /** TikTok: publicación que el cliente compartió. `mediaUrl` es su enlace público. */
  esPublicacion(m: MetaMensaje): boolean {
    return this.esTiktok && m.tipo === 'share_post' && /^https?:\/\//i.test(m.mediaUrl || '');
  }

  /**
   * Lo que se dice de un adjunto cuando no hay texto ni imagen que mostrar. En Instagram y Facebook es
   * siempre «Archivo adjunto», como antes; en TikTok distingue sticker, mensaje no soportado y la imagen
   * que está llegando o no llegó.
   */
  textoAdjunto(m: MetaMensaje): string | null {
    if (!this.esTiktok) {
      return !m.body && m.mediaUrl ? this.translate.instant('notificaciones.meta.attachment') : null;
    }
    if (this.imagenDe(m) || this.esPublicacion(m)) return null;
    if (m.tipo === 'sticker') return this.translate.instant('notificaciones.meta.tiktokSticker');
    if (m.tipo === 'unsupported') return this.translate.instant('notificaciones.meta.tiktokNoSoportado');
    if (m.tipo === 'image') {
      if (this.imagenesFallidas.has(m.id)) return this.translate.instant('notificaciones.meta.tiktokImagenNoCargo');
      if (m.mediaUrl && m.mediaUrl.startsWith('/')) return this.translate.instant('notificaciones.meta.tiktokCargandoImagen');
    }
    return !m.body && m.mediaUrl ? this.translate.instant('notificaciones.meta.attachment') : null;
  }

  irAConexion(): void {
    this.router.navigate(['/integrations/meta']);
  }

  get esTiktok(): boolean {
    return this.canal === 'tiktok';
  }

  /**
   * TikTok no deja enviar con la cuenta desconectada o vencida: se escribiría a un canal que no responde.
   * (Las conversaciones anteriores se conservan y se pueden leer.)
   */
  get sinConexionParaEnviar(): boolean {
    return this.esTiktok && !this.conectado;
  }

  /**
   * Texto de la ventana en lenguaje llano. La API habla de "messaging window";
   * el operador necesita saber si puede escribir y hasta cuándo.
   */
  get textoVentana(): string {
    if (!this.ventana) return '';
    if (this.esTiktok) return this.textoVentanaTiktok(this.ventana);
    if (!this.ventana.abierta) {
      return this.translate.instant('notificaciones.meta.windowClosed', { nombre: this.nombreContacto });
    }
    const min = this.ventana.minutosRestantes;
    if (min >= 120) return this.translate.instant('notificaciones.meta.windowHours', { horas: Math.floor(min / 60) });
    if (min >= 60) return this.translate.instant('notificaciones.meta.windowOneHour');
    return this.translate.instant('notificaciones.meta.windowMinutes', { min });
  }

  /**
   * La ventana de TikTok (D-709), con sus tres casos: te quedan N mensajes, puedes responder sin límite
   * mientras el cliente siga contestando, o hay que esperar a que escriba de nuevo.
   */
  private textoVentanaTiktok(v: MetaVentana): string {
    if (this.sinConexionParaEnviar) {
      return this.translate.instant('notificaciones.meta.tiktokVentanaSinConexion');
    }
    if (!v.abierta) return this.translate.instant('notificaciones.meta.tiktokVentanaCerrada');

    const hasta = this.fechaCorta(v.venceEn);

    if (v.estado === 'abierta') {
      return hasta
        ? this.translate.instant('notificaciones.meta.tiktokVentanaSinLimite', { hasta })
        : this.translate.instant('notificaciones.meta.tiktokVentanaSinLimiteSinFecha');
    }

    const n = v.restantes;
    if (typeof n !== 'number') return this.translate.instant('notificaciones.meta.tiktokVentanaPuedes');
    if (hasta) {
      return this.translate.instant(
        n === 1 ? 'notificaciones.meta.tiktokVentanaUnMensaje' : 'notificaciones.meta.tiktokVentanaMensajes',
        { n, hasta },
      );
    }
    return this.translate.instant(
      n === 1
        ? 'notificaciones.meta.tiktokVentanaUnMensajeSinFecha'
        : 'notificaciones.meta.tiktokVentanaMensajesSinFecha',
      { n },
    );
  }

  /** «10 nov, 3:45 p. m.», en el idioma de la pantalla. Vacío si no hay fecha válida. */
  private fechaCorta(iso: string | null | undefined): string {
    if (!iso) return '';
    const fecha = new Date(iso);
    if (isNaN(fecha.getTime())) return '';
    try {
      return fecha.toLocaleString(this.translate.currentLang || 'es', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return fecha.toLocaleString();
    }
  }

  /** Con la ventana abierta y, en TikTok, la cuenta conectada. */
  get puedeEscribir(): boolean {
    return Boolean(this.ventana?.abierta) && !this.sinConexionParaEnviar && !this.enviando;
  }

  /** Clave del texto de ayuda del campo de respuesta. */
  get claveMarcador(): string {
    if (this.sinConexionParaEnviar) return 'notificaciones.meta.tiktokReplyReconnect';
    return this.ventana?.abierta ? 'notificaciones.meta.replyPlaceholder' : 'notificaciones.meta.replyClosed';
  }

  get nombreContacto(): string {
    return this.hiloActivo?.contactoNombre || this.translate.instant('notificaciones.meta.theContact');
  }

  get puedeEnviar(): boolean {
    const hayQueEnviar = this.borrador.trim().length > 0 || (this.esTiktok && Boolean(this.imagen));
    return (
      Boolean(this.ventana?.abierta) &&
      !this.sinConexionParaEnviar &&
      hayQueEnviar &&
      !this.enviando
    );
  }

  // ─── Imagen adjunta (TikTok) ───────────────────────────────────────────

  /**
   * Lee la imagen elegida a base64, que es como viaja en la respuesta. Valida tipo y peso antes: 3 MB como
   * máximo, por seguridad (el servidor acepta más, pero TikTok podría rechazarla).
   */
  alElegirImagen(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const archivo = campo.files && campo.files[0];
    // Se vacía para poder elegir la misma imagen otra vez después de quitarla.
    campo.value = '';
    if (!archivo) return;

    this.errorImagen = null;
    if (!TIPOS_IMAGEN.includes(archivo.type)) {
      this.errorImagen = this.translate.instant('notificaciones.meta.tiktokImagenTipo');
      return;
    }
    if (archivo.size > MAX_IMAGEN_MB * 1024 * 1024) {
      this.errorImagen = this.translate.instant('notificaciones.meta.tiktokImagenPeso', { mb: MAX_IMAGEN_MB });
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      const url = typeof lector.result === 'string' ? lector.result : '';
      const coma = url.indexOf(',');
      if (coma < 0) {
        this.errorImagen = this.translate.instant('notificaciones.meta.tiktokImagenLectura');
        return;
      }
      this.imagen = {
        base64: url.slice(coma + 1),
        mime: archivo.type,
        nombre: archivo.name,
        vistaPrevia: url,
      };
    };
    lector.onerror = () => {
      this.errorImagen = this.translate.instant('notificaciones.meta.tiktokImagenLectura');
    };
    lector.readAsDataURL(archivo);
  }

  quitarImagen(): void {
    this.soltarImagenAdjunta();
    this.errorImagen = null;
  }

  private soltarImagenAdjunta(): void {
    this.imagen = null;
  }

  enviar(): void {
    if (!this.puedeEnviar || !this.hiloActivo) return;

    const imagen = this.esTiktok ? this.imagen : null;
    const texto = this.borrador.trim();
    this.enviando = true;
    this.avisoEnvio = null;

    this.servicio
      .responder(this.canal, this.hiloActivo.identidadHash, texto, imagen)
      .pipe(takeUntil(this.destroy$))
      .subscribe((r) => {
        this.enviando = false;
        if (r.enviado) {
          this.borrador = '';
          this.abrirHilo(this.hiloActivo!);
          return;
        }
        this.avisoEnvio = this.explicarFallo(r.motivo, r.mensaje);
        // TikTok mandó la imagen y no el texto: la imagen ya salió (no se reintenta), el texto se conserva
        // para volver a enviarlo y la conversación se refresca para que la imagen aparezca.
        if (r.parcial) {
          this.soltarImagenAdjunta();
          this.refrescarMensajesEnSilencio();
        }
      });
  }

  /**
   * Reenvía un mensaje que falló. Reusa el mismo camino que un envío normal,
   * así que la ventana se vuelve a validar: si ya expiró, el operador recibe la
   * explicación en vez de un segundo fallo mudo.
   */
  reintentar(m: MetaMensaje): void {
    if (!this.hiloActivo || this.enviando || !m.body) return;

    this.enviando = true;
    this.avisoEnvio = null;

    this.servicio
      .responder(this.canal, this.hiloActivo.identidadHash, m.body)
      .pipe(takeUntil(this.destroy$))
      .subscribe((r) => {
        this.enviando = false;
        if (r.enviado) {
          this.abrirHilo(this.hiloActivo!);
          return;
        }
        this.avisoEnvio = this.explicarFallo(r.motivo, r.mensaje);
      });
  }

  /**
   * Traduce el motivo técnico a algo que el operador entienda y pueda actuar. En TikTok el servidor
   * manda su propio mensaje (ya en palabras sencillas, con el motivo de TikTok si fue quien rechazó):
   * se muestra tal cual.
   */
  private explicarFallo(motivo?: string, mensajeServidor?: string): string {
    if (this.esTiktok && mensajeServidor) return mensajeServidor;
    switch (motivo) {
      case 'ventana_cerrada':
        return this.esTiktok
          ? this.translate.instant('notificaciones.meta.tiktokFailWindowClosed')
          : this.translate.instant('notificaciones.meta.failWindowClosed', { nombre: this.nombreContacto });
      case 'sin_conexion':
        return this.translate.instant('notificaciones.meta.failNotConnected', { canal: this.canalLabel });
      case 'contacto_desconocido':
        return this.translate.instant('notificaciones.meta.failUnknownContact');
      case 'rechazado_por_meta':
        return this.translate.instant('notificaciones.meta.failRejected', { canal: this.canalLabel });
      default:
        return this.translate.instant('notificaciones.meta.failDefault');
    }
  }

  trackHilo(_: number, h: MetaHilo): string {
    return h.identidadHash;
  }

  trackMensaje(_: number, m: MetaMensaje): string {
    return m.id;
  }
}
