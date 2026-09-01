import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule, Injector } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from "./shared/shared.module";
import { AppRoutingModule } from './app-routing.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { OverlayModule } from '@angular/cdk/overlay';
import { ToastrModule } from 'ngx-toastr';
// for HttpClient import:
import { LoadingBarHttpClientModule } from '@ngx-loading-bar/http-client';
// for Router import:
import { LoadingBarRouterModule } from '@ngx-loading-bar/router';
// for Core import:
import { LoadingBarModule } from '@ngx-loading-bar/core';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { NovedadModalComponent } from './shared/components/novedad-modal/novedad-modal.component';
import { LoginModule } from '../app/auth/login/login.module';
// import { ServiceWorkerModule } from '@angular/service-worker'; // SW desactivado (2026-03-25)
import { TreeTableModule } from 'primeng/treetable';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { BadgeModule } from 'primeng/badge';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireModule } from '@angular/fire/compat';
import { HttpInterceptor2 } from '../app/shared/services/interceptor/http.interceptor';
import { NotificationService } from './shared/services/notification.service';
import { CartSingletonService } from './shared/services/ventas/cart.singleton.service';
import { KatuqintelligenceService } from './shared/services/katuqintelligence/katuqintelligence.service';
import { GlobalErrorHandler } from './shared/handlers/global-error.handler';
import { LoaderComponent } from './components/loader/loader.component';
import { LoaderInterceptor } from './shared/services/interceptor/loader.interceptor';
import { NotificationrlService } from './shared/services/notificationrl.service';
import { ChangePasswordModule } from './components/change-password/change-password.module';
import { FacturaTirillaModule } from './components/pos/factura-tirilla/factura-tirilla.module';

// DMG
import { NgIdleKeepaliveModule } from '@ng-idle/keepalive';
import { RouterModule } from '@angular/router';
import { SafeUrlPipe } from './pipes/safe-url.pipe'; // Importar el pipe
import { FloatingButtonComponent } from './shared/components/floating-button/floating-button.component';
import { ChatFormComponent } from './shared/components/chat-form/chat.form.component';
import { ChatComponent } from './components/chat/chat/chat.component';
import { AppTranslateModule } from './shared/modules/translate.module';
// Importamos el nuevo módulo en lugar del componente individual
import { VoiceInteractionModule } from './shared/components/voice-interaction/voice-interaction.module';
import { VoiceAgentModule } from './shared/components/voice-agent/voice-agent.module';
import { LiveAudioModule } from './shared/components/gemini-asistant/live-audio/live-audio.module';

// Importar componentes
import { TermsConditionsComponent } from './components/terms-conditions/terms-conditions.component';
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';
import { SubscriptionCallbackComponent } from './components/subscription-callback/subscription-callback.component';

// Importar servicios
import { AnalyticsService } from './services/analytics.service';
import { CompaniesService } from './services/companies.service';
import { GeocodingService } from './shared/services/geocoding.service';
import { PosCheckoutService, POS_CHECKOUT_SERVICE } from './shared/services/ventas/pos-checkout.service';
import { DefaultToolAdapterService } from './shared/services/tools/default-tool-adapter.service';
import { TOOL_ADAPTER } from './shared/services/tools/tool-adapter';
import { TOOL_REGISTRARS } from './shared/services/tools/tool-registrar';
import { TOOL_REGISTRARS_INITIALIZER } from './shared/services/tools/tool-registrars-initializer';
import { SalesToolsRegistrarService } from './tools/sales-tools-registrar.service';
import { OrderToolsRegistrarService } from './shared/services/tools/order-tools-registrar.service';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, "./assets/i18n/", ".json");
}

@NgModule({
  declarations: [
    AppComponent,
    LoaderComponent,
    SafeUrlPipe,
    ChatComponent,
    FloatingButtonComponent,
    ChatFormComponent,
    TermsConditionsComponent,
    PrivacyPolicyComponent,
    SubscriptionCallbackComponent,
    NovedadModalComponent
  ],
  exports: [
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    SharedModule,
    AppRoutingModule,
    RouterModule,
    HttpClientModule,
    NgbModule,
    // `Overlay` del CDK NO es `providedIn: 'root'`: solo existe donde se importe
    // `OverlayModule`. `ModalGalleryService` (la galería `ks-carousel`) SÍ es
    // `providedIn: 'root'`, así que se construye en el injector RAÍZ y ahí
    // buscaba un `Overlay` que nadie había registrado → `No provider for
    // Overlay!`, y el modal quedaba en blanco.
    //
    // Los módulos lazy que importan `GalleryModule` (`ProductosModule`,
    // `crear-productos`) dejaban `Overlay` en SU injector, no en el raíz, así
    // que no alcanzaba: ng-bootstrap crea el contenido del modal contra el
    // injector raíz (`NgbModal` es `providedIn: 'root'`). Por eso la vista
    // previa del formulario largo también estaba rota. Va acá, una vez, en vez
    // de repetir el parche en cada módulo que abra una galería.
    OverlayModule,
    NgIdleKeepaliveModule.forRoot(),
    LoginModule,
    TreeTableModule,
    ButtonModule,
    TooltipModule,
    SkeletonModule,
    BadgeModule,
    AngularFireModule.initializeApp(environment.firebase),
    ToastrModule.forRoot(),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      },
      defaultLanguage: 'es'
    }),
    // for HttpClient use:
    LoadingBarHttpClientModule,
    // for Router use:
    LoadingBarRouterModule,
    // for Core use:
    LoadingBarModule,
    // Service Worker desactivado (2026-03-25) - duplicaba requests HTTP y degradaba rendimiento
    // Si se necesita reactivar: descomentar y configurar serviceWorker:true en angular.json
    // ServiceWorkerModule.register('ngsw-worker.js', {
    //   enabled: environment.production,
    //   registrationStrategy: 'registerWhenStable:30000'
    // }),
    ChangePasswordModule,
    FacturaTirillaModule,
    AppTranslateModule,
    VoiceInteractionModule,
    VoiceAgentModule, // Agregamos el módulo aquí
    LiveAudioModule
  ],
  providers: [
    NotificationService,
    KatuqintelligenceService,
    CartSingletonService,
    NotificationrlService,
    { provide: HTTP_INTERCEPTORS, useClass: HttpInterceptor2, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoaderInterceptor, multi: true },
    AnalyticsService,
    CompaniesService,
    GeocodingService,
    { provide: TOOL_ADAPTER, useClass: DefaultToolAdapterService },
    //{ provide: TOOL_REGISTRARS, useExisting: SalesToolsRegistrarService, multi: true },
    { provide: TOOL_REGISTRARS, useExisting: OrderToolsRegistrarService, multi: true },
    TOOL_REGISTRARS_INITIALIZER,
    {
      provide: POS_CHECKOUT_SERVICE,
      useFactory: (injector: Injector) => injector.get(PosCheckoutService),
      deps: [Injector]
    },
    // GlobalErrorHandler: recarga una vez ante ChunkLoadError (bundle viejo tras
    // deploy → página en blanco, wdu9v76w1g) y delega el resto a Sentry, que sigue
    // capturando todo error no manejado (showDialog:false, logErrors:true).
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
