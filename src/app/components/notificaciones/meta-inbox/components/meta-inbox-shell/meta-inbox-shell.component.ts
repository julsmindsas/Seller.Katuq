import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { LoaderService } from 'src/app/shared/services/loader.service';

import { MetaInboxService } from '../../meta-inbox.service';
import {
  META_CANAL_LABEL,
  MetaCanal,
  MetaConexion,
  MetaHilo,
  MetaMensaje,
  MetaVentana,
} from '../../models/meta-thread.model';

/**
 * Buzón de Meta — una sola implementación para Instagram y Messenger.
 *
 * Las dos entradas de menú montan este mismo componente y el canal se deriva de
 * la URL. Para el usuario son dos buzones distintos; para el código es uno solo.
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
    const canal: MetaCanal = this.router.url.includes('/facebook/')
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
        if ((this.borrador || '').trim().length > 0) return;

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
      });
  }

  private reiniciar(): void {
    this.hilos = [];
    this.hiloActivo = null;
    this.mensajes = [];
    this.ventana = null;
    this.borrador = '';
    this.avisoEnvio = null;
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
    this.hiloActivo = hilo;
    this.avisoEnvio = null;
    this.borrador = '';
    this.cargandoMensajes = true;

    this.servicio
      .mensajesDeHilo(this.canal, hilo.identidadHash)
      .pipe(takeUntil(this.destroy$))
      .subscribe((r) => {
        this.mensajes = r.items;
        this.ventana = r.ventana;
        this.cargandoMensajes = false;
      });
  }

  irAConexion(): void {
    this.router.navigate(['/integrations/meta']);
  }

  /**
   * Texto de la ventana en lenguaje llano. La API habla de "messaging window";
   * el operador necesita saber si puede escribir y hasta cuándo.
   */
  get textoVentana(): string {
    if (!this.ventana) return '';
    if (!this.ventana.abierta) {
      return `Ya pasaron 24 horas desde el último mensaje. Para poder responderle, ${this.nombreContacto} tiene que escribirte de nuevo.`;
    }
    const min = this.ventana.minutosRestantes;
    if (min >= 120) return `Tienes ${Math.floor(min / 60)} horas para responder.`;
    if (min >= 60) return 'Tienes alrededor de una hora para responder.';
    return `Te quedan ${min} minutos para responder.`;
  }

  get nombreContacto(): string {
    return this.hiloActivo?.contactoNombre || 'el contacto';
  }

  get puedeEnviar(): boolean {
    return (
      Boolean(this.ventana?.abierta) &&
      this.borrador.trim().length > 0 &&
      !this.enviando
    );
  }

  enviar(): void {
    if (!this.puedeEnviar || !this.hiloActivo) return;

    const texto = this.borrador.trim();
    this.enviando = true;
    this.avisoEnvio = null;

    this.servicio
      .responder(this.canal, this.hiloActivo.identidadHash, texto)
      .pipe(takeUntil(this.destroy$))
      .subscribe((r) => {
        this.enviando = false;
        if (r.enviado) {
          this.borrador = '';
          this.abrirHilo(this.hiloActivo!);
          return;
        }
        this.avisoEnvio = this.explicarFallo(r.motivo);
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
        this.avisoEnvio = this.explicarFallo(r.motivo);
      });
  }

  /** Traduce el motivo técnico a algo que el operador entienda y pueda actuar. */
  private explicarFallo(motivo?: string): string {
    switch (motivo) {
      case 'ventana_cerrada':
        return `Pasaron más de 24 horas desde el último mensaje. ${this.nombreContacto} tiene que escribirte de nuevo para que puedas responderle.`;
      case 'sin_conexion':
        return `La cuenta de ${this.canalLabel} no está conectada. Conéctala en Integraciones.`;
      case 'contacto_desconocido':
        return 'No pudimos identificar a este contacto para responderle. Pídele que te escriba de nuevo.';
      case 'rechazado_por_meta':
        return `${this.canalLabel} no aceptó el mensaje. Revisa que la cuenta siga conectada.`;
      default:
        return 'No se pudo enviar el mensaje. Intenta de nuevo.';
    }
  }

  trackHilo(_: number, h: MetaHilo): string {
    return h.identidadHash;
  }

  trackMensaje(_: number, m: MetaMensaje): string {
    return m.id;
  }
}
