import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconoTablerComponent } from '../../../../shared/icons/icono-tabler.component';
import { OrderActionSuggestionComponent } from './order-action-suggestion.component';

/**
 * D-547 (F2, 11.4): el aviso de sugerencia solo pinta y avisa. «Fijar» y «Ahora no» emiten; no fija nada por sí solo.
 */
describe('OrderActionSuggestionComponent (D-547 F2)', () => {
  let fixture: ComponentFixture<OrderActionSuggestionComponent>;
  let fijar: number;
  let ahoraNo: number;

  function pintar(accion: any): HTMLElement {
    fixture = TestBed.createComponent(OrderActionSuggestionComponent);
    fixture.componentInstance.fijar.subscribe(() => fijar++);
    fixture.componentInstance.ahoraNo.subscribe(() => ahoraNo++);
    fixture.componentInstance.accion = accion;
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }
  const botones = (el: HTMLElement) => Array.from(el.querySelectorAll('button')) as HTMLButtonElement[];

  beforeEach(() => {
    TestBed.configureTestingModule({ declarations: [OrderActionSuggestionComponent], imports: [IconoTablerComponent] });
    fijar = 0; ahoraNo = 0;
  });

  it('dice «Usas Pagos a diario, ¿lo fijamos?» con «Fijar» y «Ahora no»', () => {
    const el = pintar('payments');
    expect(el.querySelector('.sug-texto')!.textContent!.trim()).toBe('Usas Pagos a diario, ¿lo fijamos?');
    expect(botones(el).map(b => b.textContent!.trim())).toEqual(['Fijar', 'Ahora no']);
    expect(el.querySelector('[role="status"]')).not.toBeNull();
  });

  it('«Fijar» y «Ahora no» emiten cada uno lo suyo y no se activan solos', () => {
    const el = pintar('discount');
    expect(fijar + ahoraNo).toBe(0);
    botones(el)[0].click();
    expect([fijar, ahoraNo]).toEqual([1, 0]);
    botones(el)[1].click();
    expect([fijar, ahoraNo]).toEqual([1, 1]);
  });

  it('sin acción no pinta nada', () => {
    const el = pintar(null);
    expect(el.querySelector('.sug-aviso')).toBeNull();
  });
});
