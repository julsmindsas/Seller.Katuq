import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from "./shared/shared.module";
import { AppRoutingModule } from './app-routing.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule } from 'ngx-toastr';
// for HttpClient import:
import { LoadingBarHttpClientModule } from '@ngx-loading-bar/http-client';
// for Router import:
import { LoadingBarRouterModule } from '@ngx-loading-bar/router';
// for Core import:
import { LoadingBarModule } from '@ngx-loading-bar/core';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { LoginModule } from '../app/auth/login/login.module';
import { ServiceWorkerModule } from '@angular/service-worker';
import { TreeTableModule } from 'primeng/treetable';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireModule } from '@angular/fire/compat';
import { HttpInterceptor2 } from '../app/shared/services/interceptor/http.interceptor';
import { NotificationService } from './shared/services/notification.service';
import { CartSingletonService } from './shared/services/ventas/cart.singleton.service';
import { KatuqintelligenceService } from './shared/services/katuqintelligence/katuqintelligence.service';
import { GlobalErrorHandlerService } from './shared/services/errores/globalerror.service';
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
    ChatFormComponent
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
    NgIdleKeepaliveModule.forRoot(),
    LoginModule,
    TreeTableModule,
    AngularFireModule.initializeApp(environment.firebase),
    ToastrModule.forRoot(),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      },
    }),
    // for HttpClient use:
    LoadingBarHttpClientModule,
    // for Router use:
    LoadingBarRouterModule,
    // for Core use:
    LoadingBarModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the app is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    }),
    ChangePasswordModule,
    FacturaTirillaModule,
    AppTranslateModule,
    VoiceInteractionModule // Agregamos el módulo aquí
  ],
  providers: [
    NotificationService,
    KatuqintelligenceService,
    CartSingletonService,
    NotificationrlService,
    { provide: HTTP_INTERCEPTORS, useClass: HttpInterceptor2, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoaderInterceptor, multi: true }
    // {
    //   provide: ErrorHandler,
    //   useClass: GlobalErrorHandlerService,
    // }
  ],
  bootstrap: [AppComponent, ChatComponent]
})
export class AppModule { }
