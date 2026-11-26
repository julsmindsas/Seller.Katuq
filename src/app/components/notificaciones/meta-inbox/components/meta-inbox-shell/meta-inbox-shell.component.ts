import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { LoaderService } from 'src/app/shared/services/loader.service';

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
export class MetaInboxShellComponent implements OnInit, OnDestroy {
  canal: MetaCanal = 'instagram';
  canalLabel = '';

  conexion: MetaConexion | null = null;
  cargandoConexion = true;

  hilos: MetaHilo[] = [];
  cargandoHilos = false;

  hiloActivo: MetaHilo | null = null;

  /** La conversación abierta: dice si hay un envío o texto a medias para no pisarla con el refresco. */
  @ViewChild(MetaHiloDetalleComponent) private detalle?: MetaHiloDetalleComponent;

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

        this.refrescarHilosEnSilencio();
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
  }

  irAConexion(): void {
    this.router.navigate(['/integrations/meta']);
  }

  get esTiktok(): boolean {
    return this.canal === 'tiktok';
  }

  trackHilo(_: number, h: MetaHilo): string {
    return h.identidadHash;
  }
}
