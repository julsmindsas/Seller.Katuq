import { Component, Input, OnChanges, OnInit, Renderer2, SimpleChanges, ViewChild, ElementRef, SecurityContext } from '@angular/core';
import { Pedido } from '../modelo/pedido';
import { PaymentService } from '../../../shared/services/ventas/payment.service';
import { VentasService } from '../../../shared/services/ventas/ventas.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
@Component({
  selector: 'app-confirm',
  templateUrl: './confirm.component.html',
  styleUrls: ['./confirm.component.scss']
})
export class ConfirmComponent implements OnInit, OnChanges {

  // recibir el pedido mediante input
  @Input() pedido: Pedido;
  @ViewChild('contentToPrint', { static: true }) contentToPrint: ElementRef;
  htmlContent: SafeHtml | null = null;
  constructor( private renderer: Renderer2,private router: Router,public paymentService: PaymentService,private ventasService: VentasService,private sanitizer: DomSanitizer) {

  }

  ngOnInit(): void {
    this.pintar();
  }

  /** Ticket 1590: al llegar el pedido guardado (con su número real) se vuelve a pintar. */
  ngOnChanges(changes: SimpleChanges): void {
    const cambio = changes['pedido'];
    if (!cambio || cambio.firstChange) return;
    // Tickets 1594 y 1595: al guardar, Venta asistida vacía el carrito (clearCart) y
    // el pedido que llega ya no trae productos; la pantalla final salía con subtotal 0.
    // Se pinta con los productos del pedido anterior, sin tocar el pedido de la venta.
    const previo = cambio.previousValue as Pedido | undefined;
    const sinProductos = !this.pedido?.carrito?.length;
    this.pintar(sinProductos && previo?.carrito?.length ? { ...this.pedido, carrito: previo.carrito } as Pedido : undefined);
  }

  private pintar(pedidoAPintar?: Pedido): void {
    const pedido = pedidoAPintar ?? this.pedido;
    if (!pedido) return;
    this.htmlContent = this.paymentService.getHtmlContent(pedido);
    // htmlContent viene envuelto en SafeHtml (bypassSecurityTrustHtml). Si se pasa
    // tal cual a innerHTML, Angular lo convierte a texto y antepone
    // "SafeValue must use [property]=binding:" al contenido. sanitize() sobre un
    // valor ya marcado como confiable devuelve el HTML original sin tocarlo.
    const html = this.sanitizer.sanitize(SecurityContext.HTML, this.htmlContent) ?? '';
    this.renderer.setProperty(this.contentToPrint.nativeElement, 'innerHTML', html);
    // Ticket 1053: si los maestros aún no cargaban, pintar el pedido cuando lleguen.
    if (this.paymentService.esHtmlDeEspera(this.htmlContent)) {
      this.paymentService.getHtmlContentAsync(pedido).then((h) => {
        if (!h) return;
        this.htmlContent = h;
        this.renderer.setProperty(this.contentToPrint.nativeElement, 'innerHTML',
          this.sanitizer.sanitize(SecurityContext.HTML, h) ?? '');
      });
    }
  }
  generarNuevoPedido(){
    window.location.reload();
  }

  confirmar() {
   
    this.ventasService.createOrder({ order: this.pedido, emailHtml: this.htmlContent }).subscribe({
      next: (res: any) => {
        
        Swal.fire({
          title: "Pedido creado!",
          text: "Pedido creado con exito",
          icon: "success",
          confirmButtonText: "Ok",
        });
      },
      error: (err: any) => {
        console.log(err);
        Swal.fire({
          title: "Error!",
          text: "Error al crear el pedido",
          icon: "error",
          confirmButtonText: "Ok",
        });
      }
    });

  }
  
  printContent(): void {
    const printContents = this.contentToPrint.nativeElement.innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
  }


}
