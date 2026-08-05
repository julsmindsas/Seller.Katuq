import { NgModule } from '@angular/core';
import { CategoriaRoutingModule } from './categoria.app-routing.module';
import { ListComponent } from './list/list.component';
import { TreeTableModule } from 'primeng/treetable';
import { InputSwitchModule } from 'primeng/inputswitch';
// El componente declara `providers: [MessageService]`, o sea que tiene su
// PROPIA instancia: necesita su propio `<p-toast>` en el template. Sin él,
// todos los mensajes de la pantalla (crear, eliminar, guardar, errores de
// carga) se emitían al vacío y ninguna acción daba señal de vida.
import { ToastModule } from 'primeng/toast';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { CommonModule } from '@angular/common';
import { ImportModalModule } from 'src/app/shared/components/import-modal/import-modal.module';

@NgModule({
    imports: [CategoriaRoutingModule,
        TreeTableModule,
        InputSwitchModule,
        ToastModule,
        FormsModule,
        CommonModule,
        SharedModule,
        ImportModalModule],
    exports: [],
    declarations: [ListComponent],
    providers: [],
})
export class CategoriasModule { }
