import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject, Subscription, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { environment } from 'src/environments/environment';
import { CompanyFeaturesService } from 'src/app/shared/services/company-features.service';
import { MetaInboxService } from '../../notificaciones/meta-inbox/meta-inbox.service';
import { CANAL_RETORNO_OAUTH, CLAVE_STATE_TIKTOK } from './meta-oauth-return.component';
import {
  MetaCanal,
  MetaConexion,
  MetaConexiones,
} from '../../notificaciones/meta-inbox/models/meta-thread.model';

/**
 * Conexión de las cuentas de Instagram y Facebook de la empresa.
 *
 * Pensada para gente no técnica: un botón por canal, tres estados legibles y
 * cero campos donde pegar tokens o identificadores. El diálogo de Meta se abre
 * en una ventana emergente y lo único que vuelve es un código de autorización
 * que el backend cambia por el token — el token nunca pasa por el navegador.
 *
 * TikTok (D-709) es el tercer canal, detrás de la bandera `tiktokMensajes`. Se conecta igual, pero la
 * dirección de autorización la arma el servidor (no el front) y una cuenta que no sea de empresa
 * verificada se rechaza con un mensaje que se muestra tal cual en su tarjeta.
 */
@Component({
  selector: 'app-meta-channels',
  templateUrl: './meta-channels.component.html',
  styleUrls: ['./meta-channels.component.scss'],
})
export class MetaChannelsComponent implements OnInit, OnDestroy {
  conexiones: MetaConexiones | null = null;
  cargando = true;
  ocupado: MetaCanal | null = null;
  aviso: string | null = null;
  /** Rechazo del servidor al conectar una cuenta (p. ej. TikTok que no es de empresa), dentro de su tarjeta. */
  avisoTarjeta: { canal: MetaCanal; texto: string } | null = null;

  private destroy$ = new Subject<void>();
  private ventana: Window | null = null;
  private escucha?: (e: MessageEvent) => void;
  /** Vigila que la ventana de TikTok no se cierre sin autorizar. */
  private vigilaCierre?: Subscription;
  /** El código ya volvió de la ventana: lo que sigue es hablar con el servidor, no una cancelación. */
  private recibioRetorno = false;
  /** El `state` firmado que devolvió el servidor para el intento de conexión de TikTok en curso. */
  private stateTiktok: string | null = null;
  /** Camino alterno del retorno de TikTok cuando su página corta el vínculo con la ventana (`window.opener`). */
  private canalRetorno?: BroadcastChannel;

  readonly canales: { id: MetaCanal; nombre: string; ayuda: string }[] = [
    {
      id: 'instagram',
      nombre: 'Instagram',
      ayuda:
        'Conecta la cuenta profesional de Instagram de tu negocio para recibir aquí los mensajes directos.',
    },
    {
      id: 'facebook',
      nombre: 'Facebook',
      ayuda:
        'Conecta tu página de Facebook para recibir aquí los mensajes de Messenger.',
    },
  ];

  constructor(
    private servicio: MetaInboxService,
    private zone: NgZone,
    private features: CompanyFeaturesService,
    private translate: TranslateService,
  ) {
    // TikTok (D-709): solo con la bandera de la empresa. Sin ella, las dos tarjetas de siempre.
    if (this.tiktokActivo) {
      this.canales.push({ id: 'tiktok', nombre: 'TikTok', ayuda: '' });
    }
  }

