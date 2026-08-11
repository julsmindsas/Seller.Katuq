import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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

  constructor(
    private router: Router,
    private servicio: MetaInboxService,
  ) {}

  ngOnInit(): void {
    // El canal sale de la URL (`/notificaciones/instagram/inbox`), no de una
    // config aparte: así no puede quedar desincronizado con la ruta ni con el
    // menú. La misma pantalla sirve los dos buzones.
    this.canal = this.router.url.includes('/facebook/') ? 'facebook' : 'instagram';
    this.canalLabel = META_CANAL_LABEL[this.canal];
    this.reiniciar();
    this.cargarConexion();
    this.cargarHilos();
    this.arrancarRefrescoAutomatico();
  }

  ngOnDestroy(): void {
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
   * Tres frenos, todos por una razón:
   *  - **Pestaña oculta**: no se pollea. Cada tick cuesta lecturas de Firestore
   *    y nadie está mirando (D-117 en el canal de WhatsApp).
   *  - **Enviando**: no se pisa la pantalla en mitad de un envío.
   *  - **Escribiendo**: si el operador tiene texto a medias, no se le refresca
   *    la conversación debajo.
   */
  private arrancarRefrescoAutomatico(): void {
    interval(8000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (document.hidden) return;
        if (this.enviando) return;
        if ((this.borrador || '').trim().length > 0) return;

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
      });
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
