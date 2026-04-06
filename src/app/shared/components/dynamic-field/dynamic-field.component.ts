import { Component, Input } from '@angular/core';
import { FormControl } from '@angular/forms';
import { CustomFieldConfig } from '../../services/custom-fields.service';

@Component({
  selector: 'app-dynamic-field',
  templateUrl: './dynamic-field.component.html'
})
export class DynamicFieldComponent {
  @Input() campo!: CustomFieldConfig;
  @Input() control!: FormControl;
}
