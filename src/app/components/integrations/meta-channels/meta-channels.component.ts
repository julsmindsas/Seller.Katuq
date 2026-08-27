import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { MetaInboxService } from '../../notificaciones/meta-inbox/meta-inbox.service';
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

  private destroy$ = new Subject<void>();
  private ventana: Window | null = null;
  private escucha?: (e: MessageEvent) => void;

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
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.escucha) window.removeEventListener('message', this.escucha);
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
    return this.conexiones ? this.conexiones[canal] : null;
  }

  /** Etiqueta visible del estado. Un solo lugar donde se nombran. */
  etiqueta(canal: MetaCanal): string {
    switch (this.estadoDe(canal)?.estado) {
      case 'conectado':
        return 'Conectado';
      case 'reconectar':
        return 'Hay que reconectar';
      default:
        return 'Sin conectar';
    }
  }

  /** Explicación de qué significa el estado y qué debe hacer el usuario. */
  explicacion(canal: MetaCanal): string {
    const c = this.estadoDe(canal);
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
    return this.estadoDe(canal)?.estado === 'reconectar' ? 'Reconectar' : 'Conectar';
  }

  /**
   * Abre el diálogo de Meta en una ventana emergente. Al terminar, la página de
   * retorno le envía el código a esta ventana por `postMessage`.
   */
  conectar(canal: MetaCanal): void {
    if (this.ocupado) return;
    this.aviso = null;

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

  private escuchaRetorno(canal: MetaCanal, redirectUri: string): void {
    if (this.escucha) window.removeEventListener('message', this.escucha);

    this.escucha = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (!e.data || e.data.tipo !== 'meta_oauth') return;

      this.zone.run(() => {
        const code = e.data.code;
        if (!code) {
          this.ocupado = null;
          this.aviso = 'No se completó la conexión con Meta. Puedes intentarlo de nuevo.';
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

    window.addEventListener('message', this.escucha);
  }

  desconectar(canal: MetaCanal): void {
    if (this.ocupado) return;
    this.ocupado = canal;
    this.aviso = null;

    this.servicio
      .desconectar(canal)
      .pipe(takeUntil(this.destroy$))
      .subscribe((c) => {
        this.ocupado = null;
        if (c) this.conexiones = c;
      });
  }
}
