import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CarouselModule } from 'primeng/carousel';
import { HttpClientModule } from '@angular/common/http';

import { DragulaModule } from 'ng2-dragula';
import { TranslateModule } from '@ngx-translate/core';
// Components
import { BreadcrumbComponent } from './components/breadcrumb/breadcrumb.component';
import { FeatherIconsComponent } from './components/feather-icons/feather-icons.component';
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';
import { AvisoActualizacionComponent } from './components/aviso-actualizacion/aviso-actualizacion.component';
import { ContentComponent } from './components/layout/content/content.component';
import { FullComponent } from './components/layout/full/full.component';
import { LoaderComponent } from './components/loader/loader.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TapToTopComponent } from './components/tap-to-top/tap-to-top.component';
// Header Elements Components
import { SearchComponent } from './components/header/elements/search/search.component';
import { MegaMenuComponent } from './components/header/elements/mega-menu/mega-menu.component';
import { LanguagesComponent } from './components/header/elements/languages/languages.component';
import { NotificationComponent } from './components/header/elements/notification/notification.component';
import { BookmarkComponent } from './components/header/elements/bookmark/bookmark.component';
import { CartComponent } from './components/header/elements/cart/cart.component';
import { MessageBoxComponent } from './components/header/elements/message-box/message-box.component';
import { MyAccountComponent } from './components/header/elements/my-account/my-account.component';
// Directives
import { DisableKeyPressDirective } from './directives/disable-key-press.directive';
import { OnlyAlphabetsDirective } from './directives/only-alphabets.directive';
import { OnlyNumbersDirective } from './directives/only-numbers.directive';
import { ShowOptionsDirective } from './directives/show-options.directive';
import { RoleBasedVisibilityDirective } from './directives/role-based-visibility.directive';
import { ImageFallbackDirective } from './directives/image-fallback.directive';
import { SafeImageDirective } from './directives/safe-image.directive';
import { SafeTableStyleDirective } from './directives/safe-table-style.directive';
// Services
import { LayoutService } from './services/layout.service';
import { NavService } from './services/nav.service';
import { ImagesManagerComponent } from './components/images-manager/images-manager.component';
import { CompanyInformationComponent } from './components/header/elements/company-information/company-information.component';
import { SecurityService } from './services/security/security.service';
import { KatuqIntelligenceComponent } from './components/katuq-intelligence/katuq-intelligence.component';
import { ImageProxyService } from './services/image-proxy.service';
import { FacturacionIntegracionService } from './services/integraciones/facturas/facturacion.service'
import { BlankComponent } from './components/layout/blank/blank.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { SharedChangePasswordComponent } from './components/change-password/change-password.component';
import { NgpThemeService } from './services/ngtheme.service';
import { KatuqIntelligenceService } from './katuqintelligence/katuq-intelligence.service';
import { PlanSelectorComponent } from './components/plan-selector/plan-selector.component';
import { POSPedidosUtilService } from '../components/pos/pos-service/pos-pedidos.util.service';
import { BaseService } from './services/base.service';
import { CacheService } from './services/cache/cache.service';
import { ProduccionService } from './services/produccion/produccion.service';
// Mobile Navigation Components
import { BottomNavigationComponent } from './components/bottom-navigation/bottom-navigation.component';
import { AdaptiveNavigationComponent } from './components/adaptive-navigation/adaptive-navigation.component';
import { HapticFeedbackService } from './services/haptic-feedback.service';
// Notification Center
import { NotificationCenterComponent } from './components/notification-center/notification-center.component';
import { NotificationManagerService } from './services/notifications/notification-manager.service';
import { NotificationPreferencesService } from './services/notifications/notification-preferences.service';
// Shared Filters Component
import { SharedFiltersComponent } from './components/filters/shared-filters.component';
import { FilterService } from './services/filters/filter.service';
// Usage Widget Component
import { UsageWidgetComponent } from './components/usage-widget/usage-widget.component';
// Upgrade Modal Component
import { UpgradeModalComponent } from './components/upgrade-modal/upgrade-modal.component';
import { DynamicFieldComponent } from './components/dynamic-field/dynamic-field.component';
// PrimeNG Modules for filters
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';

