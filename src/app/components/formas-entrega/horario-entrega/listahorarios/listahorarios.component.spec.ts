import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListahorariosComponent } from './listahorarios.component';

describe('ListahorariosComponent', () => {
  let component: ListahorariosComponent;
  let fixture: ComponentFixture<ListahorariosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ListahorariosComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListahorariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
