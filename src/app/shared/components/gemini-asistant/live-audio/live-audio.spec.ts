import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveAudio } from './live-audio';

describe('LiveAudio', () => {
  let component: LiveAudio;
  let fixture: ComponentFixture<LiveAudio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LiveAudio]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveAudio);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
