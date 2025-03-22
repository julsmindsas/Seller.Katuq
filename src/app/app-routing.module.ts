import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContentComponent } from "./shared/components/layout/content/content.component";
import { FullComponent } from "./shared/components/layout/full/full.component";
import { full } from "./shared/routes/full.routes";
import { content } from "./shared/routes/routes";
import { LoginComponent } from '../app/auth/login/login.component'
import { AdminGuard } from './shared/guard/admin.guard';
import { BlankComponent } from './shared/components/layout/blank/blank.component';
import { ChangePasswordComponent } from './components/change-password/change-password.component';
import { PageNotFoundComponent } from './shared/components/page-not-found/page-not-found.component';
// Importar el componente de términos y condiciones
import { TermsConditionsComponent } from './components/terms-conditions/terms-conditions.component';

const routes: Routes = [

  {
    path: 'maestros',
    redirectTo: 'maestros'
  },
  // {
  //   path: '',
  //   redirectTo: 'login',
  //   pathMatch: 'full'
  // },
  {
    path: 'login',
    component: LoginComponent,
    pathMatch: 'full'
  },
  {
    path: 'nuevo-registro', // antes era 'diagnostic-survey'
    component: BlankComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./components/diagnostic-survey/diagnostic-survey.module').then(m => m.DiagnosticSurveyModule)
      }
    ]
  },
  {
    path: 'change-password',
    component: ChangePasswordComponent
    // Opcional: agregar guard para que esta ruta se muestre solo si la contraseña es estándar
  },
  {
    path: 'payment-callback',
    loadChildren: () => import('./components/payment-callback/payment-callback.module').then(m => m.PaymentCallbackModule)
  },
  // Agregar ruta para términos y condiciones
  {
    path: 'terms-conditions',
    component: TermsConditionsComponent
  },
  {
    path: '',
    component: ContentComponent,
    canActivate: [AdminGuard],
    children: content
  },
  {
    path: '**',
    component: PageNotFoundComponent,
    canActivate: [AdminGuard],
    //redirectTo: 'login'
  }
];

@NgModule({
  imports: [[RouterModule.forRoot(routes, {
    anchorScrolling: 'enabled',
    scrollPositionRestoration: 'enabled',
    relativeLinkResolution: 'legacy',
    useHash:false
  })],
  ],
exports: [RouterModule]
})
export class AppRoutingModule { }
