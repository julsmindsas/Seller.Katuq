import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges } from '@angular/core';
import { Definicion } from '../../plataforma.tipos';
import { almacenLocal, avisoPendiente, marcarAvisoVisto } from '../../logica/aviso-version';
import { TEXTOS } from '../../plataforma.textos';

/**
 * D-700 13.4a / 13.7a — «Estas cifras usan la definición …»: sale la primera vez que se abre cada versión de regla.
 * «Ya lo vi» se guarda en el navegador dentro de try/catch; sin almacenamiento el aviso se muestra igual y se oculta
 * mientras dure la sesión.
 */
@Component({
  selector: 'app-aviso-definicion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cfg-aviso pl-aviso" *ngIf="visible" role="status">
      <i class="pi pi-info-circle" aria-hidden="true"></i>
      <div class="pl-aviso__cuerpo">
        <div>{{ textos.avisoDefinicion(version || '') }}</div>
        <div class="pl-aviso__acciones">
          <button type="button" class="pl-enlace" (click)="verDefiniciones = !verDefiniciones" [attr.aria-expanded]="verDefiniciones">
            {{ verDefiniciones ? textos.cerrarDefiniciones : textos.verDefiniciones }}
          </button>
          <button type="button" class="pl-enlace" (click)="yaLoVi()">{{ textos.yaLoVi }}</button>
        </div>
        <ul class="pl-definiciones" *ngIf="verDefiniciones">
          <li *ngFor="let d of definiciones"><strong>{{ d.nombre }}.</strong> {{ d.definicion }}</li>
          <li *ngIf="!definiciones || !definiciones.length">{{ textos.sinDefinicion }}</li>
        </ul>
      </div>
    </div>
  `,
})
export class AvisoDefinicionComponent implements OnChanges {
  @Input() version: string | null = null;
  @Input() definiciones: Definicion[] | null = null;
  readonly textos = TEXTOS;
  visible = false;
  verDefiniciones = false;
  private ocultoEnSesion = new Set<string>();

  constructor(private cd: ChangeDetectorRef) {}

  ngOnChanges(): void {
    this.visible = !!this.version && !this.ocultoEnSesion.has(this.version) && avisoPendiente(this.version, almacenLocal());
  }

  yaLoVi(): void {
    if (this.version) {
      this.ocultoEnSesion.add(this.version);
      marcarAvisoVisto(this.version, almacenLocal());
    }
    this.visible = false;
    this.cd.markForCheck();
  }
}
