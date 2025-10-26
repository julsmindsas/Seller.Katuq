import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { RouterModule, Routes } from "@angular/router";

// PrimeNG
import { ButtonModule } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { InputTextareaModule } from "primeng/inputtextarea";
import { CalendarModule } from "primeng/calendar";
import { DropdownModule } from "primeng/dropdown";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { MessagesModule } from "primeng/messages";
import { TooltipModule } from "primeng/tooltip";

// Components
import { AgendamientoComponent } from "./agendamiento.component";
import { AppointmentsListComponent } from "./appointments-list/appointments-list.component";

const routes: Routes = [
  {
    path: "",
    component: AgendamientoComponent,
  },
  {
    path: "citas",
    component: AppointmentsListComponent,
  },
];

@NgModule({
  declarations: [AgendamientoComponent, AppointmentsListComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    // PrimeNG
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    CalendarModule,
    DropdownModule,
    ProgressSpinnerModule,
    TagModule,
    ToastModule,
    MessagesModule,
    TooltipModule,
  ],
})
export class AgendamientoModule {}
