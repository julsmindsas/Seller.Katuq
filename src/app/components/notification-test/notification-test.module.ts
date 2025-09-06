import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationTestComponent } from './notification-test.component';

@NgModule({
  declarations: [
    NotificationTestComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: NotificationTestComponent }
    ])
  ]
})
export class NotificationTestModule { }