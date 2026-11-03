import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { CarteraService } from '../../services/cartera/cartera.service';
import {
  CanalRecordatorio,
  ConfigRecordatorio,
  DestinatarioRecordatorio,
  EventoRecordatorio,
  OmisionRecordatorio,
  RecordatorioEnviado,
  RecordatorioVistaPrevia,
} from '../../services/cartera/cartera.models';

/**
 * Tickets 1385 y 1457: ventana de «Recordar pago». La usan Cartera (por cliente, por pedido y masivo) y
 * «Sin pago» de Tesorería (por fila). Pieza independiente para que los dos módulos la abran igual.
 *
 * Lo que muestra de plata (saldo, pedidos, costo) lo calcula el servidor: aquí solo se escogen destinatarios
 * y canal, se edita la plantilla del correo (Administrador) y se confirma. La vista previa no envía nada;
 * el envío repite las validaciones y recalcula el saldo.
 */
@Component({
  selector: 'app-recordatorio-cobro-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './recordatorio-cobro-modal.component.html',
  styleUrls: ['./recordatorio-cobro-modal.component.scss'],
})
export class RecordatorioCobroModalComponent implements OnInit, OnDestroy {
  /** A quién se le recuerda: clientes (con o sin lista de pedidos) o solo pedidos (la fila). */
  @Input() destinatarios: DestinatarioRecordatorio[] = [];
  /** El rol actual es de la familia Administrador: puede editar la plantilla (el servidor lo vuelve a exigir). */
  @Input() esAdmin = false;

  canal: CanalRecordatorio = 'correo';
  vista: RecordatorioVistaPrevia | null = null;
  cargando = false;
  enviando = false;
  error = '';
  resultado: RecordatorioEnviado | null = null;
  /** Un cambio de plantilla se guardó o se envió algo: al cerrar se avisa a la pantalla. */
  private huboCambio = false;

  /** Destinatarios con el texto abierto. */
  abiertos = new Set<string>();

  // ── Plantilla del correo (Administrador) ───────────────────────────────────
  config: ConfigRecordatorio | null = null;
  editando = false;
  guardandoConfig = false;
  borrador = { asunto: '', texto: '', maxPorLote: 50, incluirLinkPago: false };
  errorConfig = '';

  // ── Historial (un solo cliente) ────────────────────────────────────────────
  historial: EventoRecordatorio[] = [];
  historialAbierto = false;
  cargandoHistorial = false;

  private sub?: Subscription;
  private pedido = 0;

