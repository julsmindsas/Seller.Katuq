import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Visual } from './visual';

describe('Visual', () => {
  let component: Visual;
  let fixture: ComponentFixture<Visual>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Visual]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Visual);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
