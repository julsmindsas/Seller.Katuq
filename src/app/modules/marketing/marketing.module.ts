import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { CalendarModule } from 'primeng/calendar';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';

// Components
import { MarketingDashboardComponent } from './components/marketing-dashboard/marketing-dashboard.component';
import { CampaignManagerComponent } from './components/campaign-manager/campaign-manager.component';
import { SegmentBuilderComponent } from './components/segment-builder/segment-builder.component';
import { EmailTemplatesComponent } from './components/email-templates/email-templates.component';
import { AnalyticsComponent } from './components/analytics/analytics.component';
import { CustomerSegmentsComponent } from './components/customer-segments/customer-segments.component';
import { CartRecoveryComponent } from './components/cart-recovery/cart-recovery.component';
import { AutomationFlowsComponent } from './components/automation-flows/automation-flows.component';

// Services
import { MarketingService } from './services/marketing.service';
import { CampaignService } from './services/campaign.service';
import { SegmentationService } from './services/segmentation.service';
import { MarketingAnalyticsService } from './services/marketing-analytics.service';
import { EmailMarketingService } from './services/email-marketing.service';
import { AutomationService } from './services/automation.service';

// Guards
import { MarketingGuard } from './guards/marketing.guard';

const routes: Routes = [
  {
    path: '',
    component: MarketingDashboardComponent,
    canActivate: [MarketingGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: MarketingDashboardComponent },
      { path: 'campaigns', component: CampaignManagerComponent },
      { path: 'segments', component: CustomerSegmentsComponent },
      { path: 'segment-builder', component: SegmentBuilderComponent },
      { path: 'email-templates', component: EmailTemplatesComponent },
      { path: 'cart-recovery', component: CartRecoveryComponent },
      { path: 'automation', component: AutomationFlowsComponent },
      { path: 'analytics', component: AnalyticsComponent }
    ]
  }
];

/**
 * Marketing Module
 * Módulo 100% independiente para gestión de marketing
 * NO modifica ninguna funcionalidad operativa existente
 */
@NgModule({
  declarations: [
    MarketingDashboardComponent,
    CampaignManagerComponent,
    SegmentBuilderComponent,
    EmailTemplatesComponent,
    AnalyticsComponent,
    CustomerSegmentsComponent,
    CartRecoveryComponent,
    AutomationFlowsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    // PrimeNG Modules
    TableModule,
    ChartModule,
    CardModule,
    ButtonModule,
    DropdownModule,
    MultiSelectModule,
    CalendarModule,
    TagModule,
    ProgressBarModule
  ],
  providers: [
    MarketingService,
    CampaignService,
    SegmentationService,
    MarketingAnalyticsService,
    EmailMarketingService,
    AutomationService,
    MarketingGuard
  ],
  exports: [
    MarketingDashboardComponent
  ]
})
export class MarketingModule {
  constructor() {
    console.log('🚀 Marketing Module loaded - Standalone module for marketing features');
  }
}