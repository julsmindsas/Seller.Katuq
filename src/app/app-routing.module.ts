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
    path: 'registrarse', // onboarding de registro con encuesta de diagnóstico
    component: BlankComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./components/diagnostic-survey/diagnostic-survey.module').then(m => m.DiagnosticSurveyModule)
      }
    ]
  },
  {
    path: 'nuevo-registro', // alias legacy de /registrarse
    redirectTo: 'registrarse',
    pathMatch: 'full'
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
    canActivate: [AdminGuard, SubscriptionGuard],
    data: { requiresPremium: true },
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
    data: { requiresPremium: true, shell: true }, // shell: marco con menú, ver ThemeModeService (D-502)
    children: [
      {
        path: '',
        loadChildren: () => import('./modules/agent-builder/agent-builder.module').then(m => m.AgentBuilderModule)
      }
    ]
  },
  // La demo de agendamiento (oct-2025) se retiró: los enlaces viejos llevan a la Agenda (D-491).
  { path: 'servicios/agendamiento', redirectTo: '/agenda' },
  { path: 'servicios/agendamiento/citas', redirectTo: '/agenda' },
  // Pricing page
  {
    path: 'pricing',
    component: ContentComponent,
    canActivate: [AdminGuard],
    data: { shell: true }, // marco con menú (D-502)
    children: [
      {
        path: '',
        loadChildren: () => import('./components/pricing/pricing.module').then(m => m.PricingModule)
      }
    ]
  },
  // Billing page
  {
    path: 'billing',
    component: ContentComponent,
    canActivate: [AdminGuard],
    data: { shell: true }, // marco con menú (D-502)
    children: [
      {
        path: '',
        loadChildren: () => import('./components/billing/billing.module').then(m => m.BillingModule)
      }
    ]
  },
  // Reportes públicos — accesibles sin login
  {
    path: 'r',
    component: BlankComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./components/report-public/report-public.module').then(m => m.ReportPublicModule),
      }
    ]
  },
  // Landing pública de aprobación de cotización (spec 008.3) — sin login, por token
  {
    path: 'c',
    component: BlankComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./components/cotizacion-publica/cotizacion-publica.module').then(m => m.CotizacionPublicaModule),
      }
    ]
  },
  // Sitios publicados por el comerciante (landing / catálogo / tienda). Los abre
  // cualquiera desde el link, sin cuenta en Katuq, así que va fuera del AuthGuard.
  {
    path: 's',
    component: BlankComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./components/sitio-publico/sitio-publico.module').then(m => m.SitioPublicoModule),
      }
    ]
  },
  // Landing de campaña para pauta. Pública a propósito: quien llega por el
  // anuncio todavía no tiene cuenta. El código viaja al registro.
  {
    path: 'promo',
    component: BlankComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./components/promo-campana/promo-campana.module').then(m => m.PromoCampanaModule),
      }
    ]
  },
  // Vitrina pública de catálogos (D-141). Fuera del AuthGuard a propósito: la
  // abre el comprador, que no tiene cuenta en Katuq.
  {
    path: 'cat',
    component: BlankComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./components/catalogo-publico/catalogo-publico.module').then(m => m.CatalogoPublicoModule),
      }
    ]
  },
  // Encuesta NPS pública (D-490): la abre el comprador desde el correo o el QR, sin cuenta.
  {
    path: 'encuesta',
    component: BlankComponent,
    children: [
      {
        path: ':ref',
        loadComponent: () => import('./components/encuesta-publica/encuesta-publica.component').then(m => m.EncuestaPublicaComponent),
      }
    ]
  },
  {
    path: '',
    component: ContentComponent,
    canActivate: [AdminGuard],
    // D-502: el tema oscuro solo se aplica dentro del marco con menú (ThemeModeService)
    data: { shell: true },
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
