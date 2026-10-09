import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnVivoCompartidoModule } from '../compartido/en-vivo-compartido.module';
import { EnVivoNarracionComponent } from './en-vivo-narracion.component';
import { EnVivoOpttiaInterruptorComponent } from './en-vivo-opttia-interruptor.component';
import { EnVivoOpttiaComponent } from './en-vivo-opttia.component';

/**
 * Opttia en la pantalla "En vivo" (D-386, tarea 4.10): la tarjeta `<app-en-vivo-opttia>` (resumen,
 * preguntas y respuestas con acciones), la barra `<app-en-vivo-narracion>` que se coloca sobre la
 * escena y el botón `<app-en-vivo-opttia-interruptor>` del encabezado (prender o apagar a Opttia).
 * Leen de `EnVivoEstadoService`; el módulo importa las piezas compartidas
 * (`EnVivoCompartidoModule`: el icono, entre otras) y las exporta para quien lo importe.
 */
@NgModule({
  imports: [CommonModule, EnVivoCompartidoModule],
  declarations: [EnVivoOpttiaComponent, EnVivoNarracionComponent, EnVivoOpttiaInterruptorComponent],
  exports: [EnVivoOpttiaComponent, EnVivoNarracionComponent, EnVivoOpttiaInterruptorComponent],
})
export class EnVivoOpttiaModule {}
