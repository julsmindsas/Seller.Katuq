import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';

// PrimeNG Modules
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';

// NgBootstrap (for receipt modal)
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

// Receipt (shared with old POS)
import { FacturaTirillaModule } from '../components/pos/factura-tirilla/factura-tirilla.module';

// Customer creation modal (shared with old POS)
import { CrearClienteModalModule } from '../components/ventas/clientes/crear-cliente-modal/crear-cliente-modal.module';

// Routing
import { PosV2RoutingModule } from './pos-v2-routing.module';

// Services
import { PosV2ApiService } from './services/pos-v2-api.service';
import { PosV2CartService } from './services/pos-v2-cart.service';
import { PosV2ScannerService } from './services/pos-v2-scanner.service';
import { PosV2TerminalService } from './services/pos-v2-terminal.service';

// Components
import { PosShellComponent } from './components/pos-shell/pos-shell.component';
import { TerminalSelectorComponent } from './components/terminal-selector/terminal-selector.component';
import { CashRegisterComponent } from './components/cash-register/cash-register.component';
import { ScannerModeComponent } from './components/scanner-mode/scanner-mode.component';
import { CatalogModeComponent } from './components/catalog-mode/catalog-mode.component';
import { CartPanelComponent } from './components/cart-panel/cart-panel.component';
import { CartFabComponent } from './components/cart-fab/cart-fab.component';
import { CartBottomSheetComponent } from './components/cart-bottom-sheet/cart-bottom-sheet.component';
import { PaymentDialogComponent } from './components/payment-dialog/payment-dialog.component';
import { ShiftReportComponent } from './components/shift-report/shift-report.component';
import { ZReportComponent } from './components/z-report/z-report.component';
import { SalesBySellerComponent } from './components/sales-by-seller/sales-by-seller.component';
import { ReturnsReportComponent } from './components/returns/returns-report.component';
import { ReturnDialogComponent } from './components/returns/return-dialog.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    PosV2RoutingModule,
    AutoCompleteModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    CardModule,
    TagModule,
    InputNumberModule,
    DropdownModule,
    CalendarModule,
    TableModule,
    CheckboxModule,
    NgbModalModule,
    FacturaTirillaModule,
    CrearClienteModalModule,
  ],
  declarations: [
    PosShellComponent,
    TerminalSelectorComponent,
    CashRegisterComponent,
    ScannerModeComponent,
    CatalogModeComponent,
    CartPanelComponent,
    CartFabComponent,
    CartBottomSheetComponent,
    PaymentDialogComponent,
    ShiftReportComponent,
    ZReportComponent,
    SalesBySellerComponent,
    ReturnsReportComponent,
    ReturnDialogComponent,
  ],
  providers: [],
})
export class PosV2Module {}
