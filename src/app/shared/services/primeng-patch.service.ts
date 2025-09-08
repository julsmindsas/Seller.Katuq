import { Injectable, KeyValueDiffers, KeyValueDiffer } from '@angular/core';

/**
 * Service to patch PrimeNG components and prevent runtime errors
 * Specifically handles NG0901 error with ngStyle in p-table
 */
@Injectable({
  providedIn: 'root'
})
export class PrimengPatchService {
  private patched = false;

  constructor(private differs: KeyValueDiffers) {
    this.applyPatches();
  }

  /**
   * Apply patches to PrimeNG components
   */
  private applyPatches(): void {
    if (this.patched) {
      return;
    }

    // Patch KeyValueDiffers to handle invalid values
    this.patchKeyValueDiffers();
    
    // Patch ngStyle to handle invalid values gracefully
    this.patchNgStyle();
    
    this.patched = true;
  }

  /**
   * Patch KeyValueDiffers to handle null/undefined values
   */
  private patchKeyValueDiffers(): void {
    if (!this.differs) return;
    
    const originalFind = this.differs.find.bind(this.differs);
    
    // Override the find method to handle invalid values
    (this.differs as any).find = function(value: any): KeyValueDiffer<any, any> {
      // If value is null, undefined, or not an object, convert to empty object
      if (value === null || value === undefined) {
        value = {};
      } else if (typeof value === 'string') {
        // Try to convert string styles to object
        const styleObj: any = {};
        try {
          if (value) {
            value.split(';').forEach((style: string) => {
              const parts = style.split(':');
              if (parts.length === 2) {
                const prop = parts[0].trim();
                const val = parts[1].trim();
                if (prop) {
                  styleObj[prop] = val;
                }
              }
            });
          }
        } catch (e) {
          // Ignore parsing errors
        }
        value = styleObj;
      } else if (typeof value !== 'object' || Array.isArray(value)) {
        // For arrays or other non-object types, use empty object
        value = {};
      }
      
      return originalFind(value);
    };
  }

  /**
   * Patch ngStyle to ensure it receives valid objects
   */
  private patchNgStyle(): void {
    // Override the default behavior for ngStyle
    if (typeof window !== 'undefined') {
      // Patch any prototype methods that might be setting styles
      const patchStyleSetter = (proto: any) => {
        if (!proto || !proto.ngStyle) return;
        
        const descriptor = Object.getOwnPropertyDescriptor(proto, 'ngStyle');
        if (descriptor && descriptor.set) {
          const originalSetter = descriptor.set;
          
          descriptor.set = function(value: any) {
            // Ensure value is valid for ngStyle
            if (value === null || value === undefined) {
              value = {};
            } else if (typeof value === 'string') {
              // Convert string styles to object
              try {
                const styleObj: any = {};
                if (value) {
                  value.split(';').forEach((style: string) => {
                    const parts = style.split(':');
                    if (parts.length === 2) {
                      const prop = parts[0].trim();
                      const val = parts[1].trim();
                      if (prop) {
                        styleObj[prop] = val;
                      }
                    }
                  });
                }
                value = styleObj;
              } catch (e) {
                value = {};
              }
            } else if (typeof value !== 'object' || Array.isArray(value)) {
              // Invalid value, use empty object
              value = {};
            }
            
            originalSetter.call(this, value);
          };
          
          Object.defineProperty(proto, 'ngStyle', descriptor);
        }
      };
      
      // Try to patch known directives that use ngStyle
      setTimeout(() => {
        // Patch after Angular has initialized
        try {
          // Find and patch ngStyle directive if it exists
          const ngStyleDirective = (window as any).ng?.common?.NgStyle;
          if (ngStyleDirective && ngStyleDirective.prototype) {
            patchStyleSetter(ngStyleDirective.prototype);
          }
        } catch (e) {
          // Ignore errors if Angular internals are not accessible
        }
      }, 0);
    }
  }

  /**
   * Initialize the patch service
   * Call this in app.component.ts or main.ts
   */
  public initialize(): void {
    if (!this.patched) {
      this.applyPatches();
    }
  }
}