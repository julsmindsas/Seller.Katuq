import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Pedido } from '../../../ventas/modelo/pedido';
import { PaymentService } from '../../../../shared/services/ventas/payment.service';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-imprimir-pdf',
  templateUrl: './imprimir-pdf.component.html',
  styleUrls: ['./imprimir-pdf.component.scss']
})
export class ImprimirPdfComponent implements OnInit {
  @Input() pedido!: Pedido;
  @Input() htmlContent: string | SafeHtml = '';
  
  @Output() onClose = new EventEmitter<void>();
  @Output() onPrint = new EventEmitter<void>();
  
  safeHtmlContent: SafeHtml = '';
  isLoadingContent: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';
  
  constructor(
    private paymentService: PaymentService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    if (this.pedido && !this.htmlContent) {
      this.loadHtmlContent();
    } else {
      this.setHtmlContent(this.htmlContent);
    }
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
  
  imprimirPdf(): void {
    // Verificar que el contenido esté listo
    if (this.isLoadingContent) {
      console.warn('Content is still loading, cannot generate PDF yet');
      return;
    }

    if (this.hasError) {
      console.warn('Content has errors, cannot generate PDF');
      this.retryLoadContent();
      return;
    }

    const printContent = document.getElementById('htmlPdf');
    if (printContent) {
      // Opciones para mejorar la calidad de la imagen generada por html2canvas
      const options = {
        scale: 3, // Aumentar la escala para una mayor resolución
        useCORS: true, // Permitir cargar imágenes de otros orígenes
        logging: false,
        width: printContent.scrollWidth,
        height: printContent.scrollHeight,
      };

      html2canvas(printContent, options).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'landscape', // Cambiado a horizontal
          unit: 'mm',
          format: 'a4'
        });
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Calcular la altura de la imagen en el PDF manteniendo la proporción
        const ratio = canvasWidth / canvasHeight;
        const imgWidth = pageWidth;
        const imgHeight = imgWidth / ratio;
        
        let heightLeft = imgHeight;
        let position = 0;

        // Agregar la primera página
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Agregar páginas adicionales si el contenido es más alto que una página
        while (heightLeft > 0) {
          position -= pageHeight; // Mover la posición de la imagen hacia arriba para la siguiente página
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        
        if (this.pedido && this.pedido.nroPedido) {
          pdf.save(`pedido-${this.pedido.nroPedido}.pdf`);
        } else {
          pdf.save(`pedido-${new Date().getTime()}.pdf`);
        }
        
        this.onPrint.emit();
      });
    }
  }
} 