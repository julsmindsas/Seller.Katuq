import Swal from 'sweetalert2';

export class SueltoComponent {
  constructor(private translate: any, private toastr: any, private toastrService: any, private messageService: any) {}

  avisar(n: number, err: any): void {
    Swal.fire({ title: 'Listo', text: `Pedido ${n} creado`, icon: 'success', confirmButtonText: this.translate.instant('comun.guardar') });
    Swal.fire('Atención', 'Revisa los datos', 'warning');
    this.toastr.success('Guardado');
    this.toastrService.error(err?.error?.message || 'No se pudo guardar', '');
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Hecho' });
    Swal.fire({ html: `<b>${n}</b>`, icon: 'info' });
    Swal.fire({ title: estado === 'credit' ? 'Nota crédito' : 'Nota débito', input: 'text' });
    swal.fire({ title: 'Cierre de caja' });
    this.toast.error('Sin conexión');
    this.toster.error('Correo o contraseña incorrecta.');
    this.notificationService.success('Listo', 'Agente borrado');
    Swal.fire({ title: 'A propósito' }); // i18n-ignorar
  }
}
