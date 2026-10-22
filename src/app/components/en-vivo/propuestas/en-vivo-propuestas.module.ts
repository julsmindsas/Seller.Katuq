import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { EnVivoCompartidoModule } from '../compartido/en-vivo-compartido.module';
import { EnVivoDespachosModule } from '../despachos/en-vivo-despachos.module';
import { EnVivoSugerenciaAjusteComponent } from './en-vivo-sugerencia-ajuste.component';
import { EnVivoSugerenciaComponent } from './en-vivo-sugerencia.component';

/**
 * Opttia propone en la escena (D-422): la tarjeta (`app-en-vivo-sugerencia`) y su hoja "Ajustar"
 * (`app-en-vivo-sugerencia-ajuste`). Es el único módulo de En vivo que escribe, y solo cuando una
 * persona aprueba (dos toques) por la ruta de cada operación. La hoja reutiliza las tarjetas del
 * plan de despachos (grupo y "no entra al plan") que exporta `EnVivoDespachosModule`.
 */
@NgModule({
  imports: [TranslateModule, CommonModule, EnVivoCompartidoModule, EnVivoDespachosModule],
  declarations: [EnVivoSugerenciaComponent, EnVivoSugerenciaAjusteComponent],
  exports: [EnVivoSugerenciaComponent, EnVivoSugerenciaAjusteComponent],
})
export class EnVivoPropuestasModule {}
