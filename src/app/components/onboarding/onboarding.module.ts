import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Modules
import { SidebarModule } from 'primeng/sidebar';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { StepsModule } from 'primeng/steps';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';
import { SkeletonModule } from 'primeng/skeleton';
import { AccordionModule } from 'primeng/accordion';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { FileUploadModule } from 'primeng/fileupload';
import { TreeSelectModule } from 'primeng/treeselect';
import { MessageModule } from 'primeng/message';

// Routing
import { OnboardingRoutingModule } from './onboarding-routing.module';

// Shared Import Components Module (moved to shared)
import { ImportComponentsModule } from '../../shared/components/import-components/import-components.module';

// Components
import { OnboardingWizardComponent } from './onboarding-wizard/onboarding-wizard.component';

// Step Components
import { CompanyInfoStepComponent } from './steps/company-info-step.component';
import { GenericStepComponent } from './steps/generic-step.component';
import { WarehousesStepComponent } from './steps/warehouses-step.component';
import { PaymentMethodsStepComponent } from './steps/payment-methods-step.component';
import { DeliveryMethodsStepComponent } from './steps/delivery-methods-step.component';
import { DeliveryTypesStepComponent } from './steps/delivery-types-step.component';
import { DeliveryTimesStepComponent } from './steps/delivery-times-step.component';
import { CategoriesStepComponent } from './steps/categories-step.component';
import { RolesStepComponent } from './steps/roles-step.component';
import { BillingZonesStepComponent } from './steps/billing-zones-step.component';
import { FirstProductStepComponent } from './steps/first-product-step.component';
import { ImportCustomersStepComponent } from './steps/import-customers-step.component';
import { ImportProductsStepComponent } from './steps/import-products-step.component';
import { SequencesStepComponent } from './steps/sequences-step.component';

// Services are provided in root, no need to provide here

@NgModule({
  declarations: [
    OnboardingWizardComponent,
    // Step components
    CompanyInfoStepComponent,
    GenericStepComponent,
    WarehousesStepComponent,
    PaymentMethodsStepComponent,
    DeliveryMethodsStepComponent,
    DeliveryTypesStepComponent,
    DeliveryTimesStepComponent,
    CategoriesStepComponent,
    RolesStepComponent,
    BillingZonesStepComponent,
    FirstProductStepComponent,
    ImportCustomersStepComponent,
    ImportProductsStepComponent,
    SequencesStepComponent
    // Shared import components moved to ImportComponentsModule
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    OnboardingRoutingModule,

    // Shared Import Components (mobile-file-upload, column-mapping-card, column-mapping-preview)
    ImportComponentsModule,

    // PrimeNG
    SidebarModule,
    ButtonModule,
    ProgressBarModule,
    StepsModule,
    CheckboxModule,
    CardModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    TooltipModule,
    DividerModule,
    BadgeModule,
    ChipModule,
    SkeletonModule,
    AccordionModule,
    InputNumberModule,
    CalendarModule,
    MultiSelectModule,
    ToastModule,
    TableModule,
    TagModule,
    FileUploadModule,
    TreeSelectModule,
    MessageModule
  ]
})
export class OnboardingModule { }
