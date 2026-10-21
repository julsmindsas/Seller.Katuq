import { Component } from '@angular/core';

@Component({
  selector: 'app-plantilla',
  template: `
    <div>
      <h3>Vista de venta</h3>
      <button [title]="'Cambiar vista'">{{ 'comun.guardar' | translate }}</button>
    </div>
  `,
})
export class PlantillaComponent {}
