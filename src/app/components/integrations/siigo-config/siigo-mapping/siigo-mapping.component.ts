import { Component, forwardRef, OnDestroy } from '@angular/core';
import { ControlValueAccessor, FormBuilder, FormGroup, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-siigo-mapping',
  templateUrl: './siigo-mapping.component.html',
  styleUrls: ['./siigo-mapping.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SiigoMappingComponent),
      multi: true
    }
  ]
})
export class SiigoMappingComponent implements ControlValueAccessor, OnDestroy {

  mappingForm: FormGroup;
  private destroy$ = new Subject<void>();
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private fb: FormBuilder) {
    this.mappingForm = this.fb.group({
      accountGroup: [''],
      incomeAccount: [''],
      costAccount: [''],
      inventoryAccount: [''],
      discountAccount: ['']
    });

    // Propagate changes to parent form
    this.mappingForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.onChange(value);
        this.onTouched();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    if (value) {
      this.mappingForm.patchValue(value, { emitEvent: false });
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.mappingForm.disable();
    } else {
      this.mappingForm.enable();
    }
  }
}