import { ImagenProductoPipe } from './pipes/imagen-producto.pipe';
@NgModule({
  declarations: [
    HeaderComponent,
    AvisoActualizacionComponent,
    FooterComponent,
    SidebarComponent,
    ContentComponent,
    BreadcrumbComponent,
    FeatherIconsComponent,
    FullComponent,
    ShowOptionsDirective,
    DisableKeyPressDirective,
    OnlyAlphabetsDirective,
    OnlyNumbersDirective,
    RoleBasedVisibilityDirective,
    ImageFallbackDirective,
    SafeImageDirective,
    SafeTableStyleDirective,
    LoaderComponent,
    TapToTopComponent,
    SearchComponent,
    MegaMenuComponent,
    LanguagesComponent,
    NotificationComponent,
    BookmarkComponent,
    CartComponent,
    MessageBoxComponent,
    MyAccountComponent,
    ImagesManagerComponent,
    CompanyInformationComponent,
    KatuqIntelligenceComponent,
    BlankComponent,
    PageNotFoundComponent,
    SharedChangePasswordComponent,
    PlanSelectorComponent,
    // Mobile Navigation Components
    BottomNavigationComponent,
    AdaptiveNavigationComponent,
    // Notification Center
    NotificationCenterComponent,
    // Shared Filters Component
    SharedFiltersComponent,
    // Usage Widget Component
    UsageWidgetComponent,
    // Upgrade Modal Component
    UpgradeModalComponent,
    // Dynamic Fields
    DynamicFieldComponent
    // FloatingButtonComponent,
    // ChatFormComponent
  ],
  imports: [
    ImagenProductoPipe,
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    HttpClientModule,
    DragulaModule.forRoot(),
    TranslateModule,
    CarouselModule,
    // PrimeNG Modules for filters
    CalendarModule,
    DropdownModule,
    MultiSelectModule,
    ButtonModule,
    TooltipModule,
    InputTextModule,
    AutoCompleteModule,
    CardModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    DialogModule
  ],
  providers: [
    NavService,
    LayoutService,
    NgpThemeService,
    SecurityService,
    // ImagenService NO va acá: al declararlo en los providers de SharedModule se
    // instancia en el injector de cada módulo lazy, y como SharedModule también
    // importa HttpClientModule (que registra su propio HTTP_INTERCEPTORS para
    // XSRF), ese injector local TAPA los interceptores del root — las peticiones
    // salían sin Authorization/company y el backend respondía 401. Con
    // `providedIn: 'root'` en el servicio queda un único singleton con el
    // HttpClient del root, que sí pasa por HttpInterceptor2.
    ImageProxyService,
    FacturacionIntegracionService,
    KatuqIntelligenceService,
    POSPedidosUtilService,
    BaseService,
    CacheService,
    ProduccionService,
    HapticFeedbackService,
    NotificationManagerService,
    NotificationPreferencesService,
    FilterService
    // SE ELIMINAN LOS PROVEEDORES DE HERRAMIENTAS DE AQUÍ
    // { provide: TOOL_ADAPTER, useClass: DefaultToolAdapterService },
    // { provide: TOOL_REGISTRARS, useExisting: SalesToolsRegistrarService, multi: true },
    // { provide: TOOL_REGISTRARS, useExisting: OrderToolsRegistrarService, multi: true },
    // TOOL_REGISTRARS_INITIALIZER
  ],
  exports: [
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    // Se reexporta para que cualquier módulo que importe SharedModule pueda
    // resolver las imágenes de producto sin volver a declararlo.
    ImagenProductoPipe,
    LoaderComponent,
    BreadcrumbComponent,
    FeatherIconsComponent,
    TapToTopComponent,
    DisableKeyPressDirective,
    OnlyAlphabetsDirective,
    OnlyNumbersDirective,
    RoleBasedVisibilityDirective,
    ImageFallbackDirective,
    SafeImageDirective,
    SafeTableStyleDirective,
    ImagesManagerComponent,
    KatuqIntelligenceComponent,
    SharedChangePasswordComponent,
    CarouselModule,
    // Mobile Navigation Components
    BottomNavigationComponent,
    AdaptiveNavigationComponent,
    // Notification Center
    NotificationCenterComponent,
    // Shared Filters Component
    SharedFiltersComponent,
    // Usage Widget Component
    UsageWidgetComponent,
    // Upgrade Modal Component
    UpgradeModalComponent
    // FloatingButtonComponent,
    // ChatFormComponent
  ],
})
export class SharedModule { }