  /** ¿La empresa tiene encendido el canal de TikTok? */
  get tiktokActivo(): boolean {
    return this.features.isEnabled('tiktokMensajes');
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.escucha) window.removeEventListener('message', this.escucha);
    this.vigilaCierre?.unsubscribe();
    this.canalRetorno?.close();
    this.olvidarStateTiktok();
  }

  /** Guarda el `state` del intento (también para la página de retorno) o lo borra. Sin almacenamiento, sigue en memoria. */
  private guardarStateTiktok(state: string | null): void {
    this.stateTiktok = state;
    try {
      if (state) localStorage.setItem(CLAVE_STATE_TIKTOK, state);
      else localStorage.removeItem(CLAVE_STATE_TIKTOK);
    } catch {
      // almacenamiento bloqueado: el retorno igual se reconoce por el `state` de la URL
    }
  }

  private olvidarStateTiktok(): void {
    this.guardarStateTiktok(null);
  }

  private cargar(): void {
    this.cargando = true;
    this.servicio
      .obtenerConexiones()
      .pipe(takeUntil(this.destroy$))
      .subscribe((c) => {
        this.conexiones = c;
        this.cargando = false;
      });
  }

  estadoDe(canal: MetaCanal): MetaConexion | null {
    return this.conexiones ? this.conexiones[canal] || null : null;
  }

  /**
   * Etiqueta visible del estado. Un solo lugar donde se nombran. Con la bandera de TikTok apagada, los
   * textos son los de siempre (D-709: sin la bandera, la tarjeta queda idéntica); con ella, traducidos.
   */
  etiqueta(canal: MetaCanal): string {
    const estado = this.estadoDe(canal)?.estado;
    if (!this.tiktokActivo) {
      if (estado === 'conectado') return 'Conectado';
      if (estado === 'reconectar') return 'Hay que reconectar';
      return 'Sin conectar';
    }
    switch (estado) {
      case 'conectado':
        return this.translate.instant('integrations.metaChannels.estadoConectado');
      case 'reconectar':
        return this.translate.instant('integrations.metaChannels.estadoReconectar');
      default:
        return this.translate.instant('integrations.metaChannels.estadoSinConectar');
    }
  }

  /** Explicación de qué significa el estado y qué debe hacer el usuario. */
  explicacion(canal: MetaCanal): string {
    const c = this.estadoDe(canal);
    if (canal === 'tiktok') {
      switch (c?.estado) {
        case 'conectado':
          return this.translate.instant('integrations.metaChannels.tiktokConectada', {
            cuenta: c.cuentaNombre || this.translate.instant('integrations.metaChannels.tuCuenta'),
          });
        case 'reconectar':
          return this.translate.instant('integrations.metaChannels.tiktokReconectar');
        default:
          return this.translate.instant('integrations.metaChannels.tiktokAyuda');
      }
    }
    switch (c?.estado) {
      case 'conectado':
        return `Estás recibiendo los mensajes de ${c.cuentaNombre || 'tu cuenta'}.`;
      case 'reconectar':
        return 'El permiso se venció o lo revocaron. Mientras tanto no llegan mensajes nuevos.';
      default:
        return this.canales.find((x) => x.id === canal)?.ayuda || '';
    }
  }

  /**
   * ¿Se muestra la cuenta enlazada?
   *
   * Solo cuando el canal está vivo. Con "reconectar" también, porque ahí saber
   * cuál cuenta se cayó es justo lo que el usuario necesita. Desconectado, no:
   * una tarjeta que dice "Sin conectar" y debajo muestra una cuenta se lee como
   * que la desconexión no funcionó.
   */
  muestraCuenta(canal: MetaCanal): boolean {
    const estado = this.estadoDe(canal)?.estado;
    return (
      Boolean(this.estadoDe(canal)?.cuentaNombre) &&
      (estado === 'conectado' || estado === 'reconectar')
    );
  }

  textoBoton(canal: MetaCanal): string {
    const reconectar = this.estadoDe(canal)?.estado === 'reconectar';
    if (!this.tiktokActivo) return reconectar ? 'Reconectar' : 'Conectar';
    return this.translate.instant(reconectar ? 'notificaciones.meta.reconnect' : 'notificaciones.meta.connect');
  }

  /** Lo que dice el botón de conectar mientras la ventana está abierta. */
  textoOcupado(canal: MetaCanal): string {
    return this.translate.instant(
      canal === 'tiktok' ? 'integrations.metaChannels.abriendoTiktok' : 'integrations.metaChannels.abriendoMeta',
    );
  }

  /**
   * Abre el diálogo de Meta en una ventana emergente. Al terminar, la página de
   * retorno le envía el código a esta ventana por `postMessage`.
   */
  conectar(canal: MetaCanal): void {
    if (this.ocupado) return;
    this.aviso = null;
    this.avisoTarjeta = null;

    if (canal === 'tiktok') {
      this.conectarTiktok();
      return;
    }

    const appId = (environment as any).metaAppId;
    if (!appId) {
      this.aviso =
        'Falta configurar la aplicación de Meta. Avísale al equipo técnico antes de continuar.';
      return;
    }

    const configId = (environment as any).metaLoginConfigId;
    if (!configId) {
      this.aviso =
        'Falta la configuración de inicio de sesión de Meta. Avísale al equipo técnico.';
      return;
    }

    const redirectUri = `${window.location.origin}/integrations/meta/retorno`;

    // Facebook Login for Business NO usa `scope`: los permisos y los activos
    // (páginas y cuentas de Instagram) los define la configuración del lado de
    // Meta y se referencian por `config_id`. Mandar `scope` aquí no tiene efecto.
    const url =
      `https://www.facebook.com/v21.0/dialog/oauth` +
      `?client_id=${encodeURIComponent(appId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&config_id=${encodeURIComponent(configId)}` +
      `&response_type=code` +
      `&state=${encodeURIComponent(canal)}`;

    this.ocupado = canal;
    this.escuchaRetorno(canal, redirectUri);
    this.ventana = window.open(url, 'meta_login', 'width=600,height=740');

    if (!this.ventana) {
      this.ocupado = null;
      this.aviso =
        'El navegador bloqueó la ventana de Meta. Permite las ventanas emergentes de este sitio e intenta de nuevo.';
    }
  }

  /**
   * TikTok (D-709). La ventana se abre en el mismo clic, en blanco, y recién después se le pide al
   * servidor la dirección de autorización: abrirla cuando la respuesta llega sería una ventana que la
   * persona no pidió, y el navegador la bloquearía.
   */
  private conectarTiktok(): void {
    const redirectUri = `${window.location.origin}/integrations/meta/retorno`;

    this.ocupado = 'tiktok';
    this.recibioRetorno = false;
    this.olvidarStateTiktok();
    this.ventana = window.open('', 'tiktok_login', 'width=600,height=740');

    if (!this.ventana) {
      this.ocupado = null;
      this.aviso = this.translate.instant('integrations.metaChannels.tiktokBloqueo');
      return;
    }

    this.escuchaRetorno('tiktok', redirectUri);

    this.servicio
      .autorizarTiktok(redirectUri)
      .pipe(takeUntil(this.destroy$))
      .subscribe((autorizacion) => {
        // La persona pudo cerrar la ventana mientras el servidor respondía: no hay nada que abrir.
        if (!this.ventana || this.ventana.closed) {
          this.ocupado = null;
          return;
        }
        if (!autorizacion.url) {
          this.ventana.close();
          this.ocupado = null;
          this.aviso =
            autorizacion.error?.message || this.translate.instant('integrations.metaChannels.tiktokSinAutorizacion');
          return;
        }
        this.guardarStateTiktok(autorizacion.state);
        this.ventana.location.href = autorizacion.url;
        this.vigilarCierreDeVentana();
      });
  }

  /**
   * Si la ventana de TikTok se cierra sin que haya vuelto ningún código, la persona canceló: se libera el
   * botón para intentar de nuevo. Con el código ya recibido no se toca nada (la ventana se cierra sola
   * después de entregarlo). No se muestra error: cuando la página de TikTok corta el vínculo con la
   * ventana, el navegador la da por cerrada aunque la persona siga autorizando, y el código llegaría
   * después por el canal alterno.
   */
  private vigilarCierreDeVentana(): void {
    this.vigilaCierre?.unsubscribe();
    this.vigilaCierre = interval(500)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.ventana && !this.ventana.closed) return;
        this.vigilaCierre?.unsubscribe();
        if (this.recibioRetorno) return;
        this.ocupado = null;
      });
  }

  private escuchaRetorno(canal: MetaCanal, redirectUri: string): void {
    if (this.escucha) window.removeEventListener('message', this.escucha);
    this.canalRetorno?.close();
    this.canalRetorno = undefined;

    const alRecibir = (datos: any) => {
      if (!datos || datos.tipo !== 'meta_oauth') return;
      // El regreso de TikTok trae el `state` que firmó el servidor: uno distinto es de otra conexión y no es
      // para esta tarjeta.
      if (canal === 'tiktok' && datos.state && this.stateTiktok && datos.state !== this.stateTiktok) return;
      // El código se usa una sola vez: si llega por los dos caminos, el segundo se ignora.
      if (canal === 'tiktok' && this.recibioRetorno) return;

      this.zone.run(() => {
        const code = datos.code;
        this.recibioRetorno = true;
        if (!code) {
          this.ocupado = null;
          this.aviso =
            canal === 'tiktok'
              ? this.translate.instant('integrations.metaChannels.tiktokNoCompletada')
              : 'No se completó la conexión con Meta. Puedes intentarlo de nuevo.';
          return;
        }
        if (canal === 'tiktok') {
          this.completarTiktok(code, redirectUri);
          return;
        }
        this.servicio
          .conectar(canal, code, redirectUri)
          .pipe(takeUntil(this.destroy$))
          .subscribe((c) => {
            this.ocupado = null;
            if (c) {
              this.conexiones = c;
            } else {
              this.aviso =
                'No pudimos completar la conexión. Revisa que la cuenta tenga permisos de administrador e intenta otra vez.';
            }
          });
      });
    };

    this.escucha = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      alRecibir(e.data);
    };
    window.addEventListener('message', this.escucha);

    if (canal === 'tiktok' && typeof BroadcastChannel !== 'undefined') {
      this.canalRetorno = new BroadcastChannel(CANAL_RETORNO_OAUTH);
      this.canalRetorno.onmessage = (e: MessageEvent) => alRecibir(e.data);
    }
  }

  /** Cambia el código de TikTok por la conexión. Una cuenta no apta vuelve con su mensaje, que se muestra tal cual. */
  private completarTiktok(code: string, redirectUri: string): void {
    this.ocupado = 'tiktok';
    this.aviso = null;
    this.servicio
      .conectarTiktok(code, redirectUri, this.stateTiktok)
      .pipe(takeUntil(this.destroy$))
      .subscribe((r) => {
        this.olvidarStateTiktok();
        if (r.conexiones) {
          this.ocupado = null;
          this.conexiones = r.conexiones;
          return;
        }
        if (r.ok) {
          // Conectó, pero la respuesta no trajo el estado: se vuelve a pedir.
          this.recargarEnSilencio(() => (this.ocupado = null));
          return;
        }
        this.ocupado = null;
        this.avisoTarjeta = {
          canal: 'tiktok',
          texto: r.error?.message || this.translate.instant('integrations.metaChannels.tiktokErrorGenerico'),
        };
      });
  }

  /** Vuelve a leer las conexiones sin esconder las tarjetas. */
  private recargarEnSilencio(alTerminar?: () => void): void {
    this.servicio
      .obtenerConexiones()
      .pipe(takeUntil(this.destroy$))
      .subscribe((c) => {
        if (c) this.conexiones = c;
        if (alTerminar) alTerminar();
      });
  }

  async desconectar(canal: MetaCanal): Promise<void> {
    if (this.ocupado) return;

    // TikTok pide confirmar: desconectar borra el acceso guardado y corta el envío y la recepción.
    if (canal === 'tiktok') {
      const cuenta =
        this.estadoDe('tiktok')?.cuentaNombre || this.translate.instant('integrations.metaChannels.tuCuenta');
      const r = await Swal.fire({
        title: this.translate.instant('integrations.metaChannels.desconectarTiktokTitulo'),
        text: this.translate.instant('integrations.metaChannels.desconectarTiktokTexto', { cuenta }),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: this.translate.instant('integrations.metaChannels.desconectarTiktokConfirmar'),
        cancelButtonText: this.translate.instant('comun.cancelar'),
        confirmButtonColor: '#D64545',
        reverseButtons: true,
      });
      if (!r.isConfirmed) return;
    }

    this.ocupado = canal;
    this.aviso = null;
    this.avisoTarjeta = null;

    this.servicio
      .desconectar(canal)
      .pipe(takeUntil(this.destroy$))
      .subscribe((c) => {
        this.ocupado = null;
        if (c) {
          this.conexiones = c;
          return;
        }
        if (canal === 'tiktok') {
          this.aviso = this.translate.instant('integrations.metaChannels.desconectarTiktokError');
          this.recargarEnSilencio();
        }
      });
  }
}
