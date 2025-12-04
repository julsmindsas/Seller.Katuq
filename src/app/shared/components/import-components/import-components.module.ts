import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Modules
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/dropdown';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AccordionModule } from 'primeng/accordion';
import { MessageModule } from 'primeng/message';

// Components
import { MobileFileUploadComponent } from './mobile-file-upload/mobile-file-upload.component';
import { ColumnMappingCardComponent } from './column-mapping-card/column-mapping-card.component';
import { ColumnMappingPreviewComponent } from './column-mapping-preview/column-mapping-preview.component';

@NgModule({
  declarations: [
    MobileFileUploadComponent,
    ColumnMappingCardComponent,
    ColumnMappingPreviewComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    // PrimeNG
    FileUploadModule,
    ButtonModule,
    ProgressBarModule,
    TooltipModule,
    DropdownModule,
    ChipModule,
    TableModule,
    TagModule,
    AccordionModule,
    MessageModule
  ],
  exports: [
    MobileFileUploadComponent,
    ColumnMappingCardComponent,
    ColumnMappingPreviewComponent
  ]
})
export class ImportComponentsModule { }
