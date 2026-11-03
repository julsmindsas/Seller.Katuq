import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, Subscription } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { MaestroService } from '../../../../shared/services/maestros/maestro.service';
import { CrearClienteModalComponent } from '../../clientes/crear-cliente-modal/crear-cliente-modal.component';
import {
  CambiarClientePedidoService, ResultadoCambioCliente, VistaPreviaCambioCliente,
} from './cambiar-cliente-pedido.service';

type Paso = 'buscar' | 'revisar';

/** Motivo máximo que acepta el servidor. */
export const MAX_MOTIVO_CAMBIO_CLIENTE = 500;

/**
 * Cambiar el cliente de un pedido creado (ticket 1505, D-670, fase 1). Ventana en dos pasos:
 *  1. Buscar un cliente YA CREADO de la misma empresa (la búsqueda de siempre, `/v1/clients/search`, mínimo
 *     2 caracteres) o crear uno con «Nuevo cliente» (el formulario unificado).
 *  2. Revisar: de quién a quién, qué conserva y qué cambia el pedido, avisos y bloqueos (sin escribir nada),
 *     motivo obligatorio y, si el pedido ya salió o tiene enlace de pago, una confirmación explícita.
 *
 * No calcula ninguna regla: todo lo que dice (bloqueos, avisos, confirmaciones) viene del servidor, que además
 * lo revalida al confirmar. Textos en español fijo (las pantallas de pedidos no traducen).
 */
