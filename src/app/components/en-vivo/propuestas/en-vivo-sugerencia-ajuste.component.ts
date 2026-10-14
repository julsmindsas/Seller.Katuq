import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { PedidoEditable } from '../despachos/grupo-despacho/grupo-despacho.component';
import { EnVivoPropuestasService, HojaAjuste } from './en-vivo-propuestas.service';
import { CONFIRMAR_MS } from './propuestas.reglas';

let contadorDeHojas = 0;

/**
 * Hoja "Ajustar" de la tarjeta de Opttia (D-421): el grupo de despacho de la propuesta a la vista,
 * para cambiar el mensajero o la transportadora, sacar pedidos o pasarlos a otro grupo, y aprobar.
 * Usa el mismo lugar que la ficha (368 px al costado de la escena; en el celular, una hoja desde
 * abajo con velo), pero es una pieza propia: la ficha es de solo lectura y esta sí despacha.
 *
 * Reutiliza `app-en-vivo-grupo-despacho` y `app-en-vivo-fuera-del-plan` tal cual. Aprobar sigue
 * siendo de dos pasos: el botón del grupo pide confirmar y la confirmación dice el efecto real.
 */
@Component({
  selector: 'app-en-vivo-sugerencia-ajuste',
  templateUrl: './en-vivo-sugerencia-ajuste.component.html',
  styleUrls: ['./en-vivo-sugerencia-ajuste.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoSugerenciaAjusteComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() hoja!: HojaAjuste;

  @ViewChild('titulo') titulo?: ElementRef<HTMLElement>;
  @ViewChild('confirmacion') confirmacion?: ElementRef<HTMLButtonElement>;

  readonly idTitulo = `ev-sug-hoja-titulo-${++contadorDeHojas}`;
  /** El botón del grupo ya se tocó una vez: falta confirmar. */
  confirmando = false;

  private temporizador = 0;
  private previo: HTMLElement | null = null;

  constructor(
    private readonly propuestas: EnVivoPropuestasService,
    private readonly zona: NgZone,
    private readonly cd: ChangeDetectorRef
  ) {}

  ngOnChanges(cambios: SimpleChanges): void {
    const antes = cambios['hoja']?.previousValue as HojaAjuste | undefined;
    // Otro grupo, o ya no se puede aprobar: la confirmación pendiente se suelta.
    if (this.confirmando && (!this.hoja || antes?.item.id !== this.hoja.item.id || !this.puedeConfirmar())) this.soltar();
  }

  ngAfterViewInit(): void {
    this.previo = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;
    // El lector de pantalla y el teclado empiezan en el título de la hoja.
    this.titulo?.nativeElement.focus({ preventScroll: true });
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.temporizador);
    this.propuestas.fijarConfirmando(false);
    // El foco vuelve a donde estaba (el botón Ajustar), si sigue en la página.
    if (this.previo && this.previo.isConnected) this.previo.focus({ preventScroll: true });
  }

  cerrar(): void {
    this.soltar();
    this.propuestas.cerrarAjuste();
  }

  // ── El grupo ──────────────────────────────────────────────────────────────

  cambiarMensajero(id: string): void {
    this.propuestas.cambiarMensajero(this.hoja.item.id, id);
  }

  cambiarTransportadora(proveedor: string): void {
    this.propuestas.cambiarTransportadora(this.hoja.item.id, proveedor);
  }

  sacar(p: PedidoEditable): void {
    this.propuestas.sacar(this.hoja.item.id, p);
  }

  mover(p: PedidoEditable, destino: string): void {
    this.propuestas.mover(this.hoja.item.id, p, destino);
  }

  devolver(p: PedidoEditable, destino: string): void {
    if (destino) this.propuestas.mover(null, p, destino);
  }

  abrirPedido(id: string): void {
    this.propuestas.abrirPedido(id);
  }

  // ── Aprobar en dos pasos ──────────────────────────────────────────────────

  /** El botón del grupo ("Aprobar y despachar") es el primer paso: aparece la confirmación con el efecto. */
  pedirConfirmacion(): void {
    if (!this.puedeConfirmar()) return;
    this.propuestas.actividad();
    this.confirmando = true;
    this.propuestas.fijarConfirmando(true);
    window.clearTimeout(this.temporizador);
    this.zona.runOutsideAngular(() => {
      this.temporizador = window.setTimeout(() => this.zona.run(() => {
        this.soltar();
        this.cd.markForCheck();
      }), CONFIRMAR_MS);
    });
    this.cd.markForCheck();
    // El foco pasa al botón de confirmar (el segundo paso queda a un Enter).
    setTimeout(() => this.confirmacion?.nativeElement.focus({ preventScroll: true }));
  }

  confirmar(): void {
    if (!this.confirmando || !this.puedeConfirmar()) return;
    this.soltar();
    this.propuestas.aprobar(this.hoja.item.id);
  }

  soltar(): void {
    window.clearTimeout(this.temporizador);
    if (!this.confirmando) return;
    this.confirmando = false;
    this.propuestas.fijarConfirmando(false);
  }

  alTeclado(ev: KeyboardEvent): void {
    if (ev.key !== 'Escape') return;
    ev.preventDefault();
    ev.stopPropagation();
    if (this.confirmando) this.soltar();
    else this.cerrar();
  }

  trackSacado(_: number, s: { pedido: PedidoEditable }): string {
    return s.pedido.id;
  }

  private puedeConfirmar(): boolean {
    const h = this.hoja;
    return !!h && h.puedeAprobar && !h.bloqueado && !h.aplicando && !h.ocupado && !!h.grupo.pedidos.length;
  }
}
