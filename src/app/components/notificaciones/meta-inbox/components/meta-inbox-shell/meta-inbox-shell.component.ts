import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, asyncScheduler, interval } from 'rxjs';
import { filter, finalize, takeUntil, throttleTime } from 'rxjs/operators';

import { LoaderService } from 'src/app/shared/services/loader.service';
import {
  BandejaEnVivoService,
  SONDEO_RESPALDO_MS,
  eventoEsDelChat,
  eventoTocaMensajes,
} from 'src/app/shared/services/messaging/bandeja-en-vivo.service';

import { esFamiliaAdministrador } from 'src/app/shared/utils/roles';
import { inicialesDe } from '../../../inbox-core/iniciales';
import { MetaInboxService } from '../../meta-inbox.service';
import { MetaHiloDetalleComponent } from '../meta-hilo-detalle/meta-hilo-detalle.component';
import {
  META_CANAL_LABEL,
  MetaCanal,
  MetaConexion,
  MetaHilo,
} from '../../models/meta-thread.model';

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
export class MetaInboxShellComponent implements OnInit, OnDestroy, AfterViewChecked {
  canal: MetaCanal = 'instagram';
  canalLabel = '';

  conexion: MetaConexion | null = null;
  cargandoConexion = true;

  hilos: MetaHilo[] = [];
  cargandoHilos = false;

  hiloActivo: MetaHilo | null = null;

  /** La conversación abierta: dice si hay un envío o texto a medias para no pisarla con el refresco. */
  @ViewChild(MetaHiloDetalleComponent) private detalle?: MetaHiloDetalleComponent;

  /**
   * Foco en celular y tableta (una columna a la vez): al abrir un chat la fila tocada se esconde, así que el foco
   * pasa a «Volver»; al volver, regresa a la fila del chat que se cerró. Se aplica después de pintar.
   */
  @ViewChild('volver') private botonVolver?: ElementRef<HTMLButtonElement>;
  private focoPendiente: { a: 'volver' } | { a: 'fila'; hash: string } | null = null;

  private destroy$ = new Subject<void>();