@Component({
  selector: 'app-cambiar-cliente-pedido',
  templateUrl: './cambiar-cliente-pedido.component.html',
  styleUrls: ['./cambiar-cliente-pedido.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CambiarClientePedidoComponent implements OnInit, OnDestroy {
  /** El pedido de la fila (solo se leen su id, su número, su cliente actual y su versión). */
  @Input() pedido: any = null;

  paso: Paso = 'buscar';
  texto = '';
  buscando = false;
  buscado = false;
  resultados: any[] = [];
  errorBusqueda = '';

  /** El cliente escogido y lo que dijo el servidor sobre cambiarlo. */
  elegido: any = null;
  vista: VistaPreviaCambioCliente | null = null;
  cargandoVista = false;
  errorVista = '';

  motivo = '';
  confirmaDespacho = false;
  confirmaEnlace = false;
  confirmaRecalculo = false;
  guardando = false;
  errorGuardar = '';
  readonly maxMotivo = MAX_MOTIVO_CAMBIO_CLIENTE;

  private busqueda = new Subject<string>();
  private suscripciones = new Subscription();
  private peticion?: Subscription;
  private destruido = false;
  /** La versión del pedido con la que se ABRIÓ esta ventana: va en la vista previa y al confirmar (si alguien lo editó, 409). */
  private versionAlAbrir: string | null = null;

  constructor(
    public activeModal: NgbActiveModal,
    private servicio: CambiarClientePedidoService,
    private maestro: MaestroService,
    private modal: NgbModal,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.versionAlAbrir = this.pedido?.date_upd ? String(this.pedido.date_upd) : null;
    this.suscripciones.add(
      this.busqueda.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((termino) => {
          if (termino.trim().length < 2) {
            this.buscando = false;
            return of(null);
          }
          this.buscando = true;
          this.errorBusqueda = '';
          this.cdr.markForCheck();
          return this.maestro.searchClients(termino.trim(), 10).pipe(
            catchError(() => {
              this.errorBusqueda = 'No pudimos buscar los clientes. Inténtalo de nuevo.';
              return of([] as any[]);
            }),
          );
        }),
      ).subscribe((res: any) => {
        this.buscando = false;
        if (res === null) {
          this.resultados = [];
          this.buscado = false;
        } else {
          this.resultados = Array.isArray(res) ? res : [];
          this.buscado = true;
        }
        this.cdr.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.suscripciones.unsubscribe();
    this.peticion?.unsubscribe();
  }

  // ── Datos del pedido ──
  get numeroPedido(): string {
    return this.pedido?.nroPedido ? String(this.pedido.nroPedido) : '';
  }

  get nombreActual(): string {
    return this.nombreDe(this.pedido?.cliente) || 'Sin cliente';
  }

  get documentoActual(): string {
    return String(this.pedido?.cliente?.documento ?? '').trim();
  }

  nombreDe(c: any): string {
    if (!c) return '';
    return String(c.nombres_completos || c.nombre || [c.nombres, c.apellidos].filter(Boolean).join(' ') || '').trim();
  }

  inicial(c: any): string {
    return (this.nombreDe(c).charAt(0) || '?').toUpperCase();
  }

  // ── Paso 1: buscar ──
  alEscribir(valor: string): void {
    this.texto = valor;
    if (valor.trim().length < 2) {
      this.resultados = [];
      this.buscado = false;
      this.errorBusqueda = '';
    }
    this.busqueda.next(valor);
  }

  get pocosCaracteres(): boolean {
    const n = this.texto.trim().length;
    return n > 0 && n < 2;
  }

  idDe(c: any): string {
    return String((c && (c.cd || c.id)) || '');
  }

  esElActual(c: any): boolean {
    const cd = String(this.pedido?.cliente?.cd || this.pedido?.cliente?.id || '');
    return !!cd && cd === this.idDe(c);
  }

  elegir(c: any): void {
    const id = this.idDe(c);
    if (!id || this.cargandoVista) return;
    this.elegido = c;
    this.cargarVista(id);
  }

  /**
   * Pide la vista previa. `avisoPrevio` es el mensaje de un rechazo al confirmar (otra persona editó el pedido, cambió un pago…):
   * se conserva y se muestra encima de la vista nueva, para que la persona sepa POR QUÉ debe revisar de nuevo.
   */
  private cargarVista(clientId: string, avisoPrevio = ''): void {
    this.peticion?.unsubscribe();
    this.cargandoVista = true;
    this.errorVista = '';
    this.errorGuardar = avisoPrevio;
    this.peticion = this.servicio.vistaPrevia(String(this.pedido?._id || this.pedido?.id || ''), clientId, this.versionAlAbrir).subscribe({
      next: (r) => {
        this.cargandoVista = false;
        this.vista = r.data;
        this.confirmaDespacho = false;
        this.confirmaEnlace = false;
        this.confirmaRecalculo = false;
        this.paso = 'revisar';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargandoVista = false;
        const mensaje = err?.error?.message || 'No pudimos revisar el cambio. Inténtalo de nuevo.';
        if (this.paso === 'revisar') {
          // Se está en el paso Revisar: la vista vieja ya no vale (su huella quedó vieja). Se vuelve a Buscar con el mensaje a la vista.
          this.vista = null;
          this.paso = 'buscar';
        }
        this.errorVista = avisoPrevio && err?.error?.code !== 'STALE_WRITE' ? `${avisoPrevio} ${mensaje}` : mensaje;
        this.errorGuardar = '';
        this.cdr.markForCheck();
      },
    });
  }

  nuevoCliente(): void {
    if (this.guardando || this.cargandoVista) return;
    const ref = this.modal.open(CrearClienteModalComponent, { size: 'lg', centered: true, backdrop: 'static' });
    ref.result.then(
      (resultado: any) => {
        if (this.destruido) return;
        if (!['created', 'existing_found'].includes(resultado?.action) || !resultado?.cliente) return;
        const cliente = resultado.cliente;
        if (this.idDe(cliente)) {
          this.elegir(cliente);
        } else {
          // Sin el id de la ficha no se puede elegir: se busca por su documento y la persona la escoge.
          this.alEscribir(String(cliente.documento || ''));
          this.cdr.markForCheck();
        }
      },
      () => { /* se cerró sin crear */ },
    );
  }

  // ── Paso 2: revisar ──
  volver(): void {
    this.paso = 'buscar';
    this.vista = null;
    this.errorGuardar = '';
    this.errorVista = '';
  }

  get motivoValido(): boolean {
    return this.motivo.trim().length > 0 && this.motivo.length <= this.maxMotivo;
  }

  get faltaConfirmar(): boolean {
    const v = this.vista;
    if (!v) return true;
    return (
      (v.requiere.despacho && !this.confirmaDespacho) ||
      (v.requiere.enlacePago && !this.confirmaEnlace) ||
      (v.requiere.recalculo && !this.confirmaRecalculo)
    );
  }

  get puedeConfirmar(): boolean {
    const v = this.vista;
    return !!v && !v.sinCambios && v.puedeAplicar && !!v.huella && this.motivoValido && !this.faltaConfirmar && !this.guardando;
  }

  confirmar(): void {
    const v = this.vista;
    if (!v || !this.puedeConfirmar) return;
    this.guardando = true;
    this.errorGuardar = '';
    this.peticion?.unsubscribe();
    this.peticion = this.servicio
      .cambiar(v.orderId, {
        clientId: this.idDe(this.elegido),
        motivo: this.motivo.trim(),
        huella: v.huella as string,
        _baseVersion: this.versionAlAbrir,
        confirmaciones: { despacho: this.confirmaDespacho, enlacePago: this.confirmaEnlace, recalculo: this.confirmaRecalculo },
      })
      .subscribe({
        next: (r) => {
          this.guardando = false;
          const datos: ResultadoCambioCliente = r.data;
          this.activeModal.close({ cambio: !datos.sinCambios, datos });
        },
        error: (err) => {
          this.guardando = false;
          const codigo = err?.error?.code;
          const mensaje = err?.error?.message || 'No pudimos cambiar el cliente. Inténtalo de nuevo.';
          if (codigo === 'PREVIEW_STALE' || codigo === 'STALE_WRITE' || codigo === 'CHANGE_BLOCKED' || codigo === 'CONFIRMATION_REQUIRED') {
            // Algo cambió desde que se revisó: se vuelve a pedir la revisión, con el motivo escrito intacto y el porqué a la vista.
            this.cargarVista(this.idDe(this.elegido), mensaje);
          } else {
            this.errorGuardar = mensaje;
          }
          this.cdr.markForCheck();
        },
      });
  }

  cerrar(): void {
    if (this.guardando) return;
    this.activeModal.dismiss('cancelado');
  }

  formatoPesos(n: number | null | undefined): string {
    return `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
  }

  trackId = (_: number, c: any) => this.idDe(c) || _;
  trackMensaje = (_: number, m: { codigo: string }) => m.codigo;
}