  constructor(
    public activeModal: NgbActiveModal,
    private carteraService: CarteraService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarVista();
    this.carteraService.getConfigRecordatorio().subscribe({
      next: (c) => {
        this.config = c;
        this.cdr.markForCheck();
      },
      error: () => {
        this.config = null;
      },
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get documentoUnico(): string {
    const docs = this.destinatarios.map((d) => d.documento || '').filter(Boolean);
    return this.destinatarios.length === 1 && docs.length === 1 ? docs[0] : '';
  }

  get titulo(): string {
    const n = this.destinatarios.length;
    if (n > 1) return this.translate.instant('cartera.recordatorio.tituloVarios', { n });
    const d = this.destinatarios[0];
    return d && d.orderIds && d.orderIds.length === 1 && !d.documento
      ? this.translate.instant('cartera.recordatorio.tituloPedido')
      : this.translate.instant('cartera.recordatorio.titulo');
  }

  cambiarCanal(canal: CanalRecordatorio): void {
    if (this.canal === canal || this.enviando) return;
    this.canal = canal;
    this.cargarVista();
  }

  cargarVista(): void {
    this.sub?.unsubscribe();
    const mio = ++this.pedido;
    this.cargando = true;
    this.error = '';
    this.vista = null;
    this.sub = this.carteraService.recordatorioVistaPrevia(this.canal, this.destinatarios).subscribe({
      next: (v) => {
        if (mio !== this.pedido) return;
        this.vista = v;
        this.cargando = false;
        // Con un solo destinatario el texto ya se ve abierto.
        if (v.enviables.length === 1) this.abiertos.add(this.claveDe(v.enviables[0].cliente));
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (mio !== this.pedido) return;
        this.error = this.mensajeDe(err);
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  claveDe(c: { documento?: string; nombre?: string }): string {
    return c.documento || c.nombre || '';
  }

  alternar(clave: string): void {
    if (this.abiertos.has(clave)) this.abiertos.delete(clave);
    else this.abiertos.add(clave);
  }

  get puedeEnviar(): boolean {
    return !!this.vista && this.vista.canalDisponible && this.vista.total > 0 && !this.cargando && !this.enviando && !this.resultado &&
      (this.canal !== 'whatsapp' || this.vista.costo.saldoSuficiente);
  }

  get saldoTotal(): number {
    return (this.vista?.enviables || []).reduce((s, e) => s + (Number(e.saldo) || 0), 0);
  }

  enviar(): void {
    if (!this.puedeEnviar) return;
    this.enviando = true;
    this.error = '';
    this.carteraService.recordatorioEnviar(this.canal, this.destinatarios).subscribe({
      next: (r) => {
        this.resultado = r;
        this.enviando = false;
        if (r.enviados > 0) this.huboCambio = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.enviando = false;
        this.error = this.mensajeDe(err);
        this.cdr.markForCheck();
      },
    });
  }

  /** Motivos de omisión agrupados para el resumen («3 sin correo, 1 ya recordado hoy»). */
  resumenOmitidos(lista: { motivoTexto?: string; motivo?: string }[]): string {
    const cuenta = new Map<string, number>();
    lista.forEach((o) => {
      const t = o.motivoTexto || o.motivo || '';
      cuenta.set(t, (cuenta.get(t) || 0) + 1);
    });
    return Array.from(cuenta.entries()).map(([t, n]) => `${n} · ${t}`).join('; ');
  }

  nombreDeOmitido(o: OmisionRecordatorio): string {
    return o.cliente?.nombre || o.cliente?.documento || o.nroPedido || '—';
  }

  trackPorClave(_i: number, e: { cliente: { documento?: string; nombre?: string } }): string {
    return this.claveDe(e.cliente);
  }

  // ── Plantilla ──────────────────────────────────────────────────────────────
  abrirEditor(): void {
    if (!this.config) return;
    this.borrador = {
      asunto: this.config.correo.asunto,
      texto: this.config.correo.texto,
      maxPorLote: this.config.maxPorLote,
      incluirLinkPago: this.config.incluirLinkPago,
    };
    this.errorConfig = '';
    this.editando = true;
  }

  usarPlantillaBase(): void {
    if (!this.config) return;
    this.borrador = { ...this.borrador, asunto: this.config.defecto.asunto, texto: this.config.defecto.texto };
  }

  insertarVariable(nombre: string, campo: HTMLTextAreaElement): void {
    const marca = `{${nombre}}`;
    const ini = campo.selectionStart ?? this.borrador.texto.length;
    const fin = campo.selectionEnd ?? ini;
    this.borrador.texto = this.borrador.texto.slice(0, ini) + marca + this.borrador.texto.slice(fin);
    setTimeout(() => {
      campo.focus();
      campo.setSelectionRange(ini + marca.length, ini + marca.length);
    });
  }

  guardarPlantilla(): void {
    if (this.guardandoConfig) return;
    this.guardandoConfig = true;
    this.errorConfig = '';
    this.carteraService
      .guardarConfigRecordatorio({
        correo: { asunto: this.borrador.asunto, texto: this.borrador.texto },
        maxPorLote: Number(this.borrador.maxPorLote),
        incluirLinkPago: !!this.borrador.incluirLinkPago,
      })
      .subscribe({
        next: (c) => {
          this.config = c;
          this.guardandoConfig = false;
          this.editando = false;
          this.cargarVista(); // la vista previa vuelve a armar los mensajes con la plantilla nueva
        },
        error: (err) => {
          this.guardandoConfig = false;
          this.errorConfig = this.mensajeDe(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ── Historial ──────────────────────────────────────────────────────────────
  alternarHistorial(): void {
    this.historialAbierto = !this.historialAbierto;
    if (this.historialAbierto && !this.historial.length && this.documentoUnico && !this.cargandoHistorial) {
      this.cargandoHistorial = true;
      const unico = this.destinatarios[0];
      const orderId = !unico.documento && unico.orderIds && unico.orderIds.length === 1 ? unico.orderIds[0] : undefined;
      this.carteraService.recordatorioHistorial(this.documentoUnico, orderId).subscribe({
        next: (r) => {
          this.historial = r.eventos || [];
          this.cargandoHistorial = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.cargandoHistorial = false;
          this.cdr.markForCheck();
        },
      });
    }
  }

  cerrar(): void {
    if (this.huboCambio) this.activeModal.close({ changed: true });
    else this.activeModal.dismiss();
  }

  /** Mensaje de un error de la API: el del servidor (ya viene en español sencillo) o uno genérico. */
  private mensajeDe(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 403) {
        const code = err.error && err.error.code;
        return this.translate.instant(code === 'FEATURE_DISABLED' ? 'cartera.recordatorio.errorNoActivo' : 'cartera.acciones.errorPermiso');
      }
      const m = err.error && typeof err.error.message === 'string' ? err.error.message : '';
      if (m && err.status >= 400 && err.status < 500) return m;
    }
    return this.translate.instant('cartera.acciones.errorGeneral');
  }
}

/**
 * Abre la ventana de «Recordar pago». Devuelve `true` si se envió algo (la pantalla puede volver a pedir
 * la cartera para mostrar la última gestión).
 */
export function abrirRecordatorioCobro(modal: NgbModal, destinatarios: DestinatarioRecordatorio[], esAdmin: boolean): Promise<boolean> {
  const ref = modal.open(RecordatorioCobroModalComponent, { size: 'lg', centered: true, scrollable: true });
  const instancia = ref.componentInstance as RecordatorioCobroModalComponent;
  instancia.destinatarios = destinatarios;
  instancia.esAdmin = esAdmin;
  return ref.result.then(
    (res: { changed?: boolean } | undefined) => !!(res && res.changed),
    () => false,
  );
}
