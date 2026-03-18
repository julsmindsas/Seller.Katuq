import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContentComponent } from "./shared/components/layout/content/content.component";
import { FullComponent } from "./shared/components/layout/full/full.component";
import { full } from "./shared/routes/full.routes";
import { content } from "./shared/routes/routes";
import { LoginComponent } from '../app/auth/login/login.component'
import { AdminGuard } from './shared/guard/admin.guard';
import { SubscriptionGuard } from './shared/guards/subscription.guard';
import { OnboardingGuard } from './shared/guards/onboarding.guard';
import { BlankComponent } from './shared/components/layout/blank/blank.component';
import { ChangePasswordComponent } from './components/change-password/change-password.component';
import { PageNotFoundComponent } from './shared/components/page-not-found/page-not-found.component';
// Importar el componente de términos y condiciones
import { TermsConditionsComponent } from './components/terms-conditions/terms-conditions.component';
// Importar el componente de política de privacidad
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';
// Importar el componente de callback de suscripción
import { SubscriptionCallbackComponent } from './components/subscription-callback/subscription-callback.component';

const routes: Routes = [

  {
    path: 'maestros',
    redirectTo: 'maestros'
  },
  // Ruta por defecto - redirigir a encuesta de registro
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent,
    pathMatch: 'full'
  },
  {
    path: 'authentication',
    loadChildren: () => import('./pages/authentication/authentication.module').then(m => m.AuthenticationModule)
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
    path: 'onboarding',
    component: BlankComponent,
    canActivate: [AdminGuard, OnboardingGuard], // Solo administradores pueden acceder
    children: [
      {
        path: '',
        loadChildren: () => import('./components/onboarding/onboarding.module').then(m => m.OnboardingModule)
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
  // Agregar ruta para política de privacidad
  {
    path: 'privacy-policy',
    component: PrivacyPolicyComponent
  },
  // Ruta para callback de suscripción (después de pago en Wompi)
  {
    path: 'subscription-callback',
    component: SubscriptionCallbackComponent
  },
  // Nueva ruta para live-audio en pantalla completa
  {
    path: 'live-audio',
    component: BlankComponent,
    canActivate: [AdminGuard, SubscriptionGuard],
    data: { requiresPremium: true },
    children: [
      {
        path: '',
        loadChildren: () => import('./shared/components/gemini-asistant/live-audio/live-audio.module').then(m => m.LiveAudioModule)
      }
    ]
  },
  // Video Agent - Full screen diagnostic system
  {
    path: 'video-agent',
    component: BlankComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./modules/video-agent/video-agent.module').then(m => m.VideoAgentModule)
      }
    ]
  },
  // Agent Builder - AI Agent Creation and Management
  {
    path: 'agent-builder',
    component: ContentComponent,
    canActivate: [AdminGuard, SubscriptionGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('./modules/agent-builder/agent-builder.module').then(m => m.AgentBuilderModule)
      }
    ]
  },
  // Service Scheduling
  {
    path: 'servicios/agendamiento',
    component: BlankComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./components/servicios/agendamiento/agendamiento.module').then(m => m.AgendamientoModule)
      }
    ]
  },
  // Pricing page
  {
    path: 'pricing',
    component: ContentComponent,
    canActivate: [AdminGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('./components/pricing/pricing.module').then(m => m.PricingModule)
      }
    ]
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
    //redirectTo: 'nuevo-registro'
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
