import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormaEntregaCreateComponent } from './forma-entrega-create.component';

describe('FormaEntregaCreateComponent', () => {
  let component: FormaEntregaCreateComponent;
  let fixture: ComponentFixture<FormaEntregaCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FormaEntregaCreateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormaEntregaCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
