import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MisIdeasComponent } from './mis-ideas.component';

const routes: Routes = [
  { path: '', component: MisIdeasComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MisIdeasRoutingModule { }
