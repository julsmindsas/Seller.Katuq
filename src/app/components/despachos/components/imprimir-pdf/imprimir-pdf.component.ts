import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Pedido } from '../../../ventas/modelo/pedido';
import { PaymentService } from '../../../../shared/services/ventas/payment.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { descargarPdfAislado, imprimirAislado, TiempoAgotadoError } from '../../../../shared/utils/impresion-aislada';

@Component({
  selector: 'app-imprimir-pdf',
  templateUrl: './imprimir-pdf.component.html',
  styleUrls: ['./imprimir-pdf.component.scss']
})
export class ImprimirPdfComponent implements OnInit, OnChanges {
  @Input() pedido!: Pedido;
  @Input() htmlContent: string | SafeHtml = '';

  @Output() onClose = new EventEmitter<void>();
  @Output() onPrint = new EventEmitter<void>();

  @ViewChild('vistaPrevia') vistaPrevia?: ElementRef<HTMLElement>;

  safeHtmlContent: SafeHtml = '';
  isLoadingContent: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';
  isGeneratingPDF: boolean = false;
  isPrinting: boolean = false;

  constructor(
    private paymentService: PaymentService,
    private sanitizer: DomSanitizer,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    if (this.pedido && !this.htmlContent) {
      this.loadHtmlContent();
    } else {
      this.setHtmlContent(this.htmlContent);
    }
  }

  // Ticket 1053/1151: el padre reemplaza el aviso "Cargando datos maestros..." por el
  // pedido cuando llegan los maestros; sin esto la vista se quedaba con el aviso.
  ngOnChanges(changes: SimpleChanges): void {
    const cambio = changes['htmlContent'];
    if (cambio && !cambio.firstChange && cambio.currentValue) {
      this.hasError = false;
      this.setHtmlContent(cambio.currentValue);
    }
  }

  get ocupado(): boolean {
    return this.isLoadingContent || this.hasError || this.isGeneratingPDF || this.isPrinting;
  }

  private loadHtmlContent(): void {
    this.isLoadingContent = true;
    this.hasError = false;
    this.errorMessage = '';

    // Usar el método observable para mejor manejo de estados
    this.paymentService.getHtmlContentObservable(this.pedido).subscribe({
      next: (content) => {
        this.isLoadingContent = false;
        if (content) {
          this.setHtmlContent(content);
        } else {
          this.setErrorState('No hay contenido disponible para mostrar');
        }
      },
      error: (error) => {
        console.error('Error loading HTML content:', error);
        this.isLoadingContent = false;
        this.setErrorState(`Error cargando contenido: ${error.message || 'Error desconocido'}`);
      }
    });
  }

  private setHtmlContent(content: string | SafeHtml): void {
    // Asegurarse de que htmlContent sea SafeHtml
    if (typeof content === 'string') {
      this.safeHtmlContent = this.sanitizer.bypassSecurityTrustHtml(content);
    } else {
      this.safeHtmlContent = content;
    }
    this.htmlContent = content;
  }

  private setErrorState(message: string): void {
    this.hasError = true;
    this.errorMessage = message;
    const errorHtml = `
      <div class="alert alert-danger text-center p-4">
        <h6>⚠️ Error cargando contenido</h6>
        <p>${message}</p>
        <button class="btn btn-outline-danger btn-sm mt-2" onclick="window.location.reload()">
          Recargar página
        </button>
      </div>
    `;
    this.safeHtmlContent = this.sanitizer.bypassSecurityTrustHtml(errorHtml);
  }

  retryLoadContent(): void {
    if (this.pedido) {
      this.loadHtmlContent();
    }
  }

  closeModal(): void {
    this.onClose.emit();
  }

  /** Lo que se ve en la vista previa es exactamente lo que se imprime. */
  private contenidoVistaPrevia(): string | null {
    const html = this.vistaPrevia?.nativeElement?.innerHTML?.trim();
    return html ? html : null;
  }

  private get tituloDocumento(): string {
    return this.pedido?.nroPedido ? `pedido-${this.pedido.nroPedido}` : `pedido-${Date.now()}`;
  }

  /** Ticket 1151: diálogo de impresión del navegador (imprimir o "Guardar como PDF"). */
  async imprimir(): Promise<void> {
    if (this.ocupado) {
      if (this.hasError) this.retryLoadContent();
      return;
    }
    const contenido = this.contenidoVistaPrevia();
    if (!contenido) return;

    this.isPrinting = true;
    try {
      await imprimirAislado(contenido, this.tituloDocumento);
      this.onPrint.emit();
    } catch (error) {
      console.error('Error preparando la impresión:', error);
      this.toastr.error('No se pudo abrir la impresión. Intenta de nuevo.', 'Imprimir');
    } finally {
      this.isPrinting = false;
    }
  }

  /** Descarga como archivo PDF; con tope de tiempo para que nunca quede girando. */
  async descargarPdf(): Promise<void> {
    if (this.ocupado) {
      if (this.hasError) this.retryLoadContent();
      return;
    }
    const contenido = this.contenidoVistaPrevia();
    if (!contenido) return;

    this.isGeneratingPDF = true;
    try {
      await descargarPdfAislado(contenido, this.tituloDocumento, `${this.tituloDocumento}.pdf`);
      this.onPrint.emit();
    } catch (error) {
      console.error('Error generando PDF:', error);
      const mensaje = error instanceof TiempoAgotadoError
        ? 'El PDF tardó demasiado. Usa "Imprimir" y elige "Guardar como PDF".'
        : 'No se pudo generar el PDF. Usa "Imprimir" y elige "Guardar como PDF".';
      this.toastr.warning(mensaje, 'Descargar PDF');
    } finally {
      this.isGeneratingPDF = false;
    }
  }
}
