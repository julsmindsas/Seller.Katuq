import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaFormaEntregaComponent } from './lista-forma-entrega.component';

describe('ListaFormaEntregaComponent', () => {
  let component: ListaFormaEntregaComponent;
  let fixture: ComponentFixture<ListaFormaEntregaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ListaFormaEntregaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListaFormaEntregaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
