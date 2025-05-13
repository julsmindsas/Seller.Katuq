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
// Services
import { LayoutService } from './services/layout.service';
import { NavService } from './services/nav.service';
import { ImagesManagerComponent } from './components/images-manager/images-manager.component';
import { CompanyInformationComponent } from './components/header/elements/company-information/company-information.component';
import { SecurityService } from './services/security/security.service';
import { KatuqIntelligenceComponent } from './components/katuq-intelligence/katuq-intelligence.component';
import { ImagenService } from './utils/image.service';
import { ImageProxyService } from './services/image-proxy.service';
import { FacturacionIntegracionService } from './services/integraciones/facturas/facturacion.service'
import { BlankComponent } from './components/layout/blank/blank.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { SharedChangePasswordComponent } from './components/change-password/change-password.component';
import { NgpThemeService } from './services/ngtheme.service';
import { KatuqIntelligenceService } from './katuqintelligence/katuq-intelligence.service';
import { PlanSelectorComponent } from './components/plan-selector/plan-selector.component';
import { POSPedidosUtilService } from '../components/pos/pos-service/pos-pedidos.util.service';

@NgModule({
  declarations: [
    HeaderComponent,
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
    PlanSelectorComponent
    // FloatingButtonComponent,
    // ChatFormComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    HttpClientModule,
    DragulaModule.forRoot(),
    TranslateModule,
    CarouselModule
  ],
  providers: [
    NavService,
    LayoutService,
    NgpThemeService,
    SecurityService,
    ImagenService,
    ImageProxyService,
    FacturacionIntegracionService,
    KatuqIntelligenceService,
    POSPedidosUtilService
  ],
  exports: [
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
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
    ImagesManagerComponent,
    KatuqIntelligenceComponent,
    SharedChangePasswordComponent,
    CarouselModule
    // FloatingButtonComponent,
    // ChatFormComponent
  ],
})
export class SharedModule { }
