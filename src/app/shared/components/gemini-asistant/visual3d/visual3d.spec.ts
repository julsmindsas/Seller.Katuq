import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Visual3d } from './visual3d';

describe('Visual3d', () => {
  let component: Visual3d;
  let fixture: ComponentFixture<Visual3d>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Visual3d]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Visual3d);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
