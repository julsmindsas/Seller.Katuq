import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';

const routes: Routes = [
  // Rutas de demostración de la plantilla: llevan a la pantalla real equivalente.
  { path: 'login/simple', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login/image-one', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login/image-two', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login/validation', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login/tooltip', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login/sweetalert', redirectTo: '/login', pathMatch: 'full' },
  { path: 'register/simple', redirectTo: '/registrarse', pathMatch: 'full' },
  { path: 'register/image-one', redirectTo: '/registrarse', pathMatch: 'full' },
  { path: 'register/image-two', redirectTo: '/registrarse', pathMatch: 'full' },
  { path: 'unlock-user', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
  },
  // Duplicado de recuperar contraseña.
  { path: 'forget-password', redirectTo: 'forgot-password', pathMatch: 'full' },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthenticationRoutingModule { }
