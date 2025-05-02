import { Component, Input, OnInit,Renderer2,ViewChild,ElementRef } from '@angular/core';
import { Pedido } from '../modelo/pedido';
import { PaymentService } from '../../../shared/services/ventas/payment.service';
import { VentasService } from '../../../shared/services/ventas/ventas.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { SafeHtml } from '@angular/platform-browser';
@Component({
  selector: 'app-confirm',
  templateUrl: './confirm.component.html',
  styleUrls: ['./confirm.component.scss']
})
export class ConfirmComponent implements OnInit {

  // recibir el pedido mediante input
  @Input() pedido: Pedido;
  @ViewChild('contentToPrint', { static: true }) contentToPrint: ElementRef;
  htmlContent: SafeHtml | null = null;
  constructor( private renderer: Renderer2,private router: Router,public paymentService: PaymentService,private ventasService: VentasService) {

  }

  ngOnInit(): void {
    this.htmlContent = this.paymentService.getHtmlContent(this.pedido);
    this.renderer.setProperty(this.contentToPrint.nativeElement, 'innerHTML', this.htmlContent);
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