  /**
   * Canal en vivo (solo con la bandera `bandejaUnica`; el servicio lo decide). Con él conectado la lista y la
   * conversación abierta se refrescan al llegar un evento de este canal y el sondeo baja a uno lento de
   * respaldo. Sin él, todo igual que antes.
   */
  enVivo = false;
  /** Cada cambio le pide a la conversación abierta releer sus mensajes. */
  senalDetalle = 0;
  private readonly rafagaLista$ = new Subject<void>();
  private readonly rafagaDetalle$ = new Subject<void>();
  /** Cuándo se pidió la lista por última vez (para el sondeo lento con el canal en vivo). */
  private ultimoRefresco = 0;
  /** Sube con cada carga completa (cambio de canal): una respuesta de antes se descarta. */
  private hilosSeq = 0;
  /** Un refresco en silencio a la vez; otro pedido mientras tanto (o durante la carga) se hace al terminar. */
  private refrescoEnCurso = false;
  private refrescoPendiente = false;

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
    private enVivoSrv: BandejaEnVivoService,
    private host: ElementRef<HTMLElement>,
  ) {}

  ngAfterViewChecked(): void {
    const foco = this.focoPendiente;
    if (!foco) return;
    this.focoPendiente = null;
    if (foco.a === 'volver') {
      this.botonVolver?.nativeElement.focus();
      return;
    }
    const filas = this.host.nativeElement.querySelectorAll<HTMLElement>('.mb-hilo[data-hilo]');
    for (const fila of Array.from(filas)) {
      if (fila.getAttribute('data-hilo') === foco.hash) {
        fila.focus();
        return;
      }
    }
  }

  /** Celular y tableta: se ve la lista o el chat, uno por vez (el mismo corte del scss). */
  private get unaColumna(): boolean {
    return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(max-width: 1023px)').matches;
  }

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
    this.escucharEnVivo();
  }

  /**
   * Eventos de este canal del canal en vivo, agrupados. La conversación abierta se relee como mucho cada 400 ms
   * (solo con mensajes nuevos); la lista, como mucho cada 3 s.
   */
  private escucharEnVivo(): void {
    this.enVivoSrv.conectado$.pipe(takeUntil(this.destroy$)).subscribe((v) => (this.enVivo = v));
    this.enVivoSrv.eventos$.pipe(takeUntil(this.destroy$)).subscribe((e) => {
      if (e.canal !== this.canal) return;
      // Todo motivo cambia la fila (también «estado»: la conversación se cerró o se reabrió).
      this.rafagaLista$.next();
      const h = this.hiloActivo;
      if (h && eventoTocaMensajes(e) && eventoEsDelChat(e, { canal: this.canal, hash: h.identidadHash, threadId: h.threadId })) {
        this.rafagaDetalle$.next();
      }
    });
    this.enVivoSrv.recargar$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.rafagaLista$.next();
      if (this.hiloActivo) this.rafagaDetalle$.next();
    });
    // La lista no toca la conversación abierta: se relee aunque el asesor esté escribiendo.
    this.rafagaLista$
      .pipe(throttleTime(3000, asyncScheduler, { leading: true, trailing: true }), takeUntil(this.destroy$))
      .subscribe(() => this.refrescarHilosEnSilencio());
    this.rafagaDetalle$
      .pipe(throttleTime(400, asyncScheduler, { leading: true, trailing: true }), takeUntil(this.destroy$))
      .subscribe(() => this.senalDetalle++);
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
        if (this.detalle?.ocupado) return;

        if (document.hidden) {
          if (tick % 4 !== 0) return;
          this.refrescarHilosEnSilencio();
          return;
        }

        // Con el canal en vivo conectado este sondeo queda de respaldo: como mucho cada 30 s.
        if (this.enVivo && Date.now() - this.ultimoRefresco < SONDEO_RESPALDO_MS) return;
        this.refrescarHilosEnSilencio();
      });
  }

  /** Igual que cargar, pero sin spinner: el refresco no debe parpadear. */
  private refrescarHilosEnSilencio(): void {
    this.ultimoRefresco = Date.now();
    // Uno a la vez (también con la carga completa en camino): el pedido de más se hace al terminar, en vez de
    // descartar respuestas o perder el evento.
    if (this.refrescoEnCurso || this.cargandoHilos) {
      this.refrescoPendiente = true;
      return;
    }
    const seq = this.hilosSeq;
    const canal = this.canal;
    this.refrescoEnCurso = true;
    this.servicio
      .listarHilos(canal)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.refrescoEnCurso = false;
          this.seguirSiQuedoPendiente();
        }),
      )
      .subscribe((items) => {
        if (seq !== this.hilosSeq || canal !== this.canal) return;
        this.hilos = items;
        this.avisarSiLlegoAlgoNuevo(items);
      });
  }

  private seguirSiQuedoPendiente(): void {
    if (!this.refrescoPendiente || this.refrescoEnCurso || this.cargandoHilos) return;
    this.refrescoPendiente = false;
    this.refrescarHilosEnSilencio();
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

  private reiniciar(): void {
    this.hilos = [];
    this.hiloActivo = null;
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
    const seq = ++this.hilosSeq;
    this.refrescoPendiente = false;
    this.ultimoRefresco = Date.now();
    this.servicio
      .listarHilos(this.canal)
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => {
        if (seq !== this.hilosSeq) return;
        this.hilos = items;
        this.cargandoHilos = false;
        // Llegaron eventos mientras se cargaba: una lectura más.
        this.seguirSiQuedoPendiente();
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
    // La fila tocada se esconde en una columna: sin esto el foco se perdería.
    if (this.unaColumna) this.focoPendiente = { a: 'volver' };
  }

  /** «Volver» en celular y tableta: cierra el chat, deja ver la lista otra vez y devuelve el foco a su fila. */
  volverALista(): void {
    const hash = this.hiloActivo?.identidadHash;
    this.hiloActivo = null;
    if (hash) this.focoPendiente = { a: 'fila', hash };
  }

  /** Iniciales del avatar (sin «@» ni emojis partidos); vacío = ícono de persona. */
  readonly inicialesDe = inicialesDe;

  irAConexion(): void {
    if (!this.esAdministrador) return;
    this.router.navigate(['/integrations/meta']);
  }

  /**
   * Solo la familia Administrador conecta o desconecta las redes (el servidor responde 403 a los demás). Los demás
   * no ven el botón: ven a quién pedírselo. Sin sesión legible, no se ofrece.
   */
  readonly esAdministrador: boolean = (() => {
    try {
      const usuario = JSON.parse(localStorage.getItem('user') || '{}');
      return esFamiliaAdministrador(usuario && usuario.rol);
    } catch {
      return false;
    }
  })();

  get esTiktok(): boolean {
    return this.canal === 'tiktok';
  }

  trackHilo(_: number, h: MetaHilo): string {
    return h.identidadHash;
  }
}
