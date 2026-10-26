export class UsaComponent {
  constructor(private translate: any, private translateService: any) {}

  mostrar(): void {
    const a = this.translate.instant('ventas.tampoco');
    this.translateService.get('ventas.niEsta').subscribe();
    this.translate.stream("ventas.niAquella").subscribe();
    this.translate.get(['comun.guardar', 'ventas.enArreglo']).subscribe();
    const dinamica = this.translate.instant(`ventas.estado.${a}`);
    const formulario = this.form.get('nombre');
  }
}
