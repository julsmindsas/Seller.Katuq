import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { VisorImagenComponent } from './visor-imagen.component';
import { VisorImagenModule } from './visor-imagen.module';

/** Foto vertical de celular (1080 × 1920) generada en el navegador. */
function fotoVertical(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#5F3FE0';
  ctx.fillRect(0, 0, 1080, 1920);
  return canvas.toDataURL('image/png');
}

function esperarCarga(img: HTMLImageElement): Promise<void> {
  return img.complete && img.naturalWidth
    ? Promise.resolve()
    : new Promise((resolve) => img.addEventListener('load', () => resolve(), { once: true }));
}

describe('VisorImagenComponent (ticket 1153)', () => {
  let fixture: ComponentFixture<VisorImagenComponent>;
  let visor: VisorImagenComponent;
  let overflowAntes: string;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisorImagenModule, TranslateModule.forRoot()],
    }).compileComponents();
    overflowAntes = document.body.style.overflow;
    fixture = TestBed.createComponent(VisorImagenComponent);
    visor = fixture.componentInstance;
    visor.imagenes = [fotoVertical(), fotoVertical()];
    visor.indiceInicial = 0;
    visor.ngOnChanges({ imagenes: {} as any, indiceInicial: {} as any });
    fixture.detectChanges();
    const img: HTMLImageElement = fixture.nativeElement.querySelector('.visor-imagen__foto');
    await esperarCarga(img);
    visor.alCargar();
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('muestra la foto vertical completa, sin pasarse de la pantalla', () => {
    const img: HTMLImageElement = fixture.nativeElement.querySelector('.visor-imagen__foto');
    const caja = img.getBoundingClientRect();
    expect(caja.height).toBeGreaterThan(0);
    expect(caja.height).toBeLessThanOrEqual(window.innerHeight);
    expect(caja.width).toBeLessThanOrEqual(window.innerWidth);
    expect(caja.top).toBeGreaterThanOrEqual(0);
    expect(caja.bottom).toBeLessThanOrEqual(window.innerHeight);
    // Sin deformar: conserva la proporción 1080 × 1920.
    expect(Math.abs(caja.width / caja.height - 1080 / 1920)).toBeLessThan(0.02);
  });

  it('acerca, aleja y vuelve a ajustar', () => {
    visor.acercar();
    fixture.detectChanges();
    expect(visor.escala).toBe(1.5);
    expect(visor.porcentaje).toBe(150);
    visor.acercar();
    visor.alejar();
    fixture.detectChanges();
    expect(visor.escala).toBe(1.5);
    visor.ajustar();
    fixture.detectChanges();
    expect(visor.escala).toBe(1);
    expect(visor.desplazamiento).toEqual({ x: 0, y: 0 });
  });

  it('no pasa de 5x', () => {
    for (let i = 0; i < 20; i++) { visor.acercar(); }
    expect(visor.escala).toBe(5);
  });

  it('pasa a la siguiente foto y reinicia el zoom', () => {
    visor.acercar();
    visor.siguiente();
    fixture.detectChanges();
    expect(visor.indice).toBe(1);
    expect(visor.escala).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('2');
  });

  it('cierra con Escape', () => {
    let cerrado = false;
    visor.cerrar.subscribe(() => (cerrado = true));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cerrado).toBeTrue();
  });

  it('vive en <body>, bloquea el scroll y al destruirse lo devuelve todo', () => {
    const host: HTMLElement = fixture.nativeElement;
    expect(host.parentElement).toBe(document.body);
    expect(document.body.style.overflow).toBe('hidden');
    fixture.destroy();
    expect(document.body.contains(host)).toBeFalse();
    expect(document.body.style.overflow).toBe(overflowAntes);
  });
});
