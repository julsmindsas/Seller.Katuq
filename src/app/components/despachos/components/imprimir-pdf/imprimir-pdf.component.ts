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
  
  constructor(
    private paymentService: PaymentService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    if (this.pedido && !this.htmlContent) {
      const content = this.paymentService.getHtmlContent(this.pedido);
      if (content) {
        this.htmlContent = content;
      } else {
        this.htmlContent = '<div class="text-center p-3"><p>No hay contenido disponible para mostrar</p></div>';
      }
    }
    
    // Asegurarse de que htmlContent sea SafeHtml
    if (typeof this.htmlContent === 'string') {
      this.safeHtmlContent = this.sanitizer.bypassSecurityTrustHtml(this.htmlContent);
    } else {
      this.safeHtmlContent = this.htmlContent;
    }
  }
  
  imprimirPdf(): void {
    const printContent = document.getElementById('htmlPdf');
    if (printContent) {
      html2canvas(printContent).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        const ratio = canvasWidth / canvasHeight;
        const imgWidth = pageWidth;
        const imgHeight = imgWidth / ratio;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        if (this.pedido && this.pedido.nroPedido) {
          pdf.save(`pedido-${this.pedido.nroPedido}.pdf`);
        } else {
          pdf.save(`pedido-${new Date().getTime()}.pdf`);
        }
        
        this.onPrint.emit();
      });
    }
  }
  
  closeModal(): void {
    this.onClose.emit();
  }
} 