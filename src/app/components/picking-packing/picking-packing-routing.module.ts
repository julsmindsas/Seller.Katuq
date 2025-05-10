import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PickingListComponent } from './picking-list/picking-list.component';
import { PickingDetailComponent } from './picking-detail/picking-detail.component';
import { PackingListComponent } from './packing-list/packing-list.component';
import { PackingDetailComponent } from './packing-detail/packing-detail.component';

const routes: Routes = [
  {
    path: 'picking',
    children: [
      { path: '', component: PickingListComponent },
      { path: ':id', component: PickingDetailComponent }
    ]
  },
  {
    path: 'packing',
    children: [
      { path: '', component: PackingListComponent },
      { path: ':id', component: PackingDetailComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PickingPackingRoutingModule { } 