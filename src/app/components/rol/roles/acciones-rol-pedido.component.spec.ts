import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { OrderActionsService } from '../../../shared/services/ventas/order-actions.service';
import { AccionesRolPedidoComponent } from './acciones-rol-pedido.component';

/**
 * D-547 (F2, tarea 11.7): las 4 acciones de un rol en Roles y permisos. Un rol sin configurar muestra General y no
 * hace ninguna petición; guardar manda el perfil y 4 ids distintos y nada más.
 */
describe('AccionesRolPedidoComponent (D-547 F2)', () => {
  let llamadas: { roleId: string; profile: string; actions: string[] }[];
  let respuesta: () => Observable<any>;

  function abrir(orderActions: unknown = null, roleId = 'rol-123'): { fixture: ComponentFixture<AccionesRolPedidoComponent>; el: HTMLElement } {
    const fixture = TestBed.createComponent(AccionesRolPedidoComponent);
    fixture.componentInstance.roleId = roleId;
    fixture.componentInstance.orderActions = orderActions;
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }
  const todos = (el: HTMLElement, sel: string) => Array.from(el.querySelectorAll(sel)) as HTMLElement[];
  const selects = (el: HTMLElement) => todos(el, 'select') as HTMLSelectElement[];
  const valores = (el: HTMLElement) => selects(el).map(s => s.value);

  beforeEach(() => {
    llamadas = [];
    respuesta = () => of({ profile: 'cashier', actions: ['orderPdf', 'payments', 'billingData', 'editProducts'] });
    TestBed.configureTestingModule({
      declarations: [AccionesRolPedidoComponent],
      providers: [{
        provide: OrderActionsService,
        useValue: { guardarRol: (roleId: string, profile: string, actions: string[]) => { llamadas.push({ roleId, profile, actions }); return respuesta(); } },
      }],
    });
  });

  it('un rol sin configurar muestra General marcado, sus 4 acciones y no hace ninguna petición', () => {
    const { el } = abrir(null);
    const activo = todos(el, '.racc-perfil-activo');
    expect(activo.length).toBe(1);
    expect(activo[0].textContent!.trim()).toBe('General');
    expect(valores(el)).toEqual(['orderPdf', 'salesOrder', 'editCustomer', 'billingData']);
    expect(llamadas.length).toBe(0);
  });

  it('un rol con acciones guardadas las muestra', () => {
    const { el } = abrir({ profile: 'dispatch', actions: ['editAddress', 'salesOrder', 'changeStatus', 'history'] });
    expect(todos(el, '.racc-perfil-activo')[0].textContent!.trim()).toBe('Despacho');
    expect(valores(el)).toEqual(['editAddress', 'salesOrder', 'changeStatus', 'history']);
  });

  it('escoger un perfil llena las 4 listas', () => {
    const { fixture, el } = abrir(null);
    todos(el, '.racc-perfil').find(b => b.textContent!.trim() === 'Caja')!.click();
    fixture.detectChanges();
    expect(valores(el)).toEqual(['orderPdf', 'payments', 'billingData', 'editProducts']);
    expect(llamadas.length).toBe(0);
  });

  it('cada lista ofrece las acciones que no están en las otras tres', () => {
    const { el } = abrir(null);
    const opciones = Array.from(selects(el)[0].options).map(o => o.value);
    expect(opciones.length).toBe(13);
    expect(opciones).toContain('orderPdf');
    expect(opciones).not.toContain('salesOrder');
    expect(opciones).not.toContain('deleteOrder');
  });

  it('guardar manda el perfil y 4 ids distintos, y nada más, al rol que se edita', () => {
    const { fixture, el } = abrir({ profile: 'sales', actions: ['editCustomer', 'notes', 'editProducts', 'salesOrder'] }, 'rol-777');
    const primera = selects(el)[0];
    primera.value = 'payments';
    primera.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    (el.querySelector('.racc-guardar') as HTMLButtonElement).click();
    expect(llamadas).toEqual([{ roleId: 'rol-777', profile: 'sales', actions: ['payments', 'notes', 'editProducts', 'salesOrder'] }]);
  });

  it('si el servidor falla, no marca «Guardado.»', () => {
    respuesta = () => throwError(() => ({ error: { message: 'Solo un administrador puede cambiar las acciones de un rol.' } }));
    const { fixture, el } = abrir(null);
    (el.querySelector('.racc-guardar') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(llamadas.length).toBe(1);
    expect(el.querySelector('.racc-nota[role="status"]')).toBeNull();
    // cierra la ventana de aviso que abrió el componente
    (document.querySelector('.swal2-confirm') as HTMLElement | null)?.click();
  });
});
