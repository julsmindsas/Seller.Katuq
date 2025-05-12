import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PosCheckoutService } from '../../../../../shared/services/ventas/pos-checkout.service';
import { MaestroService } from '../../../../../shared/services/maestros/maestro.service';
import { CrearClienteModalComponent } from '../../../clientes/crear-cliente-modal/crear-cliente-modal.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-customer-section',
  templateUrl: './customer-section.component.html',
  styleUrls: ['./customer-section.component.scss']
})
export class CustomerSectionComponent implements OnInit {
  @ViewChild('clienteBuscar') clienteBuscar: ElementRef;
  
  datosCliente: any = '';
  documentoCliente: string = '';
  
  constructor(
    private modal: NgbModal,
    private service: MaestroService,
    private checkoutService: PosCheckoutService
  ) { }
  
  ngOnInit(): void {
    // Suscribirse a cambios en el cliente
    this.checkoutService.customer$.subscribe(customer => {
      if (customer) {
        this.datosCliente = customer;
      } else {
        this.datosCliente = '';
      }
    });
  }
  
  /**
   * Abre el modal de creación de cliente
   */
  openModal(): void {
    const modalRef = this.modal.open(CrearClienteModalComponent, { 
      centered: true, 
      size: 'xl', 
      modalDialogClass: 'create-customers custom-input' 
    });
    
    // Manejar el resultado del modal
    modalRef.result.then(
      (result) => {
        if (result && result.cliente) {
          this.checkoutService.setCustomer(result.cliente);
        }
      },
      () => { }
    );
  }
  
  /**
   * Edita un cliente existente
   */
  editarCliente(): void {
    // Verificar que tenemos datos de cliente válidos
    if (!this.datosCliente) {
      this.showAlert('Error', 'No hay cliente seleccionado para editar');
      return;
    }
    
    const modalRef = this.modal.open(CrearClienteModalComponent, {
      centered: true,
      size: 'xl',
      modalDialogClass: 'create-customers custom-input'
    });
    
    // Pasar los datos del cliente al modal y establecer que es edición
    modalRef.componentInstance.clienteData = this.datosCliente;
    modalRef.componentInstance.isEdit = true;
    
    // Manejar el cierre del modal
    modalRef.result.then(
      (result) => {
        if (result === 'success') {
          // Mostrar mensaje de éxito
          Swal.fire({
            title: 'Cliente actualizado',
            text: 'Los datos del cliente han sido actualizados correctamente',
            icon: 'success',
            confirmButtonText: 'Ok'
          });
          
          // Intentar recargar los datos del cliente si es posible
          if (this.clienteBuscar && this.clienteBuscar.nativeElement) {
            const docValue = this.clienteBuscar.nativeElement.value;
            // Solo si hay un valor en el input
            if (docValue) {
              this.buscar();
            }
          }
        }
      },
      () => { }
    );
  }
  
  /**
   * Limpia los datos del cliente
   */
  limpiar(): void {
    this.checkoutService.clearCustomer();
    this.documentoCliente = '';
    if (this.clienteBuscar) {
      this.clienteBuscar.nativeElement.value = '';
    }
  }
  
  /**
   * Busca un cliente por su documento
   */
  buscar(): void {
    if (!this.documentoCliente) return;
    
    const data = { documento: this.documentoCliente };
    this.service.getClientByDocument(data).subscribe((res: any) => {
      if (!res.company) {
        this.showAlert('No encontrado!', 'No se encuentra el documento. Si desea crearlo llene los datos a continuación');
      } else {
        try {
          this.checkoutService.setCustomer(res);
        } catch (error) {
          console.log(error);
        }
      }
    });
  }
  
  /**
   * Muestra una alerta con SweetAlert2
   */
  private showAlert(title: string, text: string, icon: any = 'warning'): void {
    Swal.fire({
      title,
      text,
      icon,
      confirmButtonText: 'Ok'
    });
  }
} 