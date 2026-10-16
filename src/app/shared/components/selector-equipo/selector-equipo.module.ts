import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';

import { SelectorEquipoComponent } from './selector-equipo.component';

/** Selector de personas del comercio (D-437). Lo usan las líneas de mensajería y el dueño del chat. */
@NgModule({
  imports: [CommonModule, FormsModule, DropdownModule, MultiSelectModule],
  declarations: [SelectorEquipoComponent],
  exports: [SelectorEquipoComponent],
})
export class SelectorEquipoModule {}
