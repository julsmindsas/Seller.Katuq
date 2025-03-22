import { NgModule } from '@angular/core';
import { CategoriaRoutingModule } from './categoria.app-routing.module';
import { ListComponent } from './list/list.component';
import { TreeTableModule } from 'primeng/treetable';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { CommonModule } from '@angular/common';

@NgModule({
    imports: [CategoriaRoutingModule,
        TreeTableModule,
        FormsModule,
        CommonModule,
        SharedModule],
    exports: [],
    declarations: [ListComponent],
    providers: [],
})
export class CategoriasModule { }
