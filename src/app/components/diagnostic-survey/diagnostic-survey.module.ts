import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiagnosticSurveyComponent } from './diagnostic-survey.component';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

const routes: Routes = [
  { path: '', component: DiagnosticSurveyComponent }
];

@NgModule({
  declarations: [DiagnosticSurveyComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    TranslateModule // Importar el módulo de traducción
  ],
  exports: [DiagnosticSurveyComponent]
})
export class DiagnosticSurveyModule { }
