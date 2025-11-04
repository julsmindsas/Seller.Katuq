import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OnboardingWizardComponent } from './onboarding-wizard/onboarding-wizard.component';

const routes: Routes = [
  {
    path: '',
    component: OnboardingWizardComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OnboardingRoutingModule { }
