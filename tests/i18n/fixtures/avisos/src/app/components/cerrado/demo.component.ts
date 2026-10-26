import Swal from 'sweetalert2';

export class DemoComponent {
  constructor(private translate: any, private toastr: any, private messageService: any) {}

  guardar(nombre: string): void {
    // Swal.fire('Comentario que no cuenta');
    Swal.fire({
      title: this.translate.instant('ventas.saludo', { nombre }),
      icon: 'success',
      confirmButtonColor: '#5F3FE0',
      customClass: { confirmButton: 'btn btn-primary' },
    });
    this.toastr.success(this.translate.instant('comun.guardar'), '', { positionClass: 'toast-top-right' });
    this.messageService.add({ severity: 'success', key: 'tst', summary: this.translate.instant('comun.guardar') });
    this.translate.get('primeng').subscribe();
  }
}
